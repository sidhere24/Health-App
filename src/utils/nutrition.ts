import { DAYS_OF_WEEK, HYDERABAD_FOODS, MEAL_LIBRARY } from '../data/hyderabadMeals';
import { getAgeGroupForAge, localizeWholeFood, REGIONS } from '../data/regions';
import { UK_MEALS, US_MEALS } from '../data/usUkMeals';
import type {
  ActivityLevel,
  AllergenId,
  BiologicalSex,
  ConsumedState,
  DayMealSelection,
  DayOfWeek,
  DietPreference,
  GroceryAggregateItem,
  HormonalPathway,
  HydrationState,
  LocationId,
  MacroTargets,
  MarketChannel,
  MealDifficulty,
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

/**
 * Meal library for a region: US/UK regions use the curated global meal set,
 * other regions (Hyderabad and Indian cities) use the base MEAL_LIBRARY.
 */
export function getMealsByLocation(locationId: LocationId): MealTemplate[] {
  if (locationId === 'usa') return US_MEALS;
  if (locationId === 'uk') return UK_MEALS;
  return MEAL_LIBRARY;
}

export function getMealsById(locationId: LocationId): Record<string, MealTemplate> {
  return Object.fromEntries(getMealsByLocation(locationId).map((meal) => [meal.id, meal]));
}

export function getLocalizedFoods(
  locationId: LocationId,
  customFoods: WholeFood[] = [],
  fetchedRegionalFoods: WholeFood[] = []
): WholeFood[] {
  // Global regions (USA, UK, ...) use Spoonacular-generated foods fetched from
  // /api/regional-foods/:regionId when available, then HYDERABAD_FOODS as fallback.
  const base = fetchedRegionalFoods.length > 0 ? fetchedRegionalFoods : HYDERABAD_FOODS;
  const baseLocalized = base.map((food) => localizeWholeFood(food, locationId));
  return [...customFoods, ...baseLocalized];
}

export function getLocalizedFoodsById(
  locationId: LocationId,
  customFoods: WholeFood[] = [],
  fetchedRegionalFoods: WholeFood[] = []
): Record<string, WholeFood> {
  return Object.fromEntries(
    getLocalizedFoods(locationId, customFoods, fetchedRegionalFoods).map((f) => [f.id, f])
  );
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

export function createInitialHydrationState(): HydrationState {
  const result = {} as HydrationState;
  for (const day of DAYS_OF_WEEK) {
    result[day] = 0;
  }
  return result;
}

export function calculateHydrationTargetGlasses(
  weightKg: number,
  activity: ActivityLevel = 'active'
): number {
  const baseMl = Math.max(1500, weightKg * 35);
  const activityBonusMl = activity === 'athlete' ? 750 : activity === 'active' ? 400 : 150;
  const glasses = Math.round((baseMl + activityBonusMl) / 250);
  return Math.max(6, Math.min(16, glasses));
}

export const ALLERGEN_OPTIONS: Array<{ id: AllergenId; label: string }> = [
  { id: 'dairy', label: 'Dairy' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'nuts', label: 'Peanuts & Nuts' },
  { id: 'fish', label: 'Fish' },
  { id: 'soy', label: 'Soy' },
];

const ALLERGEN_FOOD_IDS: Record<AllergenId, Set<string>> = {
  dairy: new Set(['paneer', 'curd_dahi', 'cow_ghee']),
  eggs: new Set(['whole_eggs']),
  nuts: new Set(['peanuts', 'walnuts']),
  fish: new Set(['bangda_mackerel', 'rohu_fish']),
  soy: new Set(['soya_chunks']),
};

const ALLERGEN_PATTERNS: Record<AllergenId, RegExp> = {
  dairy: /\b(milk|curd|dahi|yogurt|paneer|cheese|ghee|butter|whey|kefir|cream)\b/i,
  eggs: /\b(egg|eggs|omelette|bhurji|mutta|gudlu)\b/i,
  nuts: /\b(peanut|peanuts|walnut|walnuts|almond|almonds|cashew|cashews|pistachio|hazelnut|pecan|groundnut|akhrot|palli)\b/i,
  fish: /\b(fish|mackerel|bangda|rohu|sardine|sardines|salmon|tuna|surmai|prawn|shrimp|seafood|mathi|chepa)\b/i,
  soy: /\b(soy|soya|tofu|edamame|tempeh)\b/i,
};

export function getFoodAllergens(foodId: string, food?: WholeFood): AllergenId[] {
  const found: AllergenId[] = [];
  const text = food ? `${food.name} ${food.localName}` : '';
  for (const option of ALLERGEN_OPTIONS) {
    const id = option.id;
    if (ALLERGEN_FOOD_IDS[id].has(foodId) || (text && ALLERGEN_PATTERNS[id].test(text))) {
      found.push(id);
    }
  }
  return found;
}

export function getMealAllergens(
  meal: MealTemplate,
  foodsById: Record<string, WholeFood> = FOODS_BY_ID
): AllergenId[] {
  const set = new Set<AllergenId>();
  for (const ing of meal.ingredients) {
    const allergens = getFoodAllergens(ing.foodId, foodsById[ing.foodId]);
    for (const a of allergens) set.add(a);
  }
  return ALLERGEN_OPTIONS.map((o) => o.id).filter((id) => set.has(id));
}

export function isMealSafeForAllergens(
  meal: MealTemplate,
  excludedAllergens: AllergenId[] = [],
  foodsById: Record<string, WholeFood> = FOODS_BY_ID
): boolean {
  if (!excludedAllergens || excludedAllergens.length === 0) return true;
  const mealAllergens = getMealAllergens(meal, foodsById);
  return !mealAllergens.some((a) => excludedAllergens.includes(a));
}

export function buildWeekPlanForAllergens(
  excludedAllergens: AllergenId[],
  currentPlan: WeekPlan,
  diet: DietPreference = 'non-veg',
  mealLibrary: MealTemplate[] = MEAL_LIBRARY,
  foodsById: Record<string, WholeFood> = FOODS_BY_ID
): WeekPlan {
  if (!excludedAllergens || excludedAllergens.length === 0) return currentPlan;
  const libraryById = Object.fromEntries(mealLibrary.map((m) => [m.id, m]));
  const next = {} as WeekPlan;
  const slots: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

  DAYS_OF_WEEK.forEach((day, dayIndex) => {
    const dayPlan = { ...currentPlan[day] };
    for (const slot of slots) {
      const existing = libraryById[dayPlan[slot]] ?? MEALS_BY_ID[dayPlan[slot]];
      if (
        existing &&
        isMealSafeForAllergens(existing, excludedAllergens, foodsById) &&
        (existing.id.startsWith('ai_meal_') || isMealCompatibleWithDiet(existing, diet))
      ) {
        continue;
      }

      const safeDietPool = mealLibrary.filter(
        (m) =>
          m.slot === slot &&
          isMealSafeForAllergens(m, excludedAllergens, foodsById) &&
          (m.id.startsWith('ai_meal_') || isMealCompatibleWithDiet(m, diet))
      );

      if (safeDietPool.length > 0) {
        dayPlan[slot] = safeDietPool[dayIndex % safeDietPool.length].id;
        continue;
      }

      const safeAnyPool = mealLibrary.filter(
        (m) => m.slot === slot && isMealSafeForAllergens(m, excludedAllergens, foodsById)
      );
      if (safeAnyPool.length > 0) {
        dayPlan[slot] = safeAnyPool[dayIndex % safeAnyPool.length].id;
      }
    }
    next[day] = dayPlan;
  });

  return next;
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

export const MEAL_DIFFICULTIES: MealDifficulty[] = ['Easy', 'Moderate', 'Pro'];

const DIFFICULTY_RANK: Record<MealDifficulty, number> = {
  Easy: 1,
  Moderate: 2,
  Pro: 3,
};

export function inferMealDifficulty(prepTimeMinutes: number, stepCount: number): MealDifficulty {
  if (prepTimeMinutes <= 12 && stepCount <= 2) return 'Easy';
  if (prepTimeMinutes >= 22 || stepCount >= 4) return 'Pro';
  return 'Moderate';
}

export function getMealDifficulty(meal: Pick<MealTemplate, 'difficulty' | 'prepTimeMinutes' | 'prepSteps'>): MealDifficulty {
  if (
    meal.difficulty === 'Easy' ||
    meal.difficulty === 'Moderate' ||
    meal.difficulty === 'Pro'
  ) {
    return meal.difficulty;
  }
  return inferMealDifficulty(meal.prepTimeMinutes, meal.prepSteps.length);
}

export function getMealDifficultyRank(difficulty: MealDifficulty): number {
  return DIFFICULTY_RANK[difficulty];
}

export function matchesDifficultyFilter(
  meal: Pick<MealTemplate, 'difficulty' | 'prepTimeMinutes' | 'prepSteps'>,
  filter: MealDifficulty | 'all'
): boolean {
  if (filter === 'all') return true;
  return getMealDifficulty(meal) === filter;
}

/**
 * Adapts a 7-day meal plan so every slot respects the user's chosen maximum
 * cooking difficulty ceiling (e.g. 'Easy' = Easy only, 'Moderate' = Easy or
 * Moderate, 'Pro' = all meals) while preserving diet preferences.
 */
export function buildWeekPlanForDifficulty(
  maxDifficulty: MealDifficulty,
  currentPlan: WeekPlan,
  diet: DietPreference = 'non-veg',
  mealLibrary: MealTemplate[] = MEAL_LIBRARY
): WeekPlan {
  const maxRank = DIFFICULTY_RANK[maxDifficulty];
  const mealsById = Object.fromEntries(mealLibrary.map((m) => [m.id, m]));
  const next = {} as WeekPlan;
  const slots: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

  DAYS_OF_WEEK.forEach((day, dayIndex) => {
    const dayPlan = { ...currentPlan[day] };
    for (const slot of slots) {
      const existing = mealsById[dayPlan[slot]];
      if (
        existing &&
        DIFFICULTY_RANK[getMealDifficulty(existing)] <= maxRank &&
        (existing.id.startsWith('ai_meal_') || isMealCompatibleWithDiet(existing, diet))
      ) {
        continue;
      }

      const exactPool = mealLibrary.filter(
        (m) =>
          m.slot === slot &&
          DIFFICULTY_RANK[getMealDifficulty(m)] <= maxRank &&
          (m.id.startsWith('ai_meal_') || isMealCompatibleWithDiet(m, diet))
      );

      if (exactPool.length > 0) {
        dayPlan[slot] = exactPool[dayIndex % exactPool.length].id;
      } else {
        // Fallback: pick the easiest diet-compatible meal in that slot
        const dietPool = mealLibrary
          .filter(
            (m) =>
              m.slot === slot &&
              (m.id.startsWith('ai_meal_') || isMealCompatibleWithDiet(m, diet))
          )
          .sort(
            (a, b) =>
              DIFFICULTY_RANK[getMealDifficulty(a)] - DIFFICULTY_RANK[getMealDifficulty(b)] ||
              a.prepTimeMinutes - b.prepTimeMinutes
          );
        if (dietPool.length > 0) {
          dayPlan[slot] = dietPool[dayIndex % dietPool.length].id;
        }
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

export function getInclusivePathwayLabel(
  pathway: HormonalPathway,
  sex: BiologicalSex = 'neutral'
): string {
  switch (pathway) {
    case 'Testosterone & Steroidogenesis':
      if (sex === 'female') return 'Hormone & Energy Balance';
      if (sex === 'male') return 'Androgen & Energy Balance';
      return 'Hormone & Metabolic Balance';
    case 'Nitric Oxide & Vascular Flow':
      return 'Circulation & Nitric Oxide';
    case 'Sperm Quality & Zinc/Selenium':
      if (sex === 'female') return 'Immune & Cellular Minerals';
      if (sex === 'male') return 'Vitality & Zinc/Selenium';
      return 'Immune & Mineral Density';
    case 'Cortisol & Stress Recovery':
      return 'Stress Recovery & Sleep';
  }
}

export function getMicroSubtitles(sex: BiologicalSex = 'neutral'): {
  zinc: string;
  magnesium: string;
  selenium: string;
  nitrates: string;
} {
  if (sex === 'female') {
    return {
      zinc: 'Immunity & hormone balance',
      magnesium: 'Calm sleep & cycle comfort',
      selenium: 'Thyroid & antioxidant defense',
      nitrates: 'Healthy blood flow & stamina',
    };
  }
  if (sex === 'male') {
    return {
      zinc: 'Androgen & reproductive vitality',
      magnesium: 'Hormone balance & deep sleep',
      selenium: 'Thyroid & cellular antioxidant',
      nitrates: 'Nitric oxide & blood flow',
    };
  }
  return {
    zinc: 'Immunity & hormone synthesis',
    magnesium: 'Stress recovery & deep sleep',
    selenium: 'Thyroid & cellular protection',
    nitrates: 'Circulation & training stamina',
  };
}

/**
 * Calculates daily macro and micronutrient targets for any adult sex, age group,
 * and weight class using Mifflin-St Jeor (+5 male, -161 female, -78 neutral).
 * Ensures a healthy fat floor >= 0.85–0.9g/kg to protect hormone synthesis and
 * scales protein upward in older age groups to counter anabolic resistance.
 */
export function calculateBiometricTargets(profile: UserProfile): MacroTargets {
  const ageGroup = getAgeGroupForAge(profile.age);
  const sex: BiologicalSex = profile.sex ?? 'male';
  const sexBmrOffset = sex === 'female' ? -161 : sex === 'neutral' ? -78 : 5;
  const bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexBmrOffset;
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
  const minCalories = sex === 'female' ? 1300 : 1500;
  const calories = Math.max(
    minCalories,
    Math.round((maintenance + goalDeltas[profile.goal]) / 10) * 10
  );

  const baseProteinMultiplier =
    sex === 'female'
      ? profile.goal === 'fat-loss'
        ? 1.9
        : 1.75
      : profile.goal === 'fat-loss'
        ? 2.1
        : 1.95;
  const proteinMultiplier = baseProteinMultiplier + ageGroup.proteinBonusGPerKg;
  const proteinG = Math.round(profile.weightKg * proteinMultiplier);

  const fatMultiplier = profile.goal === 'fat-loss' ? 0.95 : 1.05;
  const fatG = Math.round(profile.weightKg * fatMultiplier);

  const remainingCalories = Math.max(360, calories - proteinG * 4 - fatG * 9);
  const carbsG = Math.round(remainingCalories / 4);

  const zincMg =
    sex === 'female'
      ? Math.max(9, ageGroup.zincMg - 4)
      : sex === 'neutral'
        ? Math.max(11, ageGroup.zincMg - 2)
        : ageGroup.zincMg;

  const magnesiumMg =
    sex === 'female'
      ? Math.max(310, ageGroup.magnesiumMg - 80)
      : sex === 'neutral'
        ? Math.max(350, ageGroup.magnesiumMg - 40)
        : ageGroup.magnesiumMg;

  const seleniumMcg =
    sex === 'female'
      ? Math.max(55, ageGroup.seleniumMcg - 5)
      : ageGroup.seleniumMcg;

  return {
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG: Math.max(25, Math.round(calories / 80)),
    zincMg,
    magnesiumMg,
    seleniumMcg,
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
  foodsById: Record<string, WholeFood> = FOODS_BY_ID,
  mealsById: Record<string, MealTemplate> = MEALS_BY_ID
): PortionMultipliers {
  const allowedSteps = [0.6, 0.75, 0.9, 1, 1.15, 1.25, 1.4];
  const next = {} as PortionMultipliers;

  for (const day of DAYS_OF_WEEK) {
    const baseTotals = computeDayTotals(
      weekPlan[day],
      { breakfast: 1, lunch: 1, snack: 1, dinner: 1 },
      { breakfast: false, lunch: false, snack: false, dinner: false },
      mealsById,
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
  foodsById: Record<string, WholeFood> = FOODS_BY_ID,
  householdServings = 1
): {
  items: GroceryAggregateItem[];
  totalWeeklyCostInr: number;
  dailyAverageCostInr: number;
  weeklyProteinG: number;
  costPer100gProteinInr: number;
} {
  const servings = Math.max(1, Math.min(8, Math.round(householdServings || 1)));
  const gramMap: Record<string, number> = {};
  let weeklyProteinG = 0;

  for (const day of DAYS_OF_WEEK) {
    const selection = weekPlan[day];
    const dayMults = multipliers[day];
    const slots: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

    for (const slot of slots) {
      const meal = mealsById[selection[slot]];
      if (!meal) continue;
      const mult = (dayMults?.[slot] ?? 1) * servings;
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

export function formatGroceryShareText(
  items: GroceryAggregateItem[],
  locationId: LocationId,
  pantryChecked: Record<string, boolean>,
  householdServings = 1
): string {
  const region = REGIONS[locationId] ?? REGIONS.hyderabad;
  const servings = Math.max(1, Math.min(8, Math.round(householdServings || 1)));
  const remaining = items.filter((item) => !pantryChecked[item.food.id]);
  const totalCost = remaining.reduce((sum, item) => sum + item.totalCostInr, 0);

  const channels: MarketChannel[] = [
    'Rythu Bazaar · Produce',
    'Dairy & Eggs',
    'Local Poultry, Fish & Butcher',
    'Begum Bazaar · Seeds & Grains',
  ];

  const lines: string[] = [
    `HydraPrep Weekly Grocery List (${region.shortLabel} · ${servings} ${servings === 1 ? 'person' : 'people'})`,
    `Remaining to buy: ${remaining.length} items · Est. ${formatCurrency(totalCost, locationId)}`,
    '',
  ];

  if (remaining.length === 0) {
    lines.push('All weekly ingredients are already stocked in your kitchen.');
    return lines.join('\n');
  }

  for (const channel of channels) {
    const group = remaining.filter((item) => item.food.marketChannel === channel);
    if (group.length === 0) continue;
    lines.push(`${region.marketChannelLabels[channel]}:`);
    for (const item of group) {
      lines.push(
        `- [ ] ${item.food.name} — ${item.practicalQuantityLabel} (${formatCurrency(item.totalCostInr, locationId)})`
      );
    }
    lines.push('');
  }

  return lines.join('\n').trim();
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
  foodsById: Record<string, WholeFood> = FOODS_BY_ID,
  mealsById: Record<string, MealTemplate> = MEALS_BY_ID
): Array<{
  day: DayOfWeek;
  planned: NutritionSummary;
  consumed: NutritionSummary;
  consumedCount: number;
  meals: Record<MealSlot, MealTemplate>;
}> {
  return DAYS_OF_WEEK.map((day) => {
    const selection = weekPlan[day];
    const totals = computeDayTotals(selection, multipliers[day], consumed[day], mealsById, foodsById);
    return {
      day,
      ...totals,
      meals: {
        breakfast: mealsById[selection.breakfast],
        lunch: mealsById[selection.lunch],
        snack: mealsById[selection.snack],
        dinner: mealsById[selection.dinner],
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
  foodsById: Record<string, WholeFood> = FOODS_BY_ID,
  mealsById: Record<string, MealTemplate> = MEALS_BY_ID
): WeeklyMacroTrendPoint[] {
  return DAYS_OF_WEEK.map((day) => {
    const totals = computeDayTotals(
      weekPlan[day],
      multipliers[day],
      consumed[day],
      mealsById,
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
