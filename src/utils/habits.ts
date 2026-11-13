import { DAYS_OF_WEEK, MEAL_SLOTS } from '../data/hyderabadMeals';
import type {
  ConsumedState,
  DayOfWeek,
  GroceryAggregateItem,
  MacroTargets,
  MealSlot,
  PortionMultipliers,
  WeekPlan,
  WholeFood,
} from '../types/nutrition';
import { computeDayTotals, FOODS_BY_ID, MEALS_BY_ID } from './nutrition';

export interface WeeklyConsistencyMetrics {
  loggedMealsCount: number;
  totalMealsCount: number;
  adherencePct: number;
  activeDaysCount: number;
  graceGoalMet: boolean;
  headline: string;
}

/**
 * Behavioral-psychology-aligned adherence tracker:
 * Uses a grace-first 5-of-7 weekly consistency framing (no punitive streak resets)
 * so missed meals never trigger "all-or-nothing" churn.
 */
export function computeConsistencyMetrics(
  weekPlan: WeekPlan,
  multipliers: PortionMultipliers,
  consumed: ConsumedState,
  _targets: MacroTargets,
  foodsById: Record<string, WholeFood> = FOODS_BY_ID
): WeeklyConsistencyMetrics {
  let loggedMealsCount = 0;
  let activeDaysCount = 0;
  const totalMealsCount = DAYS_OF_WEEK.length * 4;

  for (const day of DAYS_OF_WEEK) {
    const totals = computeDayTotals(
      weekPlan[day],
      multipliers[day],
      consumed[day],
      MEALS_BY_ID,
      foodsById
    );
    loggedMealsCount += totals.consumedCount;
    if (totals.consumedCount >= 2) {
      activeDaysCount += 1;
    }
  }

  const adherencePct = Math.round((loggedMealsCount / totalMealsCount) * 100);
  const graceGoalMet = activeDaysCount >= 5;

  let headline = 'Tap any meal below to log today’s hormonal baseline.';
  if (loggedMealsCount > 0 && activeDaysCount < 5) {
    headline = `${activeDaysCount}/5 core consistency days active · grace days protected.`;
  } else if (graceGoalMet) {
    headline = `${activeDaysCount}/7 strong hormone-prep days locked in this week.`;
  }

  return {
    loggedMealsCount,
    totalMealsCount,
    adherencePct,
    activeDaysCount,
    graceGoalMet,
    headline,
  };
}

export function getNextUnloggedSlot(
  dayConsumed: Record<MealSlot, boolean>
): { slot: MealSlot; label: string } | null {
  for (const meta of MEAL_SLOTS) {
    if (!dayConsumed[meta.id]) {
      return { slot: meta.id, label: meta.label };
    }
  }
  return null;
}

/**
 * Separates shelf-stable pantry staples (high e-commerce/Amazon affiliate conversion)
 * from perishable local produce/proteins so affiliate links match real buyer behavior.
 */
export function partitionGroceryByFulfillment(items: GroceryAggregateItem[]): {
  pantryOnline: GroceryAggregateItem[];
  freshLocal: GroceryAggregateItem[];
} {
  const PANTRY_FRESH_EXCEPTIONS = new Set<string>(['paneer', 'curd_dahi', 'whole_eggs']);
  const ONLINE_SHELF_STABLE_IDS = new Set<string>(['cow_ghee']);

  const pantryOnline: GroceryAggregateItem[] = [];
  const freshLocal: GroceryAggregateItem[] = [];

  for (const item of items) {
    const isSeedGrainPantry =
      item.food.marketChannel === 'Begum Bazaar · Seeds & Grains' ||
      ONLINE_SHELF_STABLE_IDS.has(item.food.id);

    if (isSeedGrainPantry && !PANTRY_FRESH_EXCEPTIONS.has(item.food.id)) {
      pantryOnline.push(item);
    } else {
      freshLocal.push(item);
    }
  }

  return { pantryOnline, freshLocal };
}
