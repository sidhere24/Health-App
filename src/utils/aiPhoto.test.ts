import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIdentifyResponse, findBestMealForFoods } from './aiPhoto';
import { MEAL_LIBRARY, HYDERABAD_FOODS } from '../data/hyderabadMeals';
import { FOODS_BY_ID } from './nutrition';

test('normalizeIdentifyResponse parses valid photo output', () => {
  const raw = JSON.stringify({
    foods: [
      { name: 'Chicken Breast', grams: 170 },
      { name: 'Spinach', grams: 100 },
      { name: 'Beetroot', grams: 80 },
      { name: '', grams: 10 },
      { name: 'Tomato', grams: 'bad' },
    ],
    note: 'Photo of lunch',
  });
  const res = normalizeIdentifyResponse(raw);
  assert.deepEqual(res.foods, [
    { name: 'Chicken Breast', grams: 170 },
    { name: 'Spinach', grams: 100 },
    { name: 'Beetroot', grams: 80 },
    { name: 'Tomato', grams: 0 },
  ]);
  assert.equal(res.note, 'Photo of lunch');
});

test('normalizeIdentifyResponse degrades gracefully on invalid input', () => {
  assert.deepEqual(normalizeIdentifyResponse('not json'), { foods: [], note: undefined });
  assert.deepEqual(normalizeIdentifyResponse('{"foods": "nope"}'), { foods: [], note: undefined });
  assert.deepEqual(normalizeIdentifyResponse('{"foods": [{"name":"x","grams":1}], "note":"n"}'), {
    foods: [{ name: 'x', grams: 1 }],
    note: 'n',
  });
});

test('findBestMealForFoods matches photo foods to meals', () => {
  const meal = MEAL_LIBRARY.find((m) => m.id === 'ln_chicken_palak_rice')!;
  const foodsById = FOODS_BY_ID;
  const firstTwo = meal.ingredients.slice(0, 2).map((i) => ({
    name: foodsById[i.foodId]!.name,
    grams: 50,
  }));
  const mealsById = Object.fromEntries(MEAL_LIBRARY.map((m) => [m.id, m]));
  const match = findBestMealForFoods(firstTwo, mealsById, foodsById);
  assert.ok(match);
  assert.equal(match!.mealId, meal.id);
  assert.ok(match!.score >= 2);

  const none = findBestMealForFoods([{ name: 'climbed Mountainbike', grams: 500 }], mealsById, foodsById);
  assert.equal(none, null);
});
