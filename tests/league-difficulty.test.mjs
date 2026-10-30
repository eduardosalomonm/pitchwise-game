import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createLeague,
  parseLeague,
  serializeLeague,
  finishLeagueGame,
  advanceLeagueBye,
  activeLeagueGame,
} from '../lib/league.ts';
import {
  leaguePool,
  expandedLeaguePlays,
  leaguePlaySchedule,
  leagueFixture,
  leagueMatchLength,
} from '../lib/league-matches.ts';
import {
  leaguePlayTier,
  LEAGUE_CONTENT_REQUIREMENTS as needs,
} from '../lib/league-difficulty.ts';
import { bestGoalDifference } from '../lib/my-tournament-matches.ts';
import { parseLeagueMatch } from '../lib/league-match-progress.ts';
import {
  createMatchRun,
  chooseMatchOption,
  continueMatch,
} from '../lib/match-day.ts';
import { phasePossession, choiceHandoff } from '../lib/match-narrative.ts';
const cfg = (difficulty) => ({
  name: 'Real Barrio',
  kitId: 'forest',
  size: 12,
  legs: 2,
  ...(difficulty ? { difficulty } : {}),
});
const levels = ['easy', 'intermediate', 'hard'];

test('phase tier decks match the selected level and capacity proof includes a rounded 10% reserve', () => {
  const expected = [
    [6, 2, 0],
    [1, 6, 1],
    [0, 2, 6],
  ];
  for (const [primary, difficulty] of levels.entries())
    for (const phase of ['attack', 'defence'])
      assert.equal(
        leaguePlayTier(difficulty, 9, phase, 0),
        primary,
        'the first phase establishes the chosen mode',
      );
  for (const seed of [1, 9, 19, 2026, 4294967295])
    for (const [mode, difficulty] of levels.entries())
      for (const phase of ['attack', 'defence'])
        for (let block = 0; block < 8; block++) {
          const deck = Array.from({ length: 8 }, (_, i) =>
            leaguePlayTier(difficulty, seed, phase, block * 8 + i),
          );
          assert.deepEqual(
            [0, 1, 2].map((t) => deck.filter((x) => x === t).length),
            expected[mode],
          );
        }
  assert.equal(needs.maximumAttacks, 2 * 25 + 6);
  assert.equal(needs.maximumDefences, 2 * 20 + 5);
  assert.equal(needs.requiredPrimaryAttacks, 7 * 6);
  assert.equal(needs.requiredPrimaryDefences, 5 * 6 + 5);
  assert.equal(
    needs.targetAttacksPerTier,
    Math.ceil(needs.requiredPrimaryAttacks * (1 + needs.reserve)),
  );
  assert.equal(
    needs.targetDefencesPerTier,
    Math.ceil(needs.requiredPrimaryDefences * (1 + needs.reserve)),
  );
  for (const tier of [0, 1, 2]) {
    const bucket = leaguePool().filter((p) => p.tier === tier);
    assert.equal(
      bucket.filter(
        (p) =>
          p.moment.phase === 'Attacking' && bestGoalDifference(p.moment) > 0,
      ).length,
      needs.targetAttacksPerTier,
    );
    assert.equal(
      bucket.filter(
        (p) =>
          p.moment.phase !== 'Attacking' && bestGoalDifference(p.moment) >= 0,
      ).length,
      needs.targetDefencesPerTier,
    );
    // Rarity is a real cap, not a filter that can exhaust a level late in a season.
    assert.ok(
      bucket.filter(
        (p) =>
          !p.rare &&
          p.moment.phase === 'Attacking' &&
          bestGoalDifference(p.moment) > 0,
      ).length >= needs.requiredPrimaryAttacks,
    );
    assert.ok(
      bucket.filter(
        (p) =>
          !p.rare &&
          p.moment.phase !== 'Attacking' &&
          bestGoalDifference(p.moment) >= 0,
      ).length >= needs.requiredPrimaryDefences,
    );
  }
  const longest = Array.from({ length: 22 }, (_, i) => leagueMatchLength(9, i));
  assert.equal(
    longest.reduce((n, x) => n + Math.ceil(x / 2), 0),
    56,
  );
  assert.equal(
    longest.reduce((n, x) => n + Math.floor(x / 2), 0),
    45,
  );
});

test('all54 settings have a stable selected level, unique regular plays, rare highlights and reachable wins', () => {
  const openers = new Set();
  for (const difficulty of levels)
    for (let size = 4; size <= 12; size++)
      for (const legs of [1, 2])
        for (const seed of [1, 9, 2026]) {
          const league = createLeague(seed, { ...cfg(difficulty), size, legs });
          const schedule = leaguePlaySchedule(league),
            flat = schedule.flat();
          assert.equal(new Set(flat.map((p) => p.key)).size, flat.length);
          assert.deepEqual(parseLeague(serializeLeague(league)), league);
          let a = 0,
            d = 0,
            played = 0;
          for (const [round, picks] of schedule.entries()) {
            if (!picks.length) continue;
            assert.ok(picks.filter((p) => p.rare).length <= 1);
            // Order is shuffled for narrative variety, so compare the requested multiset.
            const attacking = picks.filter(
              (p) => p.moment.phase === 'Attacking',
            );
            const defending = picks.filter(
              (p) => p.moment.phase !== 'Attacking',
            );
            assert.deepEqual(
              attacking.map((p) => p.tier).sort((a, b) => a - b),
              Array.from({ length: attacking.length }, () =>
                leaguePlayTier(difficulty, seed, 'attack', a++),
              ).sort((a, b) => a - b),
            );
            assert.deepEqual(
              defending.map((p) => p.tier).sort((a, b) => a - b),
              Array.from({ length: defending.length }, () =>
                leaguePlayTier(difficulty, seed, 'defence', d++),
              ).sort((a, b) => a - b),
            );
            const fixture = leagueFixture(league, round);
            assert.equal(fixture.difficulty.toLowerCase(), difficulty);
            assert.ok(
              fixture.moments.reduce((n, m) => n + bestGoalDifference(m), 0) >
                0,
            );
            assert.deepEqual(leagueFixture(league, round), fixture);
            openers.add(fixture.moments[0].phase);
            played++;
          }
          assert.equal(played, (size - 1) * legs);
          assert.ok(a <= needs.maximumAttacks && d <= needs.maximumDefences);
          assert.ok(flat.filter((p) => p.rare).length <= Math.ceil(played / 5));
        }
  assert.ok(openers.has('Attacking') && openers.has('Defending'));
});

test('new story copy uses football landmarks, neutral option labels and varied acting roles', () => {
  const actors = new Set(),
    scorers = new Set(),
    names = new Set();
  for (const { moment } of expandedLeaguePlays) {
    assert.ok(!names.has(moment.name), `distinct title: ${moment.name}`);
    names.add(moment.name);
    for (const node of moment.nodes) {
      actors.add(node.actorLabel);
      assert.doesNotMatch(
        node.context,
        /\b[xy]\s*=?\s*\d/i,
        `${node.id}: football landmarks, not normalized coordinates`,
      );
      for (const choice of node.choices) {
        assert.doesNotMatch(
          choice.label,
          /\b(fancy|recklessly|obviously|stupid|correct|wrong)\b/i,
          `${node.id}: do not reveal the answer in the label`,
        );
        assert.ok(
          choice.label.length <= 110,
          `${node.id}: concise mobile option`,
        );
        if (choice.outcome?.homeGoals) {
          const release = choice.ballPath.at(-2);
          const scorer = node.scene.players.find(
            (p) =>
              p.team === 'home' &&
              (choice.movement.find((m) => m.playerId === p.id)?.to.x ??
                p.x) === release.x &&
              (choice.movement.find((m) => m.playerId === p.id)?.to.y ??
                p.y) === release.y,
          );
          assert.ok(scorer, `${node.id}: visible shot owner`);
          scorers.add(scorer.label);
        }
      }
    }
  }
  assert.ok(
    actors.size >= 10,
    'decisions involve the whole team, not only the winger/nine',
  );
  assert.ok(
    scorers.size >= 6,
    'goals are not all finished by the same position',
  );
  const longShots = expandedLeaguePlays
    .filter((p) => p.rare)
    .flatMap((p) =>
      p.moment.nodes.flatMap((node) =>
        node.choices
          .filter((c) => c.outcome?.homeGoals)
          .map((c) => ({ node, release: c.ballPath.at(-2) })),
      ),
    );
  assert.ok(
    longShots.some(({ release }) => release.x <= 56),
    'an earned near-halfway goal is represented by an actual long route',
  );
});

test('new scenes and possession handoffs switch to our attack after a defensive regain', () => {
  const recoveries = new Set();
  for (const { moment } of expandedLeaguePlays)
    for (const node of moment.nodes) {
      const owners = node.scene.players.filter(
        (p) =>
          Math.hypot(p.x - node.scene.ball.x, p.y - node.scene.ball.y) < 0.001,
      );
      const sides = new Set(owners.map((p) => p.team));
      if (sides.size === 1)
        assert.equal(
          phasePossession(node),
          owners[0].team,
          `${node.id}: phase and HUD agree with the controlled ball`,
        );
      for (const choice of node.choices) {
        if (!choice.nextNodeId) continue;
        const next = moment.nodes.find((n) => n.id === choice.nextNodeId);
        assert.equal(
          choiceHandoff(moment, node, choice).possession,
          phasePossession(next),
        );
        if (node.phase === 'Defending' && next.phase === 'Attacking') {
          recoveries.add(moment.id);
          assert.equal(choiceHandoff(moment, node, choice).changed, true);
        }
      }
    }
  assert.ok(
    [...recoveries].filter((id) => id.startsWith('lg2-e-')).length >= 12,
    'the twelve Easy regain-and-outlet stories switch possession before the outlet',
  );
  assert.ok(
    recoveries.has('lg2-i-six-save-follow'),
    'the Intermediate keeper-save story switches possession before the follow-up',
  );
});

test('new difficulty changes content, never calendar, simulated scores or the meaning of choices', () => {
  let seasons = levels.map((level) => createLeague(9, cfg(level)));
  assert.deepEqual(seasons[0].rounds, seasons[2].rounds);
  assert.notDeepEqual(
    leaguePlaySchedule(seasons[0]),
    leaguePlaySchedule(seasons[2]),
  );
  while (seasons[0].status === 'playing') {
    seasons = seasons.map((league) => {
      const game = activeLeagueGame(league);
      return game
        ? finishLeagueGame(league, game.id, 2, 1)
        : advanceLeagueBye(league);
    });
    assert.deepEqual(seasons[0].rounds, seasons[1].rounds);
    assert.deepEqual(seasons[1].rounds, seasons[2].rounds);
  }
  for (const difficulty of [null, 'expert', 2, {}, '']) {
    assert.throws(() => createLeague(1, { ...cfg(), difficulty }));
    assert.equal(
      parseLeague(
        JSON.stringify({
          v: 1,
          seed: 1,
          config: { ...cfg(), difficulty },
          results: [],
        }),
      ),
      null,
    );
  }
});

test('literalv35 saves keep their original catalogue and both locked and committed journals', () => {
  const league = parseLeague(
    JSON.stringify({
      v: 1,
      seed: 7,
      config: { name: 'Real Barrio', kitId: 'forest', size: 6, legs: 1 },
      results: [
        ['league-r0-1', 2, 1],
        ['league-r1-2', 2, 1],
      ],
    }),
  );
  assert.ok(league);
  assert.equal(Object.hasOwn(league.config, 'difficulty'), false);
  const fixture = leagueFixture(league);
  assert.deepEqual(
    fixture.moments.map((m) => m.id),
    [
      'lg-curl-to-volley',
      'advanced-end-to-end',
      'bait-traps-3',
      'compass-rhythm-5',
      'mt-corner-against',
      'advanced-far-side',
    ],
  );
  const journal = {
    v: 1,
    seed: 7,
    gameId: 'league-r2-2',
    pending: true,
    choices: [['lg-curl-to-volley', 'lg-curl-to-volley-1', 'option-1']],
  };
  const locked = parseLeagueMatch(
    JSON.stringify(journal),
    7,
    journal.gameId,
    fixture.moments,
  );
  assert.ok(locked?.pending);
  assert.equal(locked.nodeId, 'lg-curl-to-volley-1');
  const committed = parseLeagueMatch(
    JSON.stringify({ ...journal, pending: false }),
    7,
    journal.gameId,
    fixture.moments,
  );
  assert.equal(committed.nodeId, 'lg-curl-to-volley-2');
  assert.equal(committed.homeScore, 0);
  assert.equal(committed.awayScore, 0);
});

test('new authored tier progression is2/3/4 reads and each rare goal still requires the full route', () => {
  for (const { tier, moment } of expandedLeaguePlays) {
    let run = createMatchRun([moment]),
      decisions = 0;
    while (run.status !== 'final') {
      const node = moment.nodes.find((n) => n.id === run.nodeId),
        choice = node.choices.find((c) => c.tone === 'positive');
      assert.equal(node.choices.length, tier === 0 ? 3 : 4);
      run = continueMatch(
        chooseMatchOption(run, moment.id, node.id, choice.id, [moment]),
        [moment],
      );
      decisions++;
    }
    assert.equal(decisions, tier + 2, moment.id);
    assert.equal(
      run.homeScore,
      Number(moment.phase === 'Attacking'),
      moment.id,
    );
    assert.equal(run.awayScore, 0, moment.id);
  }
  const rares = expandedLeaguePlays.filter((p) => p.rare);
  assert.ok(rares.length >= 3 && rares.length <= 9);
  for (const p of rares) {
    const root = p.moment.nodes[0];
    assert.ok(
      root.choices.some(
        (c) => c.tone !== 'positive' && c.outcome?.homeGoals === 0,
      ),
    );
  }
});
