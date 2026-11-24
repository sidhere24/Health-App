import test from 'node:test';
import assert from 'node:assert/strict';
import { FOODS_BY_ID, getMealsById, getMealsByLocation } from '../utils/nutrition';
import { MEAL_LIBRARY } from './hyderabadMeals';
import { MEALS_BY_LOCATION, UK_MEALS, US_MEALS } from './usUkMeals';

const MEAL_SLOTS = new Set(['breakfast', 'lunch', 'snack', 'dinner']);

test('US/UK meal libraries cover all slots with catalog-resolvable ingredients', () => {
  for (const region of ['usa', 'uk'] as const) {
    const meals = MEALS_BY_LOCATION[region];
    assert.ok(meals.length > 0, `${region} meal library must be non-empty`);
    const seen = new Set<string>();
    for (const meal of meals) {
      assert.ok(MEAL_SLOTS.has(meal.slot), `${meal.id} has a valid slot`);
      assert.ok(seen.has(meal.id) === false, `${meal.id} is unique`);
      seen.add(meal.id);
      assert.ok(meal.prepSteps.length > 0, `${meal.id} has prep steps`);
      assert.ok(meal.hormonalBenefit.length > 0, `${meal.id} has a hormonal benefit note`);
      for (const ing of meal.ingredients) {
        assert.ok(ing.foodId, `${meal.id} ingredient has a foodId`);
        assert.ok(FOODS_BY_ID[ing.foodId], `${meal.id} ingredient ${ing.foodId} resolves to a food`);
        assert.ok(ing.grams > 0, `${meal.id} ingredient ${ing.foodId} has positive grams`);
      }
    }
  }
  assert.equal(US_MEALS.length, 4);
  assert.equal(UK_MEALS.length, 4);
});

test('getMealsByLocation/getMealsById return US/UK libraries for global regions', () => {
  assert.deepEqual(getMealsByLocation('usa'), US_MEALS);
  assert.deepEqual(getMealsByLocation('uk'), UK_MEALS);
  assert.deepEqual(getMealsByLocation('hyderabad'), MEAL_LIBRARY);
  assert.equal(Object.keys(getMealsById('usa')).length, US_MEALS.length);
  assert.equal(Object.keys(getMealsById('uk')).length, UK_MEALS.length);
  assert.ok(getMealsById('usa')['us_bf_oats_egg_bowl']);
});
