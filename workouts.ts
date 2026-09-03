import type { ExerciseCategory } from "./exercises";

export interface WorkoutDay {
  key: ExerciseCategory;
  tag: string;
  title: string;
  note: string;
  /** Accent token name used for the day badge */
  accent: "primary" | "steel" | "gold" | "muted";
  /** Full V1 exercise pool, in order */
  pool: string[];
  /** Core movements that should always be included when possible */
  anchors: string[];
}

/**
 * The original Zorvia V1 split, preserved. V2 personalizes which exercises from
 * each pool are shown, but nothing from V1 has been removed.
 */
export const WORKOUT_DAYS: WorkoutDay[] = [
  {
    key: "push",
    tag: "PUSH",
    title: "Push Day",
    note: "Chest, shoulders, triceps — start with basic push-up variations, finish with isolation work.",
    accent: "primary",
    anchors: ["pushup", "pike-pushup", "tricep-dip-chair"],
    pool: [
      "wall-pushup",
      "pushup-knee",
      "pushup-incline",
      "pushup-negative",
      "pushup",
      "pushup-wide",
      "pushup-diamond",
      "pushup-decline",
      "pike-pushup",
      "pike-pushup-elevated",
      "archer-pushup",
      "pseudo-planche-pushup",
      "tricep-dip-chair",
      "dips-bar",
      "plank-shoulder-tap",
    ],
  },
  {
    key: "pull",
    tag: "PULL",
    title: "Pull Day",
    note: "Back and biceps — no bar? Rows, scapular pulls and isometric holds cover it.",
    accent: "steel",
    anchors: ["table-row", "superman-hold", "australian-pullup"],
    pool: [
      "table-row",
      "towel-row",
      "band-row",
      "australian-pullup",
      "pullup",
      "chinup",
      "scapula-pull",
      "superman-hold",
      "reverse-snow-angel",
      "archer-row",
      "iso-bicep-hold",
      "reverse-fly",
      "typewriter-pullup",
      "front-lever-tuck",
    ],
  },
  {
    key: "legs",
    tag: "LEGS",
    title: "Legs Day",
    note: "Full leg development and glutes — start with the big compound moves.",
    accent: "gold",
    anchors: ["squat", "lunge", "glute-bridge"],
    pool: [
      "squat",
      "squat-tempo",
      "bulgarian-split-squat",
      "pistol-squat-assisted",
      "pistol-squat",
      "lunge",
      "wall-sit",
      "glute-bridge",
      "single-leg-glute-bridge",
      "calf-raise",
      "lateral-squat",
      "jump-squat",
      "sumo-walk",
    ],
  },
  {
    key: "core",
    tag: "CORE",
    title: "Core + Cardio",
    note: "Abs and cardiovascular endurance — great for overall conditioning.",
    accent: "primary",
    anchors: ["plank", "bicycle-crunch", "mountain-climber"],
    pool: [
      "dead-bug",
      "plank",
      "side-plank",
      "v-up",
      "l-sit",
      "bicycle-crunch",
      "seated-in-out",
      "mountain-climber",
      "hollow-hold",
      "burpee",
      "jump-rope",
    ],
  },
  {
    key: "skill",
    tag: "SKILL",
    title: "Skill Day",
    note: "Short session (20 minutes max) — balance and control over strength. Don't attempt it exhausted.",
    accent: "steel",
    anchors: ["handstand-wall", "headstand"],
    pool: ["handstand-wall", "headstand", "front-lever-tuck", "planche-tuck", "hollow-hold"],
  },
  {
    key: "rest",
    tag: "REST",
    title: "Rest & Recovery",
    note: "Recovery and flexibility — light stretching, no rush. Rest days are part of the plan, not a missed day.",
    accent: "muted",
    anchors: ["childs-pose", "cat-cow", "savasana"],
    pool: ["childs-pose", "bridge-pose", "forward-fold", "cat-cow", "savasana"],
  },
];

export const DAY_MAP: Record<ExerciseCategory, WorkoutDay> = Object.fromEntries(
  WORKOUT_DAYS.map((d) => [d.key, d]),
) as Record<ExerciseCategory, WorkoutDay>;

/** Original V1 weekly schedule — kept as the default. */
export const DEFAULT_SCHEDULE: Record<number, ExerciseCategory> = {
  0: "pull",
  1: "legs",
  2: "rest",
  3: "core",
  4: "skill",
  5: "rest",
  6: "push",
};

export const WEEKDAYS: [number, string, string][] = [
  [0, "Sunday", "Sun"],
  [1, "Monday", "Mon"],
  [2, "Tuesday", "Tue"],
  [3, "Wednesday", "Wed"],
  [4, "Thursday", "Thu"],
  [5, "Friday", "Fri"],
  [6, "Saturday", "Sat"],
];
