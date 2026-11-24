import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_WEEK_PLAN, MEAL_LIBRARY } from '../data/hyderabadMeals';
import type { AiPlanPayload } from './aiPlan';
import { normalizeAiPlan } from './aiPlan';

test('normalizeAiPlan keeps known meal ids and fills the rest from the base plan', () => {
  const known = MEAL_LIBRARY.find((m) => m.id === 'bf_moringa_egg_bhurji')!.id;
  const payload: AiPlanPayload = {
    plan: {
      Mon: { breakfast: known, lunch: 'not_a_real_meal', snack: undefined, dinner: 'xyz' },
      Tue: {},
      Wed: { lunch: 'bf_oats_pumpkin_eggs' },
    },
  };
  const plan = normalizeAiPlan(payload);
  assert.equal(plan.Mon.breakfast, known);
  assert.equal(plan.Mon.lunch, DEFAULT_WEEK_PLAN.Mon.lunch, 'unknown ids must be dropped');
  assert.equal(plan.Tue.breakfast, DEFAULT_WEEK_PLAN.Tue.breakfast, 'missing days fall back');
  assert.ok(plan.Wed.lunch);
});

test('normalizeAiPlan avoids repeating the same meal across days', () => {
  const lunchId = MEAL_LIBRARY.find((m) => m.slot === 'lunch')!.id;
  const plan = normalizeAiPlan({ plan: { Mon: { lunch: lunchId }, Tue: { lunch: lunchId } } });
  assert.equal(plan.Mon.lunch, lunchId);
  assert.equal(plan.Tue.lunch, DEFAULT_WEEK_PLAN.Tue.lunch, 'second occurrence is dropped');
});

test('normalizeAiPlan falls back to the base plan on malformed input', () => {
  assert.deepEqual(normalizeAiPlan(null), DEFAULT_WEEK_PLAN);
  assert.deepEqual(normalizeAiPlan({} as AiPlanPayload), DEFAULT_WEEK_PLAN);
  assert.deepEqual(normalizeAiPlan(undefined), DEFAULT_WEEK_PLAN);
});
