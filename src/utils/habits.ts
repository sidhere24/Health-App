import { DAYS_OF_WEEK, MEAL_SLOTS } from '../data/hyderabadMeals';
import type {
  ConsumedState,
  DayOfWeek,
  GroceryAggregateItem,
  MacroTargets,
  MealSlot,
  MealTemplate,
  PortionMultipliers,
  WeeklyArchiveEntry,
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
  foodsById: Record<string, WholeFood> = FOODS_BY_ID,
  mealsById: Record<string, MealTemplate> = MEALS_BY_ID
): WeeklyConsistencyMetrics {
  let loggedMealsCount = 0;
  let activeDaysCount = 0;
  const totalMealsCount = DAYS_OF_WEEK.length * 4;

  for (const day of DAYS_OF_WEEK) {
    const totals = computeDayTotals(
      weekPlan[day],
      multipliers[day],
      consumed[day],
      mealsById,
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

/** 5-of-7 days hormonal consistency baseline (~71.4% -> 71%) */
export const ADHERENCE_TARGET_PCT = 71;

export interface WeeklyAdherenceChartPoint {
  weekLabel: string;
  adherencePct: number;
  loggedMeals: number;
  totalMeals: number;
  activeDays: number;
  goalMet: boolean;
}

export interface WeeklyAdherenceSummary {
  points: WeeklyAdherenceChartPoint[];
  totalWeeks: number;
  averageAdherencePct: number;
  bestWeek: WeeklyAdherenceChartPoint | null;
  trendDeltaPct: number | null;
}

/**
 * Normalizes archived weekHistory entries for the Recharts adherence bar chart
 * and computes summary statistics (average, best week, and week-over-week delta).
 */
export function buildWeeklyAdherenceChartData(
  weekHistory: WeeklyArchiveEntry[],
  maxWeeks = 8
): WeeklyAdherenceSummary {
  if (weekHistory.length === 0) {
    return {
      points: [],
      totalWeeks: 0,
      averageAdherencePct: 0,
      bestWeek: null,
      trendDeltaPct: null,
    };
  }

  const normalized: WeeklyAdherenceChartPoint[] = weekHistory.map((entry) => {
    const adherencePct = Math.max(0, Math.min(100, Math.round(entry.adherencePct)));
    return {
      weekLabel: entry.weekLabel,
      adherencePct,
      loggedMeals: entry.loggedMeals,
      totalMeals: entry.totalMeals,
      activeDays: entry.activeDays,
      goalMet: entry.activeDays >= 5 || adherencePct >= ADHERENCE_TARGET_PCT,
    };
  });

  const sumPct = normalized.reduce((sum, item) => sum + item.adherencePct, 0);
  const averageAdherencePct = Math.round(sumPct / normalized.length);

  let bestWeek = normalized[0];
  for (const item of normalized) {
    if (item.adherencePct >= bestWeek.adherencePct) {
      bestWeek = item;
    }
  }

  const trendDeltaPct =
    normalized.length >= 2
      ? normalized[normalized.length - 1].adherencePct -
        normalized[normalized.length - 2].adherencePct
      : null;

  const limit = Math.max(1, maxWeeks);
  const points = normalized.length > limit ? normalized.slice(-limit) : normalized;

  return {
    points,
    totalWeeks: normalized.length,
    averageAdherencePct,
    bestWeek,
    trendDeltaPct,
  };
}

