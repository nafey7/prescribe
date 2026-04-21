export interface MealItem {
  name: string;
  description: string;
  items: string[];
}

export interface DayPlan {
  day_index: number;
  label?: string | null;
  meals: MealItem[];
}

export interface MealPlanPayload {
  num_days: number;
  days: DayPlan[];
  summary: string;
  disclaimer: string;
}
