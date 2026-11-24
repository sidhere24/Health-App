import type { MealSlot, MealTemplate } from '../types/nutrition';

export type VoiceAction =
  | { action: 'consume'; slot?: MealSlot; mealId?: string; note?: string }
  | { action: 'plan'; slot?: MealSlot; mealId?: string; note?: string }
  | { action: 'none' };

const VALID_ACTIONS = new Set(['consume', 'plan', 'none']);

/**
 * Normalize a raw Gemini voice-parse JSON response into a typed VoiceAction.
 * Invalid/unparseable input degrades to { action: 'none' }.
 */
export function normalizeVoiceResponse(
  raw: string,
  mealsById: Record<string, MealTemplate>
): VoiceAction {
  let parsed: { action?: unknown; mealId?: unknown; note?: unknown };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return { action: 'none' };
  }
  const action = typeof parsed.action === 'string' ? parsed.action.toLowerCase() : '';
  if (action !== 'consume' && action !== 'plan' && action !== 'none') {
    return { action: 'none' };
  }
  if (action === 'none') return { action: 'none' };

  const mealId = typeof parsed.mealId === 'string' ? parsed.mealId : '';
  if (!mealId || !mealsById[mealId]) return { action: 'none' };

  const note = typeof parsed.note === 'string' ? parsed.note.slice(0, 120) : undefined;
  return { action: action as 'consume' | 'plan', mealId, note };
}
