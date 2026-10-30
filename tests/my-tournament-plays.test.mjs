import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { tournamentPlays } from '../lib/my-tournament-plays.ts';
import { matchFixtures } from '../lib/match-fixtures.ts';
import { playPool } from '../lib/my-tournament-matches.ts';
import { chooseMatchOption, continueMatch, createMatchRun, validateMatchMoments } from '../lib/match-day.ts';
import { getMatchArt, hasPlayableMotion } from '../lib/match-presentation.ts';

test('the tournament pool includes every authored play once and scoring chances at every tier', () => {
  const pool = playPool();
  assert.equal(new Set(pool.map((p) => p.key)).size, pool.length);
  const expectedKeys = [
    ...matchFixtures.flatMap((fixture) => fixture.moments.map((_, index) => `${fixture.id}:${index}`)),
    ...tournamentPlays.map(({ moment }) => `my:${moment.id}`),
  ];
  assert.deepEqual(pool.map((p) => p.key).sort(), expectedKeys.sort(), 'complete catalogue, without freezing its size');
  assert.equal(new Set(tournamentPlays.map((p) => p.moment.id)).size, tournamentPlays.length);
  for (const { tier, moment } of tournamentPlays) {
    const entry = pool.find((p) => p.key === `my:${moment.id}`);
    assert.ok(entry, `${moment.id}: included in the playable pool`);
    assert.equal(entry.tier, tier);
    assert.equal(entry.extra, moment);
  }
  for (const tier of [0, 1, 2])
    assert.ok(pool.some((p) => p.tier === tier && p.goal), `tier ${tier}: a reachable scoring chance`);
  assert.ok(pool.every((p) => [0, 1, 2].includes(p.tier)), 'only supported difficulty tiers');
  const easyTwoStep = tournamentPlays.filter((p) => p.tier === 0 && p.moment.nodes.length === 2 && p.moment.nodes[1].choices.some((c) => c.outcome?.homeGoals));
  assert.ok(easyTwoStep.length > 0, 'easy two-decision plays with a goal chance');
});

test('every new play is valid, animated, illustrated and has four options with one best', () => {
  assert.equal(validateMatchMoments(tournamentPlays.map((p) => p.moment)), true);
  for (const { moment } of tournamentPlays) {
    assert.equal(moment.nodes.length, 2, moment.id);
    for (const node of moment.nodes) {
      assert.equal(node.choices.length, 4, node.id);
      assert.equal(node.choices.filter((c) => c.tone === 'positive').length, 1, node.id);
      assert.equal(new Set(node.choices.map((c) => c.label)).size, 4, node.id);
      for (const c of node.choices) {
        assert.doesNotMatch(c.label, /\b(blindly|unchallenged|hesitate|marked|crowded|free|lunge|force|slowly)\b/i, node.id);
        assert.ok(c.label.split(/\s+/).length <= 13, node.id);
      }
      for (const c of node.choices) {
        assert.ok(hasPlayableMotion(node, c), `${node.id}/${c.label}`);
        assert.ok(existsSync(new URL(`../public${getMatchArt(node, c).src}`, import.meta.url)), getMatchArt(node, c).src);
      }
    }
  }
});

test('the ball ends where each outcome says, and reading every situation right succeeds', () => {
  for (const { moment } of tournamentPlays) {
    for (const node of moment.nodes)
      for (const c of node.choices) {
        if (!c.outcome) continue;
        const id = `${node.id}/${c.label}`;
        const end = c.ballTo;
        const after = node.scene.players.map((p) => ({ ...p, ...c.movement.find((m) => m.playerId === p.id)?.to }));
        assert.ok(after.every((p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100), id);
        const onBall = after.filter((p) => Math.hypot(p.x - end.x, (p.y - end.y) * 0.7) <= 3);
        const { homeGoals, awayGoals, possession, result } = c.outcome;
        if (homeGoals) assert.ok(end.x > 95 && end.y >= 40 && end.y <= 60, id);
        else if (awayGoals) assert.ok(end.x < 4 && end.y >= 40 && end.y <= 60, id);
        else if (end.x === 100 && (end.y < 40 || end.y > 60) && /corner to us/i.test(c.feedback)) {
          assert.equal(possession, 'home', `${id}: our corner is a restart, not a rival turnover`);
          assert.equal(result, 'retain');
        }
        else if (possession === 'home') assert.ok(onBall.some((p) => p.team === 'home'), `${id}: our player on the ball`);
        else if (result === 'lost') assert.ok(onBall.some((p) => p.team === 'away'), `${id}: rival on the ball`);
      }
    let run = createMatchRun([moment]);
    while (run.status !== 'final') {
      const node = moment.nodes.find((n) => n.id === run.nodeId);
      run = continueMatch(chooseMatchOption(run, moment.id, node.id, node.choices.find((c) => c.tone === 'positive').id, [moment]), [moment]);
    }
    const last = run.results[0].outcome;
    if (moment.phase === 'Attacking' && moment.nodes[1].phase === 'Attacking' && moment.nodes[1].choices.some((c) => c.outcome?.homeGoals))
      assert.equal(last.homeGoals, 1, `${moment.id} ideal scores`);
    else assert.ok(last.homeGoals === 1 || (last.possession === 'home' && last.awayGoals === 0), `${moment.id} ideal wins the ball or scores`);
  }
});

test('labels do not give the answer away by length', () => {
  let longest = 0;
  let nodes = 0;
  for (const { moment } of tournamentPlays)
    for (const node of moment.nodes) {
      nodes++;
      const best = node.choices.find((c) => c.tone === 'positive').label.length;
      if (best > Math.max(...node.choices.filter((c) => c.tone !== 'positive').map((c) => c.label.length))) longest++;
    }
  assert.ok(longest / nodes <= 0.4, `best is the longest in ${longest}/${nodes}`);
});
