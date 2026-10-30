import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bestGoalDifference } from '../lib/my-tournament-matches.ts';

// Minimal graphs isolate scoring feasibility from the authored fixture catalogue.
const outcome = (homeGoals, awayGoals, tone = 'neutral') => ({ tone, outcome: { homeGoals, awayGoals } });
const graph = (nodes, rootNodeId = 'root') => ({ id: 'synthetic-scoring', rootNodeId, nodes });

test('scoring feasibility follows reachable outcomes, not tone, phase or orphan goals', () => {
  assert.equal(bestGoalDifference(graph([
    { id: 'root', phase: 'Attacking', choices: [outcome(0, 0, 'positive'), outcome(0, 1)] },
    { id: 'orphan', choices: [outcome(1, 0, 'positive')] },
  ])), 0, 'an unreachable goal cannot make a play winnable');
  assert.equal(bestGoalDifference(graph([
    { id: 'root', phase: 'Defending', choices: [outcome(0, 1, 'positive'), { nextNodeId: 'regain', tone: 'neutral' }] },
    { id: 'regain', choices: [outcome(1, 0, 'neutral'), outcome(0, 0, 'positive')] },
  ])), 1, 'a defensive start can recover and score even without a positive verdict');
  assert.equal(bestGoalDifference(graph([{ id: 'root', choices: [outcome(0, 1)] }])), -1);
});

test('shared downstream nodes are valid, but cycles and missing transitions fail explicitly', () => {
  assert.equal(bestGoalDifference(graph([
    { id: 'root', choices: [{ nextNodeId: 'finish' }, { nextNodeId: 'finish' }] },
    { id: 'finish', choices: [outcome(1, 0)] },
  ])), 1);
  assert.throws(() => bestGoalDifference(graph([{ id: 'root', choices: [{ nextNodeId: 'root' }] }])), /Cyclic match graph/);
  assert.throws(() => bestGoalDifference(graph([{ id: 'root', choices: [{ nextNodeId: 'missing' }] }])), /Missing match node/);
  assert.throws(() => bestGoalDifference(graph([])), /Missing match node/);
});
