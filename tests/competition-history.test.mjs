import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newestKnockoutRounds, ourFixtureHistory } from '../lib/competition-history.ts';
import { gameForDisplay } from '../lib/fixture-order.ts';

test('latest rounds appear first without changing round identities or source games', () => {
  const games = Array.from({ length: 7 }, (_, round) => [{ id: `g${round}`, home: 'Our club', away: `Rival ${round}`, ...(round < 6 ? { homeGoals: round, awayGoals: 0 } : {}) }]);
  const original = structuredClone(games);
  assert.deepEqual(newestKnockoutRounds(games).map((r) => r.round), [6, 5, 4, 3]);
  assert.equal(newestKnockoutRounds(games)[0].games, games[6]);
  assert.deepEqual(newestKnockoutRounds(games.slice(0, 5)).map((r) => r.round), [4, 3]);
  assert.deepEqual(ourFixtureHistory(games, 'Our club').map((r) => r.round), [5, 4, 3, 2, 1, 0, 6]);
  assert.deepEqual(games, original);
});

test('reversing history preserves original away venue and penalty score order', () => {
  const games = Array.from({ length: 5 }, (_, round) => [{ id: `g${round}`, home: 'Our club', away: `Rival ${round}`, ...(round < 4 ? { homeGoals: 0, awayGoals: 0 } : {}), ...(round === 3 ? { penalties: [5, 4] } : {}) }]);
  const first = ourFixtureHistory(games, 'Our club')[0];
  assert.equal(first.round, 3);
  const view = gameForDisplay(first.game, 'Our club', first.round);
  assert.equal(view.away, 'Our club');
  assert.deepEqual(view.penalties, [4, 5]);
  assert.deepEqual(ourFixtureHistory(games, 'Our club').map((r) => r.round), [3, 2, 1, 0, 4]);
});
