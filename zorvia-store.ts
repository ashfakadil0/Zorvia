import { DEFAULT_SCHEDULE } from "@/data/workouts";
import type { ExerciseCategory } from "@/data/exercises";
import type { ZorviaState } from "./zorvia-types";

export const STORAGE_KEY = "zorvia.state.v2";
export const LEGACY_SCHEDULE_KEY = "customWeeklySchedule";
export const STATE_VERSION = 2;

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function createInitialState(): ZorviaState {
  return {
    version: STATE_VERSION,
    updatedAt: new Date(0).toISOString(),
    profile: {
      onboarded: false,
      name: "",
      level: "beginner",
      goal: "general",
      equipment: ["Bodyweight"],
      workoutDays: [0, 1, 3, 4, 6],
      activityLevel: "moderate",
      dietary: [],
      allergies: "",
    },
    schedule: { ...DEFAULT_SCHEDULE },
    sessions: [],
    activeSession: null,
    records: {},
    hydration: [],
    achievements: {},
    favorites: [],
    recentExercises: [],
    routines: [],
    settings: {
      restDefaultSec: 60,
      units: "metric",
      theme: "dark",
      reminderTime: "18:00",
      notifications: { workout: true, hydration: true, achievements: true },
      hydrationGoalMl: 2500,
      autoRestTimer: true,
      hapticsEnabled: true,
    },
    motivationIndex: 0,
    lastMotivationDate: "",
  };
}

/** Merge unknown/partial persisted data onto a fresh state, so old saves never crash the app. */
export function migrateState(raw: unknown): ZorviaState {
  const base = createInitialState();
  if (!raw || typeof raw !== "object") return base;
  const input = raw as Partial<ZorviaState>;

  const merged: ZorviaState = {
    ...base,
    ...input,
    version: STATE_VERSION,
    profile: { ...base.profile, ...(input.profile ?? {}) },
    schedule: { ...base.schedule, ...(input.schedule ?? {}) },
    settings: {
      ...base.settings,
      ...(input.settings ?? {}),
      notifications: { ...base.settings.notifications, ...(input.settings?.notifications ?? {}) },
    },
    sessions: Array.isArray(input.sessions) ? input.sessions : [],
    hydration: Array.isArray(input.hydration) ? input.hydration : [],
    favorites: Array.isArray(input.favorites) ? input.favorites : [],
    recentExercises: Array.isArray(input.recentExercises) ? input.recentExercises : [],
    routines: Array.isArray(input.routines) ? input.routines : [],
    records: input.records && typeof input.records === "object" ? input.records : {},
    achievements: input.achievements && typeof input.achievements === "object" ? input.achievements : {},
    activeSession: input.activeSession ?? null,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : base.updatedAt,
  };
  return merged;
}

/** Pull the V1 custom weekly schedule if the user had one saved in the old app. */
export function importLegacyData(state: ZorviaState): ZorviaState {
  if (typeof window === "undefined") return state;
  try {
    const legacy = window.localStorage.getItem(LEGACY_SCHEDULE_KEY);
    if (!legacy) return state;
    const parsed = JSON.parse(legacy) as Record<string, string>;
    const schedule = { ...state.schedule };
    let changed = false;
    for (const [dayIdx, key] of Object.entries(parsed)) {
      const idx = Number(dayIdx);
      if (Number.isInteger(idx) && idx >= 0 && idx <= 6 && typeof key === "string") {
        schedule[idx] = key as ExerciseCategory;
        changed = true;
      }
    }
    return changed ? { ...state, schedule } : state;
  } catch {
    return state;
  }
}

export function loadState(): ZorviaState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return importLegacyData(createInitialState());
    return migrateState(JSON.parse(raw));
  } catch {
    return createInitialState();
  }
}

export function saveState(state: ZorviaState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked — the app still works in memory */
  }
}
