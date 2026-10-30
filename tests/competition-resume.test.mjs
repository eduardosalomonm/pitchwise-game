import assert from 'node:assert/strict';
import test from 'node:test';
import { competitionActions } from '../lib/competition-resume.ts';
import { createLeague, LEAGUE_KEY, serializeLeague, activeLeagueGame, finishLeagueGame } from '../lib/league.ts';
import { createMyCup, serializeMyCup, parseSavedMyCup, MY_CUP_STORAGE_KEY, currentMyGame, finishMyGame } from '../lib/my-tournament.ts';
import { createTournament, currentTournamentGame, finishTournamentGame } from '../lib/tournament.ts';
import { CUP_STORAGE_KEY, serializeCup } from '../lib/tournament-progress.ts';

test('competition menu distinguishes new, restored and damaged saves', () => {
  const empty = competitionActions(() => null);
  assert.deepEqual(competitionActions(() => '{broken'), empty);
  const saves = {
    [LEAGUE_KEY]: serializeLeague(createLeague(44, { name: 'Pitchwise FC', kitId: 'forest', size: 6, legs: 2, difficulty: 'easy' })),
    [MY_CUP_STORAGE_KEY]: serializeMyCup(createMyCup(44, { name: 'Pitchwise FC', kitId: 'forest', size: 8 })),
  };
  let cup = createTournament(44);
  cup = finishTournamentGame(cup, currentTournamentGame(cup).id, 1, 0);
  saves[CUP_STORAGE_KEY] = serializeCup(cup);
  const actions = competitionActions((key) => saves[key] ?? null);
  assert.equal(actions.league, 'Continue · Matchweek 1');
  assert.equal(actions.custom, 'Continue · Group game 1');
  assert.equal(actions.readers, 'Continue · Group game 2');
  assert.equal(parseSavedMyCup(saves[MY_CUP_STORAGE_KEY]).team.name, 'Pitchwise FC');
});

test('the default custom club is not also drawn as a rival', () => {
  for (const size of [8,16,32]) {
    const cup = createMyCup(44, { name: 'Pitchwise FC', kitId: 'forest', size });
    assert.equal(cup.groups.flat().filter((name) => name === 'Pitchwise FC').length, 1);
    assert.deepEqual(parseSavedMyCup(serializeMyCup(cup)), cup);
  }
  assert.throws(() => createMyCup(44, { name: 'Halcyon Rangers', kitId: 'forest' }));
});

test('completed competitions offer results, not an impossible next match', () => {
  let league = createLeague(44, { name: 'Pitchwise FC', kitId: 'forest', size: 4, legs: 1 });
  let custom = createMyCup(44, { name: 'Pitchwise FC', kitId: 'forest', size: 8 });
  let readers = createTournament(44);
  while (league.status === 'playing') league = finishLeagueGame(league, activeLeagueGame(league).id, 2, 0);
  while (custom.status === 'playing') custom = finishMyGame(custom, currentMyGame(custom).id, 2, 0);
  while (readers.status === 'playing') readers = finishTournamentGame(readers, currentTournamentGame(readers).id, 2, 0);
  const saves = { [LEAGUE_KEY]: serializeLeague(league), [MY_CUP_STORAGE_KEY]: serializeMyCup(custom), [CUP_STORAGE_KEY]: serializeCup(readers) };
  assert.deepEqual(competitionActions((key) => saves[key]), { league: 'View season results', custom: 'View tournament results', readers: 'View cup results' });
});
