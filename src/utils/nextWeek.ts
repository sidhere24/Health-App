import { DAYS_OF_WEEK, MEAL_LIBRARY } from '../data/hyderabadMeals';
import { REGIONS } from '../data/regions';
import type {
  AllergenId,
  DietPreference,
  LocationId,
  MealSlot,
  MealTemplate,
  NextWeekPrepBrief,
  NextWeekPrepTask,
  NextWeekStrategy,
  PortionMultipliers,
  WeekPlan,
  WholeFood,
} from '../types/nutrition';
import {
  aggregateWeeklyGrocery,
  FOODS_BY_ID,
  formatCurrency,
  getMealDifficulty,
  getMealDifficultyRank,
  isMealCompatibleWithDiet,
  isMealSafeForAllergens,
  MEALS_BY_ID,
} from './nutrition';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

/**
 * Generates a 7-day meal prep plan for next week based on strategy:
 * - 'rotate': shifts meals to create fresh weekday variety while honoring diet & allergens
 * - 'easy': prioritizes Easy/Moderate prep meals for busy upcoming weeks
 * - 'repeat': clones the active week plan cleanly
 */
export function generateNextWeekPlan(
  currentPlan: WeekPlan,
  diet: DietPreference = 'non-veg',
  excludedAllergens: AllergenId[] = [],
  mealLibrary: MealTemplate[] = MEAL_LIBRARY,
  foodsById: Record<string, WholeFood> = FOODS_BY_ID,
  strategy: NextWeekStrategy = 'rotate'
): WeekPlan {
  if (strategy === 'repeat') {
    const clone = {} as WeekPlan;
    for (const day of DAYS_OF_WEEK) {
      clone[day] = { ...currentPlan[day] };
    }
    return clone;
  }

  const next = {} as WeekPlan;

  DAYS_OF_WEEK.forEach((day, dayIndex) => {
    const nextDay = { ...currentPlan[day] };

    for (const slot of SLOTS) {
      const currentMealId = currentPlan[day][slot];
      const basePool = mealLibrary.filter(
        (m) =>
          m.slot === slot &&
          (m.id.startsWith('ai_meal_') || isMealCompatibleWithDiet(m, diet)) &&
          isMealSafeForAllergens(m, excludedAllergens, foodsById)
      );

      const fallbackPool =
        basePool.length > 0
          ? basePool
          : mealLibrary.filter((m) => m.slot === slot && isMealSafeForAllergens(m, excludedAllergens, foodsById));

      if (fallbackPool.length === 0) continue;

      if (strategy === 'easy') {
        const easyOnly = fallbackPool.filter(
          (m) => getMealDifficultyRank(getMealDifficulty(m)) <= getMealDifficultyRank('Easy')
        );
        const modOrEasy = fallbackPool.filter(
          (m) => getMealDifficultyRank(getMealDifficulty(m)) <= getMealDifficultyRank('Moderate')
        );
        const targetPool = easyOnly.length > 0 ? easyOnly : modOrEasy.length > 0 ? modOrEasy : fallbackPool;
        nextDay[slot] = targetPool[(dayIndex + 1) % targetPool.length].id;
        continue;
      }

      // 'rotate': prefer a different meal than the same weekday this week when alternatives exist
      const alternatives = fallbackPool.filter((m) => m.id !== currentMealId);
      const pool = alternatives.length > 0 ? alternatives : fallbackPool;
      nextDay[slot] = pool[(dayIndex + 2) % pool.length].id;
    }

    next[day] = nextDay;
  });

  return next;
}

/**
 * Computes next week's required shopping items, pantry stock overlap,
 * low-waste ingredient reuse score, and automated Sunday prep checklist.
 */
export function computeNextWeekPrepBrief(
  nextWeekPlan: WeekPlan,
  multipliers: PortionMultipliers,
  pantryChecked: Record<string, boolean>,
  mealsById: Record<string, MealTemplate> = MEALS_BY_ID,
  foodsById: Record<string, WholeFood> = FOODS_BY_ID,
  householdServings = 1
): NextWeekPrepBrief {
  const grocery = aggregateWeeklyGrocery(
    nextWeekPlan,
    multipliers,
    mealsById,
    foodsById,
    householdServings
  );

  // Count how many scheduled meal slots reuse each ingredient (low-waste overlap metric)
  const slotUsageCount: Record<string, number> = {};
  for (const day of DAYS_OF_WEEK) {
    for (const slot of SLOTS) {
      const meal = mealsById[nextWeekPlan[day][slot]];
      if (!meal) continue;
      const seenInMeal = new Set<string>();
      for (const ing of meal.ingredients) {
        if (!seenInMeal.has(ing.foodId)) {
          seenInMeal.add(ing.foodId);
          slotUsageCount[ing.foodId] = (slotUsageCount[ing.foodId] ?? 0) + 1;
        }
      }
    }
  }

  const sharedStaplesCount = grocery.items.filter(
    (item) => (slotUsageCount[item.food.id] ?? 0) >= 3
  ).length;
  const ingredientReusePct =
    grocery.items.length > 0
      ? Math.round((sharedStaplesCount / grocery.items.length) * 100)
      : 0;

  const toBuyItems = grocery.items.filter((item) => !pantryChecked[item.food.id]);
  const alreadyStockedItems = grocery.items.filter((item) => Boolean(pantryChecked[item.food.id]));
  const toBuyCost =
    Math.round(toBuyItems.reduce((sum, item) => sum + item.totalCostInr, 0) * 100) / 100;

  // Derive practical Sunday batch prep tasks directly from next week's required items
  const itemsById = Object.fromEntries(grocery.items.map((item) => [item.food.id, item]));
  const prepTasks: NextWeekPrepTask[] = [];

  const grainNames = ['sona_masoori', 'kala_chana', 'moong_dal', 'ragi_jowar', 'rolled_oats']
    .map((id) => itemsById[id])
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  if (grainNames.length > 0) {
    prepTasks.push({
      id: 'nw_prep_grains',
      category: 'Soak & Grains',
      title: 'Soak pulses & batch-cook grains for Mon–Wed',
      detail: grainNames
        .slice(0, 3)
        .map((i) => `${i.food.name} (${i.practicalQuantityLabel})`)
        .join(' · '),
      estimatedMinutes: 25,
    });
  }

  const proteinItems = ['whole_eggs', 'chicken_breast', 'chicken_thigh', 'paneer', 'soya_chunks', 'bangda_mackerel', 'rohu_fish']
    .map((id) => itemsById[id])
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  if (proteinItems.length > 0) {
    prepTasks.push({
      id: 'nw_prep_proteins',
      category: 'Proteins & Eggs',
      title: 'Boil eggs & marinate main proteins in airtight boxes',
      detail: proteinItems
        .slice(0, 3)
        .map((i) => `${i.food.name} (${i.practicalQuantityLabel})`)
        .join(' · '),
      estimatedMinutes: 25,
    });
  }

  const produceItems = ['spinach', 'moringa_leaves', 'beetroot', 'sweet_potato', 'garlic_ginger', 'watermelon', 'pomegranate']
    .map((id) => itemsById[id])
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  if (produceItems.length > 0) {
    prepTasks.push({
      id: 'nw_prep_produce',
      category: 'Produce & Greens',
      title: 'Wash greens, steam roots & portion fresh produce',
      detail: produceItems
        .slice(0, 3)
        .map((i) => `${i.food.name} (${i.practicalQuantityLabel})`)
        .join(' · '),
      estimatedMinutes: 15,
    });
  }

  const seedItems = ['pumpkin_seeds', 'black_sesame', 'peanuts', 'walnuts']
    .map((id) => itemsById[id])
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  if (seedItems.length > 0) {
    prepTasks.push({
      id: 'nw_prep_seeds',
      category: 'Seeds & Fats',
      title: 'Dry-roast seeds & pre-pack 7 daily snack portions',
      detail: seedItems
        .slice(0, 3)
        .map((i) => `${i.food.name} (${i.practicalQuantityLabel})`)
        .join(' · '),
      estimatedMinutes: 10,
    });
  }

  if (prepTasks.length === 0 && grocery.items.length > 0) {
    prepTasks.push({
      id: 'nw_prep_general',
      category: 'Proteins & Eggs',
      title: 'Portion next week ingredients for 2 batch cook sessions',
      detail: grocery.items
        .slice(0, 4)
        .map((i) => `${i.food.name} (${i.practicalQuantityLabel})`)
        .join(' · '),
      estimatedMinutes: 30,
    });
  }

  return {
    totalEstimatedCost: grocery.totalWeeklyCostInr,
    toBuyCost,
    dailyAverageCost: grocery.dailyAverageCostInr,
    totalItemsCount: grocery.items.length,
    toBuyItems,
    alreadyStockedItems,
    sharedStaplesCount,
    ingredientReusePct,
    prepTasks,
  };
}

export function formatNextWeekPrepBriefText(
  brief: NextWeekPrepBrief,
  locationId: LocationId,
  householdServings = 1
): string {
  const region = REGIONS[locationId] ?? REGIONS.hyderabad;
  const servings = Math.max(1, Math.min(6, Math.round(householdServings || 1)));

  const lines: string[] = [
    `HydraPrep Next Week Prep & Items (${region.shortLabel} · ${servings} ${servings === 1 ? 'person' : 'people'})`,
    `Items to buy: ${brief.toBuyItems.length} (${formatCurrency(brief.toBuyCost, locationId)}) · Already stocked: ${brief.alreadyStockedItems.length}`,
    `Low-waste reuse: ${brief.sharedStaplesCount}/${brief.totalItemsCount} staples shared across 3+ meals`,
    '',
    'Required Items to Buy:',
  ];

  if (brief.toBuyItems.length === 0) {
    lines.push('- Everything for next week is already stocked in your pantry.');
  } else {
    for (const item of brief.toBuyItems) {
      lines.push(
        `- [ ] ${item.food.name} — ${item.practicalQuantityLabel} (${formatCurrency(item.totalCostInr, locationId)})`
      );
    }
  }

  if (brief.prepTasks.length > 0) {
    lines.push('', 'Sunday Batch Prep Checklist:');
    for (const task of brief.prepTasks) {
      lines.push(`- [ ] ${task.title} (~${task.estimatedMinutes} min): ${task.detail}`);
    }
  }

  return lines.join('\n').trim();
}
