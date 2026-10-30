import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchFixtures } from '../lib/match-fixtures.ts';
import { tournamentPlays } from '../lib/my-tournament-plays.ts';
import {
  leaguePlays,
  leagueDirectRestarts,
  leagueReboundReferences,
} from '../lib/league-plays.ts';
import { redCardPlays } from '../lib/red-card-plays.ts';
import { expandedLeaguePlays } from '../lib/league-matches.ts';
import {
  closingMoment,
  tacticalFoul,
  quickRestart,
  touchlineThrow,
  playAdvantage,
} from '../lib/tournament-stories.ts';
import { contactTimeline, movementWindow } from '../lib/pitch-motion.ts';

const moments = [
  ...matchFixtures.flatMap((fixture) => fixture.moments),
  ...tournamentPlays.map((play) => play.moment),
  ...leaguePlays.map((play) => play.moment),
  ...expandedLeaguePlays.map((play) => play.moment),
  ...redCardPlays.map((play) => play.moment),
  ...[tacticalFoul, quickRestart, touchlineThrow, playAdvantage].map(
    (build, index) => build(`audit-restart-${index}`),
  ),
  ...Array.from({ length: 7 }, (_, index) =>
    [
      [2, 0],
      [0, 0],
      [0, 2],
    ].map(([home, away]) =>
      closingMoment(`cup-${index + 1}-clock`, home, away),
    ),
  ).flat(),
];

// These are authored restarts, not exceptions inferred from a player's position.
// Only the initial delivery is exempt: short-corner/throw returns are ordinary passes.
const directRestarts = new Set([
  ...leagueDirectRestarts,
  'banks-block-3-1',
  'banks-block-5-1',
  'mt-corner-against-1',
  'mt-short-corner-1',
  'mt-easy-corner-header-1',
  'mt-press-goal-kick-1',
  'bait-traps-5-1',
  'mt-throw-in-trap-1',
  'audit-restart-2-1',
  'cup-1-clock-1',
  'cup-4-clock-1',
]);
// A blocked shot can go in off our defender: check the opponent's original shot
// and the visible deflection, rather than pretending the last touch is theirs.
const goalDeflections = new Map([
  [
    'lg2-e-keeper-deflection-reset-1/option-3',
    { shooter: 'a-l8', deflector: 'h-rcb' },
  ],
]);

const svgDistance = (left, right) =>
  Math.hypot((right.x - left.x) * 10, (right.y - left.y) * 7);

function positionOnRoute(from, route, fraction) {
  const points = [from, ...route];
  const lengths = route.map((point, index) =>
    svgDistance(points[index], point),
  );
  let distance = lengths.reduce((sum, length) => sum + length, 0) * fraction;
  for (let index = 0; index < lengths.length; index++) {
    if (distance <= lengths[index] || index === lengths.length - 1) {
      const part = lengths[index] ? distance / lengths[index] : 1;
      return {
        x: points[index].x + (points[index + 1].x - points[index].x) * part,
        y: points[index].y + (points[index + 1].y - points[index].y) * part,
      };
    }
    distance -= lengths[index];
  }
  return { x: from.x, y: from.y };
}

function frameAt(node, choice, time) {
  return node.scene.players.map((player) => {
    const move = choice.movement.find((item) => item.playerId === player.id);
    if (!move) return player;
    const window = movementWindow(
      player,
      move,
      node.scene.ball,
      choice.ballPath,
    );
    let fraction =
      time >= window.end
        ? 1
        : time <= window.start
          ? 0
          : (time - window.start) / (window.end - window.start);
    if (window.stops && time > window.start && time < window.end) {
      const stops = [{ progress: 0, time: window.start }, ...window.stops];
      for (let index = 1; index < stops.length; index++) {
        if (time > stops[index].time) continue;
        const earlier = stops[index - 1];
        const later = stops[index];
        const part =
          later.time > earlier.time
            ? (time - earlier.time) / (later.time - earlier.time)
            : 1;
        fraction =
          earlier.progress + (later.progress - earlier.progress) * part;
        break;
      }
    }
    return {
      ...player,
      ...positionOnRoute(player, [...(move.via ?? []), move.to], fraction),
    };
  });
}

function offsideAt(receiver, ball, players) {
  const direction = receiver.team === 'home' ? 1 : -1;
  const defenders = players
    .filter((player) => player.team !== receiver.team)
    .map((player) => direction * player.x)
    .sort((left, right) => right - left);
  const x = direction * receiver.x;
  return (
    direction * (receiver.x - 50) > 0 &&
    x - direction * ball.x > 1e-6 &&
    x - defenders[1] > 1e-6
  );
}

function contacts(node, choice) {
  const points = [node.scene.ball, ...choice.ballPath];
  const times = [0, ...contactTimeline(node.scene.ball, choice.ballPath)];
  return points.map((point, index) => {
    const players = frameAt(node, choice, times[index]);
    return {
      point,
      time: times[index],
      players,
      onBall: players.filter((player) => svgDistance(player, point) < 0.01),
    };
  });
}

test('uniquely authored teammate receptions are onside at the actual releasing touch across the catalogue', (t) => {
  let choices = 0;
  let passes = 0;
  let laterPasses = 0;
  let opponentContacts = 0;
  let exemptDeliveries = 0;
  let intentionalOffsides = 0;
  const unintendedOffsides = [];
  for (const moment of moments)
    for (const node of moment.nodes)
      for (const choice of node.choices) {
        choices++;
        const touches = contacts(node, choice);
        for (let index = 0; index < touches.length - 1; index++) {
          const release = touches[index];
          const reception = touches[index + 1];
          // Unowned in-flight points and contested duels do not identify a pass recipient.
          // Goal endpoints, carries and inactive attackers alone never establish an offence.
          if (release.onBall.length !== 1 || reception.onBall.length !== 1)
            continue;
          const passer = release.onBall[0];
          const receiver = reception.onBall[0];
          if (passer.team !== receiver.team) {
            opponentContacts++;
            continue;
          }
          if (passer.id === receiver.id) continue;
          if (index === 0 && directRestarts.has(node.id)) {
            exemptDeliveries++;
            continue;
          }
          passes++;
          if (index > 0) laterPasses++;
          const position = release.players.find(
            (player) => player.id === receiver.id,
          );
          const offside = offsideAt(position, release.point, release.players);
          const key = `${node.id}/${choice.id}`;
          if (key === 'direct-layoff-finish/rush' && index === 1) {
            intentionalOffsides++;
            assert.equal(
              offside,
              true,
              `${key}: the explicitly delayed pass is offside`,
            );
            assert.equal(
              choice.outcome.homeGoals + choice.outcome.awayGoals,
              0,
            );
            assert.equal(choice.outcome.possession, 'away');
          } else {
            if (offside)
              unintendedOffsides.push(
                `${key}: ${receiver.id} at release contact ${index}`,
              );
          }
        }
      }
  assert.deepEqual(
    unintendedOffsides,
    [],
    'every branch stays onside at the actual release',
  );
  assert.equal(moments.length, 308);
  assert.ok(choices >= 1200, `whole catalogue inspected: ${choices} choices`);
  assert.ok(passes >= 600, `resolved teammate passes: ${passes}`);
  assert.ok(
    laterPasses >= 20,
    `later releasing touches checked: ${laterPasses}`,
  );
  assert.ok(opponentContacts > 0);
  assert.ok(exemptDeliveries > 0);
  assert.equal(intentionalOffsides, 1);
  t.diagnostic(
    `${choices} choices; ${passes} uniquely resolved teammate passes (${laterPasses} later passes); ${exemptDeliveries} direct restart deliveries; ${opponentContacts} opponent contacts`,
  );
});

test('new league and dismissal routes synchronize every intermediate touch with a visible player', () => {
  const failures = [];
  const checkedDeflections = new Set();
  for (const { moment } of [
    ...leaguePlays,
    ...expandedLeaguePlays,
    ...redCardPlays,
  ])
    for (const node of moment.nodes)
      for (const choice of node.choices) {
        const touches = contacts(node, choice);
        for (const [i, touch] of touches.entries()) {
          if (i === 0 || i === touches.length - 1) continue;
          if (!touch.onBall.length)
            failures.push(
              `${node.id}/${choice.id}: contact ${i} has no player at the animated ball`,
            );
        }
        if (choice.outcome?.homeGoals || choice.outcome?.awayGoals) {
          const shot = touches.at(-2);
          const key = `${node.id}/${choice.id}`,
            deflection = goalDeflections.get(key);
          if (deflection) {
            checkedDeflections.add(key);
            const original = touches.at(-3);
            if (
              !(
                choice.outcome.awayGoals === 1 &&
                choice.outcome.homeGoals === 0 &&
                original?.onBall.some(
                  (p) => p.id === deflection.shooter && p.team === 'away',
                ) &&
                shot.onBall.some(
                  (p) => p.id === deflection.deflector && p.team === 'home',
                ) &&
                /deflect/i.test(choice.feedback)
              )
            )
              failures.push(
                `${key}: original shot and scoring deflection must both be visible and narrated`,
              );
          } else if (
            !shot.onBall.some(
              (p) => p.team === (choice.outcome.homeGoals ? 'home' : 'away'),
            )
          )
            failures.push(
              `${node.id}/${choice.id}: scorer owns the releasing shot`,
            );
        }
      }
  assert.deepEqual(
    failures,
    [],
    'all contacts and scoring releases have visible owners',
  );
  assert.equal(
    checkedDeflections.size,
    goalDeflections.size,
    'authored scoring deflections are actually exercised',
  );
});

test('new rebound situations judge following attackers at the original shot', () => {
  for (const { nodeId, receiverId } of leagueReboundReferences) {
    const node = moments.flatMap((m) => m.nodes).find((n) => n.id === nodeId);
    const receiver = node.scene.players.find((p) => p.id === receiverId);
    assert.equal(
      offsideAt(receiver, node.scene.ball, node.scene.players),
      false,
      nodeId,
    );
  }
});

test('saves and shot deflections keep the rebound receiver judged at the original shot', () => {
  for (const [nodeId, choiceIds, receiverId] of [
    ['block-rebound-goal-start', ['build'], 'h-st'],
    ['towers-rebounds-5-1', ['option-2', 'option-3', 'option-4'], 'a-st'],
    [
      'towers-rebounds-2-1',
      ['option-1', 'option-2', 'option-3', 'option-4'],
      'h-r8',
    ],
  ]) {
    const node = moments
      .flatMap((moment) => moment.nodes)
      .find((item) => item.id === nodeId);
    assert.ok(node, nodeId);
    const receiver = node.scene.players.find(
      (player) => player.id === receiverId,
    );
    assert.equal(
      offsideAt(receiver, node.scene.ball, node.scene.players),
      false,
      `${String(nodeId)}: eligible at the shot`,
    );
    for (const choiceId of choiceIds) {
      const choice = node.choices.find((item) => item.id === choiceId);
      assert.ok(
        choice.ballPath.length >= 2,
        `${String(nodeId)}/${String(choiceId)}: the saving/deflecting contact is retained`,
      );
      const firstTouch = contacts(node, choice)[1];
      assert.ok(
        firstTouch.onBall.some((player) => player.team !== receiver.team),
        `${String(nodeId)}/${String(choiceId)}: opponent makes the save or shot block`,
      );
      // That opponent contact does not replace the original teammate shot as the
      // offside reference. Eligibility is not recalculated at the keeper's parry.
      assert.equal(
        offsideAt(receiver, node.scene.ball, node.scene.players),
        false,
      );
    }
  }
});

test('offside geometry is mirrored, permits level and own-half positions, and counts every opponent', () => {
  for (const side of ['home', 'away']) {
    const x = (value) => (side === 'home' ? value : 100 - value);
    const opponent = side === 'home' ? 'away' : 'home';
    const players = [
      { team: opponent, x: x(90), role: 'Full-back' },
      { team: opponent, x: x(75), role: 'Goalkeeper' },
      { team: opponent, x: x(70), role: 'Centre-back' },
    ];
    for (const [position, ball, expected] of [
      [75, 60, false],
      [75.1, 60, true],
      [80, 82, false],
      [50, 40, false],
    ]) {
      assert.equal(
        offsideAt({ team: side, x: x(position) }, { x: x(ball) }, players),
        expected,
        `${side}: receiver ${position}, ball ${ball}`,
      );
    }
  }
});

test('an offside-positioned striker may intercept an opponent’s controlled backpass', () => {
  const node = moments
    .flatMap((moment) => moment.nodes)
    .find((item) => item.id === 'bait-traps-4-1');
  const choice = node.choices.find((item) => item.id === 'option-2');
  const striker = node.scene.players.find((player) => player.id === 'a-st');
  assert.equal(offsideAt(striker, node.scene.ball, node.scene.players), true);
  const [release, reception] = contacts(node, choice);
  assert.equal(release.onBall.length, 1);
  assert.equal(release.onBall[0].id, 'h-rcb');
  assert.ok(reception.onBall.some((player) => player.id === striker.id));
  assert.notEqual(release.onBall[0].team, striker.team);
  assert.equal(choice.outcome.awayGoals, 1);
});

test('forward give-and-go returns wait for release while explicit corner checkbacks finish before it', () => {
  const giveAndGo = moments
    .flatMap((moment) => moment.nodes)
    .find((item) => item.id === 'runners-tracking-3-1');
  const goal = giveAndGo.choices.find((item) => item.id === 'option-2');
  const [origin, square] = contacts(giveAndGo, goal);
  const eight = square.players.find((player) => player.id === 'a-l8');
  assert.equal(
    eight.x,
    origin.point.x,
    'the original owner is still behind the ball when the square pass is released',
  );
  assert.equal(offsideAt(eight, square.point, square.players), false);
  for (const moment of moments.filter((item) => item.id === 'cup-4-clock')) {
    const node = moment.nodes.find((item) => item.id === moment.rootNodeId);
    const choice = node.choices.find(
      (item) => item.label === 'Take it short and collect the return',
    );
    const shortRelease = contacts(node, choice)[1];
    const taker = shortRelease.players.find((player) => player.id === 'h-lw');
    assert.equal(
      offsideAt(taker, shortRelease.point, shortRelease.players),
      false,
    );
    assert.deepEqual(
      { x: taker.x, y: taker.y },
      choice.movement.find((move) => move.playerId === taker.id).to,
    );
  }
});
