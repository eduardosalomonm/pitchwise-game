import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chooseMatchOption, continueMatch, createMatchRun, getDecisionNode, getMatchMoment, matchMoments, validateMatchMoments } from '../lib/match-day.ts';

function play(run, choiceId) {
  const moment = getMatchMoment(run.momentIndex);
  const next = chooseMatchOption(run, moment.id, run.nodeId, choiceId);
  return continueMatch(next);
}

test('all five match graphs are valid and the final moment has its approved name', () => {
  assert.equal(validateMatchMoments(), true);
  assert.equal(matchMoments.length, 5);
  assert.equal(matchMoments[4].name, 'One Last Attack');
});

test('the only opening goal route takes five consecutive decisions', () => {
  let run = createMatchRun();
  for (const id of ['right-cb', 'carry', 'half-turn', 'set-run']) {
    run = play(run, id);
    assert.equal(run.homeScore, 0);
    assert.equal(run.momentIndex, 0);
  }
  run = play(run, 'bend-finish');
  assert.equal(run.homeScore, 1);
  assert.equal(run.momentIndex, 1);
  assert.equal(run.results[0].decisions.length, 5);
});

test('the opening turnover can be recovered or become a Rival XI goal', () => {
  let recovered = createMatchRun();
  recovered = play(recovered, 'force-six');
  recovered = play(recovered, 'delay');
  assert.equal(recovered.awayScore, 0);
  assert.equal(recovered.results[0].outcome.id, 'm1-recovered-shape');

  let conceded = createMatchRun();
  for (const id of ['force-six', 'dive', 'step', 'hold-line']) conceded = play(conceded, id);
  assert.equal(conceded.awayScore, 1);
  assert.equal(conceded.results[0].outcome.id, 'm1-rival-goal');
});

test('safe opening alternatives retain or concede possession without a goal', () => {
  let retained = createMatchRun();
  retained = play(retained, 'right-cb');
  retained = play(retained, 'early-wide');
  assert.equal(retained.results[0].outcome.possession, 'home');
  assert.equal(retained.homeScore + retained.awayScore, 0);

  let conceded = createMatchRun();
  conceded = play(conceded, 'go-long');
  assert.equal(conceded.results[0].outcome.possession, 'away');
  assert.equal(conceded.homeScore + conceded.awayScore, 0);
});

test('a locked choice cannot be repeated and never awards a goal twice', () => {
  let run = createMatchRun();
  for (const id of ['right-cb', 'carry', 'half-turn', 'set-run']) run = play(run, id);
  const moment = getMatchMoment(run.momentIndex);
  const locked = chooseMatchOption(run, moment.id, run.nodeId, 'bend-finish');
  assert.throws(() => chooseMatchOption(locked, moment.id, run.nodeId, 'bend-finish'), /already locked/);
  const scored = continueMatch(locked);
  assert.equal(scored.homeScore, 1);
  assert.throws(() => continueMatch(scored), /Choose an option/);
});

test('ideal, poor and mixed match paths produce 3–0, 0–3 and 1–1', () => {
  let ideal = createMatchRun();
  for (const id of ['right-cb','carry','half-turn','set-run','bend-finish','track','inside','winger','inside','arrive','delay','drop','feet','set','square']) ideal = play(ideal, id);
  assert.equal(ideal.status, 'final');
  assert.deepEqual([ideal.homeScore, ideal.awayScore], [3, 0]);

  let poor = createMatchRun();
  for (const id of ['force-six','dive','step','hold-line','ball','watch','carry','tackle','line','through']) poor = play(poor, id);
  assert.deepEqual([poor.homeScore, poor.awayScore], [0, 3]);

  let mixed = createMatchRun();
  for (const id of ['right-cb','carry','half-turn','set-run','bend-finish','ball','watch','switch','delay','drop','switch']) mixed = play(mixed, id);
  assert.deepEqual([mixed.homeScore, mixed.awayScore], [1, 1]);
});

test('invalid, stale and out-of-order inputs do not mutate match state', () => {
  const run = createMatchRun();
  const snapshot = structuredClone(run);
  assert.throws(() => chooseMatchOption(run, 'stop-overload', run.nodeId, 'right-cb'), /Out-of-order/);
  assert.throws(() => chooseMatchOption(run, matchMoments[0].id, 'm1-six', 'half-turn'), /Stale/);
  assert.throws(() => chooseMatchOption(run, matchMoments[0].id, run.nodeId, 'unknown'), /Unknown match choice/);
  assert.deepEqual(run, snapshot);
});

test('every choice references the active player and every node is reachable', () => {
  for (const moment of matchMoments) {
    for (const node of moment.nodes) {
      assert.ok(getDecisionNode(moment, node.id));
      assert.equal(node.scene.players.filter((player) => player.active).length, 1);
      for (const item of node.choices) assert.ok(item.movement.every((movement) => node.scene.players.some((player) => player.id === movement.playerId)));
    }
  }
});
