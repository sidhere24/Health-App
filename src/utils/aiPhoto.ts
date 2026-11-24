import type { MealTemplate, WholeFood } from '../types/nutrition';

export interface PhotoFood {
  name: string;
  grams: number;
}

export interface PhotoIdentifyResult {
  foods: PhotoFood[];
  note?: string;
}

/** Normalize raw Gemini vision output into a PhotoIdentifyResult (never throws). */
export function normalizeIdentifyResponse(raw: string): PhotoIdentifyResult {
  let parsed: { foods?: unknown; note?: unknown };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return { foods: [], note: undefined };
  }
  const foods = Array.isArray(parsed.foods)
    ? parsed.foods
        .map((f) => {
          if (!f || typeof f !== 'object') return null;
          const o = f as { name?: unknown; grams?: unknown };
          if (typeof o.name !== 'string' || !o.name.trim()) return null;
          const grams = typeof o.grams === 'number' && Number.isFinite(o.grams) ? o.grams : 0;
          return { name: o.name.trim(), grams: Math.max(0, grams) };
        })
        .filter((f): f is PhotoFood => f !== null)
        .slice(0, 10)
    : [];
  return { foods, note: typeof parsed.note === 'string' ? parsed.note.slice(0, 160) : undefined };
}

/** Open a camera/file picker, read the chosen image into a data URL. Returns null if cancelled. */
export function openCameraPhoto(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*;capture=camera';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read photo'));
      reader.readAsDataURL(file);
    };
    input.oncancel = () => {
      document.body.removeChild(input);
      resolve(null);
    };
    input.click();
  });
}

/**
 * Find the meal (from the meal library) whose ingredients best overlap with the
 * photo foods. Returns the best match (or null when nothing overlaps).
 */
export function findBestMealForFoods(
  foods: PhotoFood[],
  mealsById: Record<string, MealTemplate>,
  foodsById: Record<string, WholeFood>
): { mealId: string; meal: MealTemplate; score: number } | null {
  const names = [...new Set(foods.map((f) => f.name.trim().toLowerCase()).filter(Boolean))];
  if (names.length === 0) return null;

  let best: { meal: MealTemplate; score: number } | null = null;
  for (const meal of Object.values(mealsById)) {
    const mealNames = new Set(meal.ingredients.map((i) => foodsById[i.foodId]?.name.toLowerCase()));
    const score = names.filter((n) => mealNames.has(n)).length;
    if (best && score <= best.score) continue;
    best = { meal, score };
  }
  if (!best || best.score === 0) return null;
  return { mealId: best.meal.id, meal: best.meal, score: best.score };
}
