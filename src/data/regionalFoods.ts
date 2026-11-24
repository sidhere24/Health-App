import type { WholeFood } from '../types/nutrition';

/**
 * Global (non-Indian) foods for each region, generated via the Spoonacular API:
 * `npm run generate:regional-foods` with a SPOONACULAR_API_KEY in `.env`.
 *
 * Committed to keep the app offline-capable and free. `getLocalizedFoods` falls
 * back to HYDERABAD_FOODS when an entry is empty.
 */
export const REGIONAL_FOODS: Record<string, WholeFood[]> = {
  usa: [],
  uk: [],
};
