import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { AppShell } from "@/components/zorvia/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXERCISES, type ExerciseCategory } from "@/data/exercises";
import { WORKOUT_DAYS } from "@/data/workouts";
import type { CustomRoutine } from "@/lib/zorvia-types";
import { useZorvia } from "@/lib/zorvia-provider";

export const Route = createFileRoute("/routines")({
  head: () => ({
    meta: [
      { title: "Custom Routines — Zorvia" },
      { name: "description", content: "Build your own Zorvia routines from the full exercise library while your original Push, Pull, Legs and Core days stay untouched." },
      { property: "og:title", content: "Custom Routines — Zorvia" },
      { property: "og:description", content: "Create personal routines without replacing the built-in training split." },
    ],
  }),
  component: RoutinesPage,
});

function RoutinesPage() {
  const navigate = useNavigate();
  const { state, update, startSession } = useZorvia();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("push");
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");

  const save = () => {
    if (!name.trim() || !picked.length) {
      toast.error("Add a name and at least one exercise");
      return;
    }
    const routine: CustomRoutine = {
      id: `r_${Date.now()}`,
      name: name.trim(),
      category,
      exerciseIds: picked,
      days: [],
      createdAt: new Date().toISOString(),
    };
    update((s) => ({ ...s, routines: [routine, ...s.routines] }));
    setName("");
    setPicked([]);
    toast.success("Routine saved");
  };

  const results = EXERCISES.filter((e) => (q ? e.name.toLowerCase().includes(q.toLowerCase()) : e.category === category)).slice(0, 40);

  return (
    <AppShell title="Custom routines" subtitle="Your built-in Push/Pull/Legs days stay exactly as they are">
      <section className="zv-panel space-y-4 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="rname">Routine name</Label>
          <Input id="rname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hotel room session" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rcat">Focus</Label>
          <select id="rcat" className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value as ExerciseCategory)}>
            {WORKOUT_DAYS.map((d) => <option key={d.key} value={d.key}>{d.title}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rq">Find exercises</Label>
          <Input id="rq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the library" />
        </div>
        <ul className="max-h-72 space-y-1.5 overflow-y-auto">
          {results.map((ex) => {
            const on = picked.includes(ex.id);
            return (
              <li key={ex.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked((p) => (on ? p.filter((id) => id !== ex.id) : [...p, ex.id]))}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${on ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                >
                  {ex.name} <span className="font-mono text-xs text-muted-foreground">· {ex.difficulty}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <Button className="w-full" onClick={save}>
          <Plus className="size-4" aria-hidden="true" /> Save routine ({picked.length})
        </Button>
      </section>

      <section className="mt-4">
        <span className="zv-eyebrow">Your routines</span>
        {state.routines.length ? (
          <ul className="mt-2 space-y-2">
            {state.routines.map((r) => (
              <li key={r.id} className="zv-panel p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{r.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{r.exerciseIds.length} exercises · {r.category}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete ${r.name}`}
                    onClick={() => update((s) => ({ ...s, routines: s.routines.filter((x) => x.id !== r.id) }))}
                    className="zv-tap grid place-items-center rounded-lg text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <Button
                  className="mt-3 w-full"
                  variant="outline"
                  onClick={() => {
                    startSession(r.category, r.id);
                    void navigate({ to: "/session" });
                  }}
                >
                  Start this routine
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No custom routines yet.</p>
        )}
      </section>
    </AppShell>
  );
}
