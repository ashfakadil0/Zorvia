import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Play } from "lucide-react";

import { AppShell } from "@/components/zorvia/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DAY_MAP, WEEKDAYS, WORKOUT_DAYS } from "@/data/workouts";
import type { ExerciseCategory } from "@/data/exercises";
import { buildWorkoutPlan, categoryForDay, todaysCategory } from "@/lib/personalize";
import { STAGE_LABELS, stageStatus } from "@/lib/progression";
import { useZorvia } from "@/lib/zorvia-provider";

export const Route = createFileRoute("/workout")({
  head: () => ({
    meta: [
      { title: "Today's Workout — Zorvia" },
      { name: "description", content: "Your personalised push, pull, legs, core, skill and recovery sessions with sets, reps and rest built around your equipment and level." },
      { property: "og:title", content: "Today's Workout — Zorvia" },
      { property: "og:description", content: "Personalised training days with sets, reps and rest tuned to your level and equipment." },
    ],
  }),
  component: WorkoutPage,
});

function WorkoutPage() {
  const navigate = useNavigate();
  const { state, startSession, setScheduleDay } = useZorvia();
  const [selected, setSelected] = useState<ExerciseCategory>(todaysCategory(state));
  const day = DAY_MAP[selected];
  const plan = useMemo(() => buildWorkoutPlan(state, selected), [state, selected]);
  const status = useMemo(() => stageStatus(state), [state]);
  const active = state.activeSession;

  const begin = () => {
    if (active) {
      void navigate({ to: "/session" });
      return;
    }
    startSession(selected);
    void navigate({ to: "/session" });
  };

  return (
    <AppShell title="Workout" subtitle="Personalised to your level, equipment and recovery">
      {active ? (
        <div className="zv-panel mb-3 border-primary/50 p-4">
          <p className="zv-eyebrow">Session in progress</p>
          <p className="mt-1 text-sm font-semibold">{active.title}</p>
          <Button className="mt-3 w-full" onClick={() => void navigate({ to: "/session" })}>
            Resume session
          </Button>
        </div>
      ) : null}

      <section className="zv-panel mb-3 p-4">
        <span className="zv-eyebrow">Your stage</span>
        <p className="mt-1 font-display text-lg font-bold">{STAGE_LABELS[status.stage]}</p>
        <p className="mt-1 text-xs text-muted-foreground">{status.note}</p>
        {status.nextStage ? (
          <>
            <p className="mt-3 font-mono text-xs text-faint">
              Next: {STAGE_LABELS[status.nextStage]} — earned by performance, not by a deadline.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {status.requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </>
        ) : null}
        {status.readyMovements.length ? (
          <p className="mt-2 text-xs text-primary">
            Ready to step up: {status.readyMovements.map((m) => m.name).join(", ")}
          </p>
        ) : null}
      </section>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {WORKOUT_DAYS.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setSelected(d.key)}
            aria-pressed={selected === d.key}
            className={`zv-tap shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
              selected === d.key ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {d.tag}
          </button>
        ))}
      </div>

      <section className="zv-panel zv-animate-rise mt-2 p-5">
        <h2 className="font-display text-xl font-bold">{day.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{day.note}</p>
        <p className="mt-3 font-mono text-xs text-faint">
          {plan.length} exercises · {plan.reduce((n, p) => n + p.sets, 0)} sets
        </p>
        <Button className="mt-4 w-full" onClick={begin}>
          <Play className="size-4" aria-hidden="true" /> {active ? "Resume session" : "Start this session"}
        </Button>
      </section>

      <ul className="mt-3 space-y-2">
        {plan.map((p, i) => (
          <li key={p.exercise.id}>
            <Link
              to="/exercises/$exerciseId"
              params={{ exerciseId: p.exercise.id }}
              className="zv-panel flex items-center gap-3 p-3.5 transition-colors hover:border-primary/50"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted font-mono text-xs font-bold text-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{p.exercise.name}</span>
                <span className="block font-mono text-xs text-muted-foreground">
                  {p.sets} × {p.duration ? `${p.duration}s` : (p.reps ?? "—")} · rest {p.restSec}s · {STAGE_LABELS[p.stage]}
                </span>
                {p.substituteFor ? (
                  <span className="mt-0.5 block text-xs text-primary">Progression unlocked — stepped up from your easier version</span>
                ) : null}
              </span>
              <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>

      <section className="zv-panel mt-6 p-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-steel" aria-hidden="true" />
          <span className="zv-eyebrow">Weekly schedule</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Change any day's focus. Your original Zorvia split is kept as the starting point.
        </p>
        <ul className="mt-3 space-y-2">
          {WEEKDAYS.map(([idx, , long]) => (
            <li key={idx} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm font-medium">{long}</span>
              <Select value={categoryForDay(state, idx)} onValueChange={(v) => setScheduleDay(idx, v as ExerciseCategory)}>
                <SelectTrigger className="flex-1" aria-label={`Focus for ${long}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_DAYS.map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {d.tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-4">
        <Button asChild variant="outline" className="w-full">
          <Link to="/routines">Custom routines</Link>
        </Button>
      </div>
    </AppShell>
  );
}
