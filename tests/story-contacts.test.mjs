import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchFixtures } from '../lib/match-fixtures.ts';
import { tournamentPlays } from '../lib/my-tournament-plays.ts';
import { quickRestart } from '../lib/tournament-stories.ts';
import { contactTimeline, movementWindow } from '../lib/pitch-motion.ts';

const moments = [...matchFixtures.flatMap((f) => f.moments), ...tournamentPlays.map((p) => p.moment), quickRestart('cue-restart')];
const find = (id) => {
  const node = moments.flatMap((m) => m.nodes).find((n) => n.id === id);
  assert.ok(node, `authored node ${id} exists`); return node;
};
const choice = (id, option) => { const c = find(id).choices.find((c) => c.id === option); assert.ok(c, `${id}/${option}`); return c; };
const after = (node, c, playerId) => c.movement.find((m) => m.playerId === playerId)?.to ?? node.scene.players.find((p) => p.id === playerId);

test('narrated saves, blocks and tackles meet the ball before the next receiver', () => {
  // Require the named touch, rather than inferring only contacts that already exist.
  // Deriving coordinates from the movement keeps layout adjustments independent.
  for (const [id, option, defender] of [
    ['bait-traps-1-4', 'option-2', 'h-lcb'],
    ['bait-traps-4-3', 'option-2', 'h-gk'],
    ['breakers-transition-1-2', 'option-4', 'h-rcb'],
    ['breakers-transition-3-1', 'option-3', 'h-gk'],
    ['breakers-transition-3-1', 'option-4', 'h-rcb'],
    ['breakers-transition-3-2', 'option-4', 'h-gk'],
    ['compass-rhythm-2-3', 'option-2', 'h-gk'],
    ['compass-rhythm-4-3', 'option-4', 'h-rcb'],
    ['advanced-rest-defence-3', 'option-1', 'h-rb'],
  ]) {
    const node = find(id), c = choice(id, option);
    const move = c.movement.find((m) => m.playerId === defender);
    const player = node.scene.players.find((p) => p.id === defender);
    assert.ok(move && player, `${id}: named defender is present and moves`);
    const contact = c.ballPath.slice(0, -1).findIndex((p) => p.x === move.to.x && p.y === move.to.y);
    assert.ok(contact >= 0, `${id}/${option}: ${defender} touches before the rebound or pass`);
    assert.equal(movementWindow(player, move, node.scene.ball, c.ballPath).end,
      contactTimeline(node.scene.ball, c.ballPath)[contact], `${id}: defender arrives with the ball`);
  }
});

test('headers and parries visit the narrated contact before the next receiver', () => {
  for (const [node, option, x, y] of [
    ['block-rebound-finish', 'read', 20, 50], ['block-cross-start', 'reset', 14, 69],
    ['block-rebound-goal-start', 'build', 94, 50], ['direct-duel-start', 'build', 30, 43],
    ['direct-duel-start', 'reset', 27, 43], ['towers-rebounds-4-1', 'option-4', 64, 47],
    ['mt-corner-against-1', 'option-1', 8, 56], ['mt-long-ball-duel-1', 'option-1', 40, 50],
    ['mt-long-ball-duel-1', 'option-2', 40, 50], ['mt-long-ball-duel-1', 'option-4', 40, 50],
  ]) assert.ok(choice(node, option).ballPath.slice(0, -1).some((p) => p.x === x && p.y === y), `${node}/${option}: contact before destination`);
});

test('named keepers and receivers actually meet the finished pass or save', () => {
  for (const [id, option, receiver] of [
    ['block-underlap-finish', 'rush', 'a-gk'], ['direct-duel-finish', 'read', 'h-rb'],
    ['direct-outlet-start', 'reset', 'h-rcb'], ['block-rebound-goal-start', 'reset', 'h-r8'],
    ['mt-press-goal-kick-2', 'option-2', 'a-lb'],
  ]) {
    const node = find(id), c = choice(id, option), target = after(node, c, receiver);
    assert.deepEqual({ x: target.x, y: target.y }, c.ballTo, `${id}: receiver owns final contact`);
  }
});

test('recoveries, forward press traps and restart ownership agree with their story', () => {
  const wide = find('mt-clear-danger-2');
  assert.ok(Math.hypot(wide.scene.players.find((p) => p.id === 'h-lw').x - wide.scene.ball.x, wide.scene.players.find((p) => p.id === 'h-lw').y - wide.scene.ball.y) <= 3);
  const trap = find('mt-press-trap-wing-1');
  const lb = trap.scene.players.find((p) => p.id === 'a-lb');
  assert.ok(trap.scene.players.find((p) => p.id === 'a-lw').x < lb.x, 'rival winger is forward toward our goal');
  assert.ok(choice(trap.id, 'option-1').ballTo.x < lb.x);
  const corner = choice('mt-overlap-left-2', 'option-4');
  assert.equal(corner.outcome.possession, 'home'); assert.match(corner.outcome.headline, /Our corner/);
  const recovery = find('direct-cover-finish');
  const distance = (id) => { const p = recovery.scene.players.find((p) => p.id === id); return Math.hypot(p.x - recovery.scene.ball.x, (p.y - recovery.scene.ball.y) * .7); };
  assert.ok(distance('h-gk') < distance('a-lw'), 'our keeper can reach the covered through ball first');
  const restart = find('cue-restart-2');
  assert.equal(restart.scene.players.find((p) => p.id === 'a-gk').y, 30, 'keeper commits toward winger before the square pass');
  const runner = find('mt-simple-wall-pass-2');
  assert.ok(runner.scene.players.filter((p) => p.team === 'away' && p.label !== 'GK').every((p) => p.x < runner.scene.ball.x), 'only the keeper remains in front');
});
