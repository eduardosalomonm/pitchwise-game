import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import {
  createMyCup,
  currentMyGame,
  finishMyGame,
  levelOf,
  myGroupTable,
  myOpponent,
  myStage,
  parseSavedMyCup,
  serializeMyCup,
} from '../lib/my-tournament.ts';
import {
  myCupFixture,
  myCupPlays,
  playsFor,
  stageOf,
  TIER_MIX,
  tierPlan,
} from '../lib/my-tournament-matches.ts';
import { myRoundNames } from '../lib/my-tournament.ts';
import {
  makeCustomTeam,
  matchKits,
  teams,
  validTeamName,
} from '../lib/teams.ts';
import { closingMoment, closingScore } from '../lib/tournament-stories.ts';
import {
  chooseMatchOption,
  continueMatch,
  createMatchRun,
  validateMatchMoments,
} from '../lib/match-day.ts';
import { getMatchArt } from '../lib/match-presentation.ts';
import { orderedMatchChoices } from '../lib/match-choice-order.ts';

const team = { name: 'Real Barrio', kitId: 'crimson' };
const play = (cup, us, them, shootout) =>
  finishMyGame(cup, currentMyGame(cup).id, us, them, shootout);

test('My Tournament does not promise qualification based on a representative 2–0 win', async () => {
  const { myGroupStakes } = await import('../lib/my-tournament.ts');
  const cup = play(play(createMyCup(0, team), 0, 0), 0, 1);
  assert.doesNotMatch(myGroupStakes(cup), /^Win and we are through\./);
  assert.equal(play(cup, 1, 0).status, 'eliminated');
});

test('club names are the player’s own and every preset strip works against every rival', () => {
  assert.ok(validTeamName('Real Barrio'));
  assert.ok(validTeamName('Atlético Ñandú'));
  for (const bad of [
    '',
    'A',
    ' Padded',
    'x'.repeat(25),
    'Astral Club',
    'Pitchwise FC',
    'Bad<script>',
    '😀 FC',
  ])
    assert.equal(validTeamName(bad), false, bad);
  const club = makeCustomTeam('Los Halcones de Tijuana', 'sky');
  assert.deepEqual([club.shortName, club.code], ['Los Halcones', 'HTI']);
  assert.equal(makeCustomTeam('Real Barrio', 'sky').code, 'RBA');
  assert.throws(() => createMyCup(1, { name: 'Astral Club', kitId: 'ember' }));
  for (const kitId of [
    'ember',
    'navy',
    'forest',
    'crimson',
    'sky',
    'midnight',
    'violet',
    'ivory',
  ]) {
    const home = makeCustomTeam('Test FC', kitId);
    for (const rival of teams.slice(1))
      assert.ok(matchKits(rival, home).away, `${kitId} vs ${rival.name}`);
  }
});

test('16 teams: random rivals with drawn difficulty, one per level in each group, ours from solid to elite', () => {
  const rosters = new Set();
  for (let seed = 0; seed < 30; seed++) {
    const cup = createMyCup(seed, team);
    assert.equal(new Set(cup.groups.flat()).size, 16);
    assert.equal(cup.groups[0][0], team.name);
    assert.deepEqual(
      cup.groups[0].slice(1).map((t) => levelOf(cup, t)),
      [3, 4, 5],
    );
    for (const group of cup.groups.slice(1))
      assert.deepEqual(
        group.map((t) => levelOf(cup, t)),
        [5, 4, 3, 2],
      );
    assert.deepEqual(
      Object.values(cup.levels)
        .sort((a, b) => a - b)
        .join(''),
      '222333344445555',
    );
    rosters.add(cup.groups[0].slice(1).join());
  }
  assert.ok(rosters.size > 25, 'every tournament meets different rivals');
});

test('six wins make us champions; draws in knockouts need penalties; group exits finish the bracket', () => {
  let cup = createMyCup(7, team);
  for (let i = 0; i < 6; i++) {
    assert.equal(cup.round, i);
    if (i === 3) {
      assert.throws(() => play(cup, 1, 1), /shootout/);
      cup = play(cup, 1, 1, [4, 3]);
    } else cup = play(cup, 2, 0);
  }
  assert.equal(cup.status, 'champion');
  assert.equal(myStage(cup), 5);
  assert.deepEqual(
    cup.games.slice(3).map((r) => r.length),
    [4, 2, 1],
  );
  let out = createMyCup(8, team);
  for (let i = 0; i < 3; i++) out = play(out, 0, 3);
  assert.equal(out.status, 'eliminated');
  assert.ok(out.champion && out.champion !== team.name);
  assert.equal(myGroupTable(out, 0).at(-1).team, team.name);
});

test('a saved tournament restores exactly; damaged saves are rejected', () => {
  let cup = createMyCup(99, team);
  cup = play(cup, 2, 1);
  cup = play(cup, 0, 0);
  assert.deepEqual(parseSavedMyCup(serializeMyCup(cup)), cup);
  const good = JSON.parse(serializeMyCup(cup));
  for (const bad of [
    null,
    'x',
    JSON.stringify({ ...good, v: 2 }),
    JSON.stringify({ ...good, team: { name: 'Astral Club', kitId: 'ember' } }),
    JSON.stringify({ ...good, results: [['nope', 1, 0]] }),
  ])
    assert.equal(parseSavedMyCup(bad), null);
});

test('each difficulty mixes all three tiers and gets harder toward the final', () => {
  const share = {};
  for (const mode of ['easy', 'intermediate', 'hard']) {
    const totals = [0, 0, 0];
    TIER_MIX[mode].forEach((mix, stage) => {
      assert.equal(
        mix.reduce((a, b) => a + b, 0),
        [3, 4, 4, 4, 4, 5][stage],
        `${mode} stage ${stage}`,
      );
      mix.forEach((n, t) => (totals[t] += n));
    });
    assert.ok(
      totals.every((n) => n > 0),
      `${mode} contains every tier`,
    );
    share[mode] = totals;
    const hard = TIER_MIX[mode].map((m) => m[2]);
    assert.ok(hard.at(-1) >= hard[0], `${mode} ends harder than it starts`);
  }
  assert.ok(
    share.easy[0] > share.easy[1] &&
      share.intermediate[1] > share.intermediate[0] &&
      share.intermediate[1] > share.intermediate[2] &&
      share.hard[2] > share.hard[1],
  );
  assert.deepEqual(
    tierPlan('hard', 3, 5).filter((t) => t === 2).length,
    4,
    'an elite knockout rival adds a hard play',
  );
  assert.deepEqual(tierPlan('easy', 0, 3), [0, 0, 0]);
});

function bestReachableRoute(moment, startId = moment.rootNodeId) {
  const memo = new Map();
  const visiting = new Set();
  function visit(nodeId) {
    if (memo.has(nodeId)) return memo.get(nodeId);
    assert.ok(!visiting.has(nodeId), `Cycle: ${moment.id}/${nodeId}`);
    const node = moment.nodes.find((item) => item.id === nodeId);
    assert.ok(node, `Missing node: ${moment.id}/${nodeId}`);
    visiting.add(nodeId);
    const candidates = node.choices
      .map((choice) => {
        const remainder = choice.outcome
          ? {
              home: choice.outcome.homeGoals,
              away: choice.outcome.awayGoals,
              path: [],
            }
          : visit(choice.nextNodeId);
        return { ...remainder, path: [choice.id, ...remainder.path] };
      })
      .sort(
        (a, b) =>
          b.home - b.away - (a.home - a.away) ||
          a.away - b.away ||
          b.home - a.home ||
          a.path.length - b.path.length,
      );
    assert.ok(candidates[0], `No terminal route: ${moment.id}/${nodeId}`);
    visiting.delete(nodeId);
    memo.set(nodeId, candidates[0]);
    return candidates[0];
  }
  return visit(startId);
}

function shortestReachableRoute(moment, startId = moment.rootNodeId) {
  const node = moment.nodes.find((n) => n.id === startId);
  return node.choices.map((c) => ({ path: [c.id, ...(c.outcome ? [] : shortestReachableRoute(moment, c.nextNodeId).path)] }))
    .sort((a, b) => a.path.length - b.path.length)[0];
}

function playOptimal(fixture, routeFor = bestReachableRoute) {
  let run = createMatchRun(fixture.moments);
  const hasClock = fixture.moments.at(-1).id.endsWith('-clock');
  let moments = fixture.moments;
  for (let guard = 0; run.status !== 'final' && guard < 200; guard++) {
    if (hasClock) {
      const score = closingScore(run.results);
      moments = [
        ...fixture.moments.slice(0, -1),
        closingMoment(fixture.moments.at(-1).id, score.home, score.away),
      ];
    }
    const m = moments[run.momentIndex];
    const route = routeFor(m, run.nodeId);
    const selected = chooseMatchOption(
      run,
      m.id,
      run.nodeId,
      route.path[0],
      moments,
    );
    assert.deepEqual(
      [selected.homeScore, selected.awayScore],
      [run.homeScore, run.awayScore],
    );
    run = continueMatch(selected, moments);
  }
  assert.equal(
    run.status,
    'final',
    'the route must reach full time within the decision limit',
  );
  assert.equal(run.pending, undefined);
  assert.equal(run.results.length, fixture.moments.length);
  assert.equal(
    run.homeScore,
    run.results.reduce((sum, result) => sum + result.outcome.homeGoals, 0),
  );
  assert.equal(
    run.awayScore,
    run.results.reduce((sum, result) => sum + result.outcome.awayGoals, 0),
  );
  return run;
}

test('every generated match is valid, never repeats a play within a tournament and can be won by reading it right', () => {
  const combos = [];
  for (const difficulty of ['easy', 'intermediate', 'hard'])
    for (const size of [8, 16, 32])
      for (const length of ['short', 'standard', 'long'])
        combos.push({ difficulty, size, length });
  for (const [i, settings] of combos.entries())
    for (let seed = i * 7; seed < i * 7 + 4; seed++) {
      const { difficulty } = settings;
      let cup = createMyCup(seed, { ...team, ...settings });
      const seen = new Set();
      const rounds = myRoundNames(cup).length;
      for (let round = 0; round < rounds; round++) {
        const fixture = myCupFixture(cup, round);
        const level = levelOf(cup, myOpponent(cup, currentMyGame(cup)));
        assert.equal(fixture.home.name, team.name);
        assert.equal(validateMatchMoments(fixture.moments), true);
        const expectedPlays = { short: 4, standard: 5, long: 6 }[settings.length] + Number(round === rounds - 1);
        assert.equal(
          fixture.moments.length,
          expectedPlays + (round >= 3 ? 1 : 0),
        );
        const shortest = playOptimal(fixture, shortestReachableRoute);
        assert.ok(shortest.decisions.length >= expectedPlays + Number(round >= 3), 'even early-terminal choices cannot end a match after two decisions');
        assert.ok(
          fixture.moments.some((m) => {
            const route = bestReachableRoute(m);
            return route.home > route.away;
          }),
          'a reachable winning chance, not necessarily first',
        );
        const tiers = myCupPlays(cup, round)
          .map((p) => p.tier)
          .sort((a, b) => a - b);
        assert.deepEqual(
          tiers,
          tierPlan(
            difficulty,
            stageOf(cup, round),
            level,
            playsFor(cup, round),
          ).sort((a, b) => a - b),
          `${JSON.stringify(settings)} seed ${seed} round ${round} tier mix`,
        );
        for (const key of myCupPlays(cup, round).map((p) => p.key)) {
          assert.ok(!seen.has(key), `seed ${seed}: ${key} repeated`);
          seen.add(key);
        }
        for (const m of fixture.moments)
          for (const n of m.nodes)
            for (const c of n.choices) {
              assert.ok(
                existsSync(
                  new URL(`../public${getMatchArt(n, c).src}`, import.meta.url),
                ),
              );
              assert.ok(
                !/Pitchwise FC/.test(`${c.label} ${c.feedback} ${n.context}`),
                'our club name replaces Pitchwise FC',
              );
            }
        for (const m of fixture.moments)
          assert.ok(
            !/^[^.]+: [a-z]/.test(m.introduction),
            `templated intro ${m.id}`,
          );
        const result = playOptimal(fixture);
        assert.ok(
          result.homeScore > result.awayScore,
          `seed ${seed} round ${round}: ideal ${result.homeScore}-${result.awayScore}`,
        );
        cup = play(cup, result.homeScore, result.awayScore);
        assert.deepEqual(parseSavedMyCup(serializeMyCup(cup)), cup);
      }
      assert.equal(cup.status, 'champion');
    }
});

test('older cups keep their played situations and scores, then switch to longer future matches', () => {
  let original = createMyCup(3, { ...team, difficulty: 'easy', size: 32, length: 'short' });
  original = play(play(original, 2, 0), 2, 0);
  const legacy = JSON.parse(serializeMyCup(original));
  delete legacy.pacingFromRound;
  let restored = parseSavedMyCup(JSON.stringify(legacy));
  assert.equal(restored.pacingFromRound, 2);
  const { pacingFromRound, ...unchanged } = restored;
  assert.deepEqual(unchanged, original, 'migration preserves scores, draw and progress');
  assert.deepEqual(myCupPlays(restored, 0).map((p) => p.key), ['harbour-outlets:2', 'arrow-middle:2']);
  assert.deepEqual(myCupPlays(restored, 1).map((p) => p.key), ['my:mt-easy-corner-header', 'low-block:1', 'my:mt-easy-high-steal']);
  assert.equal(playsFor(restored, 2), 4);
  const seen = new Set([0, 1].flatMap((r) => myCupPlays(restored, r).map((p) => p.key)));
  for (let round = 2; round < 7; round++) {
    for (const p of myCupPlays(restored, round)) {
      assert.ok(!seen.has(p.key), `migrated cup repeats ${p.key}`);
      seen.add(p.key);
    }
    const result = playOptimal(myCupFixture(restored, round));
    assert.ok(result.homeScore > result.awayScore);
    restored = play(restored, result.homeScore, result.awayScore);
    assert.equal(restored.pacingFromRound, pacingFromRound, 'the migration boundary stays fixed');
    assert.deepEqual(parseSavedMyCup(serializeMyCup(restored)), restored);
  }
  assert.equal(restored.status, 'champion');
  for (const bad of [null, '0', -1, 0.5, 3])
    assert.equal(parseSavedMyCup(JSON.stringify({ ...legacy, pacingFromRound: bad })), null);
  assert.deepEqual(parseSavedMyCup(JSON.stringify({ ...legacy, pacingFromRound: 0 })), original);
  const fresh = JSON.parse(serializeMyCup(createMyCup(3, team)));
  delete fresh.pacingFromRound;
  assert.deepEqual(parseSavedMyCup(JSON.stringify(fresh)), createMyCup(3, team));
});

test('every legacy pacing boundary preserves unique, winnable matches in a long 32-team cup', () => {
  for (const difficulty of ['easy', 'hard']) for (let boundary = 0; boundary <= 7; boundary++) {
    let cup = createMyCup(17, { ...team, difficulty, length: 'long', size: 32 });
    if (boundary) cup.pacingFromRound = boundary;
    const seen = new Set();
    for (let round = 0; round < 7; round++) {
      const plays = myCupPlays(cup, round);
      assert.deepEqual(plays.map((p) => p.tier).sort((a, b) => a - b), tierPlan(difficulty, stageOf(cup, round), levelOf(cup, myOpponent(cup, currentMyGame(cup))), playsFor(cup, round)).sort((a, b) => a - b));
      for (const p of plays) {
        assert.ok(!seen.has(p.key), `${difficulty}/${boundary}/${round}: ${p.key}`);
        seen.add(p.key);
      }
      const result = playOptimal(myCupFixture(cup, round));
      assert.ok(result.homeScore > result.awayScore);
      cup = play(cup, result.homeScore, result.awayScore);
      if (round + 1 >= boundary) assert.deepEqual(parseSavedMyCup(serializeMyCup(cup)), cup);
    }
    assert.equal(cup.status, 'champion');
  }
});

test('opening plays vary without promising a goal at kickoff', () => {
  for (const difficulty of ['easy', 'intermediate', 'hard']) {
    const openings = new Set();
    for (let seed = 0; seed < 64; seed++) {
      const cup = createMyCup(seed, {
        ...team,
        difficulty,
        size: 16,
        length: 'standard',
      });
      const opening = bestReachableRoute(myCupFixture(cup, 0).moments[0]);
      openings.add(opening.home > opening.away ? 'chance' : 'build-or-defend');
    }
    assert.deepEqual(
      [...openings].sort((a, b) => a.localeCompare(b)),
      ['build-or-defend', 'chance'],
      difficulty,
    );
  }
});

test('length changes proportionally apportion difficulty, with independent expected quotas', () => {
  assert.deepEqual(tierPlan('intermediate', 0, 3, 2), [0, 1]);
  assert.deepEqual(tierPlan('easy', 1, 3, 3), [0, 0, 1]);
  assert.deepEqual(tierPlan('hard', 0, 3, 3), [0, 1, 2]);
  assert.deepEqual(tierPlan('easy', 5, 5, 5), [0, 0, 1, 2, 2]);
  assert.deepEqual(tierPlan('intermediate', 5, 5, 5), [0, 1, 2, 2, 2]);
  for (const mode of ['easy', 'intermediate', 'hard'])
    for (let stage = 0; stage < 6; stage++) {
      const weights = TIER_MIX[mode][stage];
      const total = weights.reduce((a, b) => a + b, 0);
      for (const count of [total - 1, total, total + 1]) {
        const plan = tierPlan(mode, stage, 4, count);
        assert.equal(plan.length, count);
        for (let tier = 0; tier < 3; tier++) {
          const quota = (weights[tier] * count) / total;
          const actual = plan.filter((t) => t === tier).length;
          assert.ok(
            actual >= Math.floor(quota) && actual <= Math.ceil(quota),
            `${mode}/${stage}/${count}/${tier}`,
          );
        }
      }
    }
});

test('option order is reshuffled per tournament but stable within it', () => {
  const orders = new Set();
  for (let seed = 0; seed < 12; seed++) {
    const fixture = myCupFixture(createMyCup(seed, team), 0);
    const again = myCupFixture(createMyCup(seed, team), 0);
    assert.deepEqual(
      fixture.moments[0].nodes[0].choiceOrder,
      again.moments[0].nodes[0].choiceOrder,
    );
    for (const m of fixture.moments)
      for (const n of m.nodes)
        orders.add(
          `${n.id}:${orderedMatchChoices(n)
            .map((c) => c.id)
            .join()}`,
        );
  }
  const byNode = new Map();
  for (const entry of orders) {
    const [node] = entry.split(':');
    byNode.set(node, (byNode.get(node) ?? 0) + 1);
  }
  assert.ok(
    [...byNode.values()].some((n) => n > 1),
    'the same play appears with different option orders',
  );
});

test('group stakes and honours work for My Tournament', async () => {
  const { myGroupStakes, recordMyCup, emptyMyHonours, parseMyHonours } =
    await import('../lib/my-tournament.ts');
  let cup = createMyCup(3, team);
  assert.equal(myGroupStakes(cup), undefined);
  cup = play(play(cup, 3, 0), 3, 0);
  assert.match(
    myGroupStakes(cup),
    /^(Already through|A draw takes us through)/,
  );
  cup = play(cup, 1, 0);
  assert.equal(myGroupStakes(cup), 'Through as Group A winners.');
  for (let i = 0; i < 3; i++) cup = play(cup, 1, 0);
  let h = recordMyCup(emptyMyHonours(), cup);
  h = recordMyCup(h, cup);
  assert.deepEqual([h.played, h.titles, h.best], [1, 1, 5]);
  assert.deepEqual(parseMyHonours(JSON.stringify(h)), h);
  assert.deepEqual(parseMyHonours('{"played":1,"titles":2}'), emptyMyHonours());
});

test('every play My Tournament can draw has a neutral title of its own', async () => {
  const { PLAY_TITLES } = await import('../lib/play-titles.ts');
  const { matchFixtures } = await import('../lib/match-fixtures.ts');
  const ids = matchFixtures.flatMap((f) => f.moments.map((m) => m.id));
  assert.deepEqual(
    ids.filter((id) => !PLAY_TITLES[id]),
    [],
    'every play has a title',
  );
  const titles = ids.map((id) => PLAY_TITLES[id]);
  assert.equal(new Set(titles).size, titles.length, 'titles are distinct');
  // Training titles that named the answer must not survive.
  for (const id of ids) {
    const original = matchFixtures
      .flatMap((f) => f.moments)
      .find((m) => m.id === id).name;
    if (
      /^(Let|Hand over|Pass on|Track|Stay|Claim|Turn off|Cover|Carry|Screen|Exploit|Win|Protect|Recover|Attack|See|Offer|Switch|Use|Draw|Invite|Leave|Keep)\b/.test(
        original,
      )
    )
      assert.notEqual(PLAY_TITLES[id], original, id);
  }
  const fixture = myCupFixture(createMyCup(11, team), 0);
  for (const m of fixture.moments)
    assert.equal(m.name, PLAY_TITLES[m.id] ?? m.name);
});

test('8, 16 and 32 teams give 5, 6 and 7 matches with the right knockout rounds', () => {
  for (const [size, rounds, first] of [
    [8, 5, 'Semi-final'],
    [16, 6, 'Quarter-final'],
    [32, 7, 'Round of 16'],
  ]) {
    let cup = createMyCup(21, { ...team, size });
    assert.equal(new Set(cup.groups.flat()).size, size);
    assert.equal(cup.groups.length, size / 4);
    assert.deepEqual(myRoundNames(cup).length, rounds);
    assert.equal(myRoundNames(cup)[3], first);
    for (let i = 0; i < rounds; i++) cup = play(cup, 2, 0);
    assert.equal(cup.status, 'champion');
    assert.equal(cup.games[3].length, size / 4);
    assert.deepEqual(parseSavedMyCup(serializeMyCup(cup)), cup);
  }
  assert.throws(() => createMyCup(1, { ...team, size: 12 }));
  assert.equal(playsFor(createMyCup(1, { ...team, length: 'short' }), 0), 4);
  assert.equal(playsFor(createMyCup(1, { ...team, length: 'long' }), 5), 7);
});
