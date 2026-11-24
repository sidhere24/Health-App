import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROFILE, DEFAULT_WEEK_PLAN, HYDERABAD_FOODS, MEAL_LIBRARY } from '../data/hyderabadMeals';
import { getAgeGuidanceForSex } from '../data/regions';
import {
  ADHERENCE_TARGET_PCT,
  buildWeeklyAdherenceChartData,
  computeConsistencyMetrics,
  getNextUnloggedSlot,
  partitionGroceryByFulfillment,
} from './habits';
import {
  materializeAiPlanToAppState,
  normalizeAiLocalMealPlan,
  validateLocalPlanRequest,
} from './aiMealPlan';
import { buildIngredientPurchaseLink, getCleanProductQuery, sanitizeExternalUrl } from './links';
import {
  computeNextWeekPrepBrief,
  formatNextWeekPrepBriefText,
  generateNextWeekPlan,
} from './nextWeek';
import {
  formatLabChecklistText,
  getRecommendedLabPanel,
  normalizeLabAiReport,
  validateLabInsightRequest,
} from './labInsights';
import {
  aggregateWeeklyGrocery,
  buildWeekPlanForAllergens,
  buildWeekPlanForDiet,
  buildWeekPlanForDifficulty,
  buildWeeklyMacroTrendData,
  calculateBiometricTargets,
  calculateHydrationTargetGlasses,
  computeDayTotals,
  computeMealNutrition,
  createInitialConsumedState,
  createInitialHydrationState,
  createInitialPortionMultipliers,
  filterWholeFoods,
  formatCurrency,
  formatGroceryShareText,
  getCurrentDayOfWeek,
  getInclusivePathwayLabel,
  getLocalizedFoodsById,
  getMealAllergens,
  getMealDietType,
  getMealDifficulty,
  getMealDifficultyRank,
  getMicroSubtitles,
  inferMealDifficulty,
  isMealSafeForAllergens,
  matchesDifficultyFilter,
  MEAL_DIFFICULTIES,
  MEALS_BY_ID,
  scalePortionsToTarget,
} from './nutrition';

test('calculateBiometricTargets returns hormonally balanced targets for 32yo 85kg male', () => {
  const targets = calculateBiometricTargets(DEFAULT_PROFILE);
  assert.ok(targets.calories >= 2400 && targets.calories <= 2850);
  assert.ok(targets.proteinG >= 160 && targets.proteinG <= 185);
  assert.ok(targets.fatG >= 80, 'fat floor must support steroidogenesis');
  assert.equal(targets.zincMg, 14);
  assert.equal(targets.magnesiumMg, 420);
  assert.equal(targets.nitratesMg, 320);
});

test('calculateBiometricTargets scales protein and micronutrients across age groups and weight classes', () => {
  const youngLight = calculateBiometricTargets({ ...DEFAULT_PROFILE, age: 22, weightKg: 60 });
  const olderHeavy = calculateBiometricTargets({ ...DEFAULT_PROFILE, age: 52, weightKg: 102 });

  assert.ok(olderHeavy.calories > youngLight.calories);
  assert.ok(olderHeavy.proteinG / 102 > youngLight.proteinG / 60, 'older age group gets anabolic resistance protein bonus');
  assert.ok(olderHeavy.nitratesMg > youngLight.nitratesMg);
  assert.ok(olderHeavy.magnesiumMg > youngLight.magnesiumMg);
});

test('calculateBiometricTargets adjusts calories and protein across goal modes', () => {
  const recomp = calculateBiometricTargets({ ...DEFAULT_PROFILE, goal: 'recomp' });
  const fatLoss = calculateBiometricTargets({ ...DEFAULT_PROFILE, goal: 'fat-loss' });
  const leanGain = calculateBiometricTargets({ ...DEFAULT_PROFILE, goal: 'lean-gain' });

  assert.ok(fatLoss.calories < recomp.calories);
  assert.ok(recomp.calories < leanGain.calories);
  assert.ok(fatLoss.proteinG > recomp.proteinG);
});

test('computeMealNutrition calculates macros, micronutrients, and INR cost from ingredients', () => {
  const breakfast = MEAL_LIBRARY.find((m) => m.id === 'bf_moringa_egg_bhurji');
  assert.ok(breakfast);

  const single = computeMealNutrition(breakfast, 1);
  const scaled = computeMealNutrition(breakfast, 1.25);

  assert.ok(single.calories > 500);
  assert.ok(single.proteinG > 30);
  assert.ok(single.zincMg > 3);
  assert.ok(single.costInr > 25 && single.costInr < 80);
  assert.ok(scaled.calories > single.calories);
  assert.ok(scaled.costInr >= single.costInr);
});

test('computeDayTotals tracks planned vs consumed totals accurately', () => {
  const mults = createInitialPortionMultipliers();
  const consumed = createInitialConsumedState();

  const initial = computeDayTotals(DEFAULT_WEEK_PLAN.Mon, mults.Mon, consumed.Mon);
  assert.equal(initial.consumedCount, 0);
  assert.equal(initial.consumed.calories, 0);
  assert.ok(initial.planned.calories >= 2100);
  assert.ok(initial.planned.proteinG >= 140);
  assert.ok(initial.planned.costInr <= DEFAULT_PROFILE.dailyBudgetInr);

  consumed.Mon.breakfast = true;
  consumed.Mon.lunch = true;
  const afterEating = computeDayTotals(DEFAULT_WEEK_PLAN.Mon, mults.Mon, consumed.Mon);
  assert.equal(afterEating.consumedCount, 2);
  assert.ok(afterEating.consumed.calories > 0);
  assert.ok(afterEating.consumed.calories < afterEating.planned.calories);
});

test('aggregateWeeklyGrocery computes weekly shopping totals and updates on meal swap', () => {
  const mults = createInitialPortionMultipliers();
  const base = aggregateWeeklyGrocery(DEFAULT_WEEK_PLAN, mults);

  assert.ok(base.items.length >= 15);
  assert.ok(base.totalWeeklyCostInr > 800 && base.totalWeeklyCostInr < 2500);
  assert.ok(base.dailyAverageCostInr <= DEFAULT_PROFILE.dailyBudgetInr);
  assert.ok(base.costPer100gProteinInr > 0 && base.costPer100gProteinInr < 250);

  const swappedPlan = {
    ...DEFAULT_WEEK_PLAN,
    Mon: {
      ...DEFAULT_WEEK_PLAN.Mon,
      lunch: 'ln_bangda_mackerel_thali',
    },
  };
  const updated = aggregateWeeklyGrocery(swappedPlan, mults);
  assert.notEqual(updated.totalWeeklyCostInr, base.totalWeeklyCostInr);
});

test('filterWholeFoods matches Telugu/Hindi local names and hormonal pathways', () => {
  const munagaku = filterWholeFoods(HYDERABAD_FOODS, 'munagaku', 'all', 'all');
  assert.equal(munagaku.length, 1);
  assert.equal(munagaku[0].id, 'moringa_leaves');

  const noFoods = filterWholeFoods(HYDERABAD_FOODS, '', 'Nitric Oxide & Vascular Flow', 'all');
  assert.ok(noFoods.length >= 4);
  assert.ok(noFoods.every((f) => f.primaryPathway === 'Nitric Oxide & Vascular Flow'));
});

test('buildWeeklyMacroTrendData builds 7-day trend points against hormonal targets', () => {
  const targets = calculateBiometricTargets(DEFAULT_PROFILE);
  const mults = createInitialPortionMultipliers();
  const consumed = createInitialConsumedState();

  const plannedTrend = buildWeeklyMacroTrendData(
    DEFAULT_WEEK_PLAN,
    mults,
    consumed,
    targets,
    'planned',
    Math.round(DEFAULT_PROFILE.weightKg * 0.9)
  );
  assert.equal(plannedTrend.length, 7);
  assert.equal(plannedTrend[0].day, 'Mon');
  assert.ok(plannedTrend[0].proteinPct >= 95);
  assert.ok(plannedTrend.every((d) => d.fatFloorMet));

  consumed.Mon.breakfast = true;
  const consumedTrend = buildWeeklyMacroTrendData(
    DEFAULT_WEEK_PLAN,
    mults,
    consumed,
    targets,
    'consumed',
    Math.round(DEFAULT_PROFILE.weightKg * 0.9)
  );
  assert.ok(consumedTrend[0].proteinG > 0);
  assert.equal(consumedTrend[1].proteinG, 0);
});

test('regional localization adapts food names, currency formatting, and scalePortionsToTarget', () => {
  const blrFoods = getLocalizedFoodsById('bengaluru');
  assert.match(blrFoods.moringa_leaves.localName, /Nugge Soppu/i);

  const usFoods = getLocalizedFoodsById('usa');
  assert.ok(usFoods.chicken_breast.pricePer100gInr < 5);
  assert.equal(formatCurrency(12.5, 'usa'), '$12.50');
  assert.equal(formatCurrency(248.4, 'hyderabad'), '₹248');

  const lightTargets = calculateBiometricTargets({ ...DEFAULT_PROFILE, weightKg: 58, age: 25 });
  const lightMults = scalePortionsToTarget(DEFAULT_WEEK_PLAN, lightTargets);
  assert.ok(lightMults.Mon.lunch < 1);

  const heavyTargets = calculateBiometricTargets({ ...DEFAULT_PROFILE, weightKg: 105, age: 30 });
  const heavyMults = scalePortionsToTarget(DEFAULT_WEEK_PLAN, heavyTargets);
  assert.ok(heavyMults.Mon.lunch > 1);
});

test('buildIngredientPurchaseLink injects affiliate tag, prefers custom URL, and blocks unsafe URLs', () => {
  const food = HYDERABAD_FOODS[0];
  const tagged = buildIngredientPurchaseLink(food, {
    storePlatform: 'amazon_in',
    affiliateTag: 'hydraprep-21',
    customUrls: {},
  });
  assert.equal(tagged.isAffiliateTagged, true);
  assert.equal(tagged.isCustom, false);
  assert.match(tagged.url, /amazon\.in\/s\?k=.*tag=hydraprep-21/);

  const custom = buildIngredientPurchaseLink(food, {
    storePlatform: 'amazon_in',
    affiliateTag: 'hydraprep-21',
    customUrls: { [food.id]: 'https://amzn.to/custom-eggs' },
  });
  assert.equal(custom.isCustom, true);
  assert.equal(custom.url, 'https://amzn.to/custom-eggs');

  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeExternalUrl('https://www.bigbasket.com/pd/123'), 'https://www.bigbasket.com/pd/123');
});

test('computeConsistencyMetrics tracks grace-first weekly adherence and next unlogged meal', () => {
  const targets = calculateBiometricTargets(DEFAULT_PROFILE);
  const mults = createInitialPortionMultipliers();
  const consumed = createInitialConsumedState();

  for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const) {
    consumed[day].breakfast = true;
    consumed[day].lunch = true;
  }

  const metrics = computeConsistencyMetrics(DEFAULT_WEEK_PLAN, mults, consumed, targets);
  assert.equal(metrics.loggedMealsCount, 10);
  assert.equal(metrics.activeDaysCount, 5);
  assert.equal(metrics.graceGoalMet, true);

  const next = getNextUnloggedSlot(consumed.Mon);
  assert.equal(next?.slot, 'snack');
});

test('partitionGroceryByFulfillment separates shelf-stable affiliate pantry staples from fresh local market items', () => {
  const grocery = aggregateWeeklyGrocery(DEFAULT_WEEK_PLAN, createInitialPortionMultipliers());
  const { pantryOnline, freshLocal } = partitionGroceryByFulfillment(grocery.items);

  assert.ok(pantryOnline.some((i) => i.food.id === 'pumpkin_seeds'));
  assert.ok(pantryOnline.some((i) => i.food.id === 'cow_ghee'));
  assert.ok(freshLocal.some((i) => i.food.id === 'whole_eggs'));
  assert.ok(freshLocal.some((i) => i.food.id === 'spinach'));
});

test('buildWeekPlanForDiet excludes meat and eggs appropriately and getCurrentDayOfWeek returns valid weekday', () => {
  const vegPlan = buildWeekPlanForDiet('vegetarian', DEFAULT_WEEK_PLAN);
  for (const day of Object.values(vegPlan)) {
    for (const mealId of Object.values(day)) {
      const meal = MEALS_BY_ID[mealId];
      assert.equal(getMealDietType(meal), 'vegetarian', `${meal.name} must be vegetarian`);
    }
  }

  const eggPlan = buildWeekPlanForDiet('eggetarian', DEFAULT_WEEK_PLAN);
  for (const day of Object.values(eggPlan)) {
    for (const mealId of Object.values(day)) {
      const meal = MEALS_BY_ID[mealId];
      assert.notEqual(getMealDietType(meal), 'non-veg', `${meal.name} must not contain meat`);
    }
  }

  const friday = getCurrentDayOfWeek(new Date('2026-11-13T12:00:00Z'));
  assert.equal(friday, 'Fri');
});

test('getCleanProductQuery strips slashes and prevents India -21 tag leakage onto amazon.com', () => {
  const eggs = HYDERABAD_FOODS.find((f) => f.id === 'whole_eggs')!;
  const query = getCleanProductQuery(eggs);
  assert.equal(query.includes('/'), false);

  const usLink = buildIngredientPurchaseLink(eggs, {
    storePlatform: 'amazon_com',
    affiliateTag: 'sid036-21',
    customUrls: {},
  });
  assert.equal(usLink.isAffiliateTagged, false);
  assert.equal(usLink.url.includes('sid036-21'), false);

  const inLink = buildIngredientPurchaseLink(eggs, {
    storePlatform: 'amazon_in',
    affiliateTag: 'sid036-21',
    customUrls: {},
  });
  assert.equal(inLink.isAffiliateTagged, true);
  assert.match(inLink.url, /tag=sid036-21/);
});

test('buildWeeklyAdherenceChartData summarizes empty and multi-week adherence history accurately', () => {
  const empty = buildWeeklyAdherenceChartData([]);
  assert.equal(empty.totalWeeks, 0);
  assert.deepEqual(empty.points, []);
  assert.equal(empty.averageAdherencePct, 0);
  assert.equal(empty.bestWeek, null);
  assert.equal(empty.trendDeltaPct, null);

  const history = [
    { weekLabel: 'W1', loggedMeals: 15, totalMeals: 28, adherencePct: 54, activeDays: 3 },
    { weekLabel: 'W2', loggedMeals: 21, totalMeals: 28, adherencePct: 75, activeDays: 5 },
    { weekLabel: 'W3', loggedMeals: 19, totalMeals: 28, adherencePct: 68, activeDays: 5 },
    { weekLabel: 'W4', loggedMeals: 26, totalMeals: 28, adherencePct: 108, activeDays: 7 },
  ];

  const summary = buildWeeklyAdherenceChartData(history, 3);
  assert.equal(summary.totalWeeks, 4);
  assert.equal(summary.points.length, 3);
  assert.equal(summary.points[0].weekLabel, 'W2');
  assert.equal(summary.points[2].adherencePct, 100, 'adherencePct must be clamped to 100');
  assert.equal(summary.points[1].goalMet, true, '5 active days satisfies grace goal');
  assert.equal(summary.bestWeek?.weekLabel, 'W4');
  assert.equal(summary.bestWeek?.adherencePct, 100);
  assert.equal(summary.averageAdherencePct, Math.round((54 + 75 + 68 + 100) / 4));
  assert.equal(summary.trendDeltaPct, 32);
  assert.equal(ADHERENCE_TARGET_PCT, 71);
});

test('validateLocalPlanRequest rejects empty locations and sanitizes valid regional payloads', () => {
  const invalid = validateLocalPlanRequest({ locationQuery: ' ' });
  assert.equal(invalid.ok, false);

  const valid = validateLocalPlanRequest({
    locationQuery: '  Kochi, Kerala ',
    availableFoods: ['Fresh sardines', 'Red matta rice', ''],
    age: 34,
    weightKg: 78,
    heightCm: 175,
    diet: 'non-veg',
    goal: 'recomp',
    activity: 'active',
    locationId: 'hyderabad',
    dailyBudget: 320,
    currencyCode: 'INR',
    currencySymbol: '₹',
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.locationQuery, 'Kochi, Kerala');
    assert.deepEqual(valid.data.availableFoods, ['Fresh sardines', 'Red matta rice']);
  }
});

test('normalizeAiLocalMealPlan and materializeAiPlanToAppState produce valid macros and groceries', () => {
  const rawAiOutput = {
    locationName: 'Kochi, Kerala',
    regionalOverview: 'Built around Fort Kochi coastal sardines, red matta rice, and backyard drumstick leaves.',
    localFoods: [
      {
        key: 'sardines',
        name: 'Fresh Indian Sardines',
        localName: 'Mathi',
        marketChannel: 'Local Poultry, Fish & Butcher',
        sourceNote: 'Local Ernakulam fish market ₹180/kg',
        pricePer100g: 18,
        per100g: { calories: 208, proteinG: 24.6, carbsG: 0, fatG: 11.4, fiberG: 0, zincMg: 1.3, magnesiumMg: 39, seleniumMcg: 52.7, nitratesMg: 0 },
        primaryPathway: 'Testosterone & Steroidogenesis',
        bioactiveMechanism: 'Rich in omega-3, selenium, and cholesterol for hormone synthesis.',
        prepTip: 'Clean and marinate with turmeric and kokum.',
      },
      {
        key: 'matta_rice',
        name: 'Kerala Red Matta Rice',
        localName: 'Kuthari',
        marketChannel: 'Begum Bazaar · Seeds & Grains',
        sourceNote: 'Local provision store ₹65/kg',
        pricePer100g: 6.5,
        per100g: { calories: 350, proteinG: 7.5, carbsG: 75, fatG: 1.8, fiberG: 3.6, zincMg: 1.8, magnesiumMg: 110, seleniumMcg: 14, nitratesMg: 0 },
        primaryPathway: 'Cortisol & Stress Recovery',
        bioactiveMechanism: 'Slow-release complex carbs replenish training glycogen.',
        prepTip: 'Soak 30 minutes and pressure cook in bulk.',
      },
      {
        key: 'moringa',
        name: 'Drumstick Leaves',
        localName: 'Muringayila',
        marketChannel: 'Rythu Bazaar · Produce',
        sourceNote: 'Morning vegetable stall ₹50/kg',
        pricePer100g: 5,
        per100g: { calories: 64, proteinG: 9.4, carbsG: 8.3, fatG: 1.4, fiberG: 2, zincMg: 0.6, magnesiumMg: 147, seleniumMcg: 1, nitratesMg: 180 },
        primaryPathway: 'Nitric Oxide & Vascular Flow',
        bioactiveMechanism: 'High dietary nitrates and magnesium.',
        prepTip: 'Steam lightly with grated coconut.',
      },
      {
        key: 'country_eggs',
        name: 'Country Whole Eggs',
        localName: 'Nadan Mutta',
        marketChannel: 'Dairy & Eggs',
        sourceNote: 'Local farm egg tray ₹7.5/egg',
        pricePer100g: 15,
        per100g: { calories: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5, fiberG: 0, zincMg: 1.3, magnesiumMg: 12, seleniumMcg: 30.7, nitratesMg: 0 },
        primaryPathway: 'Testosterone & Steroidogenesis',
        bioactiveMechanism: 'Yolk cholesterol and choline support androgen output.',
        prepTip: 'Boil 12 eggs on Sunday.',
      },
    ],
    meals: [
      {
        key: 'bf_egg_thoran',
        name: 'Nadan Egg & Muringayila Thoran',
        slot: 'breakfast',
        focusTag: 'Testosterone & Steroidogenesis',
        prepTimeMinutes: 12,
        batchFriendly: true,
        ingredients: [
          { foodKey: 'country_eggs', grams: 200 },
          { foodKey: 'moringa', grams: 80 },
        ],
        prepSteps: ['Saute moringa leaves.', 'Scramble with 4 whole eggs.'],
        hormonalBenefit: 'Morning yolk cholesterol and magnesium.',
      },
      {
        key: 'ln_mathi_matta',
        name: 'Kokum Mathi Curry & Red Matta Rice',
        slot: 'lunch',
        focusTag: 'Sperm Quality & Zinc/Selenium',
        prepTimeMinutes: 20,
        batchFriendly: true,
        ingredients: [
          { foodKey: 'sardines', grams: 220 },
          { foodKey: 'matta_rice', grams: 120 },
        ],
        prepSteps: ['Simmer sardines in kokum spice paste.', 'Serve with steamed red matta rice.'],
        hormonalBenefit: 'High bioavailable selenium and omega-3 fatty acids.',
      },
      {
        key: 'sn_egg_moringa',
        name: 'Boiled Country Eggs & Moringa Soup',
        slot: 'snack',
        focusTag: 'Nitric Oxide & Vascular Flow',
        prepTimeMinutes: 8,
        batchFriendly: true,
        ingredients: [
          { foodKey: 'country_eggs', grams: 100 },
          { foodKey: 'moringa', grams: 100 },
        ],
        prepSteps: ['Simmer moringa with black pepper and serve with boiled eggs.'],
        hormonalBenefit: 'Pre-training nitrate and mineral boost.',
      },
      {
        key: 'dn_sardine_bowl',
        name: 'Pan-Seared Mathi & Matta Kanji Bowl',
        slot: 'dinner',
        focusTag: 'Cortisol & Stress Recovery',
        prepTimeMinutes: 18,
        batchFriendly: true,
        ingredients: [
          { foodKey: 'sardines', grams: 180 },
          { foodKey: 'matta_rice', grams: 100 },
        ],
        prepSteps: ['Tawa-sear marinated sardines.', 'Serve over warm matta rice.'],
        hormonalBenefit: 'Overnight amino acids and magnesium.',
      },
    ],
    weekSchedule: {
      Mon: { breakfast: 'bf_egg_thoran', lunch: 'ln_mathi_matta', snack: 'sn_egg_moringa', dinner: 'dn_sardine_bowl' },
    },
    batchTasks: [
      {
        session: 'Sunday Batch (75 min)',
        title: 'Cook red matta rice & marinate sardines',
        detail: 'Pressure cook 3 days of red matta rice and marinate 600g fresh sardines.',
        storageNote: 'Chilled glass containers · 3 days',
      },
    ],
  };

  const normalized = normalizeAiLocalMealPlan(rawAiOutput, {
    locationQuery: 'Kochi, Kerala',
    availableFoods: ['Fresh sardines', 'Red matta rice'],
    nowIso: '2026-11-23T10:00:00.000Z',
  });
  assert.equal(normalized.locationName, 'Kochi, Kerala');
  assert.equal(Object.keys(normalized.weekSchedule).length, 7);

  const materialized = materializeAiPlanToAppState(normalized);
  const foodsById = Object.fromEntries(materialized.foods.map((f) => [f.id, f]));
  const mealsById = Object.fromEntries(materialized.meals.map((m) => [m.id, m]));
  const mults = createInitialPortionMultipliers();

  const monTotals = computeDayTotals(
    materialized.weekPlan.Mon,
    mults.Mon,
    createInitialConsumedState().Mon,
    mealsById,
    foodsById
  );
  assert.ok(monTotals.planned.calories > 1800);
  assert.ok(monTotals.planned.proteinG > 140);

  const grocery = aggregateWeeklyGrocery(materialized.weekPlan, mults, mealsById, foodsById);
  assert.equal(grocery.items.length, 4);
  assert.ok(grocery.totalWeeklyCostInr > 0);
  assert.ok(
    materialized.meals.every((m) => MEAL_DIFFICULTIES.includes(m.difficulty)),
    'AI materialized meals must always receive a valid difficulty rating'
  );
});

test('every meal in MEAL_LIBRARY has a valid difficulty rating and difficulty filter works accurately', () => {
  assert.equal(MEAL_LIBRARY.length, 25);
  for (const meal of MEAL_LIBRARY) {
    assert.ok(
      MEAL_DIFFICULTIES.includes(meal.difficulty),
      `Meal ${meal.id} must have Easy, Moderate, or Pro difficulty`
    );
  }

  const easyMeals = MEAL_LIBRARY.filter((m) => matchesDifficultyFilter(m, 'Easy'));
  const moderateMeals = MEAL_LIBRARY.filter((m) => matchesDifficultyFilter(m, 'Moderate'));
  const proMeals = MEAL_LIBRARY.filter((m) => matchesDifficultyFilter(m, 'Pro'));

  assert.ok(easyMeals.length >= 6, 'library should include Easy meals across slots');
  assert.ok(moderateMeals.length >= 6, 'library should include Moderate meals across slots');
  assert.ok(proMeals.length >= 4, 'library should include Pro meals');
  assert.equal(
    easyMeals.length + moderateMeals.length + proMeals.length,
    MEAL_LIBRARY.length
  );

  assert.equal(inferMealDifficulty(8, 2), 'Easy');
  assert.equal(inferMealDifficulty(16, 2), 'Moderate');
  assert.equal(inferMealDifficulty(25, 3), 'Pro');
});

test('buildWeekPlanForDifficulty adapts 7-day plan to Easy or Moderate while preserving diet constraints', () => {
  const easyNonVeg = buildWeekPlanForDifficulty('Easy', DEFAULT_WEEK_PLAN, 'non-veg');
  for (const day of Object.values(easyNonVeg)) {
    for (const mealId of Object.values(day)) {
      const meal = MEALS_BY_ID[mealId];
      assert.equal(
        getMealDifficulty(meal),
        'Easy',
        `${meal.name} must be Easy after adapting week to Easy`
      );
    }
  }

  const moderateVeg = buildWeekPlanForDifficulty('Moderate', DEFAULT_WEEK_PLAN, 'vegetarian');
  for (const day of Object.values(moderateVeg)) {
    for (const mealId of Object.values(day)) {
      const meal = MEALS_BY_ID[mealId];
      assert.ok(
        getMealDifficultyRank(getMealDifficulty(meal)) <= getMealDifficultyRank('Moderate'),
        `${meal.name} must be Easy or Moderate`
      );
      assert.equal(
        getMealDietType(meal),
        'vegetarian',
        `${meal.name} must preserve vegetarian constraint`
      );
    }
  }
});

test('calculateBiometricTargets and inclusive helpers adapt accurately for female, neutral, and male profiles', () => {
  const base = { ...DEFAULT_PROFILE, age: 34, weightKg: 68, heightCm: 168 };
  const female = calculateBiometricTargets({ ...base, sex: 'female' });
  const neutral = calculateBiometricTargets({ ...base, sex: 'neutral' });
  const male = calculateBiometricTargets({ ...base, sex: 'male' });

  assert.ok(female.calories < neutral.calories, 'female BMR/calories should be lower than neutral at same stats');
  assert.ok(neutral.calories < male.calories, 'neutral BMR/calories should be lower than male at same stats');
  assert.ok(female.zincMg < male.zincMg, 'female zinc RDA should be lower than male');
  assert.ok(female.magnesiumMg < male.magnesiumMg, 'female magnesium RDA should be lower than male');

  const seniorFemale = calculateBiometricTargets({ ...base, sex: 'female', age: 64 });
  assert.ok(
    seniorFemale.proteinG > female.proteinG,
    '60+ female should receive higher protein target to preserve lean muscle & bone strength'
  );

  const femalePathway = getInclusivePathwayLabel('Testosterone & Steroidogenesis', 'female');
  const femaleZincPathway = getInclusivePathwayLabel('Sperm Quality & Zinc/Selenium', 'female');
  const neutralPathway = getInclusivePathwayLabel('Sperm Quality & Zinc/Selenium', 'neutral');
  assert.equal(/sperm|testosterone/i.test(femalePathway), false);
  assert.equal(/sperm|testosterone/i.test(femaleZincPathway), false);
  assert.equal(/sperm|testosterone/i.test(neutralPathway), false);

  const femaleSubs = getMicroSubtitles('female');
  assert.equal(/sperm|testosterone|androgen/i.test(femaleSubs.zinc + femaleSubs.magnesium + femaleSubs.selenium), false);

  const menopauseGuidance = getAgeGuidanceForSex(52, 'female');
  assert.match(menopauseGuidance, /bone density|menopause/i);
});

test('aggregateWeeklyGrocery scales quantities and costs accurately for multi-person households', () => {
  const mults = createInitialPortionMultipliers();
  const single = aggregateWeeklyGrocery(DEFAULT_WEEK_PLAN, mults, MEALS_BY_ID, undefined, 1);
  const familyOfThree = aggregateWeeklyGrocery(DEFAULT_WEEK_PLAN, mults, MEALS_BY_ID, undefined, 3);

  assert.equal(familyOfThree.items.length, single.items.length);
  assert.ok(
    Math.abs(familyOfThree.totalWeeklyCostInr - single.totalWeeklyCostInr * 3) <= 2,
    '3-person weekly grocery cost should be ~3x 1-person cost'
  );
  assert.equal(
    familyOfThree.items[0].totalGrams,
    single.items[0].totalGrams * 3,
    'top ingredient totalGrams should scale 3x'
  );
});

test('calculateHydrationTargetGlasses calibrates water targets by weight and activity level', () => {
  const initialHydration = createInitialHydrationState();
  assert.equal(Object.keys(initialHydration).length, 7);
  assert.equal(initialHydration.Mon, 0);

  const moderateLight = calculateHydrationTargetGlasses(55, 'moderate');
  const activeMid = calculateHydrationTargetGlasses(75, 'active');
  const athleteHeavy = calculateHydrationTargetGlasses(98, 'athlete');

  assert.ok(moderateLight >= 6 && moderateLight <= 10);
  assert.ok(activeMid > moderateLight);
  assert.ok(athleteHeavy >= activeMid && athleteHeavy <= 16);
});

test('allergen guardrails detect meal allergens, adapt weekly plan safely, and sanitize AI requests', () => {
  const eggMeal = MEALS_BY_ID['bf_moringa_egg_bhurji'];
  assert.ok(eggMeal);
  assert.ok(getMealAllergens(eggMeal).includes('eggs'));
  assert.equal(isMealSafeForAllergens(eggMeal, ['eggs']), false);
  assert.equal(isMealSafeForAllergens(eggMeal, ['fish']), true);

  const nutAndFishFree = buildWeekPlanForAllergens(['nuts', 'fish'], DEFAULT_WEEK_PLAN, 'non-veg');
  for (const day of Object.values(nutAndFishFree)) {
    for (const mealId of Object.values(day)) {
      const meal = MEALS_BY_ID[mealId];
      assert.equal(
        isMealSafeForAllergens(meal, ['nuts', 'fish']),
        true,
        `${meal.name} should not contain nuts or fish after adapting`
      );
    }
  }

  const dairyFree = buildWeekPlanForAllergens(['dairy'], DEFAULT_WEEK_PLAN, 'non-veg');
  let dairySafeSlots = 0;
  for (const day of Object.values(dairyFree)) {
    for (const mealId of Object.values(day)) {
      if (isMealSafeForAllergens(MEALS_BY_ID[mealId], ['dairy'])) {
        dairySafeSlots += 1;
      }
    }
  }
  assert.ok(dairySafeSlots >= 21, 'most or all slots should be dairy-free after adaptation');

  const req = validateLocalPlanRequest({
    locationQuery: 'Austin, TX',
    availableFoods: ['Chicken thighs'],
    excludedAllergens: ['dairy', 'nuts', 'invalid_value'],
  });
  assert.equal(req.ok, true);
  if (req.ok) {
    assert.deepEqual(req.data.excludedAllergens, ['dairy', 'nuts']);
  }
});

test('formatGroceryShareText formats remaining unchecked items grouped by channel for household size', () => {
  const mults = createInitialPortionMultipliers();
  const grocery = aggregateWeeklyGrocery(DEFAULT_WEEK_PLAN, mults, MEALS_BY_ID, undefined, 2);
  const firstId = grocery.items[0].food.id;
  const text = formatGroceryShareText(grocery.items, 'hyderabad', { [firstId]: true }, 2);

  assert.match(text, /2 people/);
  assert.equal(text.includes(grocery.items[0].food.name), false, 'checked pantry item must be excluded');
  assert.ok(text.includes(grocery.items[1].food.name), 'unchecked items must be included');

  const allChecked = Object.fromEntries(grocery.items.map((item) => [item.food.id, true]));
  const emptyText = formatGroceryShareText(grocery.items, 'hyderabad', allChecked, 2);
  assert.match(emptyText, /already stocked/i);
});

test('generateNextWeekPlan builds rotated and easy next-week menus respecting diet and allergens', () => {
  const rotated = generateNextWeekPlan(
    DEFAULT_WEEK_PLAN,
    'non-veg',
    ['nuts', 'fish'],
    MEAL_LIBRARY,
    undefined,
    'rotate'
  );
  let changedSlots = 0;
  for (const day of Object.keys(DEFAULT_WEEK_PLAN) as Array<keyof typeof DEFAULT_WEEK_PLAN>) {
    for (const slot of ['breakfast', 'lunch', 'snack', 'dinner'] as const) {
      const mealId = rotated[day][slot];
      const meal = MEALS_BY_ID[mealId];
      assert.ok(meal, `Meal ${mealId} must exist`);
      assert.equal(
        isMealSafeForAllergens(meal, ['nuts', 'fish']),
        true,
        `${meal.name} must respect nut and fish exclusions`
      );
      if (mealId !== DEFAULT_WEEK_PLAN[day][slot]) {
        changedSlots += 1;
      }
    }
  }
  assert.ok(changedSlots >= 10, 'rotate strategy should introduce variety vs current week');

  const easyVeg = generateNextWeekPlan(
    DEFAULT_WEEK_PLAN,
    'vegetarian',
    [],
    MEAL_LIBRARY,
    undefined,
    'easy'
  );
  for (const day of Object.values(easyVeg)) {
    for (const mealId of Object.values(day)) {
      const meal = MEALS_BY_ID[mealId];
      assert.equal(getMealDietType(meal), 'vegetarian');
      assert.equal(getMealDifficulty(meal), 'Easy');
    }
  }
});

test('computeNextWeekPrepBrief separates items to buy vs stocked, computes reuse score, and formats brief', () => {
  const mults = createInitialPortionMultipliers();
  const nextWeek = generateNextWeekPlan(
    DEFAULT_WEEK_PLAN,
    'non-veg',
    [],
    MEAL_LIBRARY,
    undefined,
    'rotate'
  );
  const fullBrief = computeNextWeekPrepBrief(nextWeek, mults, {}, MEALS_BY_ID, undefined, 2);

  assert.equal(fullBrief.toBuyItems.length, fullBrief.totalItemsCount);
  assert.equal(fullBrief.alreadyStockedItems.length, 0);
  assert.ok(fullBrief.ingredientReusePct >= 30 && fullBrief.ingredientReusePct <= 100);
  assert.ok(fullBrief.prepTasks.length >= 3);

  const firstItemId = fullBrief.toBuyItems[0].food.id;
  const partialBrief = computeNextWeekPrepBrief(
    nextWeek,
    mults,
    { [firstItemId]: true },
    MEALS_BY_ID,
    undefined,
    2
  );
  assert.equal(partialBrief.alreadyStockedItems.length, 1);
  assert.equal(partialBrief.toBuyItems.length, fullBrief.totalItemsCount - 1);
  assert.ok(partialBrief.toBuyCost < partialBrief.totalEstimatedCost);

  const shareText = formatNextWeekPrepBriefText(partialBrief, 'hyderabad', 2);
  assert.match(shareText, /Next Week Prep & Items/);
  assert.match(shareText, /2 people/);
  assert.equal(shareText.includes(fullBrief.toBuyItems[0].food.name), false);
});

test('getRecommendedLabPanel personalizes suggested tests by sex, age, diet, and symptoms', () => {
  const femaleVeg = getRecommendedLabPanel(
    { ...DEFAULT_PROFILE, sex: 'female', age: 48, diet: 'vegetarian' },
    'low energy and afternoon fatigue'
  );
  const ids = femaleVeg.map((t) => t.id);
  assert.ok(ids.includes('cbc_iron_ferritin'), 'female panel should include CBC & Ferritin');
  assert.ok(ids.includes('thyroid_tsh'), 'female 35+ / fatigue should include Thyroid Panel');
  assert.ok(ids.includes('vitamin_b12_folate'), 'vegetarian should include B12 & Folate');
  assert.ok(ids.includes('female_calcium_magnesium'), 'female 45+ should include bone mineral panel');

  const male45 = getRecommendedLabPanel(
    { ...DEFAULT_PROFILE, sex: 'male', age: 46, diet: 'non-veg' },
    ''
  );
  assert.ok(
    male45.some((t) => t.id === 'male_hormone_zinc'),
    'male panel should include morning hormone + zinc option'
  );
  assert.ok(male45.some((t) => t.id === 'apob_hscrp'), '45+ should include ApoB & hs-CRP');

  const checklist = formatLabChecklistText(
    femaleVeg.slice(0, 3),
    { [femaleVeg[0].id]: true },
    { sex: 'female', age: 48, diet: 'vegetarian' }
  );
  assert.match(checklist, /HydraPrep Diagnostic Lab Checklist/);
  assert.match(checklist, /CBC/);
});

test('validateLabInsightRequest blocks unsupported MIME types and oversized uploads, and normalizes AI reports', () => {
  const badMime = validateLabInsightRequest({
    mode: 'analyze_results',
    fileAttachment: {
      fileName: 'report.svg',
      mimeType: 'image/svg+xml',
      dataBase64: 'PHN2Zz48L3N2Zz4=',
    },
  });
  assert.equal(badMime.ok, false);

  const hugeBase64 = 'A'.repeat(6_000_000);
  const tooBig = validateLabInsightRequest({
    mode: 'analyze_results',
    fileAttachment: {
      fileName: 'huge.pdf',
      mimeType: 'application/pdf',
      dataBase64: hugeBase64,
    },
  });
  assert.equal(tooBig.ok, false);

  const validText = validateLabInsightRequest({
    mode: 'analyze_results',
    pastedResults: 'Vitamin D: 18 ng/mL, Ferritin: 28 ng/mL',
    symptomsOrGoals: 'Better recovery',
    profile: {
      age: 34,
      sex: 'female',
      diet: 'vegetarian',
      locationLabel: 'Hyderabad, Telangana',
    },
  });
  assert.equal(validText.ok, true);

  const normalized = normalizeLabAiReport(
    {
      summary: 'Vitamin D and ferritin are below optimal targets.',
      extractedMarkers: [
        {
          name: 'Vitamin D (25-OH)',
          value: '18',
          unit: 'ng/mL',
          status: 'attention',
          note: 'Pair sun exposure with fortified dairy or fatty fish.',
        },
      ],
      priorityFoodFocus: [
        {
          foodOrNutrient: 'Iron + Vitamin C',
          whyItHelps: 'Supports ferritin synthesis.',
          localFoodExamples: ['Spinach', 'Amaranth', 'Lemon'],
          suggestedMealSlot: 'lunch',
        },
      ],
      recommendedTests: [
        {
          testName: 'Vitamin B12',
          category: 'Metabolic Energy',
          priority: 'Core',
          whyRecommended: 'Confirms red blood cell synthesis status.',
          fastingRequired: false,
        },
      ],
      nextWeekAdjustments: ['Add moringa and sesame chutney twice next week.'],
    },
    'analyze_results',
    '2026-11-23T12:00:00.000Z'
  );
  assert.equal(normalized.extractedMarkers.length, 1);
  assert.equal(normalized.extractedMarkers[0].status, 'attention');
  assert.equal(normalized.priorityFoodFocus.length, 1);
  assert.match(normalized.medicalDisclaimer, /not medical advice/i);
});



