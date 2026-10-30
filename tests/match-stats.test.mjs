import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addMatchStats, collectMatchStats, emptyMatchStats, parseMatchStats } from '../lib/match-stats.ts';

const sample = () => collectMatchStats({
  decisions: [
    { momentId: 'm', nodeId: 'attack', tone: 'positive' },
    { momentId: 'm', nodeId: 'recovery', tone: 'negative', booking: 'Yellow card' },
    { momentId: 'm', nodeId: 'defend', tone: 'neutral' },
  ],
  results: [{ outcome: { tone: 'neutral' } }],
}, [{ id: 'm', phase: 'Attacking', nodes: [{ id: 'attack', phase: 'Attacking' }, { id: 'recovery', phase: 'Transition' }, { id: 'defend', phase: 'Defending' }] }]);

test('stats use each decision phase, include defensive recovery and count endings once', () => {
  assert.deepEqual(sample(), {
    attacking: { correct: 1, total: 1 }, defending: { correct: 0, total: 2 },
    decisions: { positive: 1, neutral: 1, negative: 1 },
    plays: { positive: 0, neutral: 1, negative: 0 }, bookings: 1,
  });
});

test('stats aggregate without changing inputs, and reject impossible saved totals', () => {
  const stats = sample(), original = structuredClone(stats);
  assert.deepEqual(addMatchStats(emptyMatchStats(), stats), stats);
  assert.deepEqual(stats, original);
  assert.deepEqual(parseMatchStats(stats), stats);
  assert.equal(parseMatchStats(undefined), undefined);
  for (const [field, key, value] of [['attacking', 'correct', 2], ['defending', 'total', -1], ['decisions', 'positive', 1.5], ['plays', 'negative', 4], ['decisions', 'neutral', 0]]) {
    const invalid = structuredClone(stats); invalid[field][key] = value;
    assert.equal(parseMatchStats(invalid), undefined, `${field}.${key}`);
  }
  assert.equal(parseMatchStats({ ...stats, bookings: 4 }), undefined);
});
