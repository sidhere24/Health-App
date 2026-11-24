import { DAYS_OF_WEEK, DEFAULT_WEEK_PLAN } from '../data/hyderabadMeals';
import type { DayMealSelection, DayOfWeek, MealSlot, WeekPlan } from '../types/nutrition';
import { MEALS_BY_ID } from './nutrition';

export interface AiPlanPayload {
  plan: Record<string, Partial<Record<MealSlot, string>>>;
  notes?: string[];
}

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

/**
 * Validate the AI plan from the server: keep only known meal IDs that match the slot's
 * day/slot, avoid repeating a meal across days, and fall back to the base plan for
 * anything missing or invalid.
 */
export function normalizeAiPlan(
  raw: AiPlanPayload | null | undefined,
  base: WeekPlan = DEFAULT_WEEK_PLAN
): WeekPlan {
  const plan: WeekPlan = { ...base };
  if (!raw?.plan || typeof raw.plan !== 'object') return plan;

  const used = new Set<string>();
  for (const day of DAYS_OF_WEEK) {
    const merged: DayMealSelection = { ...plan[day] };
    const rawDay: Partial<Record<MealSlot, string>> | undefined = raw.plan[day];
    if (rawDay && typeof rawDay === 'object') {
      for (const slot of SLOTS) {
        const id = rawDay[slot];
        if (typeof id === 'string' && MEALS_BY_ID[id]?.slot === slot && !used.has(id)) {
          merged[slot] = id;
          used.add(id);
        }
      }
    }
    plan[day] = merged;
  }
  return plan;
}
