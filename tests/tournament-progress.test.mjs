import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTournament, currentTournamentGame, finishTournamentGame, OUR_TEAM } from '../lib/tournament.ts';
import { groupStakes, parseSavedCup, serializeCup, teamForm } from '../lib/tournament-progress.ts';

function play(run, us, them, shootout) {
  return finishTournamentGame(run, currentTournamentGame(run).id, us, them, shootout);
}

test('last-group stakes do not promise qualification when a narrow win can still eliminate us', () => {
  const run = play(play(createTournament(4), 0, 0), 0, 1);
  assert.doesNotMatch(groupStakes(run), /^Win and we are through\./);
  assert.equal(play(run, 1, 0).status, 'eliminated');
});

test('a saved cup restores exactly, including a shootout, by replaying our results', () => {
  let run = createTournament(4321);
  run = play(run, 2, 0);
  run = play(run, 1, 1);
  run = play(run, 3, 1);
  run = play(run, 1, 1, [5, 4]);
  const restored = parseSavedCup(serializeCup(run));
  assert.deepEqual(restored, run);
  assert.deepEqual(parseSavedCup(serializeCup(createTournament(7))), createTournament(7));
});

test('damaged or edited saves are rejected instead of producing an impossible cup', () => {
  const good = JSON.parse(serializeCup(play(createTournament(9), 1, 0)));
  for (const bad of [
    null, '', 'not json', '[]', '{"v":2,"seed":1,"results":[]}', '{"v":1,"seed":-4,"results":[]}',
    JSON.stringify({ ...good, results: [['wrong-game', 1, 0]] }),
    JSON.stringify({ ...good, results: [[good.results[0][0], 9, 0]] }),
    JSON.stringify({ ...good, results: [...good.results, good.results[0]] }),
  ])
    assert.equal(parseSavedCup(bad), null, String(bad));
});

test('group stakes explain the last group game, and form reads from each club point of view', () => {
  let run = createTournament(11);
  assert.equal(groupStakes(run), undefined);
  run = play(run, 3, 0);
  run = play(run, 3, 0);
  assert.match(groupStakes(run), /^(Already through|A draw takes us through)/);
  let poor = createTournament(11);
  poor = play(poor, 0, 3);
  poor = play(poor, 0, 3);
  assert.match(groupStakes(poor), /need a win|cannot reach the top two/);
  run = play(run, 1, 0);
  assert.equal(groupStakes(run), 'Through as Group A winners.');
  assert.deepEqual(teamForm(run, OUR_TEAM).map((f) => f.result), ['W', 'W', 'W']);
  const rival = run.games[0].find((g) => g.home === OUR_TEAM).away;
  assert.equal(teamForm(run, rival)[0].result, 'L');
});

test('honours count each finished cup once and remember the furthest stage', async () => {
  const { recordCup, emptyHonours, parseHonours, cupStage } = await import('../lib/tournament-progress.ts');
  let champion = createTournament(5);
  for (let i = 0; i < 7; i++) champion = play(champion, 2, 0);
  let groupExit = createTournament(6);
  for (let i = 0; i < 3; i++) groupExit = play(groupExit, 0, 2);
  assert.equal(cupStage(champion), 7);
  assert.equal(cupStage(groupExit), 2);
  let honours = recordCup(emptyHonours(), groupExit);
  honours = recordCup(honours, groupExit);
  honours = recordCup(honours, createTournament(8));
  assert.deepEqual([honours.cups, honours.titles, honours.best], [1, 0, 2]);
  honours = recordCup(honours, champion);
  assert.deepEqual([honours.cups, honours.titles, honours.best], [2, 1, 7]);
  assert.deepEqual(parseHonours(JSON.stringify(honours)), honours);
  assert.deepEqual(parseHonours('{"cups":1,"titles":3}'), emptyHonours());
  assert.deepEqual(parseHonours('nope'), emptyHonours());
});
