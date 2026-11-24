import test from 'node:test';
import assert from 'node:assert/strict';
import { formatWeight } from './format';

test('formatWeight uses kg/g for metric regions', () => {
  assert.equal(formatWeight(999, 'hyderabad'), '999 g');
  assert.equal(formatWeight(500, 'hyderabad'), '500 g');
  assert.equal(formatWeight(12500, 'hyderabad'), '12.5 kg');
});

test('formatWeight uses lb/oz for imperial regions', () => {
  assert.equal(formatWeight(16, 'usa'), '1 oz');
  assert.equal(formatWeight(453.592, 'usa'), '1.00 lb');
  assert.equal(formatWeight(170, 'uk'), '6 oz');
});
