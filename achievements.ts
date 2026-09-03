import type { ZorviaState } from "./zorvia-types";
import { todayKey } from "./zorvia-store";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  test: (state: ZorviaState) => boolean;
}

const finished = (s: ZorviaState) => s.sessions.filter((x) => x.finishedAt);

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-workout", title: "First Workout", description: "You completed your first Zorvia session.", test: (s) => finished(s).length >= 1 },
  { id: "workouts-7", title: "7 Workouts", description: "Seven sessions in the books.", test: (s) => finished(s).length >= 7 },
  { id: "workouts-10", title: "10 Workouts", description: "Double digits — the habit is forming.", test: (s) => finished(s).length >= 10 },
  { id: "workouts-30", title: "30 Workouts", description: "Thirty sessions of steady work.", test: (s) => finished(s).length >= 30 },
  { id: "streak-3", title: "3-Day Streak", description: "Three active days in a row.", test: (s) => currentStreak(s) >= 3 },
  { id: "streak-7", title: "Consistency Milestone", description: "A full week of showing up.", test: (s) => currentStreak(s) >= 7 },
  { id: "first-pr", title: "First Personal Record", description: "You beat your own best.", test: (s) => Object.keys(s.records).length >= 1 },
  { id: "pr-10", title: "Record Breaker", description: "Personal records on 10 different exercises.", test: (s) => Object.keys(s.records).length >= 10 },
  {
    id: "exercise-mastery",
    title: "Exercise Mastery",
    description: "Performed a single exercise in 10 different sessions.",
    test: (s) => {
      const counts: Record<string, number> = {};
      for (const session of finished(s)) {
        for (const id of new Set(session.entries.map((e) => e.exerciseId))) {
          counts[id] = (counts[id] ?? 0) + 1;
        }
      }
      return Object.values(counts).some((n) => n >= 10);
    },
  },
  {
    id: "monthly-consistency",
    title: "Monthly Consistency",
    description: "Trained on 12 or more days within the last 30 days.",
    test: (s) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const days = new Set(finished(s).filter((x) => new Date(x.date) >= cutoff).map((x) => x.date));
      return days.size >= 12;
    },
  },
  {
    id: "recovery-respect",
    title: "Recovery Respected",
    description: "Completed a recovery session — rest is part of training.",
    test: (s) => finished(s).some((x) => x.category === "rest"),
  },
  {
    id: "hydration-week",
    title: "Hydration Habit",
    description: "Hit your water goal on 5 days.",
    test: (s) => s.hydration.filter((h) => h.ml >= s.settings.hydrationGoalMl).length >= 5,
  },
];

/**
 * Streak counts days where the user either completed a session OR had a
 * scheduled rest day — so resting never breaks the streak.
 */
export function currentStreak(state: ZorviaState): number {
  const done = new Set(state.sessions.filter((s) => s.finishedAt).map((s) => s.date));
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 400; i++) {
    const key = todayKey(d);
    const scheduledRest = (state.schedule[d.getDay()] ?? "rest") === "rest";
    if (done.has(key) || (scheduledRest && i > 0)) {
      if (done.has(key) || scheduledRest) streak++;
    } else if (i === 0) {
      // Today doesn't break a streak yet.
    } else {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function longestStreak(state: ZorviaState): number {
  const done = [...new Set(state.sessions.filter((s) => s.finishedAt).map((s) => s.date))].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of done) {
    const d = new Date(`${key}T00:00:00`);
    if (prev) {
      const gapDays = Math.round((d.getTime() - prev.getTime()) / 86400000);
      let bridged = gapDays === 1;
      if (!bridged && gapDays > 1 && gapDays <= 3) {
        // Allow scheduled rest days to bridge the gap.
        bridged = true;
        for (let i = 1; i < gapDays; i++) {
          const mid = new Date(prev.getTime() + i * 86400000);
          if ((state.schedule[mid.getDay()] ?? "rest") !== "rest") bridged = false;
        }
      }
      run = bridged ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function evaluateAchievements(state: ZorviaState): string[] {
  return ACHIEVEMENTS.filter((a) => !state.achievements[a.id] && a.test(state)).map((a) => a.id);
}

export const MOTIVATION: string[] = [
  "Consistency beats perfection.",
  "Small sessions still count. Show up.",
  "Form first — strength follows.",
  "Rest is when the work pays off.",
  "You don't have to feel ready. Just start set one.",
  "Progress is quiet. Keep going.",
  "Strong today, stronger in a month.",
  "The hardest rep is the first one.",
  "Train the body you'll live in for decades.",
  "Discipline is just kindness to your future self.",
];

export function motivationFor(state: ZorviaState): { text: string; index: number; date: string } {
  const date = todayKey();
  if (state.lastMotivationDate === date) {
    return { text: MOTIVATION[state.motivationIndex % MOTIVATION.length]!, index: state.motivationIndex, date };
  }
  const index = (state.motivationIndex + 1) % MOTIVATION.length;
  return { text: MOTIVATION[index]!, index, date };
}
