import { createFileRoute } from "@tanstack/react-router";
import { Droplets } from "lucide-react";

import { AppShell } from "@/components/zorvia/AppShell";
import { Button } from "@/components/ui/button";
import { FOOD_GROUPS, GENERAL_RULES, MEAL_BLOCKS, estimateEnergy } from "@/data/nutrition";
import { todayKey } from "@/lib/zorvia-store";
import { useZorvia } from "@/lib/zorvia-provider";

export const Route = createFileRoute("/nutrition")({
  head: () => ({
    meta: [
      { title: "Nutrition & Hydration — Zorvia" },
      { name: "description", content: "Balanced, affordable Bangladeshi meal ideas, protein guidance and hydration tracking — no crash dieting, ever." },
      { property: "og:title", content: "Nutrition & Hydration — Zorvia" },
      { property: "og:description", content: "Familiar, affordable balanced meals plus hydration tracking built around your profile." },
    ],
  }),
  component: NutritionPage,
});

function NutritionPage() {
  const { state, addWater } = useZorvia();
  const today = todayKey();
  const water = state.hydration.find((h) => h.date === today)?.ml ?? 0;
  const goal = state.settings.hydrationGoalMl;
  const pct = Math.min(100, (water / goal) * 100);

  const energy = estimateEnergy({
    age: state.profile.age,
    heightCm: state.profile.heightCm,
    weightKg: state.profile.weightKg,
    activityLevel: state.profile.activityLevel,
    goal: state.profile.goal,
  });

  return (
    <AppShell title="Nutrition" subtitle="Balanced, familiar food — no crash dieting">
      <section className="zv-panel zv-animate-rise p-5">
        <div className="flex items-center gap-2 text-steel">
          <Droplets className="size-4" aria-hidden="true" />
          <span className="zv-eyebrow">Hydration today</span>
        </div>
        <p className="mt-2 font-display text-xl font-bold">
          {(water / 1000).toFixed(2)} L <span className="text-sm font-medium text-muted-foreground">of {(goal / 1000).toFixed(1)} L</span>
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-steel transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[200, 250, 500].map((ml) => (
            <Button key={ml} size="sm" variant="outline" onClick={() => addWater(ml)}>
              +{ml} ml
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => addWater(-250)}>
            Undo 250 ml
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Thirst and pale-yellow urine are better guides than a number. There&apos;s no benefit to forcing extra water past your goal.
        </p>
      </section>

      <section className="zv-panel mt-3 p-4">
        <span className="zv-eyebrow">Your daily guide</span>
        {energy ? (
          <>
            <p className="mt-2 text-sm">
              Roughly <strong className="font-display">{energy.target}</strong> kcal (maintenance ≈ {energy.maintenance}),{" "}
              <strong className="font-display">{energy.proteinGrams}g</strong> protein and about {(energy.waterMl / 1000).toFixed(1)} L water.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{energy.note}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Add your age, height and weight in your profile for a personal estimate.</p>
        )}
      </section>

      {MEAL_BLOCKS.map((block) => (
        <section key={block.id} className="zv-panel mt-3 p-4">
          <span className="zv-eyebrow">{block.title}</span>
          <p className="mt-1 text-xs text-muted-foreground">{block.time}</p>
          <ul className="mt-2 space-y-2">
            {block.options.map((o) => (
              <li key={o.label} className="rounded-xl border border-border p-3">
                <p className="text-sm font-semibold">
                  {o.label}
                  {o.proteinFocus ? <span className="ml-2 font-mono text-[0.625rem] text-primary">PROTEIN</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">{o.items.join(" · ")}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {FOOD_GROUPS.map((g) => (
        <section key={g.title} className="zv-panel mt-3 p-4">
          <span className="zv-eyebrow">{g.title}</span>
          <p className="mt-2 text-sm text-muted-foreground">{g.items.join(" · ")}</p>
          <p className="mt-1 text-xs text-faint">{g.note}</p>
        </section>
      ))}

      <section className="zv-panel mt-3 p-4">
        <span className="zv-eyebrow">Principles</span>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {GENERAL_RULES.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </section>

      <p className="mt-4 text-xs text-faint">
        Zorvia gives general guidance only. For medical conditions, medication, or any weight-specific plan — especially under 18 — speak with a parent or
        guardian and a qualified doctor or dietitian.
      </p>
    </AppShell>
  );
}
