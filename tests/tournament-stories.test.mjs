import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import {
  cupFixture,
  closingMoment,
  tacticalFoul,
  quickRestart,
  playAdvantage,
  closingScore,
} from '../lib/tournament-stories.ts';
import {
  validateMatchMoments,
  createMatchRun,
  chooseMatchOption,
  continueMatch,
  createMomentReview,
} from '../lib/match-day.ts';
import { getMatchArt } from '../lib/match-presentation.ts';
import { matchFixtures } from '../lib/match-fixtures.ts';

test('mobile decision cues retain restart permission, advantage and keeper behaviour without introductions', () => {
  const root = (moment) => moment.nodes.find((n) => n.id === moment.rootNodeId);
  assert.match(root(quickRestart('test-restart-cue')).context, /not asked us to wait for a whistle/i);
  assert.match(root(playAdvantage('test-advantage-cue')).context, /referee signals advantage/i);
  const rebound = matchFixtures.flatMap((f) => f.moments).find((m) => m.id === 'block-rebound-goal');
  assert.match(root(rebound).context, /keeper has spilled low shots/i);
});
test('all seven cup fixtures have five valid moments with coherent geometry and available art', () => {
  for (let round = 0; round < 7; round++) {
    const fixture = cupFixture(round, 'Cedar XI');
    assert.equal(fixture.moments.length, 5);
    assert.equal(validateMatchMoments(fixture.moments), true);
    assert.deepEqual(
      fixture.moments.map((m) => m.minute),
      [8, 27, 43, 67, 90],
    );
    for (const m of fixture.moments)
      for (const n of m.nodes)
        for (const c of n.choices) {
          assert.ok(
            existsSync(
              new URL(`../public${getMatchArt(n, c).src}`, import.meta.url),
            ),
            getMatchArt(n, c).src,
          );
          if (c.nextNodeId) {
            const next = m.nodes.find((n) => n.id === c.nextNodeId);
            assert.deepEqual(next.scene.ball, c.ballTo);
            for (const p of n.scene.players) {
              const move = c.movement.find((m) => m.playerId === p.id);
              const q = next.scene.players.find((q) => q.id === p.id);
              assert.deepEqual(move?.to ?? { x: p.x, y: p.y }, {
                x: q.x,
                y: q.y,
              });
            }
          }
        }
  }
});
function play(run, moments, choice) {
  const m = moments[run.momentIndex];
  return continueMatch(
    chooseMatchOption(run, m.id, run.nodeId, choice.id, moments),
    moments,
  );
}
test('a tactical foul records the booking once and leads to a defendable free kick', () => {
  const m = tacticalFoul('test-foul'),
    first = m.nodes[0].choices.find((c) => c.booking);
  let run = createMatchRun([m]);
  run = play(run, [m], first);
  assert.equal(run.decisions.filter((d) => d.booking).length, 1);
  assert.equal(run.possession, 'away');
  const node = m.nodes.find((n) => n.id === run.nodeId);
  run = play(
    run,
    [m],
    node.choices.find((c) => c.tone === 'positive'),
  );
  assert.equal(run.status, 'final');
  assert.equal(run.awayScore, 0);
  assert.equal(run.decisions.filter((d) => d.booking).length, 1);
});
test('delaying a restart books the player without secretly awarding a goal', () => {
  const m = quickRestart('test-restart'),
    run = play(
      createMatchRun([m]),
      [m],
      m.nodes[0].choices.find((c) => c.booking),
    );
  assert.equal(run.status, 'final');
  assert.equal(run.homeScore + run.awayScore, 0);
  assert.equal(run.decisions[0].tone, 'negative');
});
test('clock management uses the actual score, with stable IDs across the last transition', () => {
  const leading = closingMoment('cup-clock', 2, 0),
    level = closingMoment('cup-clock', 1, 1),
    behind = closingMoment('cup-clock', 0, 2);
  assert.equal(leading.rootNodeId, level.rootNodeId);
  assert.equal(level.rootNodeId, behind.rootNodeId);
  assert.equal(leading.nodes[0].choices[0].tone, 'positive');
  assert.equal(behind.nodes[0].choices[0].tone, 'negative');
  assert.equal(level.nodes[0].choices[1].outcome.homeGoals, 1);
  assert.equal(leading.nodes[0].choices[1].outcome.awayGoals, 1);
  assert.ok(leading.introduction.includes('2–0'));
});
test('every ideal cup match ends, and review derives clock context from the completed result', () => {
  for (let round = 0; round < 7; round++) {
    const fixture = cupFixture(round, 'Cedar XI');
    let run = createMatchRun(fixture.moments),
      moments = fixture.moments;
    for (let guard = 0; run.status !== 'final' && guard < 100; guard++) {
      const score = closingScore(run.results);
      moments = [
        ...fixture.moments.slice(0, 4),
        closingMoment(fixture.moments[4].id, score.home, score.away),
      ];
      const m = moments[run.momentIndex],
        n = m.nodes.find((n) => n.id === run.nodeId);
      run = play(
        run,
        moments,
        n.choices.find((c) => c.tone === 'positive'),
      );
    }
    assert.equal(run.status, 'final');
    assert.ok(run.homeScore > run.awayScore);
    const before = closingScore(run.results),
      review = createMomentReview(run, 4, moments);
    assert.equal(review.homeScore, 0);
    assert.equal(
      review.nodeId,
      closingMoment(moments[4].id, before.home, before.away).rootNodeId,
    );
  }
});

test('all seven cup endings are distinct, score-aware and complete every alternative once', () => {
  const contexts = new Set();
  const names = new Set();
  const actors = new Set();
  const sourcedIds = [];
  for (let round = 0; round < 7; round++) {
    sourcedIds.push(...cupFixture(round, 'Port Meridian').moments.slice(0, 4).map(moment => moment.id));
    const leading = closingMoment(`cup-${round}-clock`, 2, 0);
    contexts.add(leading.nodes[0].context);
    names.add(leading.name);
    actors.add(leading.nodes[0].actor);
    for (const [home, away] of [[2, 0], [0, 0], [0, 2]]) {
      const moment = closingMoment(`cup-${round}-clock`, home, away);
      assert.equal(moment.rootNodeId, leading.rootNodeId, 'score changes cannot make a pending node stale');
      assert.equal(validateMatchMoments([moment]), true);
      const node = moment.nodes[0];
      assert.equal(node.choices.length, 4);
      assert.equal(node.choices.filter(choice => choice.tone === 'positive').length, 1);
      for (const choice of node.choices) {
        const initial = createMatchRun([moment]);
        const locked = chooseMatchOption(initial, moment.id, node.id, choice.id, [moment]);
        assert.equal(locked.homeScore + locked.awayScore, 0);
        assert.throws(() => chooseMatchOption(locked, moment.id, node.id, choice.id, [moment]), /already locked/);
        const final = continueMatch(locked, [moment]);
        assert.equal(final.status, 'final');
        assert.equal(final.homeScore, choice.outcome.homeGoals);
        assert.equal(final.awayScore, choice.outcome.awayGoals);
        assert.equal(final.results.length, 1);
        for (const point of [...(choice.ballPath ?? []), ...choice.movement.map(move => move.to)]) {
          assert.ok(point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100);
        }
        if (choice.outcome.homeGoals || choice.outcome.awayGoals) {
          assert.equal(choice.ballTo.x, choice.outcome.homeGoals ? 100 : 0);
          assert.ok(choice.ballTo.y >= 40 && choice.ballTo.y <= 60);
        }
      }
    }
  }
  assert.equal(contexts.size, 7);
  assert.equal(names.size, 7);
  assert.ok(actors.size >= 5, 'late decisions should not always feature a winger');
  assert.equal(new Set(sourcedIds).size, 28, 'a cup run never replays the same pre-clock graph');
});


test('every Readers’ Cup play has its own cup introduction, not a training-fixture template', () => {
  const intros = [];
  for (let round = 0; round < 7; round++)
    for (const moment of cupFixture(round, 'Astral Club').moments.slice(0, 4)) {
      assert.ok(!moment.introduction.startsWith('Astral Club: '), moment.id);
      intros.push(moment.introduction);
    }
  assert.equal(new Set(intros).size, intros.length);
});
