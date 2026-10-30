import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rateMatch } from '../lib/match-rating.ts';

const d = (actor, tone) => ({ actor, tone, momentId: 'm', nodeId: 'n', choiceId: 'c', label: '', feedback: '' });

test('standout ties use the last good read rather than first appearance order', () => {
  const decisions = ['Goalkeeper', 'Striker', 'Striker', 'Goalkeeper'].map(actor => d(actor, 'positive'));
  assert.deepEqual(rateMatch({ decisions }).standout, { actor: 'Goalkeeper', reads: 2 });
  assert.deepEqual(rateMatch({ decisions: [...decisions, d('Striker', 'negative')] }).standout, { actor: 'Goalkeeper', reads: 2 });
  assert.deepEqual(rateMatch({ decisions: [...decisions, d('Striker', 'positive')] }).standout, { actor: 'Striker', reads: 3 });
});

test('rates reading accuracy, grade and the standout player', () => {
  const perfect = rateMatch({ decisions: [d('Goalkeeper', 'positive'), d('Striker', 'positive'), d('Striker', 'positive')] });
  assert.deepEqual([perfect.reads, perfect.decisions, perfect.accuracy, perfect.stars, perfect.grade], [3, 3, 100, 3, 'Game reader']);
  assert.deepEqual(perfect.standout, { actor: 'Striker', reads: 2 });
  const mixed = rateMatch({ decisions: [d('Left-back', 'positive'), d('Six', 'negative'), d('Six', 'neutral'), d('Striker', 'positive')] });
  assert.deepEqual([mixed.accuracy, mixed.stars, mixed.grade, mixed.standout], [50, 1, 'Getting there', undefined]);
  const poor = rateMatch({ decisions: [d('Six', 'negative')] });
  assert.deepEqual([poor.stars, poor.grade, poor.standout], [0, 'Rusty reading', undefined]);
  assert.equal(rateMatch({ decisions: [] }).accuracy, 0);
});
