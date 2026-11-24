import type { MealSlot, MealTemplate, WholeFood } from '../types/nutrition';
import { MEALS_BY_ID } from './nutrition';

export interface VoiceCommand {
  action: 'consume' | 'plan' | 'none';
  slot?: MealSlot;
  mealId?: string;
  note?: string;
}

const MEALS: MealTemplate[] = Object.values(MEALS_BY_ID);

const SLOT_WORDS: Array<[MealSlot, string[]]> = [
  ['breakfast', ['breakfast', 'morning', 'bf', 'bsfast', 'BF']],
  ['lunch', ['lunch', 'day', 'midday', 'middag', 'DL']],
  ['snack', ['snack', 'snacks', 'pre-training', 'pretraining', 'pre-workout', 'prew', 'afternoon', 'mid-evening']],
  ['dinner', ['dinner', 'evening', 'night', 'supper', 'dinner', 'supper', 'tea']],
];

const SLOT_BY_WORD = new Map<string, MealSlot>();
for (const [slot, words] of SLOT_WORDS) {
  for (const w of words) SLOT_BY_WORD.set(w, slot);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean);
}

function detectAction(tokens: string[]): 'consume' | 'plan' | 'none' {
  const consumeWords = new Set(['log', 'logged', 'ate', 'eaten', 'had', 'have', 'just', 'consumed', 'eating', 'ate']);
  if (tokens.some((t) => consumeWords.has(t))) return 'consume';
  const planWords = new Set(['add', 'plan', 'planning', 'added', 'plan-eat', 'planning']);
  if (tokens.some((t) => planWords.has(t))) return 'plan';
  return 'none';
}

function findSlot(tokens: string[]): MealSlot | undefined {
  for (const t of tokens) {
    const slot = SLOT_BY_WORD.get(t);
    if (slot) return slot;
  }
  return undefined;
}

function scoreMeal(words: string[], meal: MealTemplate, foodsById: Record<string, WholeFood>): number {
  const name = meal.name.toLowerCase();
  let score = 0;
  for (const w of words) {
    if (name.includes(w)) score += 3;
    for (const ing of meal.ingredients) {
      const f = foodsById[ing.foodId];
      if (f) {
        const fNames = [f.name, f.localName].map((s) => s.toLowerCase());
        if (fNames.some((fName) => fName.split(/\s+/).some((part) => part.startsWith(w) && w.length >= 3))) score += 2;
      }
    }
  }
  return score;
}

/**
 * Client-side parsing of a spoken command: "log oat bowl", "ate chicken",
 * "just had oats", "add dinner oats to my plan". Returns {action:'none'} when
 * nothing matches; otherwise an action with the best-matching meal (if found).
 */
export function parseVoiceCommandClient(
  text: string,
  foodsById: Record<string, WholeFood>
): VoiceCommand {
  const tokens = tokenize(text);
  if (tokens.length === 0) return { action: 'none' };

  const action = detectAction(tokens);
  if (action === 'none') return { action: 'none' };

  const slot = findSlot(tokens);
  const actionWords = new Set([
    'log', 'logged', 'ate', 'eaten', 'had', 'have', 'just', 'consumed', 'eating', 'ate',
    'add', 'plan', 'planning', 'added', 'plan-eat', 'planning',
  ]);
  const foodWords = tokens.filter((t) => !actionWords.has(t) && !SLOT_BY_WORD.has(t));

  // Score every meal; pick the best non-zero match.
  let best: { meal: MealTemplate; score: number } | null = null;
  for (const meal of MEALS) {
    const score = scoreMeal(foodWords, meal, foodsById);
    if (score > 0 && (!best || score > best.score)) best = { meal, score };
  }

  if (!best) return { action, slot, note: slot ? `Marked ${slot} as eaten` : undefined };

  const meal = best.meal;
  return {
    action,
    slot: slot ?? meal.slot,
    mealId: meal.id,
    note: action === 'plan' ? `Added ${meal.name} to plan` : `Logged ${meal.name} as eaten`,
  };
}
