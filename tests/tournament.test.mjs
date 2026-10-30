import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  GROUPS,
  OUR_TEAM,
  createTournament,
  currentTournamentGame,
  finishTournamentGame,
  groupTable,
  createShootout,
  takePenalty,
  penaltyCue,
  drawGroups,
  teamRating,
  rivalPenaltyCue,
  PENALTY_ZONES,
  penaltyAttempt,
} from '../lib/tournament.ts';
import { planPenaltyPair } from '../scripts/penalty-test-driver.mjs';
test('32 distinct teams play each group rival exactly once', () => {
  const run = createTournament();
  assert.equal(new Set(GROUPS.flat()).size, 32);
  assert.equal(run.games.flat().length, 48);
  for (const group of GROUPS)
    for (const team of group) {
      const games = run.games
        .flat()
        .filter((g) => g.home === team || g.away === team);
      assert.equal(games.length, 3);
      assert.equal(
        new Set(games.map((g) => (g.home === team ? g.away : g.home))).size,
        3,
      );
    }
});
test('wins award three points; rivals simulate once; source run is immutable', () => {
  const run = createTournament(),
    snapshot = structuredClone(run),
    game = currentTournamentGame(run);
  const next = finishTournamentGame(run, game.id, 2, 0);
  assert.deepEqual(run, snapshot);
  assert.equal(
    next.games[0].filter((g) => g.homeGoals !== undefined).length,
    16,
  );
  assert.deepEqual(
    groupTable(next, 0).find((r) => r.team === OUR_TEAM),
    {
      team: OUR_TEAM,
      played: 1,
      won: 1,
      drawn: 0,
      lost: 0,
      gf: 2,
      ga: 0,
      points: 3,
    },
  );
  assert.throws(() => finishTournamentGame(next, game.id, 2, 0), /not active/);
  assert.deepEqual(next, finishTournamentGame(run, game.id, 2, 0));
});
test('seven wins lift the trophy and every knockout has one winner', () => {
  let run = createTournament();
  for (let i = 0; i < 7; i++) {
    assert.equal(run.round, i);
    run = finishTournamentGame(run, currentTournamentGame(run).id, 3, 0);
  }
  assert.equal(run.status, 'champion');
  assert.equal(run.champion, OUR_TEAM);
  assert.deepEqual(
    run.games.slice(3).map((r) => r.length),
    [8, 4, 2, 1],
  );
  assert.equal(new Set(run.games[3].flatMap((g) => [g.home, g.away])).size, 16);
  assert.ok(
    run.games
      .slice(3)
      .flat()
      .every((g) => g.winner && g.homeGoals !== undefined),
  );
  assert.equal(currentTournamentGame(run), undefined);
});
test('group elimination completes the other teams tournament without inventing our games', () => {
  let run = createTournament();
  for (let i = 0; i < 3; i++)
    run = finishTournamentGame(run, currentTournamentGame(run).id, 0, 5);
  assert.equal(run.status, 'eliminated');
  assert.notEqual(run.champion, OUR_TEAM);
  assert.ok(run.champion);
  assert.ok(
    run.games
      .slice(3)
      .flat()
      .every((g) => g.home !== OUR_TEAM && g.away !== OUR_TEAM),
  );
});
test('draws award a point; goal difference and goals scored break point ties', () => {
  const run = createTournament();
  const next = finishTournamentGame(run, currentTournamentGame(run).id, 1, 1);
  assert.equal(groupTable(next, 0).find((r) => r.team === OUR_TEAM).points, 1);
  const table = groupTable(next, 0);
  for (let i = 1; i < table.length; i++)
    assert.ok(table[i - 1].points >= table[i].points);
});
test('knockout draws require penalties; a shootout can win or eliminate without adding match goals', () => {
  let run = createTournament();
  for (let i = 0; i < 3; i++)
    run = finishTournamentGame(run, currentTournamentGame(run).id, 3, 0);
  const game = currentTournamentGame(run);
  assert.throws(() => finishTournamentGame(run, game.id, 1, 1), /shootout/);
  assert.throws(
    () => finishTournamentGame(run, game.id, 1, 1, [4, 4]),
    /shootout/,
  );
  const won = finishTournamentGame(run, game.id, 1, 1, [5, 4]);
  assert.equal(won.round, 4);
  assert.equal(won.status, 'playing');
  const saved = won.games[3].find((g) => g.id === game.id);
  assert.equal(saved.homeGoals, 1);
  assert.equal(saved.awayGoals, 1);
  assert.equal(saved.winner, OUR_TEAM);
  const lost = finishTournamentGame(run, game.id, 1, 1, [3, 4]);
  assert.equal(lost.status, 'eliminated');
  assert.notEqual(lost.champion, OUR_TEAM);
});
test('invalid inputs cannot change a tournament', () => {
  const run = createTournament(),
    game = currentTournamentGame(run);
  for (const value of [-1, 1.5, NaN, Infinity, 6])
    assert.throws(
      () => finishTournamentGame(run, game.id, value, 0),
      /Invalid/,
    );
});
test('different seeds vary simulated results; all tables preserve goals and points', () => {
  const versions = [1, 2, 3].map((seed) => {
    const r = createTournament(seed);
    return finishTournamentGame(r, currentTournamentGame(r).id, 0, 0);
  });
  assert.notDeepEqual(versions[0].games[0], versions[1].games[0]);
  for (const r of versions)
    for (let g = 0; g < 8; g++) {
      const rows = groupTable(r, g);
      assert.equal(
        rows.reduce((s, t) => s + t.gf, 0),
        rows.reduce((s, t) => s + t.ga, 0),
      );
      assert.equal(
        rows.reduce((s, t) => s + t.won, 0),
        rows.reduce((s, t) => s + t.lost, 0),
      );
      for (const row of rows) assert.equal(row.points, 3 * row.won + row.drawn);
    }
});
test('penalties support victory, defeat, early finish, sudden death and locked completion', () => {
  for (let seed = 0; seed < 20; seed++)
    for (const good of [true, false]) {
      let state = createShootout();
      while (!state.finished) state = planPenaltyPair(state, 'test', seed, good, !good).next;
      assert.ok(state.finished);
      assert.equal(state.kicks, 3, 'an uncatchable score finishes early');
      assert.equal(state.us > state.them, good);
      assert.equal(takePenalty(state, 0, 'test', seed), state);
    }
  for (const invalid of [-1, 6, 1.5, NaN, Infinity]) {
    const state = createShootout();
    assert.equal(takePenalty(state, invalid, 'test', 1), state);
    assert.equal(takePenalty(state, 0, 'test', 1, invalid), state);
  }
});

test('group qualifiers occupy opposite bracket halves and each winner feeds the displayed adjacent slot', () => {
  let run = createTournament();
  for (let i = 0; i < 3; i++)
    run = finishTournamentGame(run, currentTournamentGame(run).id, 3, 0);
  for (let group = 0; group < 8; group++) {
    const qualifiers = groupTable(run, group)
      .slice(0, 2)
      .map((row) => row.team);
    const slots = qualifiers.map((team) =>
      run.games[3].findIndex(
        (game) => game.home === team || game.away === team,
      ),
    );
    assert.notEqual(Math.floor(slots[0] / 4), Math.floor(slots[1] / 4));
  }
  for (let round = 3; round < 6; round++) {
    run = finishTournamentGame(run, currentTournamentGame(run).id, 3, 0);
    run.games[round + 1].forEach((game, index) => {
      assert.equal(game.home, run.games[round][index * 2].winner);
      assert.equal(game.away, run.games[round][index * 2 + 1].winner);
    });
  }
});

test('penalty history records each pair once and matches both score totals', () => {
  let state = createShootout();
  const original = structuredClone(state);
  for (let pair = 0; pair < 5; pair++) state = planPenaltyPair(state, 'test', 2, true, true).next;
  assert.equal(state.finished, false, '5–5 enters sudden death');
  state = planPenaltyPair(state, 'test', 2, false, false).next;
  assert.equal(state.finished, false, 'two misses continue sudden death');
  state = planPenaltyPair(state, 'test', 2, true, false).next;
  assert.deepEqual(original, createShootout());
  assert.equal(state.history.length, state.kicks);
  assert.equal(state.us, state.history.filter((kick) => kick.scored).length);
  assert.equal(
    state.them,
    state.history.filter((kick) => kick.rivalScored).length,
  );
  assert.equal(state.kicks, 7, 'sudden death retains every pair');
  assert.deepEqual([state.us, state.them], [6, 5]);
  assert.equal(takePenalty(state, 0, 'test', 2), state);
});

test('runner-up away-side shootout displays penalties in fixture order, not our-team order', () => {
  let run = createTournament(1);
  for (const score of [
    [1, 0],
    [1, 0],
    [0, 1],
  ])
    run = finishTournamentGame(run, currentTournamentGame(run).id, ...score);
  const game = currentTournamentGame(run);
  assert.equal(game.away, OUR_TEAM);
  const next = finishTournamentGame(run, game.id, 0, 0, [5, 4]);
  assert.deepEqual(
    next.games[3].find((item) => item.id === game.id).penalties,
    [4, 5],
  );
});

test('the draw is one club per pot and the same in every cup; seeds only vary the other results', () => {
  const groups = drawGroups(2026);
  assert.equal(new Set(groups.flat()).size, 32);
  assert.equal(groups[0][0], OUR_TEAM);
  const [, first, second, third] = groups[0].map(teamRating);
  assert.ok(first < second && second < third, 'group games get harder');
  for (const group of groups.slice(1)) {
    const ratings = group.map(teamRating);
    assert.ok(ratings[0] > ratings[1] && ratings[1] > ratings[2] && ratings[2] > ratings[3]);
  }
  for (const seed of [1, 99, 123456]) assert.deepEqual(createTournament(seed).groups, groups);
  const a = finishTournamentGame(createTournament(1), currentTournamentGame(createTournament(1)).id, 1, 0);
  const b = finishTournamentGame(createTournament(2), currentTournamentGame(createTournament(2)).id, 1, 0);
  assert.notDeepEqual(a.games[0], b.games[0]);
});

test('stronger clubs usually win simulated games, without making upsets impossible', () => {
  let favourite = 0, upsets = 0;
  for (let seed = 0; seed < 300; seed++) {
    let run = createTournament(seed);
    for (let i = 0; i < 3; i++) run = finishTournamentGame(run, currentTournamentGame(run).id, 1, 0);
    for (const game of run.games.slice(0, 3).flat()) {
      if (game.home === OUR_TEAM || game.away === OUR_TEAM) continue;
      const diff = teamRating(game.home) - teamRating(game.away);
      if (Math.abs(diff) < 10 || game.homeGoals === game.awayGoals) continue;
      const strongerWon = (game.homeGoals > game.awayGoals) === diff > 0;
      if (strongerWon) favourite++;
      else upsets++;
    }
  }
  assert.ok(favourite > upsets * 2, `favourites ${favourite} vs upsets ${upsets}`);
  assert.ok(upsets > 0);
});

test('six penalty zones resolve exact saves deterministically; preview matches the locked kick', () => {
  assert.equal(PENALTY_ZONES.length, 6);
  assert.equal(new Set(PENALTY_ZONES.map((z) => z.label)).size, 6);
  for (let seed = 0; seed < 20; seed++)
    for (let shot = 0; shot < 6; shot++)
      for (let dive = 0; dive < 6; dive++) {
        const state = createShootout(), preview = penaltyAttempt(state, shot, 'g', seed);
        const next = takePenalty(state, shot, 'g', seed, dive), kick = next.history[0];
        assert.equal(kick.scored, shot !== kick.keeperSide);
        assert.equal(kick.rivalScored, dive !== kick.rivalDirection);
        assert.equal(kick.dive, dive);
        assert.deepEqual(preview, { direction: shot, keeperSide: kick.keeperSide, scored: kick.scored });
        assert.deepEqual(next, takePenalty(state, shot, 'g', seed, dive));
        assert.equal(state.kicks, 0);
      }
});

test('body language is usually neutral and sometimes deceptive, never an exact-zone oracle', () => {
  for (const [cueFn, targetKey] of [[penaltyCue, 'keeperSide'], [rivalPenaltyCue, 'rivalDirection']]) {
    let neutral = 0, hints = 0, honest = 0;
    const targetsByText = new Map();
    for (let seed = 0; seed < 600; seed++) for (let kick = 0; kick < 6; kick++) {
      const cue = cueFn('g', kick, seed), state = { ...createShootout(), kicks: kick };
      const target = takePenalty(state, 0, 'g', seed, 0).history.at(-1)[targetKey];
      assert.deepEqual(Object.keys(cue).sort(), ['side', 'text']);
      assert.ok(!/high|low|guarantee/i.test(cue.text));
      const targets = targetsByText.get(cue.text) ?? new Set();
      targets.add(target); targetsByText.set(cue.text, targets);
      if (cue.side === null) neutral++;
      else { hints++; if (target % 3 === cue.side) honest++; }
    }
    assert.ok(neutral / (neutral + hints) > .65 && neutral / (neutral + hints) < .75);
    assert.ok(honest / hints > .58 && honest / hints < .74);
    for (const targets of targetsByText.values()) assert.equal(targets.size, 6, 'one tell cannot identify a target');
  }
});

test('neutral penalty play can win or lose; reading hints helps without guaranteeing a win', () => {
  const wins = [0, 0];
  for (let seed = 0; seed < 256; seed++) for (const reading of [0, 1]) {
    let state = createShootout();
    while (!state.finished && state.kicks < 100) {
      const keeper = penaltyCue('balance', state.kicks, seed), kicker = rivalPenaltyCue('balance', state.kicks, seed);
      const shot = reading && keeper.side !== null ? (keeper.side + 1) % 3 : 0;
      const dive = reading && kicker.side !== null ? kicker.side + (state.kicks % 2 ? 3 : 0) : 0;
      state = takePenalty(state, shot, 'balance', seed, dive);
    }
    assert.ok(state.finished, 'sampled sudden-death games terminate');
    wins[reading] += Number(state.us > state.them);
  }
  assert.ok(wins[0] > 256 * .3 && wins[0] < 256 * .7, `neutral wins ${wins[0]}/256`);
  assert.ok(wins[1] > wins[0] && wins[1] < 256 * .85, `hint-reading wins ${wins[1]}/256`);
});
