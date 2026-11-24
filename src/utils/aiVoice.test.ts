import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVoiceResponse } from './aiVoice';
import { MEAL_LIBRARY } from '../data/hyderabadMeals';

const mealsById = Object.fromEntries(MEAL_LIBRARY.map((m) => [m.id, m]));

test('normalizeVoiceResponse returns none for empty/invalid input', () => {
  assert.deepEqual(normalizeVoiceResponse('', mealsById), { action: 'none' });
  assert.deepEqual(normalizeVoiceResponse('not json', mealsById), { action: 'none' });
  assert.deepEqual(normalizeVoiceResponse('{"action":"explode"}', mealsById), { action: 'none' });
  assert.deepEqual(normalizeVoiceResponse('{"action":"consume"}', mealsById), { action: 'none' });
});

test('normalizeVoiceResponse accepts consume/plan with valid meal IDs', () => {
  const consume = normalizeVoiceResponse(
    JSON.stringify({ action: 'consume', mealId: MEAL_LIBRARY[0].id, note: 'I had the oat bowl' }),
    mealsById
  );
  assert.equal(consume.action, 'consume');
  assert.equal(consume.mealId, MEAL_LIBRARY[0].id);

  const plan = normalizeVoiceResponse(
    JSON.stringify({ action: 'plan', mealId: 'ln_bangda_mackerel_thali', note: 'yes' }),
    mealsById
  );
  assert.equal(plan.action, 'plan');
  assert.equal(plan.mealId, 'ln_bangda_mackerel_thali');
});

test('normalizeVoiceResponse rejects unknown or missing meal IDs', () => {
  const bogus = normalizeVoiceResponse(JSON.stringify({ action: 'consume', mealId: 'bogus_id' }), mealsById);
  assert.deepEqual(bogus, { action: 'none' });
  const none = normalizeVoiceResponse(JSON.stringify({ action: 'none' }), mealsById);
  assert.deepEqual(none, { action: 'none' });
});
