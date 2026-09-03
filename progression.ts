import { EXERCISE_MAP, type Exercise } from "@/data/exercises";
import type { ZorviaState } from "./zorvia-types";

/**
 * Zorvia progression stages. Readiness based, never time based — nothing here
 * promises "advanced in 30 days".
 */
export type Stage = "beginner" | "foundation" | "intermediate" | "advanced";

export const STAGE_ORDER: Stage[] = ["beginner", "foundation", "intermediate", "advanced"];

export const STAGE_LABELS: Record<Stage, string> = {
  beginner: "Beginner",
  foundation: "Foundation",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const STAGE_NOTES: Record<Stage, string> = {
  beginner: "Learning the movements with the easiest safe version. Consistency beats intensity here.",
  foundation: "Full-range basics with good form. This is where most strength is actually built.",
  intermediate: "Harder variations, single-limb work and longer holds once the basics are solid.",
  advanced: "Demanding bodyweight strength and skill work, earned by performance — not by a calendar.",
};

export const STAGE_RANK: Record<Stage, number> = { beginner: 0, foundation: 1, intermediate: 2, advanced: 3 };

/** Easiest entry-level variations, regardless of their difficulty label. */
const BEGINNER_STAGE_IDS = new Set([
  "wall-pushup",
  "pushup-knee",
  "pushup-incline",
  "table-row",
  "scapula-pull",
  "superman-hold",
  "reverse-snow-angel",
  "wall-sit",
  "glute-bridge",
  "calf-raise",
  "dead-bug",
  "plank",
  "side-plank",
  "childs-pose",
  "bridge-pose",
  "forward-fold",
  "cat-cow",
  "savasana",
]);

export function stageOf(exercise: Exercise): Stage {
  if (BEGINNER_STAGE_IDS.has(exercise.id)) return "beginner";
  if (exercise.category === "rest") return "beginner";
  if (exercise.difficulty === "Advanced") return "advanced";
  if (exercise.difficulty === "Intermediate") return "intermediate";
  return "foundation";
}

/** Highest number in a reps string, e.g. "10–15" -> 15, "5 each side" -> 5. */
export function repTarget(reps?: string): number | undefined {
  if (!reps) return undefined;
  const nums = reps.match(/\d+/g);
  if (!nums?.length) return undefined;
  return Math.max(...nums.map(Number));
}

export function timesPerformed(state: ZorviaState, exerciseId: string): number {
  return state.sessions.filter(
    (s) => s.finishedAt && s.entries.some((e) => e.exerciseId === exerciseId && e.sets.some((set) => set.done)),
  ).length;
}

export interface Readiness {
  /** Ready for the next progression? */
  ready: boolean;
  /** 0–1 progress toward that readiness. */
  progress: number;
  next?: Exercise;
  easier?: Exercise;
  reason: string;
}

/**
 * Readiness = performance + repetition + recovery. No timelines.
 */
export function readinessFor(state: ZorviaState, exercise: Exercise): Readiness {
  const next = exercise.progressionId ? EXERCISE_MAP[exercise.progressionId] : undefined;
  const easier = exercise.regressionId ? EXERCISE_MAP[exercise.regressionId] : undefined;
  const record = state.records[exercise.id];
  const sessions = timesPerformed(state, exercise.id);

  const targetReps = repTarget(exercise.reps);
  const targetSecs = exercise.duration;
  const bestReps = record?.bestReps ?? 0;
  const bestSecs = record?.bestSeconds ?? 0;

  // Performance goal: clear the top of the prescribed range (or hold time) comfortably.
  const perfGoal = targetSecs ? Math.round(targetSecs * 1.5) : targetReps ? targetReps + 2 : undefined;
  const perfNow = targetSecs ? bestSecs : bestReps;
  const perfRatio = perfGoal ? Math.min(1, perfNow / perfGoal) : sessions >= 4 ? 1 : sessions / 4;
  const repRatio = Math.min(1, sessions / 3);
  const progress = Math.round(((perfRatio * 0.65 + repRatio * 0.35) || 0) * 100) / 100;

  const result = (ready: boolean, reason: string): Readiness => ({
    ready,
    progress,
    ...(next ? { next } : {}),
    ...(easier ? { easier } : {}),
    reason,
  });

  if (!next) return result(false, "This is the top of its progression line — keep refining form and control.");
  if (sessions < 3) return result(false, `Log this movement in ${3 - sessions} more session${3 - sessions === 1 ? "" : "s"} before stepping up.`);
  if (perfGoal && perfNow < perfGoal) {
    const unit = targetSecs ? "s hold" : " clean reps";
    return result(false, `Reach ${perfGoal}${unit} with good form to unlock ${next.name}.`);
  }
  return result(true, `Your logged performance says you're ready to try ${next.name}. Move up when form stays clean.`);
}

export interface StageStatus {
  stage: Stage;
  nextStage?: Stage;
  /** Completed workouts overall. */
  workouts: number;
  /** Movements at the current stage that meet their readiness criteria. */
  readyMovements: Exercise[];
  /** Human-readable, non-time-based requirements for the next stage. */
  requirements: string[];
  note: string;
}

/**
 * The user's overall stage: their stated level, adjusted upward only when logged
 * performance supports it. Never derived from height or weight.
 */
export function stageStatus(state: ZorviaState): StageStatus {
  const done = state.sessions.filter((s) => s.finishedAt);
  const workouts = done.length;
  const stated: Stage = state.profile.level === "advanced" ? "advanced" : state.profile.level === "intermediate" ? "intermediate" : workouts >= 4 ? "foundation" : "beginner";

  const readyMovements = Object.keys(state.records)
    .map((id) => EXERCISE_MAP[id])
    .filter((ex): ex is Exercise => Boolean(ex))
    .filter((ex) => STAGE_RANK[stageOf(ex)] >= STAGE_RANK[stated] - 1)
    .filter((ex) => readinessFor(state, ex).ready);

  let stage = stated;
  // Earned promotion: broad readiness plus enough logged training.
  if (stage !== "advanced" && readyMovements.length >= 4 && workouts >= 12) {
    stage = STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, STAGE_RANK[stage] + 1)] ?? stage;
  }

  const nextStage = STAGE_ORDER[STAGE_RANK[stage] + 1];
  const requirements = nextStage
    ? [
        "Hit the top of the prescribed range on your main movements with clean form.",
        "Log at least 12 completed workouts at this stage — quality, not speed.",
        "Keep taking your rest days; recovery is part of the progression, not a pause from it.",
        "Move up on any single exercise the moment its readiness check passes — you don't have to wait for the whole stage.",
      ]
    : ["Keep refining technique, control and recovery. Add volume slowly."];

  return {
    stage,
    ...(nextStage ? { nextStage } : {}),
    workouts,
    readyMovements,
    requirements,
    note: STAGE_NOTES[stage],
  };
}

/** Cap on how hard an exercise may be for a given stage. */
export function stageCeiling(stage: Stage): number {
  return STAGE_RANK[stage];
}
