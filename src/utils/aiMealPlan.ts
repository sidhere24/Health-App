import { DAYS_OF_WEEK } from '../data/hyderabadMeals';
import type {
  ActivityLevel,
  AiGeneratedFoodItem,
  AiGeneratedMealItem,
  AiLocalMealPlan,
  AiLocalPlanRequest,
  AllergenId,
  BatchTask,
  BiologicalSex,
  DayOfWeek,
  DietPreference,
  GoalMode,
  HormonalPathway,
  LocationId,
  MarketChannel,
  MealDifficulty,
  MealSlot,
  MealTemplate,
  WeekPlan,
  WholeFood,
} from '../types/nutrition';
import { inferMealDifficulty } from './nutrition';

const VALID_MARKET_CHANNELS: MarketChannel[] = [
  'Rythu Bazaar · Produce',
  'Begum Bazaar · Seeds & Grains',
  'Local Poultry, Fish & Butcher',
  'Dairy & Eggs',
];

const VALID_PATHWAYS: HormonalPathway[] = [
  'Testosterone & Steroidogenesis',
  'Nitric Oxide & Vascular Flow',
  'Sperm Quality & Zinc/Selenium',
  'Cortisol & Stress Recovery',
];

const VALID_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];
const VALID_GOALS: GoalMode[] = ['recomp', 'fat-loss', 'lean-gain'];
const VALID_ACTIVITIES: ActivityLevel[] = ['moderate', 'active', 'athlete'];
const VALID_DIETS: DietPreference[] = ['non-veg', 'eggetarian', 'vegetarian'];
const VALID_SEXES: BiologicalSex[] = ['female', 'male', 'neutral'];
const VALID_ALLERGENS: AllergenId[] = ['dairy', 'eggs', 'nuts', 'fish', 'soy'];
const VALID_LOCATIONS: LocationId[] = ['hyderabad', 'bengaluru', 'mumbai', 'delhi', 'usa', 'uk'];

export const REGIONAL_FOOD_SUGGESTIONS: Record<LocationId, string[]> = {
  hyderabad: [
    'Gongura leaves',
    'Country eggs',
    'Korameenu / Rohu fish',
    'Jowar & Ragi flour',
    'Moringa (Munagaku)',
    'Roasted peanuts & pumpkin seeds',
  ],
  bengaluru: [
    'Ragi flour',
    'Nugge soppu (Moringa)',
    'Mangalore Bangda mackerel',
    'Nandini curd & paneer',
    'Avarekalu / Sprouted moong',
    'Coconut & sesame seeds',
  ],
  mumbai: [
    'Fresh Bangda / Surmai fish',
    'Nachni & Jowar bhakri flour',
    'Shevgyachya pala (Moringa)',
    'Sprouted matki & moong',
    'Kokum & pomegranate',
    'Whole eggs & Amul paneer',
  ],
  delhi: [
    'Bajra & Jowar atta',
    'Sarson / Palak / Methi greens',
    'Mother Dairy paneer & curd',
    'Kashmiri walnuts & almonds',
    'Kala chana & moong dal',
    'Chicken breast & whole eggs',
  ],
  usa: [
    'Pasture-raised whole eggs',
    'Wild sardines / Atlantic mackerel',
    'Baby kale & red beets',
    'Greek yogurt & cottage cheese',
    'Raw pepitas (pumpkin seeds)',
    'Chicken thighs & jasmine rice',
  ],
  uk: [
    'Atlantic mackerel fillets',
    'Free-range eggs',
    'Cavolo nero & watercress',
    'Live natural yogurt / kefir',
    'Oats & red lentils',
    'Beetroot & pumpkin seeds',
  ],
};

export function getLocalFoodSuggestionsForRegion(locationId: LocationId): string[] {
  return REGIONAL_FOOD_SUGGESTIONS[locationId] ?? REGIONAL_FOOD_SUGGESTIONS.hyderabad;
}

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function cleanText(value: unknown, maxLen: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLen) || fallback;
}

function slugKey(raw: string, fallbackPrefix: string, index: number): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 36);
  return cleaned || `${fallbackPrefix}_${index + 1}`;
}

export function validateLocalPlanRequest(
  body: unknown
): { ok: true; data: AiLocalPlanRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request payload must be a JSON object.' };
  }

  const input = body as Record<string, unknown>;
  const locationQuery = cleanText(input.locationQuery, 120);
  if (locationQuery.length < 2) {
    return { ok: false, error: 'Please enter a city, neighborhood, or region (at least 2 characters).' };
  }

  const rawFoods = Array.isArray(input.availableFoods)
    ? input.availableFoods
    : typeof input.availableFoods === 'string'
      ? input.availableFoods.split(',')
      : [];

  const availableFoods = rawFoods
    .map((f) => cleanText(f, 60))
    .filter((f) => f.length > 0)
    .slice(0, 20);

  const locationId: LocationId = VALID_LOCATIONS.includes(input.locationId as LocationId)
    ? (input.locationId as LocationId)
    : 'hyderabad';

  const goal: GoalMode = VALID_GOALS.includes(input.goal as GoalMode)
    ? (input.goal as GoalMode)
    : 'recomp';

  const activity: ActivityLevel = VALID_ACTIVITIES.includes(input.activity as ActivityLevel)
    ? (input.activity as ActivityLevel)
    : 'active';

  const diet: DietPreference = VALID_DIETS.includes(input.diet as DietPreference)
    ? (input.diet as DietPreference)
    : 'non-veg';

  const sex: BiologicalSex = VALID_SEXES.includes(input.sex as BiologicalSex)
    ? (input.sex as BiologicalSex)
    : 'neutral';

  const excludedAllergens: AllergenId[] = Array.isArray(input.excludedAllergens)
    ? Array.from(
        new Set(
          input.excludedAllergens.filter((a): a is AllergenId =>
            VALID_ALLERGENS.includes(a as AllergenId)
          )
        )
      )
    : [];

  const rawTargets = (input.targets && typeof input.targets === 'object'
    ? input.targets
    : {}) as Record<string, unknown>;

  const age = Math.round(clampNum(input.age, 18, 85, 32));
  const weightKg = Math.round(clampNum(input.weightKg, 40, 180, 80));
  const heightCm = Math.round(clampNum(input.heightCm, 135, 225, 175));
  const dailyBudget = clampNum(input.dailyBudget, 5, 10000, 300);

  return {
    ok: true,
    data: {
      locationQuery,
      availableFoods,
      kitchenNote: cleanText(input.kitchenNote, 200) || undefined,
      locationId,
      currencyCode: cleanText(input.currencyCode, 8, 'INR'),
      currencySymbol: cleanText(input.currencySymbol, 4, '₹'),
      sex,
      age,
      weightKg,
      heightCm,
      goal,
      activity,
      diet,
      excludedAllergens,
      dailyBudget,
      targets: {
        calories: Math.round(clampNum(rawTargets.calories, 1400, 5000, 2500)),
        proteinG: Math.round(clampNum(rawTargets.proteinG, 80, 350, 160)),
        carbsG: Math.round(clampNum(rawTargets.carbsG, 80, 600, 280)),
        fatG: Math.round(clampNum(rawTargets.fatG, 40, 220, 80)),
        fiberG: Math.round(clampNum(rawTargets.fiberG, 15, 90, 35)),
        zincMg: Math.round(clampNum(rawTargets.zincMg, 8, 40, 14)),
        magnesiumMg: Math.round(clampNum(rawTargets.magnesiumMg, 250, 800, 420)),
        seleniumMcg: Math.round(clampNum(rawTargets.seleniumMcg, 40, 200, 65)),
        nitratesMg: Math.round(clampNum(rawTargets.nitratesMg, 150, 800, 320)),
        dailyBudgetInr: dailyBudget,
      },
    },
  };
}

function normalizeMarketChannel(raw: unknown): MarketChannel {
  if (typeof raw === 'string' && VALID_MARKET_CHANNELS.includes(raw as MarketChannel)) {
    return raw as MarketChannel;
  }
  const lower = typeof raw === 'string' ? raw.toLowerCase() : '';
  if (lower.includes('seed') || lower.includes('grain') || lower.includes('pantry') || lower.includes('nut') || lower.includes('lentil')) {
    return 'Begum Bazaar · Seeds & Grains';
  }
  if (lower.includes('poultry') || lower.includes('fish') || lower.includes('meat') || lower.includes('butcher')) {
    return 'Local Poultry, Fish & Butcher';
  }
  if (lower.includes('dairy') || lower.includes('egg') || lower.includes('milk') || lower.includes('yogurt')) {
    return 'Dairy & Eggs';
  }
  return 'Rythu Bazaar · Produce';
}

function normalizePathway(raw: unknown): HormonalPathway {
  if (typeof raw === 'string' && VALID_PATHWAYS.includes(raw as HormonalPathway)) {
    return raw as HormonalPathway;
  }
  const lower = typeof raw === 'string' ? raw.toLowerCase() : '';
  if (lower.includes('nitric') || lower.includes('vascular') || lower.includes('blood')) {
    return 'Nitric Oxide & Vascular Flow';
  }
  if (lower.includes('sperm') || lower.includes('zinc') || lower.includes('selenium')) {
    return 'Sperm Quality & Zinc/Selenium';
  }
  if (lower.includes('cortisol') || lower.includes('stress') || lower.includes('sleep')) {
    return 'Cortisol & Stress Recovery';
  }
  return 'Testosterone & Steroidogenesis';
}

function normalizeDifficulty(
  raw: unknown,
  prepTimeMinutes: number,
  stepCount: number
): MealDifficulty {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    if (lower === 'easy' || lower === 'beginner' || lower === 'quick') return 'Easy';
    if (lower === 'moderate' || lower === 'medium' || lower === 'intermediate') return 'Moderate';
    if (lower === 'pro' || lower === 'hard' || lower === 'advanced') return 'Pro';
  }
  return inferMealDifficulty(prepTimeMinutes, stepCount);
}

/**
 * Validates and normalizes structured JSON from Gemini into a guaranteed-valid
 * AiLocalMealPlan where every meal ingredient references a valid local food and
 * every day/slot references a valid generated meal.
 */
export function normalizeAiLocalMealPlan(
  raw: unknown,
  meta: { locationQuery: string; availableFoods: string[]; nowIso?: string }
): AiLocalMealPlan {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI response did not return a valid meal plan object.');
  }

  const obj = raw as Record<string, unknown>;
  const rawFoods = Array.isArray(obj.localFoods) ? obj.localFoods : [];
  if (rawFoods.length < 4) {
    throw new Error('AI response returned too few local whole foods to construct a weekly plan.');
  }

  const seenFoodKeys = new Set<string>();
  const localFoods: AiGeneratedFoodItem[] = [];

  rawFoods.slice(0, 24).forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') return;
    const f = entry as Record<string, unknown>;
    const name = cleanText(f.name, 80);
    if (!name) return;

    let key = slugKey(cleanText(f.key, 40) || name, 'food', idx);
    while (seenFoodKeys.has(key)) {
      key = `${key}_${idx + 1}`;
    }
    seenFoodKeys.add(key);

    const per = (f.per100g && typeof f.per100g === 'object'
      ? f.per100g
      : {}) as Record<string, unknown>;

    localFoods.push({
      key,
      name,
      localName: cleanText(f.localName, 80, name),
      marketChannel: normalizeMarketChannel(f.marketChannel),
      sourceNote: cleanText(f.sourceNote, 140, `Local ${meta.locationQuery} market staple`),
      pricePer100g: Math.round(clampNum(f.pricePer100g, 0.05, 2500, 15) * 100) / 100,
      per100g: {
        calories: Math.round(clampNum(per.calories, 5, 950, 120)),
        proteinG: Math.round(clampNum(per.proteinG, 0, 90, 8) * 10) / 10,
        carbsG: Math.round(clampNum(per.carbsG, 0, 100, 14) * 10) / 10,
        fatG: Math.round(clampNum(per.fatG, 0, 100, 4) * 10) / 10,
        fiberG: Math.round(clampNum(per.fiberG, 0, 50, 2) * 10) / 10,
        zincMg: Math.round(clampNum(per.zincMg, 0, 30, 0.8) * 10) / 10,
        magnesiumMg: Math.round(clampNum(per.magnesiumMg, 0, 600, 35)),
        seleniumMcg: Math.round(clampNum(per.seleniumMcg, 0, 400, 8) * 10) / 10,
        nitratesMg: Math.round(clampNum(per.nitratesMg, 0, 600, 15)),
      },
      primaryPathway: normalizePathway(f.primaryPathway),
      bioactiveMechanism: cleanText(
        f.bioactiveMechanism,
        220,
        'Supports daily protein synthesis and micronutrient adequacy.'
      ),
      prepTip: cleanText(f.prepTip, 160, 'Wash and portion during weekly batch prep.'),
    });
  });

  if (localFoods.length < 4) {
    throw new Error('AI response contained insufficient valid whole-food entries.');
  }

  const foodKeysSet = new Set(localFoods.map((f) => f.key));
  const fallbackFoodKey = localFoods[0].key;

  const rawMeals = Array.isArray(obj.meals) ? obj.meals : [];
  const seenMealKeys = new Set<string>();
  const meals: AiGeneratedMealItem[] = [];

  rawMeals.slice(0, 20).forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') return;
    const m = entry as Record<string, unknown>;
    const name = cleanText(m.name, 110);
    if (!name) return;

    const slot: MealSlot = VALID_SLOTS.includes(m.slot as MealSlot)
      ? (m.slot as MealSlot)
      : VALID_SLOTS[idx % 4];

    let key = slugKey(cleanText(m.key, 40) || name, slot, idx);
    while (seenMealKeys.has(key)) {
      key = `${key}_${idx + 1}`;
    }
    seenMealKeys.add(key);

    const rawIngredients = Array.isArray(m.ingredients) ? m.ingredients : [];
    const ingredients = rawIngredients
      .map((ing) => {
        if (!ing || typeof ing !== 'object') return null;
        const item = ing as Record<string, unknown>;
        const rawKey = slugKey(cleanText(item.foodKey, 40), 'food', 0);
        const resolvedKey = foodKeysSet.has(rawKey)
          ? rawKey
          : localFoods.find(
              (f) =>
                f.key === item.foodKey ||
                f.name.toLowerCase() === String(item.foodKey ?? '').toLowerCase()
            )?.key;
        if (!resolvedKey) return null;
        return {
          foodKey: resolvedKey,
          grams: Math.round(clampNum(item.grams, 5, 700, 100)),
          prepNote: cleanText(item.prepNote, 80) || undefined,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (ingredients.length === 0) {
      ingredients.push({ foodKey: fallbackFoodKey, grams: 150, prepNote: undefined });
    }

    const prepSteps = (Array.isArray(m.prepSteps) ? m.prepSteps : [])
      .map((s) => cleanText(s, 220))
      .filter((s) => s.length > 0)
      .slice(0, 5);

    const prepTimeMinutes = Math.round(clampNum(m.prepTimeMinutes, 3, 90, 15));
    const normalizedSteps =
      prepSteps.length > 0 ? prepSteps : ['Combine local ingredients and cook until tender.'];

    meals.push({
      key,
      name,
      slot,
      focusTag: normalizePathway(m.focusTag),
      prepTimeMinutes,
      difficulty: normalizeDifficulty(m.difficulty, prepTimeMinutes, normalizedSteps.length),
      batchFriendly: typeof m.batchFriendly === 'boolean' ? m.batchFriendly : true,
      ingredients,
      prepSteps: normalizedSteps,
      hormonalBenefit: cleanText(
        m.hormonalBenefit,
        220,
        'Delivers regional whole-food protein, minerals, and steady energy.'
      ),
    });
  });

  // Ensure every slot has at least 1 meal
  const mealsBySlot: Record<MealSlot, AiGeneratedMealItem[]> = {
    breakfast: [],
    lunch: [],
    snack: [],
    dinner: [],
  };
  for (const meal of meals) {
    mealsBySlot[meal.slot].push(meal);
  }
  for (const slot of VALID_SLOTS) {
    if (mealsBySlot[slot].length === 0) {
      throw new Error(`AI meal plan is missing a generated ${slot} option.`);
    }
  }

  const mealsByKey = new Map(meals.map((m) => [m.key, m]));
  const rawSchedule = (obj.weekSchedule && typeof obj.weekSchedule === 'object'
    ? obj.weekSchedule
    : {}) as Record<string, Record<string, unknown>>;

  const weekSchedule = {} as Record<DayOfWeek, Record<MealSlot, string>>;
  DAYS_OF_WEEK.forEach((day, dayIdx) => {
    const rawDay = rawSchedule[day] ?? {};
    weekSchedule[day] = {
      breakfast: resolveSlotMealKey(rawDay.breakfast, mealsByKey, mealsBySlot.breakfast, dayIdx),
      lunch: resolveSlotMealKey(rawDay.lunch, mealsByKey, mealsBySlot.lunch, dayIdx),
      snack: resolveSlotMealKey(rawDay.snack, mealsByKey, mealsBySlot.snack, dayIdx),
      dinner: resolveSlotMealKey(rawDay.dinner, mealsByKey, mealsBySlot.dinner, dayIdx),
    };
  });

  const rawBatch = Array.isArray(obj.batchTasks) ? obj.batchTasks : [];
  const batchTasks = rawBatch
    .map((entry, idx) => {
      if (!entry || typeof entry !== 'object') return null;
      const b = entry as Record<string, unknown>;
      const title = cleanText(b.title, 100);
      const detail = cleanText(b.detail, 260);
      if (!title || !detail) return null;
      const rawSession = cleanText(b.session, 50).toLowerCase();
      const session: 'Sunday Batch (75 min)' | 'Wednesday Refresh (45 min)' =
        rawSession.includes('wed') || idx >= 3
          ? 'Wednesday Refresh (45 min)'
          : 'Sunday Batch (75 min)';
      return {
        session,
        title,
        detail,
        storageNote: cleanText(b.storageNote, 80, 'Chilled airtight container · 3 days'),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 8);

  if (batchTasks.length === 0) {
    batchTasks.push(
      {
        session: 'Sunday Batch (75 min)',
        title: `Prep core ${meta.locationQuery} proteins & grains`,
        detail: 'Wash greens, portion proteins, and cook 3 days of regional base grains in one batch.',
        storageNote: 'Airtight glass containers · 3 days',
      },
      {
        session: 'Wednesday Refresh (45 min)',
        title: 'Mid-week fresh produce & protein restock',
        detail: 'Refresh perishable greens and prep Thursday–Sunday protein portions.',
        storageNote: 'Chilled shelf · Thu–Sun',
      }
    );
  }

  const nowIso = meta.nowIso ?? new Date().toISOString();
  return {
    id: `ai_plan_${nowIso.replace(/[^0-9]/g, '').slice(0, 14)}`,
    generatedAt: nowIso,
    locationName: cleanText(obj.locationName, 100, meta.locationQuery),
    regionalOverview: cleanText(
      obj.regionalOverview,
      360,
      `Tailored 7-day whole-food meal prep plan built around seasonal produce, local proteins, and staples available in ${meta.locationQuery}.`
    ),
    availableFoodsUsed:
      meta.availableFoods.length > 0
        ? meta.availableFoods
        : localFoods.slice(0, 6).map((f) => f.name),
    localFoods,
    meals,
    weekSchedule,
    batchTasks,
  };
}

function resolveSlotMealKey(
  candidate: unknown,
  mealsByKey: Map<string, AiGeneratedMealItem>,
  slotPool: AiGeneratedMealItem[],
  dayIdx: number
): string {
  if (typeof candidate === 'string') {
    const direct = mealsByKey.get(candidate);
    if (direct) return direct.key;
    const slugged = mealsByKey.get(slugKey(candidate, 'meal', 0));
    if (slugged) return slugged.key;
  }
  return slotPool[dayIdx % slotPool.length].key;
}

/**
 * Deterministically materializes an AiLocalMealPlan into HydraPrep's native
 * WholeFood[], MealTemplate[], WeekPlan, and BatchTask[] entities so every
 * tracker, Recharts graph, portion scaler, and affiliate grocery link works live.
 */
export function materializeAiPlanToAppState(plan: AiLocalMealPlan): {
  foods: WholeFood[];
  meals: MealTemplate[];
  weekPlan: WeekPlan;
  batchTasks: BatchTask[];
} {
  const foodIdMap = new Map<string, string>();

  const foods: WholeFood[] = plan.localFoods.map((item) => {
    const id = `ai_food_${item.key}`;
    foodIdMap.set(item.key, id);
    return {
      id,
      name: item.name,
      localName: item.localName,
      marketChannel: item.marketChannel,
      hyderabadSourceNote: item.sourceNote,
      pricePer100gInr: item.pricePer100g,
      per100g: { ...item.per100g },
      primaryPathway: item.primaryPathway,
      bioactiveMechanism: item.bioactiveMechanism,
      prepTip: item.prepTip,
      isCustom: true,
    };
  });

  const mealIdMap = new Map<string, string>();
  const meals: MealTemplate[] = plan.meals.map((meal) => {
    const id = `ai_meal_${meal.key}`;
    mealIdMap.set(meal.key, id);
    return {
      id,
      name: meal.name,
      slot: meal.slot,
      focusTag: meal.focusTag,
      prepTimeMinutes: meal.prepTimeMinutes,
      difficulty: normalizeDifficulty(meal.difficulty, meal.prepTimeMinutes, meal.prepSteps.length),
      batchFriendly: meal.batchFriendly,
      ingredients: meal.ingredients.map((ing) => ({
        foodId: foodIdMap.get(ing.foodKey) ?? `ai_food_${ing.foodKey}`,
        grams: ing.grams,
        prepNote: ing.prepNote,
      })),
      prepSteps: meal.prepSteps,
      hormonalBenefit: meal.hormonalBenefit,
    };
  });

  const weekPlan = {} as WeekPlan;
  for (const day of DAYS_OF_WEEK) {
    const schedule = plan.weekSchedule[day];
    weekPlan[day] = {
      breakfast: mealIdMap.get(schedule.breakfast) ?? meals[0].id,
      lunch: mealIdMap.get(schedule.lunch) ?? meals[0].id,
      snack: mealIdMap.get(schedule.snack) ?? meals[0].id,
      dinner: mealIdMap.get(schedule.dinner) ?? meals[0].id,
    };
  }

  const batchTasks: BatchTask[] = plan.batchTasks.map((task, idx) => ({
    id: `ai_batch_${idx + 1}`,
    session: task.session,
    title: task.title,
    detail: task.detail,
    storageNote: task.storageNote,
  }));

  return { foods, meals, weekPlan, batchTasks };
}
