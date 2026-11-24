import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVoiceCommandClient } from './voice';
import { FOODS_BY_ID } from './nutrition';

test('parseVoiceCommandClient parses "log oat bowl" and finds a meal', () => {
  const r = parseVoiceCommandClient('log oat bowl', FOODS_BY_ID);
  assert.equal(r.action, 'consume');
  assert.ok(r.mealId, 'should find a matching meal');
  assert.ok(r.note);
});

test('parseVoiceCommandClient parses "ate chicken"', () => {
  const r = parseVoiceCommandClient('ate chicken', FOODS_BY_ID);
  assert.equal(r.action, 'consume');
  assert.ok(r.mealId);
});

test('parseVoiceCommandClient detects slot words in the transcript', () => {
  const r = parseVoiceCommandClient('log dinner', FOODS_BY_ID);
  assert.equal(r.action, 'consume');
  assert.equal(r.slot, 'dinner');
});

test('parseVoiceCommandClient parses plan commands ("add oat bowl to dinner")', () => {
  const r = parseVoiceCommandClient('add oat bowl to dinner', FOODS_BY_ID);
  assert.equal(r.action, 'plan');
  assert.equal(r.slot, 'dinner');
});

test('parseVoiceCommandClient returns none for unrelated text', () => {
  assert.deepEqual(parseVoiceCommandClient('the weather is nice', FOODS_BY_ID), { action: 'none' });
  assert.deepEqual(parseVoiceCommandClient('hello world', FOODS_BY_ID), { action: 'none' });
});
