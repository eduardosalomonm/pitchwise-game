import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchFixtures } from '../lib/match-fixtures.ts';
import {
  createMatchRun,
  chooseMatchOption,
  continueMatch,
  createMomentReview,
} from '../lib/match-day.ts';
import { hasPlayableMotion } from '../lib/match-presentation.ts';

const advanced = matchFixtures.slice(3, 5);
function choose(run, moments, choiceId) {
  const moment = moments[run.momentIndex];
  return continueMatch(
    chooseMatchOption(run, moment.id, run.nodeId, choiceId, moments),
    moments,
  );
}
function runPath(moments, selector) {
  let run = createMatchRun(moments);
  for (let guard = 0; run.status !== 'final' && guard < 80; guard++) {
    const moment = moments[run.momentIndex];
    const node = moment.nodes.find((n) => n.id === run.nodeId);
    run = choose(run, moments, selector(node, moment).id);
  }
  assert.equal(run.status, 'final');
  return run;
}

for (const fixture of advanced) {
  test(`${fixture.name}: the ideal route needs four or five decisions per moment and finishes 3–0`, () => {
    const run = runPath(fixture.moments, (n) =>
      n.choices.find((c) => c.tone === 'positive'),
    );
    assert.deepEqual([run.homeScore, run.awayScore], [3, 0]);
    assert.equal(run.results.length, 5);
    for (const result of run.results)
      assert.ok(result.decisions.length >= 4 && result.decisions.length <= 5);
    assert.ok(run.results.some((r) => r.decisions.length === 5));
    assert.ok(new Set(run.decisions.map((d) => d.actor)).size >= 8);
  });
  test(`${fixture.name}: each early error can be rescued or become a rival goal`, () => {
    const poor = runPath(fixture.moments, (n) =>
      n.choices.find((c) => c.tone === 'negative'),
    );
    assert.deepEqual([poor.homeScore, poor.awayScore], [0, 5]);
    const rescued = runPath(fixture.moments, (n, m) =>
      n.choices.find(
        (c) => c.tone === (n.id === m.rootNodeId ? 'negative' : 'positive'),
      ),
    );
    assert.deepEqual([rescued.homeScore, rescued.awayScore], [0, 0]);
    assert.ok(rescued.results.every((r) => r.decisions.length === 2));
    const mixed = runPath(fixture.moments, (n, m) => {
      const i = fixture.moments.indexOf(m);
      const tone =
        i === 0
          ? 'positive'
          : i === 1 || n.id === m.rootNodeId
            ? 'negative'
            : 'positive';
      return n.choices.find((c) => c.tone === tone);
    });
    assert.deepEqual([mixed.homeScore, mixed.awayScore], [1, 1]);
  });
  test(`${fixture.name}: every branch animates, ends, and rejects replayed or stale scoring inputs`, () => {
    const contexts = new Set();
    for (const moment of fixture.moments) {
      function walk(run) {
        if (run.status === 'final') return;
        const node = moment.nodes.find((n) => n.id === run.nodeId);
        for (const choice of node.choices) {
          assert.ok(hasPlayableMotion(node, choice), node.id);
          const before = structuredClone(run);
          const locked = chooseMatchOption(run, moment.id, node.id, choice.id, [
            moment,
          ]);
          assert.deepEqual(run, before);
          assert.equal(locked.homeScore + locked.awayScore, 0);
          assert.throws(
            () =>
              chooseMatchOption(locked, moment.id, node.id, choice.id, [
                moment,
              ]),
            /locked/,
          );
          assert.throws(() =>
            chooseMatchOption(run, 'stale', node.id, choice.id, [moment]),
          );
          assert.throws(() =>
            chooseMatchOption(run, moment.id, node.id, 'invalid', [moment]),
          );
          const after = continueMatch(locked, [moment]);
          const afterSnapshot = structuredClone(after);
          assert.throws(() => continueMatch(after, [moment]), /Choose an option/);
          assert.deepEqual(after, afterSnapshot);
          if (choice.outcome) {
            assert.equal(after.status, 'final');
            assert.deepEqual(
              [after.homeScore, after.awayScore],
              [choice.outcome.homeGoals, choice.outcome.awayGoals],
            );
          } else walk(after);
        }
      }
      walk(createMatchRun([moment]));
      for (const node of moment.nodes) {
        assert.ok(!contexts.has(node.context), node.id);
        contexts.add(node.context);
        assert.equal(
          node.scene.players.find((p) => p.active).label,
          node.actorLabel,
        );
      }
    }
  });
  test(`${fixture.name}: review does not overwrite the final score and full replay resets`, () => {
    const completed = runPath(fixture.moments, (n) =>
      n.choices.find((c) => c.tone === 'positive'),
    );
    const snapshot = structuredClone(completed);
    const review = createMomentReview(completed, 0, fixture.moments);
    const root = fixture.moments[0].nodes.find((n) => n.id === review.nodeId);
    choose(
      review,
      fixture.moments,
      root.choices.find((c) => c.tone === 'negative').id,
    );
    assert.deepEqual(completed, snapshot);
    const restarted = createMatchRun(fixture.moments);
    assert.deepEqual(
      [restarted.homeScore, restarted.awayScore, restarted.decisions.length],
      [0, 0, 0],
    );
  });
}
