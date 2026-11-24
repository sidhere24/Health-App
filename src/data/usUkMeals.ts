import type { MealTemplate } from '../types/nutrition';

/**
 * Curated meal templates for global regions (USA, UK) using the same regional
 * food catalog (HYDERABAD_FOODS) so nutrition math composes everywhere.
 * Spoonacular generates region foods when a key is present (see
 * server/regionalFoods.ts); this library is the offline base for usa/uk.
 */

export const US_MEALS: MealTemplate[] = [
  {
    id: 'us_bf_oats_egg_bowl',
    name: 'Oats & Egg Bowl',
    slot: 'breakfast',
    focusTag: 'Testosterone & Steroidogenesis',
    prepTimeMinutes: 10,
    batchFriendly: false,
    ingredients: [
      { foodId: 'rolled_oats', grams: 150 },
      { foodId: 'whole_eggs', grams: 100 },
      { foodId: 'banana', grams: 60, prepNote: '1 medium' },
      { foodId: 'spinach', grams: 40 },
    ],
    prepSteps: [
      'Cook rolled oats in water or almond milk until thickened.',
      'Top with sliced banana, spinach, and scrambled whole eggs.',
    ],
    hormonalBenefit: 'Whole-egg protein with oats and banana covers morning amino acids and simple carbs for energy.',
  },
  {
    id: 'us_lunch_chicken_veg',
    name: 'Chicken & Veggie Bowl',
    slot: 'lunch',
    focusTag: 'Testosterone & Steroidogenesis',
    prepTimeMinutes: 20,
    batchFriendly: true,
    ingredients: [
      { foodId: 'chicken_breast', grams: 250, prepNote: 'grilled or baked' },
      { foodId: 'sweet_potato', grams: 120 },
      { foodId: 'spinach', grams: 100 },
      { foodId: 'curd_dahi', grams: 25, prepNote: 'side of Greek yogurt' },
    ],
    prepSteps: [
      'Roast sweet potato cubes at 400°F while searing the chicken.',
      'Serve chicken over spinach with sweet potato and a dollop of curd.',
    ],
    hormonalBenefit: 'High-leucine chicken protein supports lean muscle while sweet potato adds steady carbs.',
  },
  {
    id: 'us_snack_seed_mix',
    name: 'Roasted Seed & Nut Mix',
    slot: 'snack',
    focusTag: 'Sperm Quality & Zinc/Selenium',
    prepTimeMinutes: 5,
    batchFriendly: true,
    ingredients: [
      { foodId: 'pumpkin_seeds', grams: 40, prepNote: 'dry-roasted' },
      { foodId: 'black_sesame', grams: 15 },
      { foodId: 'walnuts', grams: 20 },
    ],
    prepSteps: ['Mix seeds and nuts; a handful as a pre-training snack.'],
    hormonalBenefit: 'Zinc-rich pumpkin seeds, ALA omega-3s from walnuts, and sesamin from black sesame support reproductive health.',
  },
  {
    id: 'us_dinner_paneer_spinach',
    name: 'Paneer & Spinach Bowl',
    slot: 'dinner',
    focusTag: 'Testosterone & Steroidogenesis',
    prepTimeMinutes: 15,
    batchFriendly: true,
    ingredients: [
      { foodId: 'paneer', grams: 120, prepNote: 'pan-seared cubes' },
      { foodId: 'spinach', grams: 120 },
      { foodId: 'curd_dahi', grams: 60, prepNote: 'side of yogurt' },
    ],
    prepSteps: [
      'Sear paneer cubes until golden; toss with wilted spinach.',
      'Serve with a side of curd and a drizzle of olive oil.',
    ],
    hormonalBenefit: 'Casein-rich paneer feeds overnight muscle repair while spinach nitrates support vascular flow.',
  },
];

export const UK_MEALS: MealTemplate[] = [
  {
    id: 'uk_bf_curd_oats_parfait',
    name: 'Curd Oats Parfait',
    slot: 'breakfast',
    focusTag: 'Cortisol & Stress Recovery',
    prepTimeMinutes: 8,
    batchFriendly: true,
    ingredients: [
      { foodId: 'curd_dahi', grams: 200 },
      { foodId: 'rolled_oats', grams: 80 },
      { foodId: 'black_sesame', grams: 10 },
    ],
    prepSteps: ['Layer curd with soaked rolled oats and a sprinkle of black sesame.'],
    hormonalBenefit: 'Probiotic curd supports the gut-testis axis for morning calm and recovery.',
  },
  {
    id: 'uk_lunch_roasted_veg_bowl',
    name: 'Roasted Veg Bowl',
    slot: 'lunch',
    focusTag: 'Nitric Oxide & Vascular Flow',
    prepTimeMinutes: 25,
    batchFriendly: true,
    ingredients: [
      { foodId: 'sweet_potato', grams: 130 },
      { foodId: 'spinach', grams: 100 },
      { foodId: 'curd_dahi', grams: 50, prepNote: 'side of yogurt' },
    ],
    prepSteps: ['Roast sweet potato cubes and toss with wilted spinach.'],
    hormonalBenefit: 'Sweet potato gives complex carbs; spinach nitrates support vascular nitric oxide.',
  },
  {
    id: 'uk_snack_peanut_mix',
    name: 'Peanut & Seed Mix',
    slot: 'snack',
    focusTag: 'Nitric Oxide & Vascular Flow',
    prepTimeMinutes: 5,
    batchFriendly: true,
    ingredients: [
      { foodId: 'peanuts', grams: 55, prepNote: 'dry-roasted with skin' },
      { foodId: 'black_sesame', grams: 15 },
      { foodId: 'walnuts', grams: 15 },
    ],
    prepSteps: ['A handful of the mix as a mid-afternoon snack.'],
    hormonalBenefit: 'L-arginine from peanuts supports nitric oxide production; walnuts add omega-3s.',
  },
  {
    id: 'uk_dinner_mashed_chickpeas',
    name: 'Spiced Mashed Chickpeas',
    slot: 'dinner',
    focusTag: 'Sperm Quality & Zinc/Selenium',
    prepTimeMinutes: 20,
    batchFriendly: true,
    ingredients: [
      { foodId: 'kala_chana', grams: 70, prepNote: 'dry weight, boiled' },
      { foodId: 'spinach', grams: 100 },
      { foodId: 'black_sesame', grams: 15 },
    ],
    prepSteps: ['Mash boiled kala chana with wilted spinach and black pepper.'],
    hormonalBenefit: 'Resistant-starch chickpeas stabilize evening cortisol; spinach brings folate and magnesium.',
  },
];

/** Keyed view of the global meal libraries. */
export const MEALS_BY_LOCATION: Record<'usa' | 'uk', MealTemplate[]> = {
  usa: US_MEALS,
  uk: UK_MEALS,
};
