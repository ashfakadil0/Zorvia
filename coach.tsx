import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { AppShell } from "@/components/zorvia/AppShell";
import { GOAL_LABELS } from "@/lib/zorvia-types";
import { currentStreak } from "@/lib/achievements";
import { buildWorkoutPlan, recentTrainingLoad, todaysCategory } from "@/lib/personalize";
import { estimateEnergy } from "@/data/nutrition";
import { DAY_MAP } from "@/data/workouts";
import { todayKey } from "@/lib/zorvia-store";
import { useZorvia } from "@/lib/zorvia-provider";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "Zorvia Coach — Guidance" },
      { name: "description", content: "Practical suggestions built from your profile, training history, recovery and equipment — training, progression, recovery and habits." },
      { property: "og:title", content: "Zorvia Coach — Guidance" },
      { property: "og:description", content: "Suggestions from your own history: what to train, when to back off, and how to progress." },
    ],
  }),
  component: CoachPage,
});

function CoachPage() {
  const { state } = useZorvia();
  const category = todaysCategory(state);
  const plan = buildWorkoutPlan(state, category);
  const load = recentTrainingLoad(state);
  const streak = currentStreak(state);
  const water = state.hydration.find((h) => h.date === todayKey())?.ml ?? 0;
  const energy = estimateEnergy({
    age: state.profile.age,
    heightCm: state.profile.heightCm,
    weightKg: state.profile.weightKg,
    activityLevel: state.profile.activityLevel,
    goal: state.profile.goal,
  });
  const weekCount = state.sessions.filter((s) => s.finishedAt && Date.now() - new Date(s.date).getTime() < 7 * 86400000).length;

  const tips: { title: string; body: string }[] = [];

  tips.push({
    title: "Today",
    body:
      category === "rest"
        ? "Recovery day. Ten minutes of mobility, a walk, decent food and sleep is the whole job today."
        : `${DAY_MAP[category].title}: ${plan.length} exercises picked for your level and equipment. Start with the compound movements while you're fresh.`,
  });

  if (load >= 3) {
    tips.push({ title: "Recovery", body: `You've trained ${load} days in a row. Either take a rest day or keep today light — one easier session protects weeks of progress.` });
  } else if (weekCount === 0) {
    tips.push({ title: "Restart small", body: "No sessions logged this week. Do a short version — even 15 minutes counts and rebuilds momentum faster than waiting for a perfect day." });
  }

  if (state.profile.equipment.length <= 1) {
    tips.push({ title: "Equipment", body: "You're bodyweight-only right now. Progress by slowing the lowering phase, adding reps, or moving to harder variations rather than chasing gear." });
  }

  const prCount = Object.keys(state.records).length;
  tips.push({
    title: "Progression",
    body: prCount
      ? "You have logged records. Add one rep or a few seconds to your best sets before adding load — small, boring progression is what works."
      : "Log your sets during sessions so Zorvia can suggest reps based on your real performance.",
  });

  if (energy) {
    tips.push({
      title: "Fuel",
      body: energy.minor
        ? `Around ${energy.target} kcal and ${energy.proteinGrams}g protein to support growth and recovery. For anything weight-specific, involve a parent or guardian and a qualified professional.`
        : `Around ${energy.target} kcal and ${energy.proteinGrams}g protein today. Protein at each meal, plenty of vegetables, and carbohydrates around training.`,
    });
  }

  if (water < state.settings.hydrationGoalMl * 0.5) {
    tips.push({ title: "Hydration", body: "You're under halfway to your water goal. A glass with each meal usually closes the gap without thinking about it." });
  }

  tips.push({
    title: "Habit",
    body: streak >= 3
      ? `${streak} days consistent. Keep the schedule realistic — ${state.profile.workoutDays.length || 4} sessions a week you actually do beats six you plan.`
      : "Pick a fixed time and stick to the same slot for two weeks. Consistency comes from the calendar, not motivation.",
  });

  return (
    <AppShell title="Zorvia Coach" subtitle={`Goal: ${GOAL_LABELS[state.profile.goal]}`}>
      <section className="zv-panel zv-animate-rise p-5">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
          <span className="zv-eyebrow">Built from your own data</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Suggestions based on your profile, history, recovery and equipment. Zorvia does not diagnose conditions or replace medical advice.
        </p>
      </section>

      <ul className="mt-3 space-y-2">
        {tips.map((t) => (
          <li key={t.title} className="zv-panel p-4">
            <span className="zv-eyebrow">{t.title}</span>
            <p className="mt-1.5 text-sm text-muted-foreground">{t.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link to="/workout" className="text-primary hover:underline">Open today&apos;s plan</Link>
        <Link to="/form-check" className="text-primary hover:underline">AI Form Check</Link>
      </div>
    </AppShell>
  );
}
