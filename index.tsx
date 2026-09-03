import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Droplets, Flame, Moon, Play, Quote, TrendingUp, Trophy } from "lucide-react";

import { AppShell } from "@/components/zorvia/AppShell";
import { ProgressRing } from "@/components/zorvia/ProgressRing";
import { Button } from "@/components/ui/button";
import { DAY_MAP, WEEKDAYS } from "@/data/workouts";
import { estimateEnergy } from "@/data/nutrition";
import { currentStreak, motivationFor } from "@/lib/achievements";
import { buildWorkoutPlan, categoryForDay, todaysCategory } from "@/lib/personalize";
import { useZorvia } from "@/lib/zorvia-provider";
import { todayKey } from "@/lib/zorvia-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zorvia — Your Daily Training Companion" },
      {
        name: "description",
        content: "A premium, offline-friendly fitness companion: personalised push/pull/legs training, form guidance, progress tracking, hydration and balanced nutrition.",
      },
      { property: "og:title", content: "Zorvia — Your Daily Training Companion" },
      {
        property: "og:description",
        content: "Personalised calisthenics and strength training with form coaching, progress tracking and balanced nutrition.",
      },
    ],
  }),
  component: Home,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Home() {
  const navigate = useNavigate();
  const { state, ready, update } = useZorvia();

  useEffect(() => {
    if (ready && !state.profile.onboarded) void navigate({ to: "/onboarding", replace: true });
  }, [ready, state.profile.onboarded, navigate]);

  const category = todaysCategory(state);
  const day = DAY_MAP[category];
  const today = todayKey();

  const plan = useMemo(() => buildWorkoutPlan(state, category), [state, category]);
  const todaySessions = state.sessions.filter((s) => s.date === today && s.finishedAt);
  const streak = currentStreak(state);

  const setsPlanned = plan.reduce((n, p) => n + p.sets, 0);
  const setsDone = todaySessions.reduce(
    (n, s) => n + s.entries.reduce((m, e) => m + e.sets.filter((x) => x.done).length, 0),
    0,
  );
  const completion = setsPlanned ? Math.min(100, (setsDone / setsPlanned) * 100) : todaySessions.length ? 100 : 0;

  const water = state.hydration.find((h) => h.date === today)?.ml ?? 0;
  const waterPct = Math.min(100, (water / state.settings.hydrationGoalMl) * 100);

  const energy = estimateEnergy({
    age: state.profile.age,
    heightCm: state.profile.heightCm,
    weightKg: state.profile.weightKg,
    activityLevel: state.profile.activityLevel,
    goal: state.profile.goal,
  });

  const motivation = useMemo(() => motivationFor(state), [state]);
  useEffect(() => {
    if (!ready) return;
    if (state.lastMotivationDate !== motivation.date) {
      update((s) => ({ ...s, motivationIndex: motivation.index, lastMotivationDate: motivation.date }));
    }
  }, [ready, motivation, state.lastMotivationDate, update]);

  const week = WEEKDAYS.map(([idx, short]) => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() - idx + 7) % 7));
    const key = todayKey(d);
    return {
      idx,
      short,
      done: state.sessions.some((s) => s.date === key && s.finishedAt),
      rest: categoryForDay(state, idx) === "rest",
      isToday: idx === new Date().getDay(),
    };
  });

  const lastSession = state.sessions.find((s) => s.finishedAt);
  const recentPr = Object.values(state.records)
    .filter((r) => r.date === today)
    .slice(0, 1)[0];

  const heavyLoad = state.sessions.filter((s) => {
    const d = new Date(s.date);
    return s.finishedAt && Date.now() - d.getTime() < 3 * 86400000;
  }).length;

  return (
    <AppShell
      title={`${greeting()}, ${state.profile.name || "Athlete"}`}
      subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
    >
      {/* Today's workout */}
      <section className="zv-panel zv-animate-rise p-5">
        <p className="zv-eyebrow">Today · {day.tag}</p>
        <div className="mt-2 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold leading-tight">{day.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{day.note}</p>
            <p className="mt-3 font-mono text-xs text-faint">
              {plan.length} exercises · {setsPlanned} sets · ~{Math.max(10, plan.length * 5)} min
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/workout">
                  <Play className="size-4" aria-hidden="true" />
                  {state.activeSession ? "Resume session" : completion >= 100 ? "Train again" : "Start workout"}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/workout">View plan</Link>
              </Button>
            </div>
          </div>
          <ProgressRing value={completion} sublabel="today" />
        </div>
      </section>

      {/* Stats row */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        <div className="zv-panel p-4">
          <div className="flex items-center gap-2 text-primary">
            <Flame className="size-4" aria-hidden="true" />
            <span className="zv-eyebrow">Streak</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold">{streak}</p>
          <p className="text-xs text-muted-foreground">{streak === 1 ? "active day" : "active days"} — rest days count.</p>
        </div>
        <div className="zv-panel p-4">
          <div className="flex items-center gap-2 text-steel">
            <TrendingUp className="size-4" aria-hidden="true" />
            <span className="zv-eyebrow">Sessions</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold">{state.sessions.filter((s) => s.finishedAt).length}</p>
          <p className="text-xs text-muted-foreground">completed all-time</p>
        </div>
      </section>

      {/* Hydration */}
      <section className="zv-panel mt-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-steel">
            <Droplets className="size-4" aria-hidden="true" />
            <span className="zv-eyebrow">Hydration</span>
          </div>
          <Link to="/nutrition" className="text-xs text-primary hover:underline">
            Manage
          </Link>
        </div>
        <p className="mt-2 font-display text-lg font-bold">
          {(water / 1000).toFixed(2)} L <span className="text-sm font-medium text-muted-foreground">of {(state.settings.hydrationGoalMl / 1000).toFixed(1)} L</span>
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(waterPct)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-steel transition-all" style={{ width: `${waterPct}%` }} />
        </div>
      </section>

      {/* Nutrition snapshot */}
      <section className="zv-panel mt-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="zv-eyebrow">Nutrition today</span>
          <Link to="/nutrition" className="text-xs text-primary hover:underline">
            Meal ideas
          </Link>
        </div>
        {energy ? (
          <p className="mt-2 text-sm">
            Around <strong className="font-display">{energy.target}</strong> kcal and{" "}
            <strong className="font-display">{energy.proteinGrams}g</strong> protein is a balanced target for you today.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Add your height and weight in your profile for balanced daily guidance.</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{energy?.note}</p>
      </section>

      {/* Recovery reminder */}
      {category === "rest" || heavyLoad >= 3 ? (
        <section className="zv-panel mt-3 border-gold/40 p-4">
          <div className="flex items-center gap-2 text-gold">
            <Moon className="size-4" aria-hidden="true" />
            <span className="zv-eyebrow">Recovery</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {category === "rest"
              ? "Today is a recovery day. Light mobility, a walk, good food and 8 hours of sleep are the work today."
              : "You've trained several days in a row. Keep sleep and food consistent, and take a lighter session if you feel run down."}
          </p>
        </section>
      ) : null}

      {/* PR */}
      {recentPr ? (
        <section className="zv-panel mt-3 border-gold/40 p-4">
          <div className="flex items-center gap-2 text-gold">
            <Trophy className="size-4" aria-hidden="true" />
            <span className="zv-eyebrow">New personal record</span>
          </div>
          <p className="mt-2 text-sm">
            You beat your best on{" "}
            <Link to="/exercises/$exerciseId" params={{ exerciseId: recentPr.exerciseId }} className="text-primary hover:underline">
              this exercise
            </Link>{" "}
            today. Well earned.
          </p>
        </section>
      ) : null}

      {/* Weekly snapshot */}
      <section className="zv-panel mt-3 p-4">
        <span className="zv-eyebrow">This week</span>
        <ul className="mt-3 flex justify-between">
          {week.map((d) => (
            <li key={d.idx} className="flex flex-col items-center gap-1.5">
              <span className={`text-[0.625rem] font-semibold uppercase ${d.isToday ? "text-primary" : "text-muted-foreground"}`}>{d.short}</span>
              <span
                aria-label={d.done ? "Completed" : d.rest ? "Rest day" : "Not completed"}
                className={`grid size-7 place-items-center rounded-lg text-xs font-bold ${
                  d.done ? "bg-primary text-primary-foreground" : d.rest ? "bg-muted text-faint" : "border border-border text-faint"
                }`}
              >
                {d.done ? "✓" : d.rest ? "·" : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent workout */}
      {lastSession ? (
        <section className="zv-panel mt-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="zv-eyebrow">Last workout</span>
            <Link to="/progress" className="text-xs text-primary hover:underline">
              History
            </Link>
          </div>
          <p className="mt-2 text-sm font-semibold">{lastSession.title}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(lastSession.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })} ·{" "}
            {Math.round(lastSession.durationSec / 60)} min ·{" "}
            {lastSession.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)} sets
          </p>
        </section>
      ) : null}

      {/* Motivation */}
      <section className="mt-3 flex items-start gap-3 rounded-xl border border-border/60 px-4 py-3">
        <Quote className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden="true" />
        <p className="text-sm italic text-muted-foreground">{motivation.text}</p>
      </section>

      <p className="mt-6 text-center text-xs text-faint">Presented by Ashfak Alom Adil</p>
    </AppShell>
  );
}
