import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, SkipForward, Timer, Trophy, X } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/zorvia/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getExercise } from "@/data/exercises";
import { previousExerciseEntry, sessionElapsedSeconds, useZorvia } from "@/lib/zorvia-provider";
import type { ExerciseEntry, SetEntry } from "@/lib/zorvia-types";

export const Route = createFileRoute("/session")({
  head: () => ({
    meta: [
      { title: "Workout Session — Zorvia" },
      { name: "description", content: "Track sets, reps, rest timers and elapsed time through your live Zorvia workout session." },
      { property: "og:title", content: "Workout Session — Zorvia" },
      { property: "og:description", content: "Live set tracking, rest timers and a session summary when you finish." },
    ],
  }),
  component: SessionPage,
});

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.max(0, Math.round(sec)) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Human-readable summary of a logged set, e.g. "12 reps · 20kg" or "30s". */
function formatSetResult(set: SetEntry): string {
  const parts: string[] = [];
  if (set.seconds) parts.push(`${set.seconds}s`);
  else if (set.reps) parts.push(`${set.reps} reps`);
  if (set.weightKg) parts.push(`${set.weightKg}kg`);
  return parts.length ? parts.join(" · ") : "✓";
}

/** "Last time" text for a given set index, pulled from the most recent prior session. */
function previousSetText(prevEntry: ExerciseEntry | undefined, index: number): string | null {
  const prevSet = prevEntry?.sets[index];
  if (!prevSet?.done) return null;
  return `Last time: ${formatSetResult(prevSet)}`;
}

function SessionPage() {
  const navigate = useNavigate();
  const { state, logSet, toggleSkip, goToExercise, setSessionRunning, finishSession, discardSession } = useZorvia();
  const active = state.activeSession;
  const [tick, setTick] = useState(0);
  const [rest, setRest] = useState(0);
  const [holdSetIndex, setHoldSetIndex] = useState<number | null>(null);
  const [holdRemaining, setHoldRemaining] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");

  const entry = active?.entries[active.currentIndex];
  const exercise = entry ? getExercise(entry.exerciseId) : undefined;

  // Global 1s ticker — keeps the elapsed-time header live.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Rest timer — only counts down while the session is running (not paused).
  useEffect(() => {
    if (!active?.running) return;
    if (rest <= 0) return;
    const id = setTimeout(() => setRest((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(id);
  }, [rest, active?.running]);

  // Timed-hold countdown for the set currently being performed.
  useEffect(() => {
    if (!active?.running) return;
    if (holdRemaining === null || holdRemaining <= 0) return;
    const id = setTimeout(() => setHoldRemaining((r) => (r === null ? null : Math.max(0, r - 1))), 1000);
    return () => clearTimeout(id);
  }, [holdRemaining, active?.running]);

  // When a hold countdown finishes, auto-log the set and (optionally) kick off rest.
  useEffect(() => {
    if (holdRemaining !== 0 || holdSetIndex === null || !entry) return;
    logSet(entry.exerciseId, holdSetIndex, { seconds: entry.targetDuration });
    setHoldSetIndex(null);
    setHoldRemaining(null);
    if (state.settings.autoRestTimer && exercise) setRest(exercise.rest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdRemaining, holdSetIndex]);

  // Reset any in-flight hold timer when the active exercise changes, so state never
  // leaks between exercises (e.g. navigating away mid-hold).
  useEffect(() => {
    setHoldSetIndex(null);
    setHoldRemaining(null);
    setReps("");
    setWeight("");
  }, [active?.currentIndex]);

  if (!active) {
    return (
      <AppShell title="Session">
        <div className="zv-panel p-5">
          <p className="text-sm text-muted-foreground">No active session right now.</p>
          <Button asChild className="mt-4">
            <Link to="/workout">Pick a workout</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const next = active.entries[active.currentIndex + 1];
  const nextExercise = next ? getExercise(next.exerciseId) : undefined;
  const totalSets = active.entries.reduce((n, e) => n + e.targetSets, 0);
  const doneSets = active.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const elapsed = sessionElapsedSeconds(active);
  const prevEntry = entry ? previousExerciseEntry(state, entry.exerciseId, active.id) : undefined;
  const record = entry ? state.records[entry.exerciseId] : undefined;
  const isHoldExercise = Boolean(entry?.targetDuration);

  const prevIndex = () => {
    if (active.currentIndex > 0) goToExercise(active.currentIndex - 1);
  };
  const nextIndex = () => {
    if (active.currentIndex + 1 < active.entries.length) goToExercise(active.currentIndex + 1);
  };

  const startHold = (setIndex: number) => {
    if (!entry?.targetDuration) return;
    setHoldSetIndex(setIndex);
    setHoldRemaining(entry.targetDuration);
  };
  const cancelHold = () => {
    setHoldSetIndex(null);
    setHoldRemaining(null);
  };

  const logRepSet = (setIndex: number) => {
    if (!entry || !exercise) return;
    logSet(entry.exerciseId, setIndex, {
      reps: reps ? Number(reps) : undefined,
      weightKg: weight ? Number(weight) : undefined,
    });
    if (state.settings.autoRestTimer) setRest(exercise.rest);
  };

  const complete = () => {
    const savedRecord = finishSession(notes.trim() || undefined);
    if (savedRecord) {
      toast.success("Workout complete!", {
        description: `${doneSets} sets in ${fmt(elapsed)} — nice work.`,
      });
    }
    void navigate({ to: "/progress" });
  };

  return (
    <AppShell title={active.title} subtitle={`${fmt(elapsed)} elapsed · ${doneSets}/${totalSets} sets`} bare>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={doneSets} aria-valuemin={0} aria-valuemax={totalSets}>
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }} />
      </div>

      {!active.running ? (
        <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-xs font-semibold text-amber-500">
          Session paused — timers are on hold
        </div>
      ) : null}

      {exercise && entry ? (
        <section className="zv-panel p-5">
          <p className="zv-eyebrow">Exercise {active.currentIndex + 1} of {active.entries.length}</p>
          <h2 className="mt-1 font-display text-xl font-bold">{exercise.name}</h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {entry.targetSets} × {entry.targetDuration ? `${entry.targetDuration}s` : (entry.targetReps ?? "—")} · rest {exercise.rest}s
          </p>
          {record ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-gold">
              <Trophy className="size-3.5" aria-hidden="true" />
              PR: {[
                record.bestReps ? `${record.bestReps} reps` : null,
                record.bestWeightKg ? `${record.bestWeightKg}kg` : null,
                record.bestSeconds ? `${record.bestSeconds}s` : null,
              ].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <Link to="/exercises/$exerciseId" params={{ exerciseId: exercise.id }} className="mt-2 inline-block text-xs text-primary hover:underline">
            Form & instructions
          </Link>

          <ul className="mt-4 space-y-2">
            {entry.sets.map((set, i) => {
              const prevText = previousSetText(prevEntry, i);
              const holding = holdSetIndex === i && holdRemaining !== null;

              return (
                <li key={i} className="rounded-xl border border-border p-2.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-faint">SET {i + 1}</span>
                    <span className="flex-1 font-mono text-xs text-muted-foreground">
                      {set.done ? formatSetResult(set) : holding ? "In progress…" : "pending"}
                    </span>

                    {set.done ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => (isHoldExercise ? startHold(i) : logRepSet(i))}
                        disabled={isHoldExercise && holdSetIndex !== null}
                      >
                        <RotateCcw className="size-4" aria-hidden="true" /> Redo
                      </Button>
                    ) : isHoldExercise ? (
                      holding ? (
                        <Button size="sm" variant="outline" onClick={cancelHold}>
                          Cancel
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => startHold(i)} disabled={holdSetIndex !== null}>
                          <Timer className="size-4" aria-hidden="true" /> Start hold
                        </Button>
                      )
                    ) : (
                      <Button size="sm" onClick={() => logRepSet(i)}>
                        <Check className="size-4" aria-hidden="true" /> Done
                      </Button>
                    )}
                  </div>

                  {holding ? (
                    <p className="mt-2 text-center font-mono text-3xl font-bold tabular-nums text-primary">{fmt(holdRemaining ?? 0)}</p>
                  ) : null}

                  {!set.done && !holding && prevText ? (
                    <p className="mt-1 pl-[3.75rem] text-xs text-faint">{prevText}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {!isHoldExercise ? (
            <div className="mt-3 flex gap-2">
              <Input inputMode="numeric" placeholder="Reps" value={reps} onChange={(e) => setReps(e.target.value)} aria-label="Reps" />
              <Input inputMode="numeric" placeholder="Weight kg" value={weight} onChange={(e) => setWeight(e.target.value)} aria-label="Weight in kilograms" />
            </div>
          ) : null}

          {rest > 0 ? (
            <p className="mt-3 font-mono text-sm text-steel">Rest {fmt(rest)} · <button type="button" className="underline" onClick={() => setRest(0)}>skip rest</button></p>
          ) : null}
        </section>
      ) : null}

      {nextExercise ? <p className="mt-3 text-xs text-muted-foreground">Next up: {nextExercise.name}</p> : <p className="mt-3 text-xs text-muted-foreground">Last exercise — finish strong.</p>}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={prevIndex} disabled={active.currentIndex === 0}>
          <ChevronLeft className="size-4" aria-hidden="true" /> Previous
        </Button>
        <Button onClick={nextIndex} disabled={active.currentIndex + 1 >= active.entries.length}>
          Next exercise <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
        <Button variant="outline" onClick={() => setSessionRunning(!active.running)}>
          {active.running ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          {active.running ? "Pause" : "Resume"}
        </Button>
        <Button variant="outline" onClick={() => { if (entry) toggleSkip(entry.exerciseId); nextIndex(); }}>
          <SkipForward className="size-4" aria-hidden="true" /> Skip
        </Button>
      </div>

      <Button variant="secondary" className="mt-2 w-full" onClick={complete}>
        Finish workout
      </Button>

      <Textarea className="mt-3" placeholder="Session notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Session notes" />

      <Button
        variant="ghost"
        className="mt-3 w-full text-muted-foreground"
        onClick={() => {
          discardSession();
          void navigate({ to: "/workout" });
        }}
      >
        <X className="size-4" aria-hidden="true" /> Discard session
      </Button>
    </AppShell>
  );
}
