import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  contactTimeline,
  movementWindow,
  routeStyle,
} from '../lib/pitch-motion.ts';
import { matchFixtures } from '../lib/match-fixtures.ts';
import { tournamentPlays } from '../lib/my-tournament-plays.ts';
import { leaguePlays } from '../lib/league-plays.ts';
import { expandedLeaguePlays } from '../lib/league-matches.ts';
import { redCardPlays } from '../lib/red-card-plays.ts';
import {
  closingMoment,
  tacticalFoul,
  quickRestart,
  touchlineThrow,
  playAdvantage,
} from '../lib/tournament-stories.ts';
import { completeTeamShape } from '../lib/team-shape.ts';
import { courses } from '../lib/scenarios.ts';

const moments = [
  ...matchFixtures.flatMap((f) => f.moments),
  ...tournamentPlays.map((p) => p.moment),
  ...leaguePlays.map((p) => p.moment),
  ...expandedLeaguePlays.map((p) => p.moment),
  ...redCardPlays.map((p) => p.moment),
  ...[tacticalFoul, quickRestart, touchlineThrow, playAdvantage].map(
    (build, i) => build(`audit-restart-${i}`),
  ),
  ...Array.from({ length: 7 }, (_, i) =>
    [
      [2, 0],
      [0, 0],
      [0, 2],
    ].map(([h, a]) => closingMoment(`cup-${i + 1}-clock`, h, a)),
  ).flat(),
];
const point = (p) => ({ x: p.x, y: p.y });

test('all competition edges preserve the displayed ball, identities and positions, including ten-player teams', () => {
  let edges = 0;
  for (const moment of moments)
    for (const node of moment.nodes)
      for (const choice of node.choices) {
        if (!choice.nextNodeId) continue;
        edges++;
        const next = moment.nodes.find((n) => n.id === choice.nextNodeId);
        assert.ok(next, `${node.id}/${choice.id}: reachable continuation`);
        assert.deepEqual(
          choice.ballPath.at(-1),
          choice.ballTo,
          `${node.id}: path ends at next ball`,
        );
        assert.deepEqual(
          choice.ballTo,
          next.scene.ball,
          `${node.id}: ball continuity`,
        );
        const before = completeTeamShape(
          node.scene.players,
          node.scene.ball,
          node.scene.unavailablePlayerIds,
        );
        const after = completeTeamShape(
          next.scene.players,
          next.scene.ball,
          next.scene.unavailablePlayerIds,
        );
        assert.equal(
          before.length,
          22 - (node.scene.unavailablePlayerIds?.length ?? 0),
        );
        assert.equal(after.length, before.length);
        assert.deepEqual(
          next.scene.unavailablePlayerIds,
          node.scene.unavailablePlayerIds,
        );
        for (const player of before) {
          const following = after.find((p) => p.id === player.id);
          assert.ok(following, `${node.id}: ${player.id} is not replaced`);
          assert.deepEqual(
            point(following),
            choice.movement.find((m) => m.playerId === player.id)?.to ??
              point(player),
            `${node.id}/${choice.id}/${player.id}: no teleport`,
          );
          assert.deepEqual(
            [following.label, following.team, following.role],
            [player.label, player.team, player.role],
          );
        }
      }
  assert.ok(
    edges > 140,
    `whole catalogue, not only original match: ${edges} edges`,
  );
});

test('every rendered scene and authored route has normalized coordinates and valid movement identities', () => {
  const normalized = (p, label) =>
    assert.ok(
      Number.isFinite(p.x) &&
        Number.isFinite(p.y) &&
        p.x >= 0 &&
        p.x <= 100 &&
        p.y >= 0 &&
        p.y <= 100,
      label,
    );
  const inspect = (players, ball, movements, path, id, unavailable = []) => {
    const xi = completeTeamShape(players, ball, unavailable);
    assert.equal(
      new Set(xi.map((p) => p.id)).size,
      22 - unavailable.length,
      id,
    );
    for (const side of ['home', 'away'])
      assert.equal(
        xi.filter((p) => p.team === side).length,
        11 -
          unavailable.filter((key) =>
            key.startsWith(side === 'home' ? 'h-' : 'a-'),
          ).length,
        id,
      );
    [ball, ...xi, ...path].forEach((p) => normalized(p, id));
    assert.equal(
      new Set(movements.map((m) => m.playerId)).size,
      movements.length,
      `${id}: one route per player`,
    );
    for (const move of movements) {
      assert.ok(
        xi.some((p) => p.id === move.playerId),
        `${id}/${move.playerId}`,
      );
      [move.to, ...(move.via ?? [])].forEach((p) => normalized(p, id));
      if (move.arriveAtBallContact !== undefined)
        assert.ok(
          Number.isInteger(move.arriveAtBallContact) &&
            move.arriveAtBallContact >= 0 &&
            move.arriveAtBallContact < path.length,
          `${id}: authored contact deadline exists`,
        );
    }
  };
  for (const moment of moments)
    for (const node of moment.nodes)
      for (const choice of node.choices)
        inspect(
          node.scene.players,
          node.scene.ball,
          choice.movement,
          choice.ballPath ?? [],
          `${node.id}/${choice.id}`,
          node.scene.unavailablePlayerIds,
        );
  for (const course of courses)
    for (const s of course.scenarios)
      inspect(
        s.players,
        s.ball,
        s.reveal.movements,
        s.reveal.ballPath ?? (s.reveal.ballTo ? [s.reveal.ballTo] : []),
        s.id,
      );
});

test('receivers wait for a releasing touch, arrive with the ball, and hold through the shot', () => {
  const ball = { x: 60, y: 50 },
    path = [
      { x: 75, y: 50 },
      { x: 90, y: 50 },
      { x: 100, y: 50 },
    ];
  assert.deepEqual(contactTimeline(ball, path), [0.375, 0.75, 1]);
  const receiver = { x: 74, y: 30 },
    move = { playerId: 'h-st', to: path[1], label: '' };
  assert.deepEqual(movementWindow(receiver, move, ball, path), {
    start: 0.375,
    end: 0.75,
  });
  const style = routeStyle(
    receiver,
    [move.to],
    movementWindow(receiver, move, ball, path),
  );
  assert.equal(style.animationDelay, `${0.35 + 2.3 * 0.375}s`);
  assert.equal(style.animationDuration, `${2.3 * 0.375}s`);
  assert.equal(style.animationTimingFunction, 'linear');
  // The return taker checks back before the second pass, not after it arrives.
  const taker = { x: 100, y: 0 },
    corner = [
      { x: 90, y: 9 },
      { x: 90, y: 1 },
    ];
  assert.equal(
    movementWindow(
      taker,
      { playerId: 'h-lw', to: corner[1], label: '', arriveAtBallContact: 0 },
      taker,
      corner,
    ).end,
    contactTimeline(taker, corner)[0],
  );
  assert.deepEqual(
    movementWindow(
      ball,
      { playerId: 'h-l8', to: path[1], label: '' },
      ball,
      path,
    ),
    { start: 0.375, end: 0.75 },
    'a forward give-and-go waits for the return, unlike a check-back',
  );
});

test('explicit run timing overrides receiving timing for a deliberately offside release', () => {
  const ball = { x: 72, y: 65 },
    path = [
      { x: 80, y: 65 },
      { x: 89, y: 70 },
    ];
  const move = {
    playerId: 'h-rw',
    to: path[1],
    label: '',
    arriveAtBallContact: 0,
  };
  assert.deepEqual(movementWindow({ x: 77, y: 70 }, move, ball, path), {
    start: 0,
    end: contactTimeline(ball, path)[0],
  });
  assert.deepEqual(
    movementWindow(
      { x: 77, y: 70 },
      { ...move, arriveAtBallContact: undefined },
      ball,
      path,
    ),
    { start: contactTimeline(ball, path)[0], end: 1 },
  );
  assert.deepEqual(contactTimeline(ball, []), []);
  assert.deepEqual(contactTimeline(ball, [ball]), [1]);
  assert.ok(
    !routeStyle(ball, [ball], {
      start: 0,
      end: 0,
    }).animationDuration.startsWith('0s'),
  );
});

test('a goalkeeper can make two synchronized saves in one action without skipping the first contact', () => {
  const node = matchFixtures
    .flatMap((f) => f.moments.flatMap((m) => m.nodes))
    .find((n) => n.id === 'towers-rebounds-5-1');
  const choice = node.choices.find((c) => c.id === 'option-3');
  const goalkeeper = node.scene.players.find((p) => p.id === 'h-gk');
  const movement = choice.movement.find((m) => m.playerId === goalkeeper.id);
  assert.deepEqual(movement.via, [choice.ballPath[0]]);
  assert.deepEqual(movement.to, choice.ballPath[2]);
  const times = contactTimeline(node.scene.ball, choice.ballPath);
  const window = movementWindow(
    goalkeeper,
    movement,
    node.scene.ball,
    choice.ballPath,
  );
  const offsets = contactTimeline(goalkeeper, [...movement.via, movement.to]);
  assert.deepEqual(window, {
    start: 0,
    end: times[2],
    stops: [
      { progress: offsets[0], time: times[0] },
      { progress: 1, time: times[2] },
    ],
  });
  assert.match(
    routeStyle(goalkeeper, [...movement.via, movement.to], window)
      .animationTimingFunction,
    /^linear\(0, /,
  );
  assert.equal(choice.outcome.possession, 'home');
  assert.equal(choice.outcome.homeGoals + choice.outcome.awayGoals, 0);
});
