import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRoundReport } from '../lib/round-report.ts';
import { createTournament, currentTournamentGame, finishTournamentGame, groupTable, OUR_TEAM, ROUND_NAMES } from '../lib/tournament.ts';
import { createMyCup, currentMyGame, finishMyGame, myGroupTable, myRoundNames } from '../lib/my-tournament.ts';

const readers = (before, after, round) =>
  buildRoundReport({ round, us: OUR_TEAM, before, after, table: groupTable, roundNames: ROUND_NAMES });

test('the report shows our result, the moving group table, the other group game and who is next', () => {
  let run = createTournament(12);
  const first = finishTournamentGame(run, currentTournamentGame(run).id, 2, 1);
  const r1 = readers(run, first, 0);
  assert.equal(r1.title, 'Group game 1 report');
  assert.deepEqual([r1.result.us, r1.result.them], [2, 1]);
  assert.equal(r1.group.rows.length, 4);
  assert.ok(r1.group.other && r1.group.other.homeGoals !== undefined);
  assert.equal(r1.next.round, 'Group game 2');
  const second = finishTournamentGame(first, currentTournamentGame(first).id, 0, 3);
  const r2 = readers(first, second, 1);
  assert.deepEqual(r2.group.rows.map((r) => [r.team, r.move]), [
    ['Breakwater United', 0], ['Loombridge City', 2], ['Pitchwise FC', -1], ['Halcyon Rangers', -1],
  ]);
  assert.ok(r2.headlines.length >= 1);
  const third = finishTournamentGame(second, currentTournamentGame(second).id, 3, 0);
  const r3 = readers(second, third, 2);
  assert.equal(r3.group.qualified, true);
  assert.deepEqual(r3.next, { round: 'Round of 16', opponent: 'Stonebridge Athletic' });
  run = third;
});

test('authored results explain the qualification boundary and next rival, not unrelated matches', () => {
  const row = (team, points, gf, ga, won, lost) => ({ team, played: won + lost, won, drawn: 0, lost, gf, ga, points });
  const before = {
    groups: [['Us', 'A', 'B', 'C'], ['E', 'F', 'G', 'H']], status: 'playing', round: 1,
    games: [[
      { id: 'first-us', home: 'Us', away: 'A', homeGoals: 2, awayGoals: 0 },
      { id: 'first-other', home: 'B', away: 'C', homeGoals: 1, awayGoals: 0 },
    ]],
    standings: [row('Us', 3, 2, 0, 1, 0), row('B', 3, 1, 0, 1, 0), row('C', 0, 0, 1, 0, 1), row('A', 0, 0, 2, 0, 1)],
  };
  const after = {
    ...before, round: 2,
    games: [before.games[0], [
      { id: 'ours', home: 'B', away: 'Us', homeGoals: 1, awayGoals: 0 },
      { id: 'other', home: 'C', away: 'A', homeGoals: 3, awayGoals: 0 },
      { id: 'smaller-upset', home: 'E', away: 'F', homeGoals: 4, awayGoals: 0 },
      { id: 'draw', home: 'G', away: 'H', homeGoals: 1, awayGoals: 1 },
    ], [{ id: 'next', home: 'Us', away: 'C' }]],
    standings: [row('B', 6, 2, 0, 2, 0), row('C', 3, 3, 1, 1, 1), row('Us', 3, 2, 1, 1, 1), row('A', 0, 0, 5, 0, 2)],
  };
  const report = buildRoundReport({ round: 1, us: 'Us', before, after, table: (cup) => cup.standings, roundNames: ['Group game 1', 'Group game 2', 'Group game 3'] });
  assert.deepEqual(report.group.rows.map((r) => [r.team, r.move]), [['B', 1], ['C', 1], ['Us', -2], ['A', 0]]);
  assert.deepEqual(report.headlines, ['Down to third. Level on points with C; tiebreakers put us outside the top two.', 'C beat A 3–0.']);
  assert.deepEqual(report.next, { round: 'Group game 3', opponent: 'C' });
  assert.deepEqual([report.result.opponent, report.result.us, report.result.them], ['B', 0, 1]);
  assert.equal(report.group.other.id, 'other');
  assert.equal(report.result.outcome, 'loss');
});

test('knockout reports show the trophy distance and conditional route, then the championship', () => {
  let run = createTournament(3);
  for (let i = 0; i < 3; i++) run = finishTournamentGame(run, currentTournamentGame(run).id, 2, 0);
  const ko = finishTournamentGame(run, currentTournamentGame(run).id, 1, 1, [5, 4]);
  const report = readers(run, ko, 3);
  assert.deepEqual(report.result.penalties, [5, 4]);
  assert.equal(report.group, undefined);
  assert.equal(report.headlines[0], 'Into the quarter-final. 3 wins from the trophy.');
  assert.equal(report.result.outcome, 'win');
  assert.ok(report.headlines.some((h) => h.startsWith(`Beat ${report.next.opponent} and we meet `)));
  let end = ko;
  for (let i = 4; i < 7; i++) {
    const before = end;
    end = finishTournamentGame(end, currentTournamentGame(end).id, 2, 0);
    if (i === 6) {
      const final = readers(before, end, 6);
      assert.equal(final.next, undefined);
      assert.equal(final.finished.status, 'champion');
      assert.ok(final.headlines.some((h) => h.startsWith('Champions')));
    }
  }
});

test('My Tournament trophy distance adapts to 8, 16 and 32 teams', () => {
  const team = { name: 'Real Barrio', kitId: 'ember' };
  for (const [size, remaining] of [[8, 1], [16, 2], [32, 3]]) {
    let before = createMyCup(11, { ...team, size });
    for (let round = 0; round < 3; round++) before = finishMyGame(before, currentMyGame(before).id, 2, 0);
    const after = finishMyGame(before, currentMyGame(before).id, 1, 0);
    const report = buildRoundReport({ round: 3, us: team.name, before, after, table: myGroupTable, roundNames: myRoundNames(after) });
    assert.equal(report.headlines[0], `Into the ${myRoundNames(after)[4].toLowerCase()}. ${remaining === 1 ? 'One win' : `${remaining} wins`} from the trophy.`);
    assert.equal(report.headlines.length, size === 8 ? 2 : 3);
  }
});

test('the next rival’s away shootout win and the sibling bracket are reported in the right orientation', () => {
  const before = { groups: [['Us', 'A', 'B', 'C']], games: [], round: 3, status: 'playing' };
  const after = { ...before, round: 4, games: [[], [], [], [
    { id: 'ours', home: 'Us', away: 'A', homeGoals: 2, awayGoals: 0, winner: 'Us' },
    { id: 'rival', home: 'D', away: 'Next', homeGoals: 1, awayGoals: 1, penalties: [4, 5], winner: 'Next' },
  ], [{ id: 'next', home: 'Next', away: 'Us' }, { id: 'sibling', home: 'S', away: 'T' }]] };
  const report = buildRoundReport({ round: 3, us: 'Us', before, after, table: () => [], roundNames: ['G1', 'G2', 'G3', 'Quarter-final', 'Semi-final', 'Final'] });
  assert.deepEqual(report.headlines, [
    'Into the semi-final. 2 wins from the trophy.',
    'Next came through on penalties, 5–4 against D, after 1–1 to reach the semi-final.',
    'Beat Next and we meet S or T.',
  ]);
});

test('a shootout defeat is a loss and elimination never leaks automatically simulated future results', () => {
  const before = { groups: [['Us', 'A', 'B', 'C']], games: [], round: 3, status: 'playing' };
  const after = { ...before, status: 'eliminated', round: 5, champion: 'Future', games: [[], [], [], [
    { id: 'ours', home: 'A', away: 'Us', homeGoals: 1, awayGoals: 1, penalties: [5, 4], winner: 'A' },
  ], [{ id: 'future', home: 'A', away: 'Future', homeGoals: 0, awayGoals: 4, winner: 'Future' }]] };
  const report = buildRoundReport({ round: 3, us: 'Us', before, after, table: () => [], roundNames: ['G1', 'G2', 'G3', 'Quarter-final', 'Semi-final', 'Final'] });
  assert.equal(report.result.outcome, 'loss');
  assert.deepEqual(report.result.penalties, [4, 5]);
  assert.deepEqual(report.headlines, ['Our run ends in the quarter-final. A advance on penalties.']);
  assert.equal(report.next, undefined);
  assert.deepEqual(report.finished, { status: 'eliminated' });
  assert.doesNotMatch(JSON.stringify(report), /Future/);
});

test('the final group report identifies winners/runners-up on both sides of the knockout draw', () => {
  for (const position of [0, 1]) {
    const rows = (names) => names.map((team, i) => ({ team, points: 9 - 3 * i, played: 3, gf: 3, ga: 0, won: 3 - i, drawn: 0, lost: i }));
    const ours = position ? ['A', 'Us', 'B', 'C'] : ['Us', 'A', 'B', 'C'];
    const theirs = position ? ['Next', 'D', 'E', 'F'] : ['D', 'Next', 'E', 'F'];
    const before = { groups: [['Us', 'A', 'B', 'C'], ['Next', 'D', 'E', 'F']], standings: [rows(ours), rows(theirs)], games: [], round: 2, status: 'playing' };
    const after = { ...before, round: 3, standings: [rows(ours), rows(theirs)], games: [[], [], [
      { id: 'ours', home: 'Us', away: 'C', homeGoals: 2, awayGoals: 0 },
      { id: 'rival', home: 'Next', away: 'F', homeGoals: 0, awayGoals: 0 },
    ], [{ id: 'next', home: 'Us', away: 'Next' }]] };
    const report = buildRoundReport({ round: 2, us: 'Us', before, after, table: (c, g) => c.standings[g], roundNames: ['G1', 'G2', 'G3', 'Semi-final', 'Final'] });
    assert.equal(report.headlines[0], `Group A ${position ? 'runners-up' : 'winners'}. The knockout route is open.`);
    assert.equal(report.headlines[1], `Our next opponent: Next, Group B ${position ? 'winners' : 'runners-up'}.`);
    assert.equal(report.headlines[2], 'Next drew 0–0 with F.');
    assert.equal(report.group.qualified, true);
  }
});
