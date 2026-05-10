export interface ExerciseItem {
  name: string;
  sets?: number | null;
  reps?: string | null;
  duration_minutes?: number | null;
  rest_seconds?: number | null;
  notes: string;
  modifications: string[];
}

export interface WorkoutSession {
  session_type: "cardio" | "strength" | "flexibility" | "balance" | "rest";
  name: string;
  duration_minutes: number;
  intensity: "low" | "moderate" | "high";
  exercises: ExerciseItem[];
  warmup_notes: string;
  cooldown_notes: string;
}

export interface DayWorkout {
  day_index: number;
  label?: string | null;
  sessions: WorkoutSession[];
  is_rest_day: boolean;
}

export interface FitnessPlanPayload {
  num_days: number;
  days: DayWorkout[];
  goal: string;
  fitness_level: "beginner" | "intermediate" | "advanced";
  medical_notes: string;
  summary: string;
  disclaimer: string;
}
