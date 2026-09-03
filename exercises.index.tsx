import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Heart, Search } from "lucide-react";

import { AppShell } from "@/components/zorvia/AppShell";
import { Input } from "@/components/ui/input";
import {
  DIFFICULTIES,
  EQUIPMENT_LIST,
  EXERCISES,
  MUSCLE_AREAS,
  MUSCLE_GROUPS,
  inArea,
  type Difficulty,
  type Equipment,
  type MuscleArea,
  type MuscleGroup,
} from "@/data/exercises";
import { STAGE_LABELS, stageOf } from "@/lib/progression";
import { useZorvia } from "@/lib/zorvia-provider";

export const Route = createFileRoute("/exercises/")({
  head: () => ({
    meta: [
      { title: "Exercise Library — Zorvia" },
      { name: "description", content: "Search and filter every Zorvia exercise by muscle group, equipment and difficulty, with full form guidance on each." },
      { property: "og:title", content: "Exercise Library — Zorvia" },
      { property: "og:description", content: "Filter by muscle, equipment and difficulty. Form, breathing, mistakes and progressions for every movement." },
    ],
  }),
  component: ExercisesPage,
});

function ExercisesPage() {
  const { state, toggleFavorite } = useZorvia();
  const [q, setQ] = useState("");
  const [area, setArea] = useState<MuscleArea | "all">("all");
  const [muscle, setMuscle] = useState<MuscleGroup | "all">("all");
  const [equip, setEquip] = useState<Equipment | "all">("all");
  const [diff, setDiff] = useState<Difficulty | "all">("all");
  const [favOnly, setFavOnly] = useState(false);

  const results = useMemo(
    () =>
      EXERCISES.filter((ex) => {
        if (q && !ex.name.toLowerCase().includes(q.toLowerCase())) return false;
        if (area !== "all" && !inArea(ex, area)) return false;
        if (muscle !== "all" && ex.primary !== muscle && !ex.secondary.includes(muscle)) return false;
        if (equip !== "all" && !ex.equipment.includes(equip)) return false;
        if (diff !== "all" && ex.difficulty !== diff) return false;
        if (favOnly && !state.favorites.includes(ex.id)) return false;
        return true;
      }).sort((a, b) => a.name.localeCompare(b.name)),
    [q, area, muscle, equip, diff, favOnly, state.favorites],
  );

  const recent = state.recentExercises.slice(0, 6);

  return (
    <AppShell title="Exercises" subtitle={`${EXERCISES.length} movements with full form guidance`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
        <Input className="pl-9" placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exercises" />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {(["all", ...MUSCLE_AREAS] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setArea(a as MuscleArea | "all")}
            aria-pressed={area === a}
            className={`zv-tap shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              area === a ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {a === "all" ? "All areas" : a}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <select className="rounded-lg border border-border bg-card px-2 py-1.5" value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleGroup | "all")} aria-label="Filter by muscle">
          <option value="all">All muscles</option>
          {MUSCLE_GROUPS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="rounded-lg border border-border bg-card px-2 py-1.5" value={equip} onChange={(e) => setEquip(e.target.value as Equipment | "all")} aria-label="Filter by equipment">
          <option value="all">All equipment</option>
          {EQUIPMENT_LIST.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="rounded-lg border border-border bg-card px-2 py-1.5" value={diff} onChange={(e) => setDiff(e.target.value as Difficulty | "all")} aria-label="Filter by difficulty">
          <option value="all">All levels</option>
          {DIFFICULTIES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setFavOnly((v) => !v)}
          aria-pressed={favOnly}
          className={`rounded-lg border px-2 py-1.5 font-semibold ${favOnly ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
        >
          Favourites
        </button>
      </div>

      {recent.length && !q ? (
        <section className="mt-4">
          <span className="zv-eyebrow">Recently viewed</span>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {recent.map((id) => {
              const ex = EXERCISES.find((e) => e.id === id);
              if (!ex) return null;
              return (
                <Link key={id} to="/exercises/$exerciseId" params={{ exerciseId: id }} className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs font-semibold">
                  {ex.name}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <ul className="mt-4 space-y-2">
        {results.map((ex) => (
          <li key={ex.id} className="zv-panel flex items-center gap-3 p-3.5">
            <Link to="/exercises/$exerciseId" params={{ exerciseId: ex.id }} className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{ex.name}</span>
              <span className="block font-mono text-xs text-muted-foreground">
                {ex.primary} · {STAGE_LABELS[stageOf(ex)]} · {ex.equipment.join(", ")}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => toggleFavorite(ex.id)}
              aria-label={state.favorites.includes(ex.id) ? `Remove ${ex.name} from favourites` : `Add ${ex.name} to favourites`}
              className="zv-tap grid place-items-center rounded-lg"
            >
              <Heart className={`size-4 ${state.favorites.includes(ex.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {!results.length ? <p className="mt-6 text-center text-sm text-muted-foreground">No exercises match those filters.</p> : null}
    </AppShell>
  );
}
