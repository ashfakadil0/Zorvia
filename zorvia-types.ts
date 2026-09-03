import type { Difficulty, Equipment, ExerciseCategory } from "@/data/exercises";

export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type Goal = "general" | "strength" | "calisthenics" | "mobility" | "endurance" | "habit" | "fat-loss" | "muscle";
export type ActivityLevel = "low" | "moderate" | "high";
export type ThemePref = "dark" | "light" | "system";

export interface UserProfile {
  onboarded: boolean;
  name: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  level: FitnessLevel;
  goal: Goal;
  equipment: Equipment[];
  workoutDays: number[];
  activityLevel: ActivityLevel;
  dietary: string[];
  allergies: string;
}

export interface SetEntry {
  reps?: number;
  weightKg?: number;
  seconds?: number;
  done: boolean;
}

export interface ExerciseEntry {
  exerciseId: string;
  targetSets: number;
  targetReps?: string;
  targetDuration?: number;
  sets: SetEntry[];
  skipped?: boolean;
}

export interface SessionRecord {
  id: string;
  date: string; // yyyy-mm-dd
  startedAt: string;
  finishedAt?: string;
  category: ExerciseCategory;
  title: string;
  durationSec: number;
  entries: ExerciseEntry[];
  notes?: string;
  routineId?: string;
}

export interface ActiveSession extends SessionRecord {
  currentIndex: number;
  pausedAccumSec: number;
  running: boolean;
  lastTickAt: string;
}

export interface PersonalRecord {
  exerciseId: string;
  bestReps?: number;
  bestWeightKg?: number;
  bestSeconds?: number;
  date: string;
}

export interface HydrationDay {
  date: string;
  ml: number;
}

export interface CustomRoutine {
  id: string;
  name: string;
  category: ExerciseCategory;
  exerciseIds: string[];
  days: number[];
  createdAt: string;
}

export interface Settings {
  restDefaultSec: number;
  units: "metric" | "imperial";
  theme: ThemePref;
  reminderTime: string;
  notifications: {
    workout: boolean;
    hydration: boolean;
    achievements: boolean;
  };
  hydrationGoalMl: number;
  autoRestTimer: boolean;
  hapticsEnabled: boolean;
}

export interface ZorviaState {
  version: number;
  updatedAt: string;
  profile: UserProfile;
  schedule: Record<number, ExerciseCategory>;
  sessions: SessionRecord[];
  activeSession: ActiveSession | null;
  records: Record<string, PersonalRecord>;
  hydration: HydrationDay[];
  achievements: Record<string, string>;
  favorites: string[];
  recentExercises: string[];
  routines: CustomRoutine[];
  settings: Settings;
  motivationIndex: number;
  lastMotivationDate: string;
}

export const DIFFICULTY_RANK: Record<Difficulty, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
};

export const GOAL_LABELS: Record<Goal, string> = {
  general: "General fitness",
  strength: "Strength",
  calisthenics: "Calisthenics skills",
  mobility: "Mobility & flexibility",
  endurance: "Endurance",
  habit: "Building a habit",
  "fat-loss": "Healthy body composition",
  muscle: "Muscle development",
};

export const LEVEL_LABELS: Record<FitnessLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export type { Equipment, ExerciseCategory, Difficulty };
