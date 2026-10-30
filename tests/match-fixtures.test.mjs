import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { matchFixtures } from '../lib/match-fixtures.ts';
import {
  createMatchRun,
  createMomentReview,
  chooseMatchOption,
  continueMatch,
  validateMatchMoments,
} from '../lib/match-day.ts';
import { getMatchArt } from '../lib/match-presentation.ts';

test('fifteen distinct match days contain seventy-five reachable, valid moment graphs', () => {
  assert.equal(matchFixtures.length, 15);
  assert.deepEqual(matchFixtures.slice(0,5).map(f=>f.id),['original','low-block','second-ball','high-pressure','changing-picture']);
  const ids = matchFixtures.flatMap((f) => f.moments.map((m) => m.id));
  assert.equal(ids.length, 75);
  assert.equal(new Set(ids).size, 75);
  for (const f of matchFixtures)
    assert.equal(validateMatchMoments(f.moments), true);
});
test('every fixture choice has artwork, a complete team, consistent transitions, and goal direction', () => {
  for (const f of matchFixtures)
    for (const m of f.moments)
      for (const n of m.nodes) {
        assert.equal(n.scene.players.length, 22);
        assert.equal(n.scene.players.filter((p) => p.active).length, 1);
        for (const c of n.choices) {
          assert.ok(
            existsSync(
              new URL(`../public${getMatchArt(n, c).src}`, import.meta.url),
            ),
          );
          if (c.outcome?.homeGoals) assert.ok(c.ballTo.x >= 95);
          if (c.outcome?.awayGoals) assert.ok(c.ballTo.x <= 5);
          if (c.nextNodeId) {
            const next = m.nodes.find((x) => x.id === c.nextNodeId);
            assert.deepEqual(c.ballTo, next.scene.ball);
            for (const p of n.scene.players) {
              const move = c.movement.find((x) => x.playerId === p.id);
              const q = next.scene.players.find((x) => x.id === p.id);
              assert.deepEqual(move?.to ?? { x: p.x, y: p.y }, {
                x: q.x,
                y: q.y,
              });
            }
          }
        }
      }
});
function play(run, moments, id) {
  const m = moments[run.momentIndex];
  return continueMatch(
    chooseMatchOption(run, m.id, run.nodeId, id, moments),
    moments,
  );
}
for (const f of matchFixtures.slice(1, 3)) {
  test(`${f.name}: ideal, poor, neutral and recovered paths finish with accurate scores`, () => {
    for (const [path, expected] of [
      [
        ['build', 'read'],
        [3, 0],
      ],
      [
        ['force', 'charge'],
        [0, f.id === 'low-block' ? 2 : 3],
      ],
      [['reset'], [0, 0]],
      [
        ['force', 'delay'],
        [0, 0],
      ],
    ]) {
      let run = createMatchRun(f.moments);
      for (let i = 0; i < 5; i++)
        for (const id of path) run = play(run, f.moments, id);
      assert.equal(run.status, 'final');
      assert.equal(run.results.length, 5);
      assert.deepEqual([run.homeScore, run.awayScore], expected);
      assert.throws(
        () =>
          chooseMatchOption(
            run,
            f.moments[0].id,
            run.nodeId,
            'build',
            f.moments,
          ),
        /finished/,
      );
    }
  });
  test(`${f.name}: repeated, stale and cross-match choices cannot mutate a run`, () => {
    const run = createMatchRun(f.moments);
    const snapshot = structuredClone(run);
    const m = f.moments[0];
    assert.throws(() =>
      chooseMatchOption(
        run,
        'play-through-press',
        'm1-gk',
        'right-cb',
        f.moments,
      ),
    );
    assert.throws(() =>
      chooseMatchOption(run, m.id, 'missing', 'build', f.moments),
    );
    assert.throws(() =>
      chooseMatchOption(run, m.id, run.nodeId, 'missing', f.moments),
    );
    assert.deepEqual(run, snapshot);
    const pending = chooseMatchOption(
      run,
      m.id,
      run.nodeId,
      'build',
      f.moments,
    );
    assert.throws(
      () => chooseMatchOption(pending, m.id, run.nodeId, 'build', f.moments),
      /locked/,
    );
  });
  test(`${f.name}: review is isolated from completed results; replay resets everything`, () => {
    let run = createMatchRun(f.moments);
    for (let i = 0; i < 5; i++) {
      run = play(run, f.moments, 'build');
      run = play(run, f.moments, 'read');
    }
    const snapshot = structuredClone(run);
    const review = createMomentReview(run, 2, f.moments);
    const reviewed = play(play(review, f.moments, 'build'), f.moments, 'read');
    assert.equal(review.results.length, 0);
    assert.equal(review.homeScore, 0);
    assert.equal(reviewed.results.length, 1);
    assert.deepEqual(run, snapshot);
    const restart = createMatchRun(f.moments);
    assert.equal(restart.homeScore + restart.awayScore, 0);
    assert.equal(restart.decisions.length, 0);
  });
}

test('new turnovers vary the actor, pitch zone and available decisions', () => {
  for (const fixture of matchFixtures.slice(1, 3)) {
    const recoveries = fixture.moments.map((m) =>
      m.nodes.find((n) => n.id.endsWith('-recover')),
    );
    assert.ok(new Set(recoveries.map((n) => n.trainingCourseId)).size >= 4);
    assert.equal(new Set(recoveries.map((n) => n.prompt)).size, 5);
    assert.equal(
      new Set(recoveries.flatMap((n) => n.choices.map((c) => c.label))).size,
      recoveries.flatMap((n) => n.choices).length,
    );
    assert.ok(
      Math.max(...recoveries.map((n) => n.scene.ball.x)) -
        Math.min(...recoveries.map((n) => n.scene.ball.x)) >=
        40,
    );
    assert.ok(
      Math.max(...recoveries.map((n) => n.scene.ball.y)) -
        Math.min(...recoveries.map((n) => n.scene.ball.y)) >=
        40,
    );
  }
});

test('the light Match Day list mirrors the full fixtures in order', async () => {
  const { fixtureList, thumbnailPath } = await import('../lib/fixture-list.ts');
  assert.deepEqual(fixtureList, matchFixtures.map(({ id, name, opponent, cover }) => ({ id, name, opponent, cover })));
  for (const { cover } of fixtureList) assert.ok(existsSync(`public${thumbnailPath(cover)}`), `card thumbnail for ${cover}`);
});
