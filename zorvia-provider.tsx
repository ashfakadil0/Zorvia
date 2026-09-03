import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { EXERCISE_MAP, type Exercise, type ExerciseCategory } from "@/data/exercises";
import { DAY_MAP } from "@/data/workouts";
import { ACHIEVEMENTS, evaluateAchievements } from "@/lib/achievements";
import { buildWorkoutPlan } from "@/lib/personalize";
import { createInitialState, loadState, saveState, todayKey, STATE_VERSION } from "@/lib/zorvia-store";
import type {
  ActiveSession,
  ExerciseEntry,
  SessionRecord,
  Settings,
  UserProfile,
  ZorviaState,
} from "@/lib/zorvia-types";

/** Most recent finished session's entry for this exercise, so the session player can
 * show "last time" beside each set. `state.sessions` is stored newest-first. */
export function previousExerciseEntry(
  state: ZorviaState,
  exerciseId: string,
  excludeSessionId?: string,
): ExerciseEntry | undefined {
  for (const session of state.sessions) {
    if (session.id === excludeSessionId || !session.finishedAt) continue;
    const entry = session.entries.find((e) => e.exerciseId === exerciseId && e.sets.some((s) => s.done));
    if (entry) return entry;
  }
  return undefined;
}

interface ZorviaContextValue {
  state: ZorviaState;
  ready: boolean;
  syncing: boolean;
  update: (fn: (draft: ZorviaState) => ZorviaState) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setScheduleDay: (weekday: number, category: ExerciseCategory) => void;
  startSession: (category: ExerciseCategory, routineId?: string) => void;
  logSet: (exerciseId: string, setIndex: number, payload: { reps?: number; weightKg?: number; seconds?: number }) => void;
  toggleSkip: (exerciseId: string) => void;
  goToExercise: (index: number) => void;
  swapExercise: (exerciseId: string, replacementId: string) => void;
  setSessionRunning: (running: boolean) => void;
  finishSession: (notes?: string) => SessionRecord | null;
  discardSession: () => void;
  addWater: (ml: number) => void;
  toggleFavorite: (exerciseId: string) => void;
  markRecentExercise: (exerciseId: string) => void;
  clearLocalData: () => void;
  pushToCloud: () => Promise<void>;
}

const ZorviaContext = createContext<ZorviaContextValue | null>(null);

function haptic(enabled: boolean, pattern: number | number[] = 12) {
  if (!enabled || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* unsupported */
  }
}

function stamp(state: ZorviaState): ZorviaState {
  return { ...state, updatedAt: new Date().toISOString(), version: STATE_VERSION };
}

function elapsedOf(session: ActiveSession): number {
  if (!session.running) return session.pausedAccumSec;
  const delta = (Date.now() - new Date(session.lastTickAt).getTime()) / 1000;
  return session.pausedAccumSec + Math.max(0, Math.round(delta));
}

export function ZorviaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ZorviaState>(() => createInitialState());
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  /* ---- hydrate from local storage after mount (never during SSR) ---- */
  useEffect(() => {
    const local = loadState();
    setState(local);
    setReady(true);
  }, []);

  /* ---- persist locally on every change ---- */
  useEffect(() => {
    if (!ready) return;
    saveState(state);
  }, [state, ready]);

  /* ---- theme ---- */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const pref = state.settings.theme;
    const prefersLight =
      pref === "light" ||
      (pref === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches);
    root.classList.toggle("theme-light", prefersLight);
    root.classList.toggle("dark", !prefersLight);
  }, [state.settings.theme]);

  const update = useCallback((fn: (draft: ZorviaState) => ZorviaState) => {
    setState((prev) => stamp(fn(prev)));
  }, []);

  /* ---- cloud sync: newest client_updated_at wins, never clobber newer data ---- */
  const pushToCloud = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const current = stateRef.current;
    setSyncing(true);
    try {
      await supabase.from("user_state").upsert(
        {
          user_id: auth.user.id,
          state: JSON.parse(JSON.stringify(current)),
          state_version: STATE_VERSION,
          client_updated_at: current.updatedAt,
        },
        { onConflict: "user_id" },
      );
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    const pull = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || cancelled) return;
      setSyncing(true);
      try {
        const { data } = await supabase
          .from("user_state")
          .select("state, client_updated_at")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        if (cancelled) return;
        const remote = data?.state as ZorviaState | undefined;
        const local = stateRef.current;
        if (remote && data?.client_updated_at && new Date(data.client_updated_at) > new Date(local.updatedAt)) {
          const { migrateState } = await import("@/lib/zorvia-store");
          setState(migrateState(remote));
        } else if (local.profile.onboarded) {
          await pushToCloud();
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };

    void pull();
    return () => {
      cancelled = true;
    };
  }, [ready, pushToCloud]);

  // Debounced push so ongoing sessions don't hammer the network.
  useEffect(() => {
    if (!ready || !state.profile.onboarded) return;
    const t = setTimeout(() => void pushToCloud(), 4000);
    return () => clearTimeout(t);
  }, [state, ready, pushToCloud]);

  /* ---------------------------- actions ---------------------------- */

  const updateProfile = useCallback(
    (patch: Partial<UserProfile>) => update((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
    [update],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) =>
      update((s) => ({
        ...s,
        settings: { ...s.settings, ...patch, notifications: { ...s.settings.notifications, ...(patch.notifications ?? {}) } },
      })),
    [update],
  );

  const setScheduleDay = useCallback(
    (weekday: number, category: ExerciseCategory) =>
      update((s) => ({ ...s, schedule: { ...s.schedule, [weekday]: category } })),
    [update],
  );

  const startSession = useCallback(
    (category: ExerciseCategory, routineId?: string) => {
      update((s) => {
        const routine = routineId ? s.routines.find((r) => r.id === routineId) : undefined;
        const planned = routine
          ? routine.exerciseIds
              .map((id) => EXERCISE_MAP[id])
              .filter((ex): ex is Exercise => Boolean(ex))
              .map((ex) => ({
                exercise: ex,
                sets: ex.sets,
                reps: ex.reps,
                duration: ex.duration,
                restSec: ex.rest,
              }))
          : buildWorkoutPlan(s, category);

        const entries: ExerciseEntry[] = planned.map((p) => ({
          exerciseId: p.exercise.id,
          targetSets: p.sets,
          targetReps: p.reps,
          targetDuration: p.duration,
          sets: Array.from({ length: p.sets }, () => ({ done: false })),
        }));

        const active: ActiveSession = {
          id: `s_${Date.now()}`,
          date: todayKey(),
          startedAt: new Date().toISOString(),
          category,
          title: routine?.name ?? DAY_MAP[category].title,
          durationSec: 0,
          entries,
          routineId,
          currentIndex: 0,
          pausedAccumSec: 0,
          running: true,
          lastTickAt: new Date().toISOString(),
        };
        return { ...s, activeSession: active };
      });
    },
    [update],
  );

  const logSet = useCallback(
    (exerciseId: string, setIndex: number, payload: { reps?: number; weightKg?: number; seconds?: number }) => {
      update((s) => {
        if (!s.activeSession) return s;
        const entries = s.activeSession.entries.map((entry) => {
          if (entry.exerciseId !== exerciseId) return entry;
          const sets = entry.sets.map((set, i) => (i === setIndex ? { ...set, ...payload, done: true } : set));
          return { ...entry, sets };
        });
        haptic(s.settings.hapticsEnabled);
        return { ...s, activeSession: { ...s.activeSession, entries } };
      });
    },
    [update],
  );

  const toggleSkip = useCallback(
    (exerciseId: string) =>
      update((s) => {
        if (!s.activeSession) return s;
        const entries = s.activeSession.entries.map((e) =>
          e.exerciseId === exerciseId ? { ...e, skipped: !e.skipped } : e,
        );
        return { ...s, activeSession: { ...s.activeSession, entries } };
      }),
    [update],
  );

  const goToExercise = useCallback(
    (index: number) =>
      update((s) => {
        if (!s.activeSession) return s;
        const clamped = Math.max(0, Math.min(index, s.activeSession.entries.length - 1));
        return { ...s, activeSession: { ...s.activeSession, currentIndex: clamped } };
      }),
    [update],
  );

  const swapExercise = useCallback(
    (exerciseId: string, replacementId: string) =>
      update((s) => {
        if (!s.activeSession) return s;
        const replacement = EXERCISE_MAP[replacementId];
        if (!replacement) return s;
        const entries = s.activeSession.entries.map((e) =>
          e.exerciseId === exerciseId
            ? {
                exerciseId: replacement.id,
                targetSets: e.targetSets,
                targetReps: replacement.reps,
                targetDuration: replacement.duration,
                sets: Array.from({ length: e.targetSets }, () => ({ done: false })),
              }
            : e,
        );
        return { ...s, activeSession: { ...s.activeSession, entries } };
      }),
    [update],
  );

  const setSessionRunning = useCallback(
    (running: boolean) =>
      update((s) => {
        if (!s.activeSession) return s;
        const accum = elapsedOf(s.activeSession);
        return {
          ...s,
          activeSession: { ...s.activeSession, running, pausedAccumSec: accum, lastTickAt: new Date().toISOString() },
        };
      }),
    [update],
  );

  const finishSession = useCallback(
    (notes?: string) => {
      let saved: SessionRecord | null = null;
      update((s) => {
        const active = s.activeSession;
        if (!active) return s;

        const durationSec = elapsedOf(active);
        const record: SessionRecord = {
          id: active.id,
          date: active.date,
          startedAt: active.startedAt,
          finishedAt: new Date().toISOString(),
          category: active.category,
          title: active.title,
          durationSec,
          entries: active.entries,
          notes,
          routineId: active.routineId,
        };
        saved = record;

        // Personal records
        const records = { ...s.records };
        for (const entry of record.entries) {
          for (const set of entry.sets) {
            if (!set.done) continue;
            const prev = records[entry.exerciseId];
            const next = {
              exerciseId: entry.exerciseId,
              bestReps: Math.max(prev?.bestReps ?? 0, set.reps ?? 0) || undefined,
              bestWeightKg: Math.max(prev?.bestWeightKg ?? 0, set.weightKg ?? 0) || undefined,
              bestSeconds: Math.max(prev?.bestSeconds ?? 0, set.seconds ?? 0) || undefined,
              date: record.date,
            };
            const improved =
              (next.bestReps ?? 0) > (prev?.bestReps ?? 0) ||
              (next.bestWeightKg ?? 0) > (prev?.bestWeightKg ?? 0) ||
              (next.bestSeconds ?? 0) > (prev?.bestSeconds ?? 0);
            if (!prev || improved) records[entry.exerciseId] = { ...next, date: record.date };
          }
        }

        const withSession: ZorviaState = {
          ...s,
          sessions: [record, ...s.sessions].slice(0, 500),
          records,
          activeSession: null,
          recentExercises: [
            ...new Set([...record.entries.map((e) => e.exerciseId), ...s.recentExercises]),
          ].slice(0, 24),
        };

        const unlocked = evaluateAchievements(withSession);
        const achievements = { ...withSession.achievements };
        for (const id of unlocked) achievements[id] = new Date().toISOString();

        if (unlocked.length && s.settings.notifications.achievements) {
          for (const id of unlocked) {
            const meta = ACHIEVEMENTS.find((a) => a.id === id);
            if (meta) setTimeout(() => toast.success(`Achievement: ${meta.title}`, { description: meta.description }), 400);
          }
        }
        haptic(s.settings.hapticsEnabled, [10, 40, 20]);
        return { ...withSession, achievements };
      });
      return saved;
    },
    [update],
  );

  const discardSession = useCallback(() => update((s) => ({ ...s, activeSession: null })), [update]);

  const addWater = useCallback(
    (ml: number) =>
      update((s) => {
        const key = todayKey();
        const existing = s.hydration.find((h) => h.date === key);
        const capped = Math.max(0, Math.min(5000, (existing?.ml ?? 0) + ml));
        const hydration = existing
          ? s.hydration.map((h) => (h.date === key ? { ...h, ml: capped } : h))
          : [{ date: key, ml: capped }, ...s.hydration];
        haptic(s.settings.hapticsEnabled);
        return { ...s, hydration: hydration.slice(0, 400) };
      }),
    [update],
  );

  const toggleFavorite = useCallback(
    (exerciseId: string) =>
      update((s) => ({
        ...s,
        favorites: s.favorites.includes(exerciseId)
          ? s.favorites.filter((id) => id !== exerciseId)
          : [...s.favorites, exerciseId],
      })),
    [update],
  );

  const markRecentExercise = useCallback(
    (exerciseId: string) =>
      update((s) => ({ ...s, recentExercises: [...new Set([exerciseId, ...s.recentExercises])].slice(0, 24) })),
    [update],
  );

  const clearLocalData = useCallback(() => {
    const fresh = createInitialState();
    setState({ ...fresh, updatedAt: new Date().toISOString() });
  }, []);

  const value = useMemo<ZorviaContextValue>(
    () => ({
      state,
      ready,
      syncing,
      update,
      updateProfile,
      updateSettings,
      setScheduleDay,
      startSession,
      logSet,
      toggleSkip,
      goToExercise,
      swapExercise,
      setSessionRunning,
      finishSession,
      discardSession,
      addWater,
      toggleFavorite,
      markRecentExercise,
      clearLocalData,
      pushToCloud,
    }),
    [
      state,
      ready,
      syncing,
      update,
      updateProfile,
      updateSettings,
      setScheduleDay,
      startSession,
      logSet,
      toggleSkip,
      goToExercise,
      swapExercise,
      setSessionRunning,
      finishSession,
      discardSession,
      addWater,
      toggleFavorite,
      markRecentExercise,
      clearLocalData,
      pushToCloud,
    ],
  );

  return <ZorviaContext.Provider value={value}>{children}</ZorviaContext.Provider>;
}

export function useZorvia() {
  const ctx = useContext(ZorviaContext);
  if (!ctx) throw new Error("useZorvia must be used inside <ZorviaProvider>");
  return ctx;
}

export function sessionElapsedSeconds(session: ActiveSession): number {
  return elapsedOf(session);
}
