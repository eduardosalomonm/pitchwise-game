import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gameForDisplay, inFixtureOrder, ourSideForRound } from '../lib/fixture-order.ts';
import { createTournament, currentTournamentGame, finishTournamentGame, OUR_TEAM } from '../lib/tournament.ts';
import { parseSavedCup, serializeCup } from '../lib/tournament-progress.ts';
import { createMyCup, currentMyGame, finishMyGame, parseSavedMyCup, serializeMyCup } from '../lib/my-tournament.ts';

test('venue alternates stably and scores remain paired with the club, including away victories', () => {
  assert.deepEqual(Array.from({ length: 7 }, (_, i) => ourSideForRound(i)), ['home', 'away', 'home', 'away', 'home', 'away', 'home']);
  assert.deepEqual(inFixtureOrder('Us', 'Rival', 'away'), ['Rival', 'Us']);
  assert.deepEqual(inFixtureOrder(2, 0, 'away'), [0, 2]);
  const original = { id: 'ours', home: 'Us', away: 'Rival', homeGoals: 2, awayGoals: 0, winner: 'Us' };
  const before = structuredClone(original);
  const away = gameForDisplay(original, 'Us', 1);
  assert.deepEqual([away.home, away.homeGoals, away.away, away.awayGoals, away.winner], ['Rival', 0, 'Us', 2, 'Us']);
  assert.equal(gameForDisplay(away, 'Us', 1), away, 'display adaptation is idempotent');
  assert.deepEqual(original, before, 'canonical fixture is immutable');
  assert.deepEqual(gameForDisplay(away, 'Us', 0), original);
});

test('away penalties and unplayed fixtures reverse consistently; other clubs stay untouched', () => {
  const shootout = { id: 'pen', home: 'Us', away: 'Rival', homeGoals: 1, awayGoals: 1, penalties: [5, 4], winner: 'Us' };
  assert.deepEqual(gameForDisplay(shootout, 'Us', 3).penalties, [4, 5]);
  assert.deepEqual(shootout.penalties, [5, 4]);
  const pending = gameForDisplay({ id: 'next', home: 'Us', away: 'Rival' }, 'Us', 1);
  assert.deepEqual([pending.home, pending.away, pending.homeGoals, pending.awayGoals], ['Rival', 'Us', undefined, undefined]);
  const other = { id: 'other', home: 'A', away: 'B', homeGoals: 3, awayGoals: 2 };
  assert.equal(gameForDisplay(other, 'Us', 1), other);
});

test('displaying both cups never changes their simulation, saves, standings or knockout path', () => {
  let readers = createTournament(2026);
  let custom = createMyCup(2026, { name: 'Real Barrio', kitId: 'forest', difficulty: 'easy', size: 32, length: 'short' });
  for (let round = 0; round < 7; round++) {
    const beforeReaders = serializeCup(readers);
    const beforeCustom = serializeMyCup(custom);
    const readerGame = gameForDisplay(currentTournamentGame(readers), OUR_TEAM, round);
    const customGame = gameForDisplay(currentMyGame(custom), custom.team.name, round);
    assert.equal(readerGame[round % 2 ? 'away' : 'home'], OUR_TEAM);
    assert.equal(customGame[round % 2 ? 'away' : 'home'], custom.team.name);
    assert.equal(serializeCup(readers), beforeReaders);
    assert.equal(serializeMyCup(custom), beforeCustom);
    readers = finishTournamentGame(readers, readerGame.id, 2, 0);
    custom = finishMyGame(custom, customGame.id, 2, 0);
    assert.deepEqual(parseSavedCup(serializeCup(readers)), readers);
    assert.deepEqual(parseSavedMyCup(serializeMyCup(custom)), custom);
  }
  assert.equal(readers.status, 'champion');
  assert.equal(custom.status, 'champion');
});
