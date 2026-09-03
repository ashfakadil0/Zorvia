import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EQUIPMENT_LIST, type Equipment } from "@/data/exercises";
import { WEEKDAYS } from "@/data/workouts";
import { useZorvia } from "@/lib/zorvia-provider";
import { GOAL_LABELS, LEVEL_LABELS, type ActivityLevel, type FitnessLevel, type Goal } from "@/lib/zorvia-types";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your Zorvia profile" },
      { name: "description", content: "Tell Zorvia about your experience, goals, equipment and training days so workouts and nutrition fit you." },
      { property: "og:title", content: "Set up your Zorvia profile" },
      { property: "og:description", content: "Personalise your training plan in under a minute." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Onboarding,
});

const STEPS = ["You", "Body", "Goal", "Equipment", "Days"] as const;

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`zv-tap rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
        selected ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const { state, updateProfile, update } = useZorvia();
  const p = state.profile;
  const [step, setStep] = useState(0);

  const isMinor = (p.age ?? 0) > 0 && (p.age ?? 0) < 18;

  const toggleEquipment = (item: Equipment) =>
    updateProfile({
      equipment: p.equipment.includes(item) ? p.equipment.filter((e) => e !== item) : [...p.equipment, item],
    });

  const toggleDay = (day: number) =>
    updateProfile({
      workoutDays: p.workoutDays.includes(day) ? p.workoutDays.filter((d) => d !== day) : [...p.workoutDays, day].sort(),
    });

  const finish = () => {
    update((s) => ({
      ...s,
      profile: {
        ...s.profile,
        onboarded: true,
        name: s.profile.name.trim() || "Athlete",
        equipment: s.profile.equipment.length ? s.profile.equipment : ["Bodyweight"],
        workoutDays: s.profile.workoutDays.length ? s.profile.workoutDays : [1, 2, 4, 5],
      },
    }));
    void navigate({ to: "/", replace: true });
  };

  const canNext =
    step === 0 ? p.name.trim().length > 0 : step === 1 ? true : step === 2 ? true : step === 3 ? true : true;

  return (
    <div className="min-h-dvh bg-background px-5 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <p className="zv-eyebrow">Step {step + 1} of {STEPS.length}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight">{STEPS[step]}</h1>
          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        <div className="zv-panel zv-animate-rise space-y-4 p-5">
          {step === 0 ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="pname">What should we call you?</Label>
                <Input id="pname" value={p.name} maxLength={40} onChange={(e) => updateProfile({ name: e.target.value })} placeholder="Your name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="page">Age</Label>
                <Input
                  id="page"
                  type="number"
                  min={10}
                  max={100}
                  value={p.age ?? ""}
                  onChange={(e) => updateProfile({ age: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="e.g. 17"
                />
                {isMinor ? (
                  <p className="text-xs text-gold">
                    You're under 18 — Zorvia will focus on growth, technique, strength and healthy habits, never calorie restriction.
                  </p>
                ) : null}
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ph">Height (cm)</Label>
                  <Input
                    id="ph"
                    type="number"
                    min={100}
                    max={230}
                    value={p.heightCm ?? ""}
                    onChange={(e) => updateProfile({ heightCm: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw">Weight (kg)</Label>
                  <Input
                    id="pw"
                    type="number"
                    min={25}
                    max={250}
                    value={p.weightKg ?? ""}
                    onChange={(e) => updateProfile({ weightKg: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Daily activity outside training</Label>
                <div className="flex flex-wrap gap-2">
                  {(["low", "moderate", "high"] as ActivityLevel[]).map((a) => (
                    <Chip key={a} selected={p.activityLevel === a} onClick={() => updateProfile({ activityLevel: a })}>
                      {a === "low" ? "Mostly sitting" : a === "moderate" ? "Moderately active" : "Very active"}
                    </Chip>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Optional — used only to give sensible nutrition ranges. You can skip it.</p>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="space-y-2">
                <Label>Experience level</Label>
                <div className="flex flex-wrap gap-2">
                  {(["beginner", "intermediate", "advanced"] as FitnessLevel[]).map((l) => (
                    <Chip key={l} selected={p.level === l} onClick={() => updateProfile({ level: l })}>
                      {LEVEL_LABELS[l]}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Main goal</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                    <Chip key={g} selected={p.goal === g} onClick={() => updateProfile({ goal: g })}>
                      {GOAL_LABELS[g]}
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className="space-y-2">
                <Label>What do you have access to?</Label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_LIST.map((eq) => (
                    <Chip key={eq} selected={p.equipment.includes(eq)} onClick={() => toggleEquipment(eq)}>
                      {eq.replace(/-/g, " ")}
                    </Chip>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Bodyweight only is completely fine — most of Zorvia works with no equipment.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="allergies">Dietary notes or allergies (optional)</Label>
                <Textarea
                  id="allergies"
                  value={p.allergies}
                  maxLength={300}
                  onChange={(e) => updateProfile({ allergies: e.target.value })}
                  placeholder="e.g. vegetarian, lactose intolerant, no seafood"
                />
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <div className="space-y-2">
              <Label>Which days do you want to train?</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(([idx, short]) => (
                  <Chip key={idx} selected={p.workoutDays.includes(idx)} onClick={() => toggleDay(idx)}>
                    {short}
                  </Chip>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Rest days are part of the plan, not a failure. Zorvia will schedule recovery around your training days.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="size-4" aria-hidden="true" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Continue <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={finish}>
              <Check className="size-4" aria-hidden="true" /> Start training
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
