export type GoalMode = 'recomp' | 'fat-loss' | 'lean-gain';

export type ActivityLevel = 'moderate' | 'active' | 'athlete';

export type DietPreference = 'non-veg' | 'eggetarian' | 'vegetarian';

export type BiologicalSex = 'female' | 'male' | 'neutral';

export type TextSizeMode = 'standard' | 'large';

export type AllergenId = 'dairy' | 'eggs' | 'nuts' | 'fish' | 'soy';

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

export type MealDifficulty = 'Easy' | 'Moderate' | 'Pro';

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
  sex?: BiologicalSex;
  age: number;
  weightKg: number;
  heightCm: number;
  activity: ActivityLevel;
  goal: GoalMode;
  diet?: DietPreference;
  excludedAllergens?: AllergenId[];
  householdServings?: number;
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
  difficulty: MealDifficulty;
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

export type HydrationState = Record<DayOfWeek, number>;

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

export interface AiLocalPlanRequest {
  locationQuery: string;
  availableFoods: string[];
  kitchenNote?: string;
  locationId: LocationId;
  currencyCode: string;
  currencySymbol: string;
  sex?: BiologicalSex;
  age: number;
  weightKg: number;
  heightCm: number;
  goal: GoalMode;
  activity: ActivityLevel;
  diet: DietPreference;
  excludedAllergens?: AllergenId[];
  dailyBudget: number;
  targets: MacroTargets;
}

export interface AiGeneratedFoodItem {
  key: string;
  name: string;
  localName: string;
  marketChannel: MarketChannel;
  sourceNote: string;
  pricePer100g: number;
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
}

export interface AiGeneratedMealItem {
  key: string;
  name: string;
  slot: MealSlot;
  focusTag: HormonalPathway;
  prepTimeMinutes: number;
  difficulty: MealDifficulty;
  batchFriendly: boolean;
  ingredients: Array<{
    foodKey: string;
    grams: number;
    prepNote?: string;
  }>;
  prepSteps: string[];
  hormonalBenefit: string;
}

export interface AiLocalMealPlan {
  id: string;
  generatedAt: string;
  locationName: string;
  regionalOverview: string;
  availableFoodsUsed: string[];
  localFoods: AiGeneratedFoodItem[];
  meals: AiGeneratedMealItem[];
  weekSchedule: Record<DayOfWeek, Record<MealSlot, string>>;
  batchTasks: Array<{
    session: 'Sunday Batch (75 min)' | 'Wednesday Refresh (45 min)';
    title: string;
    detail: string;
    storageNote: string;
  }>;
}

export type NextWeekStrategy = 'rotate' | 'repeat' | 'easy';

export interface NextWeekPrepTask {
  id: string;
  category: 'Soak & Grains' | 'Proteins & Eggs' | 'Produce & Greens' | 'Seeds & Fats';
  title: string;
  detail: string;
  estimatedMinutes: number;
}

export interface NextWeekPrepBrief {
  totalEstimatedCost: number;
  toBuyCost: number;
  dailyAverageCost: number;
  totalItemsCount: number;
  toBuyItems: GroceryAggregateItem[];
  alreadyStockedItems: GroceryAggregateItem[];
  sharedStaplesCount: number;
  ingredientReusePct: number;
  prepTasks: NextWeekPrepTask[];
}

export type LabMarkerStatus = 'optimal' | 'borderline' | 'attention' | 'info';

export type LabTestPriority = 'Core' | 'Targeted' | 'Optional';

export interface LabMarkerInsight {
  name: string;
  value: string;
  unit: string;
  status: LabMarkerStatus;
  note: string;
}

export interface LabFoodFocus {
  foodOrNutrient: string;
  whyItHelps: string;
  localFoodExamples: string[];
  suggestedMealSlot: MealSlot;
}

export interface LabRecommendedTest {
  id: string;
  testName: string;
  category: string;
  whyRecommended: string;
  fastingRequired: boolean;
  priority: LabTestPriority;
}

export interface LabAiInsightReport {
  id: string;
  generatedAt: string;
  mode: 'analyze_results' | 'suggest_tests';
  summary: string;
  extractedMarkers: LabMarkerInsight[];
  priorityFoodFocus: LabFoodFocus[];
  recommendedTests: LabRecommendedTest[];
  nextWeekAdjustments: string[];
  medicalDisclaimer: string;
}

export interface LabFileAttachment {
  fileName: string;
  mimeType: string;
  dataBase64: string;
}


