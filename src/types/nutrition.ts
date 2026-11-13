export type GoalMode = 'recomp' | 'fat-loss' | 'lean-gain';

export type ActivityLevel = 'moderate' | 'active' | 'athlete';

export type DietPreference = 'non-veg' | 'eggetarian' | 'vegetarian';

export type AgeGroupId = '18-25' | '26-35' | '36-45' | '46-60' | '60+';

export type WeightClassId = 'light' | 'middle' | 'cruiser' | 'heavy';

export type LocationId = 'hyderabad' | 'bengaluru' | 'mumbai' | 'delhi' | 'usa' | 'uk';

export type StorePlatform =
  | 'amazon_in'
  | 'bigbasket'
  | 'blinkit'
  | 'amazon_com'
  | 'amazon_co_uk';

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export type MarketChannel =
  | 'Rythu Bazaar · Produce'
  | 'Begum Bazaar · Seeds & Grains'
  | 'Local Poultry, Fish & Butcher'
  | 'Dairy & Eggs';

export type HormonalPathway =
  | 'Testosterone & Steroidogenesis'
  | 'Nitric Oxide & Vascular Flow'
  | 'Sperm Quality & Zinc/Selenium'
  | 'Cortisol & Stress Recovery';

export interface UserProfile {
  age: number;
  weightKg: number;
  heightCm: number;
  activity: ActivityLevel;
  goal: GoalMode;
  diet?: DietPreference;
  locationId: LocationId;
  dailyBudgetInr: number;
}

export interface WeeklyArchiveEntry {
  weekLabel: string;
  loggedMeals: number;
  totalMeals: number;
  adherencePct: number;
  activeDays: number;
}

export interface MacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  zincMg: number;
  magnesiumMg: number;
  seleniumMcg: number;
  nitratesMg: number;
  dailyBudgetInr: number;
}

export interface WholeFood {
  id: string;
  name: string;
  localName: string;
  marketChannel: MarketChannel;
  hyderabadSourceNote: string;
  pricePer100gInr: number;
  /** Nutrition per 100g edible portion */
  per100g: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    zincMg: number;
    magnesiumMg: number;
    seleniumMcg: number;
    nitratesMg: number;
  };
  primaryPathway: HormonalPathway;
  bioactiveMechanism: string;
  prepTip: string;
  isCustom?: boolean;
}

export interface MealIngredient {
  foodId: string;
  grams: number;
  prepNote?: string;
}

export interface MealTemplate {
  id: string;
  name: string;
  slot: MealSlot;
  focusTag: HormonalPathway;
  prepTimeMinutes: number;
  batchFriendly: boolean;
  ingredients: MealIngredient[];
  prepSteps: string[];
  hormonalBenefit: string;
}

export interface NutritionSummary {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  zincMg: number;
  magnesiumMg: number;
  seleniumMcg: number;
  nitratesMg: number;
  costInr: number;
}

export type DayMealSelection = Record<MealSlot, string>;

export type WeekPlan = Record<DayOfWeek, DayMealSelection>;

export type PortionMultipliers = Record<DayOfWeek, Record<MealSlot, number>>;

export type ConsumedState = Record<DayOfWeek, Record<MealSlot, boolean>>;

export interface BatchTask {
  id: string;
  session: 'Sunday Batch (75 min)' | 'Wednesday Refresh (45 min)';
  title: string;
  detail: string;
  storageNote: string;
}

export interface GroceryAggregateItem {
  food: WholeFood;
  totalGrams: number;
  totalCostInr: number;
  practicalQuantityLabel: string;
}

export interface AffiliateLinkConfig {
  storePlatform: StorePlatform;
  affiliateTag: string;
  customUrls: Record<string, string>;
}
