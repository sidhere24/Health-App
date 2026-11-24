import { DAYS_OF_WEEK, MEAL_SLOTS } from '../data/hyderabadMeals';
import type {
  ConsumedState,
  DayOfWeek,
  MacroTargets,
  MealTemplate,
  PortionMultipliers,
  WeekPlan,
  WholeFood,
} from '../types/nutrition';
import { computeDayTotals } from './nutrition';
import { computeConsistencyMetrics, getNextUnloggedSlot } from './habits';
import { FOODS_BY_ID, MEALS_BY_ID } from './nutrition';

/**
 * WhatsApp-style social share surfaces: social profile metrics ("Smarts:macro")
 * for the week and ready-to-paste WhatsApp status/plan text. Everything here is
 * a pure function of the existing plan state, so no social server is needed.
 */

export interface SocialProfileMetrics {
  dayLabel: DayOfWeek;
  dayMeals: string[];
  /** Daily averages across the week. */
  weekCalories: number;
  weekProteinG: number;
  weekCarbsG: number;
  weekFatG: number;
  weekFiberG: number;
  /** Macro shares vs. the user's weekly targets ("Smarts:macro"). */
  macros: { proteinPct: number; carbsPct: number; fatPct: number };
  proteinTargetG: number;
  consistency: string;
  nextUnlogged: string | null;
}

/**
 * Aggregates the week into shareable social metrics: average daily calories,
 * macro composition percentages, and the existing consistency headline.
 */
export function computeSocialProfileMetrics(
  weekPlan: WeekPlan,
  selectedDay: DayOfWeek,
  multipliers: PortionMultipliers,
  consumed: ConsumedState,
  foodsById: Record<string, WholeFood> = FOODS_BY_ID,
  targets: MacroTargets,
  mealsById: Record<string, MealTemplate> = MEALS_BY_ID
): SocialProfileMetrics {
  let sumCalories = 0;
  let sumProtein = 0;
  let sumCarbs = 0;
  let sumFat = 0;
  let sumFiber = 0;

  for (const day of DAYS_OF_WEEK) {
    const totals = computeDayTotals(weekPlan[day], multipliers[day], consumed[day], mealsById, foodsById);
    sumCalories += totals.planned.calories;
    sumProtein += totals.planned.proteinG;
    sumCarbs += totals.planned.carbsG;
    sumFat += totals.planned.fatG;
    sumFiber += totals.planned.fiberG;
  }
  const avg = (n: number) => Math.round((n / DAYS_OF_WEEK.length) * 10) / 10;
  const weekCalories = avg(sumCalories);
  const weekProteinG = avg(sumProtein);
  const weekCarbsG = avg(sumCarbs);
  const weekFatG = avg(sumFat);

  const dayMeals = MEAL_SLOTS.map((slotMeta) => mealsById[weekPlan[selectedDay][slotMeta.id]]?.name)
    .filter((name): name is string => Boolean(name));

  const consistency =
    computeConsistencyMetrics(weekPlan, multipliers, consumed, targets, foodsById).headline;
  const nextUnlogged = getNextUnloggedSlot(consumed[selectedDay])?.label ?? null;

  return {
    dayLabel: selectedDay,
    dayMeals,
    weekCalories,
    weekProteinG,
    weekCarbsG,
    weekFatG,
    weekFiberG: avg(sumFiber),
    macros: {
      proteinPct: targets.proteinG > 0 ? Math.round((weekProteinG / targets.proteinG) * 100) : 0,
      carbsPct: targets.carbsG > 0 ? Math.round((weekCarbsG / targets.carbsG) * 100) : 0,
      fatPct: targets.fatG > 0 ? Math.round((weekFatG / targets.fatG) * 100) : 0,
    },
    proteinTargetG: targets.proteinG,
    consistency,
    nextUnlogged,
  };
}

/** One-line WhatsApp-style status for today's plan (copyable). */
export function formatWhatsAppStatus(metrics: SocialProfileMetrics): string {
  const dayPlan = metrics.dayMeals.length > 0 ? metrics.dayMeals.join(' + ') : 'no plan today';
  const { proteinPct, carbsPct, fatPct } = metrics.macros;
  return `HydraPrep · ${metrics.dayLabel} plan: ${dayPlan} · macros P${proteinPct}/${carbsPct}/${fatPct}`;
}

/** Multi-line WhatsApp-ready share text with macros + consistency. */
export function formatWhatsAppPlanText(
  metrics: SocialProfileMetrics,
  targets: MacroTargets
): string {
  const lines = [
    `💪 HydraPrep plan — ${metrics.dayLabel}`,
    ...metrics.dayMeals.map((name) => `• ${name}`),
    `Macros (daily avg): ${metrics.weekCalories} kcal · P${metrics.weekProteinG}g · C${metrics.weekCarbsG}g · F${metrics.weekFatG}g`,
    `Targets: P${targets.proteinG}g · C${targets.carbsG}g · F${targets.fatG}g`,
    metrics.consistency,
  ];
  if (metrics.nextUnlogged) lines.push(`Next to log: ${metrics.nextUnlogged}`);
  return lines.join('\n');
}
