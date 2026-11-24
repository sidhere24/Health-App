import { spooncastApiKey, cachedGet } from './spoonacular.ts';
import type { HormonalPathway, LocationId, MarketChannel, WholeFood } from '../src/types/nutrition';

// Spoonacular returns prices in US Cents; converting to INR-normalized prices so
// they compose with HydraPrep's region multipliers (e.g., usa 0.032 ≈ $ per 100g).
const USD_TO_INR = 83;

interface SpoonNutrient {
  name: string;
  amount: number;
  unit: string;
}

interface SpoonIngredientInfo {
  id: number;
  name?: string;
  original?: string;
  originalName?: string;
  aisle?: string;
  estimatedCost?: { value: number; unit?: string } | null;
  nutrition?: { nutrients?: SpoonNutrient[] } | null;
}

interface SpoonIngredientSearchResponse {
  results?: Array<{ id: number; name?: string }>;
  [key: string]: unknown;
}

/** Regions HydraPrep supports and for which global (non-Indian) foods are generated. */
export const REGION_FOOD_QUERIES: Record<string, string[]> = {
  // ~10 queries per region ≈ 22–26 spoon points (search + info) — fits the free tier.
  usa: ['chicken breast', 'milk', 'whole milk', 'eggs', 'oats', 'peanut butter', 'spinach', 'broccoli', 'banana', 'sweet potato'],
  uk: ['bread', 'whole grain bread', 'milk', 'whole milk', 'eggs', 'salmon', 'tuna', 'bacon', 'potato', 'carrots'],
};

const usdCentsToInr = (cents: number): number => Math.round((cents / 100) * USD_TO_INR);

function pick(nutrients: SpoonNutrient[] | undefined, ...patterns: string[]): number {
  const n = nutrients?.find((x) => patterns.some((p) => x.name.toLowerCase().includes(p)));
  return n?.amount ?? 0;
}

function toWholeFood(info: SpoonIngredientInfo): WholeFood | null {
  const name = (info.name || info.original || info.originalName || '').trim();
  if (!name) return null;

  const nutrients = info.nutrition?.nutrients ?? [];
  const channel: MarketChannel = channelFor(info.aisle, name);

  const price = usdCentsToInr(info.estimatedCost?.value ?? 0);
  return {
    id: String(info.id),
    name,
    localName: name,
    marketChannel: channel,
    hyderabadSourceNote: `Spoonacular · ${name} · ${info.aisle ?? 'global food database'} · global sourcing`,
    pricePer100gInr: price,
    per100g: {
      calories: pick(nutrients, 'calori'),
      proteinG: pick(nutrients, 'protein'),
      carbsG: pick(nutrients, 'carb'),
      fatG: pick(nutrients, 'fat'),
      fiberG: pick(nutrients, 'fiber'),
      zincMg: pick(nutrients, 'zinc'),
      magnesiumMg: pick(nutrients, 'magnesium'),
      seleniumMcg: pick(nutrients, 'selenium'),
      nitratesMg: pick(nutrients, 'nitrate'),
    },
    primaryPathway: pickPathway(name, info.aisle),
    bioactiveMechanism: `${name}: globally sourced whole food with a Spoonacular-verified nutrient profile.`,
    prepTip: `Whole food — portion it like a serving of ${name} alongside complex carbs and healthy fats.`,
  };
}

function channelFor(aisle: string | undefined, name: string): MarketChannel {
  const a = (aisle ?? '').toLowerCase();
  const n = name.toLowerCase();
  if (
    a.includes('fish') ||
    a.includes('meat') ||
    a.includes('poultry') ||
    a.includes('seafood') ||
    n.includes('chicken') ||
    n.includes('beef') ||
    n.includes('pork') ||
    n.includes('fish') ||
    n.includes('egg')
  ) {
    return 'Local Poultry, Fish & Butcher';
  }
  if (a.includes('dairy') || a.includes('milk') || a.includes('cheese') || n.includes('egg')) {
    return 'Dairy & Eggs';
  }
  if (a.includes('grain') || a.includes('pasta') || a.includes('bread') || a.includes('bakery')) {
    return 'Begum Bazaar · Seeds & Grains';
  }
  return 'Rythu Bazaar · Produce';
}

function pickPathway(name: string, aisle: string | undefined): HormonalPathway {
  const n = name.toLowerCase();
  if (n.includes('zinc') || n.includes('pumpkin seed') || n.includes('sunflower') || n.includes('lentil') || n.includes('chickpea')) {
    return 'Sperm Quality & Zinc/Selenium';
  }
  if (n.includes('nitrate') || n.includes('beet') || n.includes('cucumber') || n.includes('watermelon') || n.includes('spinach') || n.includes('kale') || n.includes('moringa')) {
    return 'Nitric Oxide & Vascular Flow';
  }
  if (n.includes('egg') || n.includes('chicken') || n.includes('beef') || n.includes('salmon') || n.includes('tuna') || n.includes('turkey') || n.includes('protein') || n.includes('milk') || n.includes('cheese') || n.includes('yogurt')) {
    return 'Testosterone & Steroidogenesis';
  }
  return 'Cortisol & Stress Recovery';
}

async function spoonSearch(regionId: string, query: string): Promise<SpoonIngredientSearchResponse | null> {
  const key = spooncastApiKey;
  if (!key) return null;
  try {
    return await cachedGet<SpoonIngredientSearchResponse>(
      `spoon_search:${regionId}:${query.toLowerCase()}`,
      60 * 60 * 1000,
      async () => {
        const url = new URL('https://api.spoonacular.com/food/ingredients/search');
        url.searchParams.set('query', query);
        url.searchParams.set('number', '2');
        url.searchParams.set('apiKey', key);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Spoonacular search (${query}) failed: ${res.status}`);
        return (await res.json()) as SpoonIngredientSearchResponse;
      }
    );
  } catch {
    return null;
  }
}

async function spoonInfo(id: number): Promise<SpoonIngredientInfo | null> {
  const key = spooncastApiKey;
  if (!key) return null;
  try {
    return await cachedGet<SpoonIngredientInfo>(`spoon_info:${id}`, 24 * 60 * 60 * 1000, async () => {
      const url = new URL(`https://api.spoonacular.com/food/ingredients/${id}/information`);
      url.searchParams.set('amount', '100');
      url.searchParams.set('unit', 'grams');
      url.searchParams.set('apiKey', key);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Spoonacular info (${id}) failed: ${res.status}`);
      return (await res.json()) as SpoonIngredientInfo;
    });
  } catch {
    return null;
  }
}

export async function generateRegionalFoods(regionId: string): Promise<WholeFood[]> {
  const queries = REGION_FOOD_QUERIES[regionId];
  if (!queries || !spooncastApiKey) return [];

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const foods: WholeFood[] = [];

  for (const query of queries) {
    const search = await spoonSearch(regionId, query);
    const first = search?.results?.[0];
    if (!first) continue;
    const info = await spoonInfo(first.id);
    if (!info) continue;

    const f = toWholeFood(info);
    if (!f) continue;
    if (seenIds.has(f.id) || seenNames.has(f.name.toLowerCase())) continue;

    seenIds.add(f.id);
    seenNames.add(f.name.toLowerCase());
    foods.push(f);
  }

  return foods;
}
