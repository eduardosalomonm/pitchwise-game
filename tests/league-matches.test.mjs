import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLeague, leagueIsOurs } from '../lib/league.ts';
import {
  leaguePool,
  leagueFixture,
  leagueMatchLength,
  leaguePlaySchedule,
  expandedLeaguePlays,
} from '../lib/league-matches.ts';
import { playPool, bestGoalDifference } from '../lib/my-tournament-matches.ts';
import { leaguePlays } from '../lib/league-plays.ts';
import { redCardPlays } from '../lib/red-card-plays.ts';
import {
  chooseMatchOption,
  continueMatch,
  createMatchRun,
  validateMatchMoments,
} from '../lib/match-day.ts';
import {
  parseLeagueMatch,
  serializeLeagueMatch,
} from '../lib/league-match-progress.ts';
import { completeTeamShape } from '../lib/team-shape.ts';
import { hasPlayableMotion, getMatchArt } from '../lib/match-presentation.ts';
import { catalogEvent, knownFixture } from '../lib/playtest-catalog.ts';
import { existsSync } from 'node:fs';
const cfg = (size = 12, legs = 2) => ({
  name: 'Real Barrio',
  kitId: 'forest',
  size,
  legs,
});

test('league catalogues stay distinct and valid without changing the historical cup pool', () => {
  assert.equal(playPool().length, 109);
  assert.equal(leaguePlays.length, 41);
  assert.equal(leaguePool(false).length, 150);
  assert.equal(expandedLeaguePlays.length, 121);
  assert.equal(leaguePool().length, 271);
  assert.equal(redCardPlays.length, 12);
  const entries = [...leaguePool(), ...redCardPlays];
  assert.equal(new Set(entries.map((p) => p.moment.id)).size, 283);
  const fingerprint = (m) =>
    JSON.stringify(
      m.nodes.map((n) => ({
        actor: n.actorLabel,
        phase: n.phase,
        scene: n.scene,
        choices: n.choices.map((c) => ({
          moves: c.movement,
          path: c.ballPath,
          goals: c.outcome
            ? [c.outcome.homeGoals, c.outcome.awayGoals, c.outcome.possession]
            : undefined,
          next: Boolean(c.nextNodeId),
        })),
      })),
    );
  assert.equal(
    new Set(entries.map((p) => fingerprint(p.moment))).size,
    283,
    'no geometrically identical renamed plays',
  );
  assert.equal(validateMatchMoments(entries.map((p) => p.moment)), true);
  for (const p of [...leaguePlays, ...expandedLeaguePlays, ...redCardPlays])
    for (const node of p.moment.nodes) {
      assert.equal(
        node.choices.filter((c) => c.tone === 'positive').length,
        1,
        node.id,
      );
      for (const c of node.choices) {
        assert.ok(hasPlayableMotion(node, c), node.id);
        assert.ok(
          existsSync(
            new URL(`../public${getMatchArt(node, c).src}`, import.meta.url),
          ),
        );
      }
    }
});

test('length decks are mostly four/five moments, with rare three/six games', () => {
  for (const seed of [1, 7, 2026, 3910]) {
    const lengths = Array.from({ length: 20 }, (_, i) =>
      leagueMatchLength(seed, i),
    );
    assert.equal(lengths.filter((n) => n === 3).length, 2);
    assert.equal(lengths.filter((n) => n === 6).length, 2);
    assert.equal(lengths.filter((n) => n === 4 || n === 5).length, 16);
  }
});

test('new flank exits and keeper cues agree with the visible geometry', () => {
  const get = (id) =>
    leaguePlays.find((p) => p.moment.id === `lg-${id}`).moment;
  for (const id of ['outside-stepover', 'nutmeg-exit']) {
    const root = get(id).nodes[0],
      best = root.choices.find((c) => c.tone === 'positive');
    assert.ok(
      best.ballPath.every((p) => p.y >= root.scene.ball.y),
      `${id}: outside on our right moves toward the touchline`,
    );
  }
  for (const [id, y] of [
    ['outside-stepover', 58],
    ['six-underlap', 42],
    ['curl-to-volley', 58],
    ['dummy-cross', 43],
  ]) {
    const m = get(id),
      first = m.nodes[0],
      next = m.nodes.find(
        (n) =>
          n.id === first.choices.find((c) => c.tone === 'positive').nextNodeId,
      );
    assert.equal(
      next.scene.players.find((p) => p.id === 'a-gk').y,
      y,
      `${id}: the keeper moves to the side described`,
    );
  }
  const caught = get('catch-clean-shot').nodes[0].scene.players;
  assert.ok(
    caught.find((p) => p.id === 'h-six').y -
      caught.find((p) => p.id === 'a-st').y >
      20,
    'the release outlet is actually on the other side of the striker',
  );
});

test('full-length seasons select fresh regular plays and each match has a reachable win', () => {
  const firstPhases = new Set(),
    cardSides = new Set();
  for (const seed of [1, 2, 7, 19, 77, 313, 2026])
    for (const [size, legs] of [
      [4, 1],
      [5, 2],
      [12, 2],
    ]) {
      const league = createLeague(seed, cfg(size, legs)),
        schedule = leaguePlaySchedule(league),
        selected = schedule.flat();
      assert.equal(
        new Set(selected.map((p) => p.key)).size,
        selected.length,
        'regular plays do not repeat in a season',
      );
      for (let round = 0; round < league.rounds.length; round++) {
        const fixture = leagueFixture(league, round);
        if (!league.rounds[round].some((g) => leagueIsOurs(league, g))) {
          assert.equal(fixture, undefined);
          continue;
        }
        assert.ok(fixture.moments.length >= 3 && fixture.moments.length <= 6);
        assert.equal(
          new Set(fixture.moments.map((m) => m.id)).size,
          fixture.moments.length,
        );
        assert.ok(
          fixture.moments.reduce((n, m) => n + bestGoalDifference(m), 0) > 0,
          'every fixture can be won',
        );
        assert.deepEqual(
          leagueFixture(league, round),
          fixture,
          'reload does not reroll allocation',
        );
        firstPhases.add(fixture.moments[0].phase);
        if (fixture.redCard) {
          cardSides.add(fixture.redCard.team);
          for (const m of fixture.moments.slice(fixture.redCard.fromMoment))
            for (const node of m.nodes) {
              assert.equal(node.scene.players.length, 21);
              assert.ok(
                !node.scene.players.some(
                  (p) => p.id === fixture.redCard.player,
                ),
              );
              assert.equal(
                completeTeamShape(
                  node.scene.players,
                  node.scene.ball,
                  node.scene.unavailablePlayerIds,
                ).length,
                21,
                'rendering cannot replace the expelled player',
              );
              assert.equal(
                node.choices.length,
                fixture.redCard.team === 'away' ? 3 : 4,
              );
            }
        }
      }
    }
  assert.ok(
    firstPhases.has('Attacking') && firstPhases.has('Defending'),
    'opening is not always a scoring route',
  );
  assert.equal(cardSides.size, 2);
});

test('the dismissal advantage changes opportunities and read depth, not just the badge', () => {
  for (const p of redCardPlays) {
    const ours = p.team === 'home';
    assert.equal(p.moment.nodes.length, ours ? 3 : 2, p.moment.id);
    for (const n of p.moment.nodes) {
      assert.equal(n.scene.players.filter((q) => q.team === p.team).length, 10);
      assert.equal(n.scene.players.filter((q) => q.team !== p.team).length, 11);
      assert.deepEqual(n.scene.unavailablePlayerIds, [ours ? 'h-l8' : 'a-l8']);
    }
  }
});

test('dismissal restarts distinguish our goal kick from a contested ball', () => {
  const moment = redCardPlays.find(
    (p) => p.moment.id === 'rc-ours-shift-cross',
  ).moment;
  const ending = moment.nodes
    .flatMap((n) => n.choices)
    .find(
      (c) => c.label === 'Stay tight and make him head under pressure',
    ).outcome;
  assert.equal(ending.possession, 'home');
  assert.equal(ending.homeGoals + ending.awayGoals, 0);
  assert.match(ending.headline, /Goal kick/);
});

test('league telemetry accepts only authored decisions and recalculates claimed verdicts', () => {
  assert.equal(knownFixture('league').moments.length, 283);
  assert.ok(
    catalogEvent({
      type: 'activity_start',
      activity: 'match',
      fixtureId: 'league',
    }),
  );
  for (const { moment } of [
    ...leaguePlays,
    ...expandedLeaguePlays,
    ...redCardPlays,
  ])
    for (const node of moment.nodes)
      for (const choice of node.choices) {
        const e = {
          type: 'match_decision',
          fixtureId: 'league',
          nodeId: node.id,
          choiceId: choice.id,
          verdict: 'forged',
        };
        assert.equal(catalogEvent(e).verdict, choice.tone);
        assert.equal(catalogEvent({ ...e, choiceId: 'invented' }), null);
      }
  assert.equal(
    catalogEvent({
      type: 'match_decision',
      fixtureId: 'league',
      nodeId: 'invented',
      choiceId: 'option-1',
      verdict: 'positive',
    }),
    null,
  );
});

test('in-flight choices restore pending reveals and scores only by replaying validated transitions', () => {
  const fixture = leagueFixture(createLeague(7, cfg(6, 1))),
    moments = fixture.moments;
  let run = createMatchRun(moments);
  while (run.status !== 'final') {
    const moment = moments[run.momentIndex],
      node = moment.nodes.find((n) => n.id === run.nodeId),
      choice =
        node.choices.find((c) => c.tone === 'positive') ?? node.choices[0];
    run = chooseMatchOption(run, moment.id, node.id, choice.id, moments);
    assert.deepEqual(
      parseLeagueMatch(
        serializeLeagueMatch(7, 'game', run),
        7,
        'game',
        moments,
      ),
      run,
      'locked reveal survives reload',
    );
    run = continueMatch(run, moments);
    assert.deepEqual(
      parseLeagueMatch(
        serializeLeagueMatch(7, 'game', run),
        7,
        'game',
        moments,
      ),
      run,
      'committed state survives reload',
    );
  }
  const saved = JSON.parse(serializeLeagueMatch(7, 'game', run));
  for (const value of [
    { ...saved, seed: 8 },
    { ...saved, gameId: 'stale' },
    { ...saved, pending: 'yes' },
    { ...saved, choices: [saved.choices[0], saved.choices[0]] },
    { ...saved, choices: [['fake', 'fake', 'fake']] },
  ])
    assert.equal(
      parseLeagueMatch(JSON.stringify(value), 7, 'game', moments),
      undefined,
    );
  assert.equal(parseLeagueMatch('{', 7, 'game', moments), undefined);
});
