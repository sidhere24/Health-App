export interface SpoonacularNutrition {
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
}

export interface SpoonacularSearchResult {
  id: number;
  title: string;
  readyInMinutes?: number;
  servings?: number;
  nutrition?: SpoonacularNutrition;
}
