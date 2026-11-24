import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROFILE, DEFAULT_WEEK_PLAN, HYDERABAD_FOODS, MEAL_LIBRARY } from '../data/hyderabadMeals';
import { computeConsistencyMetrics, getNextUnloggedSlot, partitionGroceryByFulfillment } from './habits';
import { buildIngredientPurchaseLink, getCleanProductQuery, sanitizeExternalUrl } from './links';
import {
  aggregateWeeklyGrocery,
  buildWeekPlanForDiet,
  buildWeeklyMacroTrendData,
  calculateBiometricTargets,
  computeDayTotals,
  computeMealNutrition,
  createInitialConsumedState,
  createInitialPortionMultipliers,
  filterWholeFoods,
  formatCurrency,
  formatPracticalQuantity,
  getCurrentDayOfWeek,
  getLocalizedFoodsById,
  getMealDietType,
  getMealsByLocation,
  getMealsById,
  MEALS_BY_ID,
  PORTION_STEPS,
  scalePortionsToTarget,
} from './nutrition';
import { US_MEALS, UK_MEALS } from '../data/usUkMeals';

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
  const usChicken =
    Object.values(usFoods).find((f) => f.name.toLowerCase().includes('chicken breast')) ??
    Object.values(usFoods).find((f) => f.name.toLowerCase().includes('chicken'));
  assert.ok(usChicken, 'USA foods are available');
  assert.ok(usChicken.pricePer100gInr > 0);
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

test('formatPracticalQuantity renders eggs, curd kg, and generic grams labels', () => {
  assert.equal(formatPracticalQuantity('whole_eggs', 200), '4 eggs (~200 g)');
  assert.equal(formatPracticalQuantity('curd_dahi', 1250), '1.25 kg / L');
  assert.equal(formatPracticalQuantity('curd_dahi', 500), '500 g');
  assert.equal(formatPracticalQuantity('spinach', 300), '300 g');
});

test('formatPracticalQuantity renders imperial quantities for usa/uk', () => {
  assert.equal(formatPracticalQuantity('spinach', 100, 'usa'), '4 oz');
  assert.equal(formatPracticalQuantity('spinach', 500, 'usa'), '1.1 lb');
  assert.equal(formatPracticalQuantity('spinach', 500, 'uk'), '1.1 lb');
  assert.equal(formatPracticalQuantity('whole_eggs', 100, 'usa'), '2 eggs (~4 oz)');
});

test('getMealsByLocation returns US/UK libraries for global regions and base library otherwise', () => {
  assert.deepEqual(getMealsByLocation('usa'), US_MEALS);
  assert.deepEqual(getMealsByLocation('uk'), UK_MEALS);
  assert.deepEqual(getMealsByLocation('hyderabad'), MEAL_LIBRARY);
  assert.equal(Object.keys(getMealsById('usa')).length, US_MEALS.length);
  assert.equal(Object.keys(getMealsById('uk')).length, UK_MEALS.length);
});

test('scalePortionsToTarget snaps every day to the allowed portion steps', () => {
  const heavyTargets = calculateBiometricTargets({ ...DEFAULT_PROFILE, weightKg: 105, age: 30 });
  const heavyMults = scalePortionsToTarget(DEFAULT_WEEK_PLAN, heavyTargets);
  for (const dayMults of Object.values(heavyMults)) {
    for (const mult of Object.values(dayMults)) {
      assert.ok(PORTION_STEPS.includes(mult), `portion multiplier ${mult} is not a snapped step`);
    }
  }
});


