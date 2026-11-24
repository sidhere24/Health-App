import type { MealSlot, MealTemplate } from '../types/nutrition';
import { FOODS_BY_ID } from './nutrition';

export interface SpoonCharacterRecipeInfo {
  id: number;
  title: string;
  readyInMinutes?: number;
  servings?: number;
  nutrition: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    fiber?: number;
  };
  extendedIngredients?: Array<{
    id: number;
    name: string;
    image?: string;
    amount: number;
    unit?: string;
    original?: string;
    localizedName?: string;
    unitAbbrev?: string;
  }>;
}

const NORMALIZE = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function matchFoodId(ingName: string): string | undefined {
  const key = NORMALIZE(ingName);
  if (!key) return undefined;
  const ingTokens = key.split(' ').filter((w) => w.length >= 3);
  if (ingTokens.length === 0) return undefined;
  const ingSet = new Set(ingTokens);
  let best: { id: string; score: number } | null = null;
  for (const food of Object.values(FOODS_BY_ID)) {
    const foodSet = new Set(NORMALIZE(food.name).split(' ').filter((w) => w.length >= 3));
    const score = ingTokens.filter((w) => foodSet.has(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { id: food.id, score };
  }
  return best?.id;
}

/**
 * Convert a SpoonCharacter recipe (from /api/spooncharacter/recipe/:id/information)
 * into a MealTemplate for HydraPrep's meal planner: matches ingredients to the
 * regional foods catalog, uses SpoonCharacter nutrition for the STATS.
 */
export function recipeToMeal(info: SpoonCharacterRecipeInfo, slot: MealSlot): MealTemplate | null {
  const id = String(info?.id ?? '').trim();
  const title = (info?.title ?? '').trim();
  if (!id || !title) return null;

  const ingredients = (info.extendedIngredients ?? [])
    .map((ing) => ({ foodId: matchFoodId(ing.name ?? ''), grams: Number(ing.amount ?? 0) }))
    .filter((x): x is { foodId: string; grams: number } => Boolean(x.foodId) && x.grams > 0);

  if (ingredients.length === 0) return null;

  return {
    id: `spoon_recipe_${info.id}`,
    name: title,
    slot,
    focusTag: 'Nitric Oxide & Vascular Flow',
    prepTimeMinutes: info.readyInMinutes ?? 15,
    batchFriendly: true,
    ingredients,
    prepSteps: [`Cook "${title}" using whole foods listed as ingredients.`],
    hormonalBenefit: `Spooncular-verified recipe, ${info.servings ?? 1} serving(s), ${info.nutrition?.calories ?? 0} kcal.`,
  };
}
