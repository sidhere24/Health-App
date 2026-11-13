import { DAYS_OF_WEEK, HYDERABAD_FOODS, MEAL_LIBRARY } from '../data/hyderabadMeals';
import { getAgeGroupForAge, localizeWholeFood, REGIONS } from '../data/regions';
import type {
  ConsumedState,
  DayMealSelection,
  DayOfWeek,
  GroceryAggregateItem,
  HormonalPathway,
  LocationId,
  MacroTargets,
  MarketChannel,
  MealSlot,
  MealTemplate,
  NutritionSummary,
  PortionMultipliers,
  UserProfile,
  WeekPlan,
  WholeFood,
} from '../types/nutrition';

export const FOODS_BY_ID: Record<string, WholeFood> = Object.fromEntries(
  HYDERABAD_FOODS.map((food) => [food.id, food])
);

export const MEALS_BY_ID: Record<string, MealTemplate> = Object.fromEntries(
  MEAL_LIBRARY.map((meal) => [meal.id, meal])
);

export function getLocalizedFoods(
  locationId: LocationId,
  customFoods: WholeFood[] = []
): WholeFood[] {
  const baseLocalized = HYDERABAD_FOODS.map((food) => localizeWholeFood(food, locationId));
  return [...customFoods, ...baseLocalized];
}

export function getLocalizedFoodsById(
  locationId: LocationId,
  customFoods: WholeFood[] = []
): Record<string, WholeFood> {
  return Object.fromEntries(getLocalizedFoods(locationId, customFoods).map((f) => [f.id, f]));
}

export function formatCurrency(amount: number, locationId: LocationId): string {
  const region = REGIONS[locationId] ?? REGIONS.hyderabad;
  if (region.currencyCode === 'INR') {
    return `${region.currencySymbol}${Math.round(amount)}`;
  }
  return `${region.currencySymbol}${amount.toFixed(2)}`;
}

export function createInitialPortionMultipliers(): PortionMultipliers {
  const result = {} as PortionMultipliers;
  for (const day of DAYS_OF_WEEK) {
    result[day] = { breakfast: 1, lunch: 1, snack: 1, dinner: 1 };
  }
  return result;
}

export function createInitialConsumedState(): ConsumedState {
  const result = {} as ConsumedState;
  for (const day of DAYS_OF_WEEK) {
    result[day] = { breakfast: false, lunch: false, snack: false, dinner: false };
  }
  return result;
}

const MEAT_FOOD_IDS = new Set([
  'chicken_breast',
  'chicken_thigh',
  'bangda_mackerel',
  'rohu_fish',
]);

export function getMealDietType(meal: MealTemplate): 'non-veg' | 'eggetarian' | 'vegetarian' {
  const hasMeat = meal.ingredients.some((i) => MEAT_FOOD_IDS.has(i.foodId));
  if (hasMeat) return 'non-veg';
  const hasEggs = meal.ingredients.some((i) => i.foodId === 'whole_eggs');
  if (hasEggs) return 'eggetarian';
  return 'vegetarian';
}

export function isMealCompatibleWithDiet(
  meal: MealTemplate,
  diet: 'non-veg' | 'eggetarian' | 'vegetarian' = 'non-veg'
): boolean {
  const mealType = getMealDietType(meal);
  if (diet === 'non-veg') return true;
  if (diet === 'eggetarian') return mealType !== 'non-veg';
  return mealType === 'vegetarian';
}

export function buildWeekPlanForDiet(
  diet: 'non-veg' | 'eggetarian' | 'vegetarian',
  currentPlan: WeekPlan
): WeekPlan {
  if (diet === 'non-veg') return currentPlan;
  const next = {} as WeekPlan;
  const slots: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

  DAYS_OF_WEEK.forEach((day, dayIndex) => {
    const dayPlan = { ...currentPlan[day] };
    for (const slot of slots) {
      const existing = MEALS_BY_ID[dayPlan[slot]];
      if (existing && isMealCompatibleWithDiet(existing, diet)) continue;
      const pool = MEAL_LIBRARY.filter(
        (m) => m.slot === slot && isMealCompatibleWithDiet(m, diet)
      );
      if (pool.length > 0) {
        dayPlan[slot] = pool[dayIndex % pool.length].id;
      }
    }
    next[day] = dayPlan;
  });

  return next;
}

export function getCurrentDayOfWeek(date = new Date()): DayOfWeek {
  // JS getDay(): 0 = Sun, 1 = Mon ... 6 = Sat
  const map: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return map[date.getDay()] ?? 'Mon';
}

/**
 * Calculates daily macro and hormonal micronutrient targets for any adult age group
 * and weight class. Ensures a healthy fat floor >= 0.9g/kg to protect steroidogenesis
 * and scales protein upward slightly in older age groups to counter anabolic resistance.
 */
export function calculateBiometricTargets(profile: UserProfile): MacroTargets {
  const ageGroup = getAgeGroupForAge(profile.age);
  const bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5;
  const activityFactors = {
    moderate: 1.45,
    active: 1.6,
    athlete: 1.75,
  };
  const maintenance = bmr * activityFactors[profile.activity];

  const goalDeltas = {
    recomp: -150,
    'fat-loss': -420,
    'lean-gain': 250,
  };
  const calories = Math.max(1500, Math.round((maintenance + goalDeltas[profile.goal]) / 10) * 10);

  const baseProteinMultiplier = profile.goal === 'fat-loss' ? 2.1 : 1.95;
  const proteinMultiplier = baseProteinMultiplier + ageGroup.proteinBonusGPerKg;
  const proteinG = Math.round(profile.weightKg * proteinMultiplier);

  const fatMultiplier = profile.goal === 'fat-loss' ? 0.95 : 1.05;
  const fatG = Math.round(profile.weightKg * fatMultiplier);

  const remainingCalories = Math.max(400, calories - proteinG * 4 - fatG * 9);
  const carbsG = Math.round(remainingCalories / 4);

  return {
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG: Math.max(28, Math.round(calories / 80)),
    zincMg: ageGroup.zincMg,
    magnesiumMg: ageGroup.magnesiumMg,
    seleniumMcg: ageGroup.seleniumMcg,
    nitratesMg: ageGroup.nitratesMg,
    dailyBudgetInr: profile.dailyBudgetInr,
  };
}

export function computeMealNutrition(
  meal: MealTemplate,
  portionMultiplier = 1,
  foodsById: Record<string, WholeFood> = FOODS_BY_ID
): NutritionSummary {
  const totals: NutritionSummary = {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
    zincMg: 0,
    magnesiumMg: 0,
    seleniumMcg: 0,
    nitratesMg: 0,
    costInr: 0,
  };

  for (const item of meal.ingredients) {
    const food = foodsById[item.foodId];
    if (!food) continue;
    const factor = (item.grams * portionMultiplier) / 100;
    totals.calories += food.per100g.calories * factor;
    totals.proteinG += food.per100g.proteinG * factor;
    totals.carbsG += food.per100g.carbsG * factor;
    totals.fatG += food.per100g.fatG * factor;
    totals.fiberG += food.per100g.fiberG * factor;
    totals.zincMg += food.per100g.zincMg * factor;
    totals.magnesiumMg += food.per100g.magnesiumMg * factor;
    totals.seleniumMcg += food.per100g.seleniumMcg * factor;
    totals.nitratesMg += food.per100g.nitratesMg * factor;
    totals.costInr += food.pricePer100gInr * factor;
  }

  return {
    calories: Math.round(totals.calories),
    proteinG: Math.round(totals.proteinG * 10) / 10,
    carbsG: Math.round(totals.carbsG * 10) / 10,
    fatG: Math.round(totals.fatG * 10) / 10,
    fiberG: Math.round(totals.fiberG * 10) / 10,
    zincMg: Math.round(totals.zincMg * 10) / 10,
    magnesiumMg: Math.round(totals.magnesiumMg),
    seleniumMcg: Math.round(totals.seleniumMcg * 10) / 10,
    nitratesMg: Math.round(totals.nitratesMg),
    costInr: Math.round(totals.costInr * 100) / 100,
  };
}

export function addNutritionSummaries(a: NutritionSummary, b: NutritionSummary): NutritionSummary {
  return {
    calories: Math.round(a.calories + b.calories),
    proteinG: Math.round((a.proteinG + b.proteinG) * 10) / 10,
    carbsG: Math.round((a.carbsG + b.carbsG) * 10) / 10,
    fatG: Math.round((a.fatG + b.fatG) * 10) / 10,
    fiberG: Math.round((a.fiberG + b.fiberG) * 10) / 10,
    zincMg: Math.round((a.zincMg + b.zincMg) * 10) / 10,
    magnesiumMg: Math.round(a.magnesiumMg + b.magnesiumMg),
    seleniumMcg: Math.round((a.seleniumMcg + b.seleniumMcg) * 10) / 10,
    nitratesMg: Math.round(a.nitratesMg + b.nitratesMg),
    costInr: Math.round((a.costInr + b.costInr) * 100) / 100,
  };
}

export const EMPTY_NUTRITION: NutritionSummary = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  zincMg: 0,
  magnesiumMg: 0,
  seleniumMcg: 0,
  nitratesMg: 0,
  costInr: 0,
};

export function computeDayTotals(
  daySelection: DayMealSelection,
  multipliers: Record<MealSlot, number>,
  consumed: Record<MealSlot, boolean>,
  mealsById: Record<string, MealTemplate> = MEALS_BY_ID,
  foodsById: Record<string, WholeFood> = FOODS_BY_ID
): { planned: NutritionSummary; consumed: NutritionSummary; consumedCount: number } {
  let planned = { ...EMPTY_NUTRITION };
  let consumedTotals = { ...EMPTY_NUTRITION };
  let consumedCount = 0;

  const slots: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];
  for (const slot of slots) {
    const meal = mealsById[daySelection[slot]];
    if (!meal) continue;
    const summary = computeMealNutrition(meal, multipliers[slot] ?? 1, foodsById);
    planned = addNutritionSummaries(planned, summary);
    if (consumed[slot]) {
      consumedTotals = addNutritionSummaries(consumedTotals, summary);
      consumedCount += 1;
    }
  }

  return { planned, consumed: consumedTotals, consumedCount };
}

export function scalePortionsToTarget(
  weekPlan: WeekPlan,
  targets: MacroTargets,
  foodsById: Record<string, WholeFood> = FOODS_BY_ID
): PortionMultipliers {
  const allowedSteps = [0.6, 0.75, 0.9, 1, 1.15, 1.25, 1.4];
  const next = {} as PortionMultipliers;

  for (const day of DAYS_OF_WEEK) {
    const baseTotals = computeDayTotals(
      weekPlan[day],
      { breakfast: 1, lunch: 1, snack: 1, dinner: 1 },
      { breakfast: false, lunch: false, snack: false, dinner: false },
      MEALS_BY_ID,
      foodsById
    );
    const ratio = baseTotals.planned.calories > 0 ? targets.calories / baseTotals.planned.calories : 1;
    const snapped = allowedSteps.reduce((best, candidate) =>
      Math.abs(candidate - ratio) < Math.abs(best - ratio) ? candidate : best
    );
    next[day] = {
      breakfast: snapped,
      lunch: snapped,
      snack: snapped,
      dinner: snapped,
    };
  }

  return next;
}

export function formatPracticalQuantity(foodId: string, totalGrams: number): string {
  const roundedGrams = Math.round(totalGrams);
  if (foodId === 'whole_eggs') {
    const count = Math.round(roundedGrams / 50);
    return `${count} eggs (~${roundedGrams} g)`;
  }
  if (foodId === 'curd_dahi') {
    if (roundedGrams >= 1000) {
      return `${(roundedGrams / 1000).toFixed(2)} kg / L`;
    }
    return `${roundedGrams} g`;
  }
  if (roundedGrams >= 1000) {
    return `${(roundedGrams / 1000).toFixed(2)} kg`;
  }
  return `${roundedGrams} g`;
}

export function aggregateWeeklyGrocery(
  weekPlan: WeekPlan,
  multipliers: PortionMultipliers,
  mealsById: Record<string, MealTemplate> = MEALS_BY_ID,
  foodsById: Record<string, WholeFood> = FOODS_BY_ID
): {
  items: GroceryAggregateItem[];
  totalWeeklyCostInr: number;
  dailyAverageCostInr: number;
  weeklyProteinG: number;
  costPer100gProteinInr: number;
} {
  const gramMap: Record<string, number> = {};
  let weeklyProteinG = 0;

  for (const day of DAYS_OF_WEEK) {
    const selection = weekPlan[day];
    const dayMults = multipliers[day];
    const slots: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

    for (const slot of slots) {
      const meal = mealsById[selection[slot]];
      if (!meal) continue;
      const mult = dayMults?.[slot] ?? 1;
      const mealSummary = computeMealNutrition(meal, mult, foodsById);
      weeklyProteinG += mealSummary.proteinG;

      for (const ing of meal.ingredients) {
        gramMap[ing.foodId] = (gramMap[ing.foodId] ?? 0) + ing.grams * mult;
      }
    }
  }

  const items: GroceryAggregateItem[] = Object.entries(gramMap)
    .map(([foodId, totalGrams]) => {
      const food = foodsById[foodId];
      if (!food) return null;
      const totalCostInr = Math.round((totalGrams / 100) * food.pricePer100gInr * 100) / 100;
      return {
        food,
        totalGrams: Math.round(totalGrams),
        totalCostInr,
        practicalQuantityLabel: formatPracticalQuantity(foodId, totalGrams),
      };
    })
    .filter((x): x is GroceryAggregateItem => x !== null)
    .sort((a, b) => b.totalCostInr - a.totalCostInr);

  const totalWeeklyCostInr =
    Math.round(items.reduce((sum, item) => sum + item.totalCostInr, 0) * 100) / 100;
  const dailyAverageCostInr = Math.round((totalWeeklyCostInr / 7) * 100) / 100;
  const costPer100gProteinInr =
    weeklyProteinG > 0 ? Math.round((totalWeeklyCostInr / weeklyProteinG) * 100 * 100) / 100 : 0;

  return {
    items,
    totalWeeklyCostInr,
    dailyAverageCostInr,
    weeklyProteinG: Math.round(weeklyProteinG),
    costPer100gProteinInr,
  };
}

export function filterWholeFoods(
  foods: WholeFood[],
  query: string,
  pathwayFilter: HormonalPathway | 'all',
  marketFilter: MarketChannel | 'all'
): WholeFood[] {
  const q = query.trim().toLowerCase();
  return foods.filter((food) => {
    if (pathwayFilter !== 'all' && food.primaryPathway !== pathwayFilter) {
      return false;
    }
    if (marketFilter !== 'all' && food.marketChannel !== marketFilter) {
      return false;
    }
    if (!q) return true;
    return (
      food.name.toLowerCase().includes(q) ||
      food.localName.toLowerCase().includes(q) ||
      food.bioactiveMechanism.toLowerCase().includes(q) ||
      food.hyderabadSourceNote.toLowerCase().includes(q)
    );
  });
}

export function getWeeklyDaySummaries(
  weekPlan: WeekPlan,
  multipliers: PortionMultipliers,
  consumed: ConsumedState,
  foodsById: Record<string, WholeFood> = FOODS_BY_ID
): Array<{
  day: DayOfWeek;
  planned: NutritionSummary;
  consumed: NutritionSummary;
  consumedCount: number;
  meals: Record<MealSlot, MealTemplate>;
}> {
  return DAYS_OF_WEEK.map((day) => {
    const selection = weekPlan[day];
    const totals = computeDayTotals(selection, multipliers[day], consumed[day], MEALS_BY_ID, foodsById);
    return {
      day,
      ...totals,
      meals: {
        breakfast: MEALS_BY_ID[selection.breakfast],
        lunch: MEALS_BY_ID[selection.lunch],
        snack: MEALS_BY_ID[selection.snack],
        dinner: MEALS_BY_ID[selection.dinner],
      },
    };
  });
}

export interface WeeklyMacroTrendPoint {
  day: DayOfWeek;
  proteinG: number;
  fatG: number;
  carbsG: number;
  proteinTargetG: number;
  fatTargetG: number;
  carbsTargetG: number;
  proteinPct: number;
  fatPct: number;
  carbsPct: number;
  calories: number;
  fatFloorMet: boolean;
}

export function buildWeeklyMacroTrendData(
  weekPlan: WeekPlan,
  multipliers: PortionMultipliers,
  consumed: ConsumedState,
  targets: MacroTargets,
  mode: 'planned' | 'consumed',
  fatFloorG = Math.round(targets.fatG * 0.85),
  foodsById: Record<string, WholeFood> = FOODS_BY_ID
): WeeklyMacroTrendPoint[] {
  return DAYS_OF_WEEK.map((day) => {
    const totals = computeDayTotals(
      weekPlan[day],
      multipliers[day],
      consumed[day],
      MEALS_BY_ID,
      foodsById
    );
    const source = mode === 'consumed' ? totals.consumed : totals.planned;

    const proteinPct = targets.proteinG > 0 ? Math.round((source.proteinG / targets.proteinG) * 100) : 0;
    const fatPct = targets.fatG > 0 ? Math.round((source.fatG / targets.fatG) * 100) : 0;
    const carbsPct = targets.carbsG > 0 ? Math.round((source.carbsG / targets.carbsG) * 100) : 0;

    return {
      day,
      proteinG: source.proteinG,
      fatG: source.fatG,
      carbsG: source.carbsG,
      proteinTargetG: targets.proteinG,
      fatTargetG: targets.fatG,
      carbsTargetG: targets.carbsG,
      proteinPct,
      fatPct,
      carbsPct,
      calories: source.calories,
      fatFloorMet: source.fatG >= fatFloorG,
    };
  });
}
