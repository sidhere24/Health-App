const BASE = 'https://api.spoonacular.com';
export const spooncastApiKey = process.env.SPOONACULAR_API_KEY?.trim();
const apiKey = spooncastApiKey;

interface SpoonCharacterSearchResponse {
  results?: SpoonCharacterSearchResult[];
  [key: string]: unknown;
}

export interface SpoonCharacterSearchResult {
  id: number;
  title: string;
  imageUrl?: string;
  readyInMinutes?: number;
  servings?: number;
  nutrition?: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}

interface SpoonCharacterSearchParams {
  query: string;
  number?: number;
  includeDiets?: string;
  excludeIngredients?: string;
}

// Simple in-memory TTL cache so the free Spoonacular tier is not exhausted by
// repeated user searches: cached for 5 minutes per query.
const cache = new Map<string, { value: unknown; expiresAt: number }>();

export function cachedGet<T>(
  key: string,
  ttlMs: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value as T);
  }
  const p = fetchFn();
  p.then(
    () => {
      if (cache.size > 200) {
        // Evict the oldest entry
        const oldest = [...cache.entries()].sort(([, a], [, b]) => a.expiresAt - b.expiresAt)[0]?.[0];
        if (oldest) cache.delete(oldest);
      }
    },
    () => {}
  );
  return p.then((value) => {
    cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  });
}

export async function searchRecipes(
  params: SpoonCharacterSearchParams
): Promise<SpoonCharacterSearchResponse> {
  if (!apiKey) throw new Error('SPOONACULAR_API_KEY is not configured');
  const q = params.query.trim();
  if (!q) throw new Error('Search query is required');

  const key = `spoon_character_search:${q.toLowerCase()}:${params.number ?? 20}`;
  return cachedGet<SpoonCharacterSearchResponse>(key, 5 * 60 * 1000, async () => {
    const url = new URL(`${BASE}/recipes/complexSearch`);
    url.searchParams.set('query', q);
    url.searchParams.set('number', String(params.number ?? 20));
    if (params.includeDiets) url.searchParams.set('includeDiets', params.includeDiets);
    if (params.excludeIngredients) url.searchParams.set('excludeIngredients', params.excludeIngredients);
    url.searchParams.set('apiKey', apiKey);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Spoonacular search failed (${res.status})`);
    }
    return (await res.json()) as SpoonCharacterSearchResponse;
  });
}

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
  extendedIngredients: Array<{
    id: number;
    name: string;
    image?: string;
    amount: number;
    unit?: string;
    original?: string;
    localizedName?: string;
    unitAbbrev?: string;
  }>;
  [key: string]: unknown;
}

export async function getRecipeInformation(id: number): Promise<SpoonCharacterRecipeInfo> {
  if (!spooncastApiKey) throw new Error('SPOONACULAR_API_KEY is not configured');
  const url = new URL(`https://api.spoonacular.com/recipes/${id}/information`);
  url.searchParams.set('apiKey', spooncastApiKey);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Spooncular recipe info (${id}) failed: ${res.status}`);
  const data = (await res.json()) as SpoonCharacterRecipeInfo;
  return {
    id: data.id ?? id,
    title: (data.title ?? '').trim() || `Recipe ${id}`,
    readyInMinutes: typeof data.readyInMinutes === 'number' ? data.readyInMinutes : undefined,
    servings: typeof data.servings === 'number' ? data.servings : undefined,
    nutrition: {
      calories: data.nutrition?.calories,
      protein: data.nutrition?.protein,
      fat: data.nutrition?.fat,
      carbs: data.nutrition?.carbs,
      fiber: data.nutrition?.fiber,
    },
    extendedIngredients: Array.isArray(data.extendedIngredients) ? data.extendedIngredients : [],
  };
}