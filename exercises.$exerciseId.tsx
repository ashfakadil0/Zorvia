import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Heart } from "lucide-react";

import { AppShell } from "@/components/zorvia/AppShell";
import { EXERCISES, areaFor, getExercise } from "@/data/exercises";
import { alternativesFor } from "@/lib/personalize";
import { STAGE_LABELS, readinessFor, stageOf, timesPerformed } from "@/lib/progression";
import { useZorvia } from "@/lib/zorvia-provider";

export const Route = createFileRoute("/exercises/$exerciseId")({
  head: ({ params }) => {
    const ex = getExercise(params.exerciseId);
    const title = ex ? `${ex.name} — Form & Technique | Zorvia` : "Exercise — Zorvia";
    const description = ex?.summary ?? "Exercise details, form cues and progressions in Zorvia.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ExerciseDetail,
});

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="zv-panel mt-3 p-4">
      <span className="zv-eyebrow">{title}</span>
      <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function ExerciseDetail() {
  const { exerciseId } = Route.useParams();
  const { state, toggleFavorite, markRecentExercise } = useZorvia();
  const exercise = getExercise(exerciseId);

  useEffect(() => {
    if (exercise) markRecentExercise(exercise.id);
  }, [exercise, markRecentExercise]);

  if (!exercise) {
    return (
      <AppShell title="Exercise not found">
        <p className="text-sm text-muted-foreground">That exercise isn&apos;t in the library.</p>
        <Link to="/exercises" className="mt-3 inline-block text-sm text-primary hover:underline">Back to library</Link>
      </AppShell>
    );
  }

  const record = state.records[exercise.id];
  const alts = alternativesFor(exercise, state.profile.equipment);
  const progression = exercise.progressionId ? getExercise(exercise.progressionId) : undefined;
  const regression = exercise.regressionId ? getExercise(exercise.regressionId) : undefined;
  const similar = EXERCISES.filter((e) => e.id !== exercise.id && e.primary === exercise.primary).slice(0, 5);
  const isFav = state.favorites.includes(exercise.id);
  const stage = stageOf(exercise);
  const readiness = readinessFor(state, exercise);
  const logged = timesPerformed(state, exercise.id);

  return (
    <AppShell
      title={exercise.name}
      subtitle={`${areaFor(exercise)} · ${exercise.primary} · ${STAGE_LABELS[stageOf(exercise)]}`}
      action={
        <button type="button" onClick={() => toggleFavorite(exercise.id)} aria-label={isFav ? "Remove from favourites" : "Add to favourites"} className="zv-tap grid place-items-center rounded-xl">
          <Heart className={`size-5 ${isFav ? "fill-primary text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
        </button>
      }
    >
      <section className="zv-panel zv-animate-rise p-5">
        <p className="text-sm text-muted-foreground">{exercise.summary}</p>
        <p className="mt-3 font-mono text-xs text-faint">
          {exercise.sets} sets × {exercise.duration ? `${exercise.duration}s` : (exercise.reps ?? "—")} · rest {exercise.rest}s
        </p>
        <p className="mt-1 font-mono text-xs text-faint">Equipment: {exercise.equipment.join(", ")}</p>
        <p className="mt-1 font-mono text-xs text-faint">Stage: {STAGE_LABELS[stage]} · Level: {exercise.difficulty}</p>
        <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted/40">
          <div className="grid h-full place-items-center px-4 text-center">
            <p className="text-xs text-muted-foreground">
              Form demonstration illustration coming to this movement. Follow the setup and steps below for now.
            </p>
          </div>
        </div>
        {exercise.secondary.length ? <p className="mt-1 font-mono text-xs text-faint">Also works: {exercise.secondary.join(", ")}</p> : null}
      </section>

      <Block title="Form">
        <p><strong className="text-foreground">Setup.</strong> {exercise.setup}</p>
        <ol className="list-decimal space-y-1 pl-5">
          {exercise.steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
        <p><strong className="text-foreground">Range of motion.</strong> {exercise.rom}</p>
        <p><strong className="text-foreground">What it should feel like.</strong> {exercise.feel}</p>
      </Block>

      <Block title="Breathing">{exercise.breathing}</Block>

      <Block title="Common mistakes">
        <ul className="list-disc space-y-1 pl-5">{exercise.mistakes.map((m) => <li key={m}>{m}</li>)}</ul>
      </Block>

      <Block title="Safety">
        <ul className="list-disc space-y-1 pl-5">{exercise.safety.map((m) => <li key={m}>{m}</li>)}</ul>
      </Block>

      <Block title="Beginner modification">{exercise.beginner}</Block>

      <Block title="Progression readiness">
        <p>{readiness.reason}</p>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(readiness.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round(readiness.progress * 100)}%` }} />
        </div>
        <p className="font-mono text-xs text-faint">
          Logged in {logged} session{logged === 1 ? "" : "s"} · readiness {Math.round(readiness.progress * 100)}%
        </p>
        <p className="text-xs text-faint">
          Progression is based on your performance and form — not on a fixed number of days. Rest days count toward being ready.
        </p>
      </Block>

      {regression || progression ? (
        <Block title="Easier & harder">
          {regression ? (
            <p>
              Easier:{" "}
              <Link to="/exercises/$exerciseId" params={{ exerciseId: regression.id }} className="text-primary hover:underline">{regression.name}</Link>
            </p>
          ) : null}
          {progression ? (
            <p>
              Harder:{" "}
              <Link to="/exercises/$exerciseId" params={{ exerciseId: progression.id }} className="text-primary hover:underline">{progression.name}</Link>
            </p>
          ) : null}
        </Block>
      ) : null}

      {alts.length ? (
        <Block title="Equipment alternatives">
          <ul className="space-y-1">
            {alts.map((a) => (
              <li key={a.id}>
                <Link to="/exercises/$exerciseId" params={{ exerciseId: a.id }} className="text-primary hover:underline">{a.name}</Link>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {similar.length ? (
        <Block title={`Other ${exercise.primary.toLowerCase()} work`}>
          <ul className="space-y-1">
            {similar.map((a) => (
              <li key={a.id}>
                <Link to="/exercises/$exerciseId" params={{ exerciseId: a.id }} className="text-primary hover:underline">{a.name}</Link>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <Block title="Your performance">
        {record ? (
          <p>
            Best: {record.bestReps ? `${record.bestReps} reps` : null} {record.bestWeightKg ? `· ${record.bestWeightKg} kg` : null}{" "}
            {record.bestSeconds ? `· ${record.bestSeconds}s` : null} (set {new Date(record.date).toLocaleDateString()})
          </p>
        ) : (
          <p>No logged sets yet — complete this in a session and your best will show here.</p>
        )}
      </Block>
    </AppShell>
  );
}
