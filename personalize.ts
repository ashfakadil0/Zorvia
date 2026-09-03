import { EXERCISE_MAP, type Equipment, type Exercise, type ExerciseCategory } from "@/data/exercises";
import { DAY_MAP, WORKOUT_DAYS } from "@/data/workouts";
import { type UserProfile, type ZorviaState } from "./zorvia-types";
import { todayKey } from "./zorvia-store";
import { readinessFor, STAGE_RANK, stageOf, stageStatus, type Stage } from "./progression";

const TARGET_COUNT: Record<Stage, number> = { beginner: 4, foundation: 5, intermediate: 7, advanced: 9 };

/** Equipment that a home-first app never requires. Kept only for legacy profiles. */
const GYM_ONLY: Equipment[] = ["Barbell", "Machine", "Bench", "Dumbbell"];

function hasEquipment(ex: Exercise, owned: string[]): boolean {
  // Home-first: an exercise is available when at least one of its options is
  // bodyweight-ish or something the user actually owns.
  return ex.equipment.some(
    (e) => e === "Bodyweight" || e === "Wall" || (owned.includes(e) && !GYM_ONLY.includes(e)),
  );
}

/**
 * The hardest stage we will program for this user. Driven by experience, logged
 * performance and age safety — never by height or weight.
 */
function allowedStage(state: ZorviaState, profile: UserProfile): Stage {
  const { stage } = stageStatus(state);
  if ((profile.age ?? 99) < 16 && STAGE_RANK[stage] > STAGE_RANK.intermediate) return "intermediate";
  return stage;
}

function goalBoost(ex: Exercise, profile: UserProfile): number {
  switch (profile.goal) {
    case "strength":
      return ex.difficulty === "Advanced" ? 2 : ex.difficulty === "Intermediate" ? 1 : 0;
    case "calisthenics":
      return ex.category === "skill" ? 3 : ex.equipment.includes("Bodyweight") ? 1 : 0;
    case "mobility":
      return ex.primary === "Mobility" ? 3 : 0;
    case "endurance":
      return ex.duration || ex.primary === "Full body" ? 2 : 0;
    case "muscle":
      return ex.difficulty === "Beginner" ? 0 : 1;
    case "fat-loss":
      return ex.primary === "Full body" || ex.primary === "Legs" ? 2 : 0;
    default:
      return 0;
  }
}

export interface PlannedExercise {
  exercise: Exercise;
  sets: number;
  reps?: string;
  duration?: number;
  restSec: number;
  /** Set when this movement replaced an easier one because readiness passed. */
  substituteFor?: string;
  stage: Stage;
}

/** Build today's (or any day's) personalized session plan. */
export function buildWorkoutPlan(state: ZorviaState, category: ExerciseCategory): PlannedExercise[] {
  const day = DAY_MAP[category];
  if (!day) return [];
  const { profile, settings } = state;
  const owned = profile.equipment.length ? profile.equipment : ["Bodyweight"];
  const stage = allowedStage(state, profile);
  const ceiling = STAGE_RANK[stage];

  const scored = day.pool
    .map((id) => EXERCISE_MAP[id])
    .filter((ex): ex is Exercise => Boolean(ex))
    .filter((ex) => hasEquipment(ex, owned))
    .filter((ex) => STAGE_RANK[stageOf(ex)] <= ceiling)
    .map((ex) => {
      let score = 0;
      if (day.anchors.includes(ex.id)) score += 6;
      score += goalBoost(ex, profile);
      // Favour movements sitting right at the user's current stage.
      score -= Math.abs(STAGE_RANK[stageOf(ex)] - ceiling);
      if (state.favorites.includes(ex.id)) score += 1;
      return { ex, score };
    })
    .sort((a, b) => b.score - a.score);

  const limit = category === "rest" ? day.pool.length : (TARGET_COUNT[stage] ?? 5);
  const chosen = scored.slice(0, limit).map((s) => s.ex);

  // Keep the original pool order so sessions still flow compound → isolation.
  chosen.sort((a, b) => day.pool.indexOf(a.id) - day.pool.indexOf(b.id));

  const picked = new Set(chosen.map((c) => c.id));
  const plan: PlannedExercise[] = [];

  for (const base of chosen) {
    let ex = base;
    let substituteFor: string | undefined;

    // Readiness-based progression: step up only when logged performance supports it.
    if (category !== "rest") {
      const readiness = readinessFor(state, base);
      const next = readiness.next;
      if (
        readiness.ready &&
        next &&
        !picked.has(next.id) &&
        hasEquipment(next, owned) &&
        STAGE_RANK[stageOf(next)] <= ceiling + 1
      ) {
        ex = next;
        substituteFor = base.id;
        picked.add(next.id);
      }
    }

    const record = state.records[ex.id];
    let sets = ex.sets;
    if (stage === "beginner" && sets > 3) sets = 3;
    if (stage === "advanced" && category !== "rest") sets = Math.min(5, sets + 1);

    // Nudge reps up slightly once a record exists (progressive overload, capped).
    let reps = ex.reps;
    if (reps && record?.bestReps) reps = `${record.bestReps + 1}`;

    plan.push({
      exercise: ex,
      sets,
      ...(reps ? { reps } : {}),
      ...(ex.duration ? { duration: ex.duration } : {}),
      restSec:
        category === "rest"
          ? Math.max(15, ex.rest)
          : Math.max(20, Math.min(ex.rest, settings.restDefaultSec + 30)),
      ...(substituteFor ? { substituteFor } : {}),
      stage: stageOf(ex),
    });
  }

  return plan;
}

/** Which day category is scheduled for a given weekday. */
export function categoryForDay(state: ZorviaState, weekday: number): ExerciseCategory {
  return state.schedule[weekday] ?? "rest";
}

export function todaysCategory(state: ZorviaState): ExerciseCategory {
  return categoryForDay(state, new Date().getDay());
}

/** Recovery signal: consecutive training days completed just before today. */
export function recentTrainingLoad(state: ZorviaState): number {
  const days = new Set(state.sessions.filter((s) => s.finishedAt).map((s) => s.date));
  let count = 0;
  for (let i = 1; i <= 6; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (days.has(todayKey(d))) count++;
    else break;
  }
  return count;
}

export function alternativesFor(exercise: Exercise, owned: string[]): Exercise[] {
  const ids = new Set([...exercise.alternativeIds]);
  if (exercise.regressionId) ids.add(exercise.regressionId);
  return [...ids]
    .map((id) => EXERCISE_MAP[id])
    .filter((ex): ex is Exercise => Boolean(ex))
    .filter((ex) => hasEquipment(ex, owned.length ? owned : ["Bodyweight"]));
}

export function exerciseAvailable(exercise: Exercise, owned: string[]): boolean {
  return hasEquipment(exercise, owned.length ? owned : ["Bodyweight"]);
}

export const ALL_CATEGORIES = WORKOUT_DAYS.map((d) => d.key);
