import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createLeague,
  finishLeagueGame,
  advanceLeagueBye,
  activeLeagueGame,
  leagueTable,
  leagueIsOurs,
  parseLeague,
  serializeLeague,
  leagueHeadline,
  DEFAULT_LEAGUE_NAME,
  validLeagueName,
} from '../lib/league.ts';
import { teams, validTeamName } from '../lib/teams.ts';
const config = (size = 6, legs = 1) => ({
  name: 'Real Barrio',
  kitId: 'forest',
  size,
  legs,
});

test('the canonical player-club default is valid only in leagues, without allowing rival collisions', () => {
  assert.equal(DEFAULT_LEAGUE_NAME, 'Pitchwise FC');
  assert.equal(validTeamName(DEFAULT_LEAGUE_NAME), false);
  for (const name of [DEFAULT_LEAGUE_NAME, 'pitchwise fc', 'Friends FC']) {
    assert.equal(validLeagueName(name), true);
    for (const size of [4, 12]) {
      const league = createLeague(7, {
        ...config(size, 2),
        name,
        difficulty: 'intermediate',
      });
      assert.equal(league.clubs.filter((club) => club === name).length, 1);
      assert.deepEqual(parseLeague(serializeLeague(league)), league);
      assert.equal(
        leagueTable(league).filter((row) => row.team === name).length,
        1,
      );
    }
  }
  for (const name of [
    null,
    '',
    ' Pitchwise FC',
    'Pitchwise FC ',
    '<club>',
    ...teams.slice(1).flatMap((t) => [t.name, t.shortName]),
  ]) {
    assert.equal(validLeagueName(name), false);
    assert.throws(() => createLeague(7, { ...config(), name }));
  }
});

test('every league size and leg count has exact pairings, real venues and genuine byes', () => {
  for (let size = 4; size <= 12; size++)
    for (const legs of [1, 2])
      for (const seed of [1, 7, 2026, 4294967295]) {
        const league = createLeague(seed, config(size, legs));
        const meetings = new Map();
        assert.equal(new Set(league.clubs).size, size);
        assert.equal(league.rounds.length, (size % 2 ? size : size - 1) * legs);
        assert.equal(
          new Set(league.rounds.flat().map((g) => g.id)).size,
          ((size * (size - 1)) / 2) * legs,
        );
        for (const games of league.rounds) {
          assert.equal(
            new Set(games.flatMap((g) => [g.home, g.away])).size,
            games.length * 2,
          );
          assert.equal(games.length, Math.floor(size / 2));
          for (const g of games) {
            assert.notEqual(g.home, g.away);
            const key = [g.home, g.away].sort().join('/');
            meetings.set(key, [...(meetings.get(key) ?? []), g]);
          }
        }
        assert.equal(meetings.size, (size * (size - 1)) / 2);
        for (const games of meetings.values()) {
          assert.equal(games.length, legs);
          if (legs === 2) assert.equal(games[0].home, games[1].away);
        }
        for (const team of league.clubs)
          assert.equal(
            league.rounds.flat().filter((g) => [g.home, g.away].includes(team))
              .length,
            (size - 1) * legs,
          );
        const ours = league.rounds
          .flat()
          .filter((g) => leagueIsOurs(league, g));
        assert.ok(
          ours.some((g) => g.home === league.config.name) &&
            ours.some((g) => g.away === league.config.name),
        );
        for (const club of league.clubs)
          assert.ok(
            Math.abs(
              league.rounds.flat().filter((g) => g.home === club).length -
                league.rounds.flat().filter((g) => g.away === club).length,
            ) <= 1,
            'balanced home/away allocation',
          );
        assert.deepEqual(createLeague(seed, config(size, legs)), league);
      }
});

test('result commits are immutable, correctly oriented and cannot award points twice', () => {
  let league = createLeague(7, config(5, 2));
  while (!activeLeagueGame(league)) league = advanceLeagueBye(league);
  const g = activeLeagueGame(league),
    original = structuredClone(league);
  const after = finishLeagueGame(league, g.id, 2, 1);
  assert.deepEqual(league, original);
  const stored = after.rounds[league.round].find((game) => game.id === g.id);
  assert.equal(
    stored[g.home === league.config.name ? 'homeGoals' : 'awayGoals'],
    2,
  );
  assert.equal(
    leagueTable(after).find((r) => r.team === league.config.name).points,
    3,
  );
  assert.throws(() => finishLeagueGame(after, g.id, 2, 1));
  assert.throws(() => finishLeagueGame(league, 'stale', 2, 1));
  for (const n of [-1, 1.5, NaN, 10, '2'])
    assert.throws(() => finishLeagueGame(league, g.id, n, 0));
  assert.throws(() => advanceLeagueBye(league));
  assert.deepEqual(finishLeagueGame(league, g.id, 2, 1), after);
});

test('table conservation, last-five form and reconstruction hold across complete seasons', () => {
  for (let size = 4; size <= 12; size++)
    for (const legs of [1, 2]) {
      let league = createLeague(313, config(size, legs)),
        played = 0;
      while (league.status === 'playing') {
        const snapshot = structuredClone(league.rounds.slice(0, league.round));
        const g = activeLeagueGame(league);
        league = g
          ? finishLeagueGame(league, g.id, played++ % 3, 1)
          : advanceLeagueBye(league);
        assert.deepEqual(league.rounds.slice(0, snapshot.length), snapshot);
        assert.deepEqual(parseLeague(serializeLeague(league)), league);
        const table = leagueTable(league);
        assert.equal(
          table.reduce((n, r) => n + r.won, 0),
          table.reduce((n, r) => n + r.lost, 0),
        );
        assert.equal(
          table.reduce((n, r) => n + r.gf, 0),
          table.reduce((n, r) => n + r.ga, 0),
        );
        for (const r of table) {
          assert.equal(r.points, r.won * 3 + r.drawn);
          assert.equal(r.played, r.won + r.drawn + r.lost);
          assert.equal(r.form.length, r.played);
        }
      }
      const table = leagueTable(league),
        us = table.find((r) => r.team === league.config.name);
      assert.ok(table.every((r) => r.played === (size - 1) * legs));
      assert.equal(
        us.form.at(-1).result,
        (played - 1) % 3 > 1 ? 'W' : (played - 1) % 3 === 1 ? 'D' : 'L',
      );
      assert.match(leagueHeadline(league), /Season complete|League champions/);
      assert.throws(() => advanceLeagueBye(league));
      assert.throws(() => finishLeagueGame(league, 'done', 1, 0));
    }
});

test('invalid settings and forged saved rounds are rejected without touching valid progress', () => {
  for (const props of [
    { size: 3 },
    { size: 13 },
    { size: 4.5 },
    { legs: 3 },
    { kitId: 'unknown' },
    { name: 'Port Meridian' },
    { name: '<script>' },
  ])
    assert.throws(() => createLeague(1, { ...config(), ...props }));
  for (const seed of [-1, NaN, 2.5])
    assert.throws(() => createLeague(seed, config()));
  const saved = JSON.parse(serializeLeague(createLeague(1, config())));
  for (const value of [
    null,
    '',
    '{',
    JSON.stringify({ ...saved, v: 2 }),
    JSON.stringify({ ...saved, results: [null] }),
    JSON.stringify({ ...saved, results: [['wrong', 1, 0]] }),
    JSON.stringify({ ...saved, results: Array(100).fill(null) }),
  ])
    assert.equal(parseLeague(value), null);
});
