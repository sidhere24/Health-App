import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROFILE, DEFAULT_WEEK_PLAN } from '../data/hyderabadMeals';
import {
  computeSocialProfileMetrics,
  formatWhatsAppPlanText,
  formatWhatsAppStatus,
} from './social';
import {
  calculateBiometricTargets,
  createInitialConsumedState,
  createInitialPortionMultipliers,
  FOODS_BY_ID,
} from './nutrition';

test('computeSocialProfileMetrics returns empty metrics for an empty week plan', () => {
  const metrics = computeSocialProfileMetrics(
    { Mon: { breakfast: '', lunch: '', snack: '', dinner: '' }, Tue: { breakfast: '', lunch: '', snack: '', dinner: '' }, Wed: { breakfast: '', lunch: '', snack: '', dinner: '' }, Thu: { breakfast: '', lunch: '', snack: '', dinner: '' }, Fri: { breakfast: '', lunch: '', snack: '', dinner: '' }, Sat: { breakfast: '', lunch: '', snack: '', dinner: '' }, Sun: { breakfast: '', lunch: '', snack: '', dinner: '' } },
    'Mon',
    createInitialPortionMultipliers(),
    createInitialConsumedState(),
    {},
    calculateBiometricTargets(DEFAULT_PROFILE)
  );
  assert.equal(metrics.dayMeals.length, 0);
  assert.equal(metrics.weekCalories, 0);
  assert.equal(metrics.macros.proteinPct, 0);
});

test('computeSocialProfileMetrics surfaces day meals and Smarts:macro percentages', () => {
  const metrics = computeSocialProfileMetrics(
    DEFAULT_WEEK_PLAN,
    'Mon',
    createInitialPortionMultipliers(),
    createInitialConsumedState(),
    FOODS_BY_ID,
    calculateBiometricTargets(DEFAULT_PROFILE)
  );
  assert.ok(metrics.dayMeals.length > 0, 'selected day should have planned meals');
  assert.ok(metrics.weekCalories > 0, 'weekly avg calories should be > 0');
  assert.ok(metrics.weekProteinG > 0, 'weekly avg protein should be > 0');
  assert.ok(metrics.macros.proteinPct + metrics.macros.carbsPct + metrics.macros.fatPct > 0);
  assert.ok(metrics.consistency.length > 0);
  assert.ok(typeof metrics.nextUnlogged === 'string' || metrics.nextUnlogged === null);
});

test('formatWhatsAppStatus is a one-line copyable string mentioning the plan', () => {
  const metrics = computeSocialProfileMetrics(
    DEFAULT_WEEK_PLAN,
    'Mon',
    createInitialPortionMultipliers(),
    createInitialConsumedState(),
    {},
    calculateBiometricTargets(DEFAULT_PROFILE)
  );
  const status = formatWhatsAppStatus(metrics);
  assert.match(status, /HydraPrep · Mon plan: /);
  assert.doesNotMatch(status, /\n/);
});

test('formatWhatsAppPlanText is a multi-line share text with macros and consistency', () => {
  const targets = calculateBiometricTargets(DEFAULT_PROFILE);
  const metrics = computeSocialProfileMetrics(
    DEFAULT_WEEK_PLAN,
    'Mon',
    createInitialPortionMultipliers(),
    createInitialConsumedState(),
    {},
    targets
  );
  const text = formatWhatsAppPlanText(metrics, targets);
  assert.match(text, /💪 HydraPrep plan — Mon/);
  assert.match(text, /Macros \(daily avg\): \d+ kcal · P[\d.]+g · C[\d.]+g · F[\d.]+g/);
  assert.match(text, /Targets: P\d+g · C\d+g · F\d+g/);
});
