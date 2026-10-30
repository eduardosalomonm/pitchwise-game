import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchFixtures } from '../lib/match-fixtures.ts';
import {
  createMatchRun,
  chooseMatchOption,
  continueMatch,
  validateMatchMoments,
} from '../lib/match-day.ts';
import { tournamentFixture } from '../lib/tournament-fixture.ts';
const added = matchFixtures.slice(5);
test('ten additional opponents have the agreed difficulty split and no reused IDs', () => {
  assert.equal(added.length, 10);
  assert.deepEqual(
    ['Easy', 'Intermediate', 'Hard'].map(
      (level) => added.filter((f) => f.difficulty === level).length,
    ),
    [3, 4, 3],
  );
  assert.equal(new Set(matchFixtures.map((f) => f.id)).size, 15);
  assert.equal(new Set(added.map((f) => f.opponent)).size, 10);
  for (const f of added) {
    assert.equal(f.moments.length, 5);
    assert.equal(validateMatchMoments(f.moments), true);
  }
});
for (const fixture of added)
  test(`${fixture.name}: every branch completes with the exact awarded score and immutable input`, () => {
    function visit(run, moments) {
      if (run.status === 'final') {
        assert.equal(run.results.length, 1);
        return;
      }
      const moment = moments[0],
        node = moment.nodes.find((n) => n.id === run.nodeId);
      for (const choice of node.choices) {
        const before = structuredClone(run);
        const locked = chooseMatchOption(
          run,
          moment.id,
          node.id,
          choice.id,
          moments,
        );
        assert.deepEqual(run, before);
        assert.equal(locked.homeScore, 0);
        assert.equal(locked.awayScore, 0);
        const next = continueMatch(locked, moments);
        if (choice.outcome) {
          assert.equal(next.homeScore, choice.outcome.homeGoals);
          assert.equal(next.awayScore, choice.outcome.awayGoals);
        }
        visit(next, moments);
      }
    }
    for (const moment of fixture.moments)
      visit(createMatchRun([moment]), [moment]);
    let run = createMatchRun(fixture.moments);
    while (run.status !== 'final') {
      const m = fixture.moments[run.momentIndex],
        n = m.nodes.find((n) => n.id === run.nodeId),
        c = n.choices.find((c) => c.tone === 'positive');
      run = continueMatch(
        chooseMatchOption(run, m.id, n.id, c.id, fixture.moments),
        fixture.moments,
      );
    }
    const depth =
      fixture.difficulty === 'Easy'
        ? 1
        : fixture.difficulty === 'Intermediate'
          ? 2
          : 3;
    assert.ok(run.results.every((r) => r.decisions.length === depth));
    assert.equal(run.awayScore, 0);
  });
test('overlap goal includes the full-back contact before the striker and goal', () => {
  const c = added
    .find((f) => f.id === 'narrow-width')
    .moments[2].nodes[0].choices.find((c) => c.outcome?.homeGoals);
  assert.deepEqual(c.ballPath, [
    { x: 90, y: 90 },
    { x: 90, y: 49 },
    { x: 100, y: 50 },
  ]);
});
test('tournament names replace the source opponent without mutating fixture content or IDs', () => {
  for (const f of added) {
    const before = structuredClone(f),
      renamed = tournamentFixture(f, 'Cedar XI');
    assert.deepEqual(f, before);
    assert.equal(renamed.id, f.id);
    assert.equal(renamed.opponent, 'Cedar XI');
    assert.ok(!JSON.stringify(renamed).includes(f.opponent));
    assert.equal(validateMatchMoments(renamed.moments), true);
  }
});
