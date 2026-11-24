import test from 'node:test';
import assert from 'node:assert/strict';
import { recipeToMeal } from './recipeImport';

test('recipeToMeal converts SpoonCharacterRecipeInfo with matched foods', () => {
  const info = {
    id: 1234,
    title: 'Garlic Chicken Stir Fry',
    readyInMinutes: 20,
    servings: 4,
    nutrition: { calories: 210, protein: 30, fat: 8, carbs: 5, fiber: 2 },
    extendedIngredients: [
      { id: 1, name: 'chicken breast', amount: 200, unit: 'g' },
      { id: 2, name: 'spinach', amount: 100, unit: 'g' },
      { id: 3, name: 'garlic', amount: 15, unit: 'g' },
      { id: 4, name: 'salt', amount: 1, unit: 'g' },
    ],
  };
  const meal = recipeToMeal(info, 'dinner');
  assert.ok(meal);
  assert.equal(meal.id, 'spoon_recipe_1234');
  assert.equal(meal.name, 'Garlic Chicken Stir Fry');
  assert.equal(meal.slot, 'dinner');
  assert.ok(meal.ingredients.some((i) => i.foodId === 'chicken_breast' && i.grams === 200));
  assert.ok(meal.ingredients.some((i) => i.foodId === 'spinach' && i.grams === 100));
  // Salt isn't in the HydroPrep foods catalog — filtered out.
  assert.ok(!meal.ingredients.some((i) => i.foodId === 'salt'));
});

test('recipeToMeal returns null when no ingredients match', () => {
  const info = {
    id: 5,
    title: 'Fancy Dessert',
    nutrition: { calories: 1 },
    extendedIngredients: [{ id: 9, name: 'magic dust', amount: 10, unit: 'g' }],
  };
  assert.equal(recipeToMeal(info, 'lunch'), null);
});
