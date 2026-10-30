import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  readThePlay,
  readPenalty,
  boardDirection,
} from '../lib/read-the-play.ts';
import { courses } from '../lib/scenarios.ts';
import { matchFixtures } from '../lib/match-fixtures.ts';
import { completeTeamShape } from '../lib/team-shape.ts';

const actor = {
  id: 'us',
  role: 'Midfielder',
  team: 'home',
  x: 50,
  y: 50,
  active: true,
};
const rival = { id: 'them', role: 'Striker', team: 'away', x: 55, y: 50 };
const snapshot = {
  players: [actor, rival],
  ball: { x: 50, y: 50 },
  phase: 'Attacking',
};
test('optional reading describes the starting board without inspecting answers or future motion', () => {
  const before = structuredClone(snapshot);
  const reading = readThePlay(snapshot);
  assert.equal(reading.ball, 'You have the ball.');
  assert.match(
    reading.pressure,
    /their striker, to the right of your player/,
  );
  assert.deepEqual(
    readThePlay({
      ...snapshot,
      choices: [{ label: 'secret best pass', movement: [{ x: 80, y: 20 }] }],
      reveal: { cue: 'spoiler' },
    }),
    reading,
  );
  assert.deepEqual(snapshot, before);
});
test('loose, contested and defensive balls are not falsely assigned to the active player', () => {
  assert.match(
    readThePlay({ ...snapshot, phase: 'Defending', ball: rival }).ball,
    /their striker/,
  );
  assert.match(
    readThePlay({ ...snapshot, phase: 'Defending' }).ball,
    /between players/,
  );
  assert.match(
    readThePlay({ ...snapshot, players: [actor, { ...rival, x: 51 }] }).ball,
    /between our midfielder/,
  );
  assert.match(
    readThePlay({ ...snapshot, ball: { x: 90, y: 10 } }).ball,
    /between players/,
  );
  assert.match(
    readThePlay({ ...snapshot, players: [actor, { ...rival, x: 90 }] })
      .pressure,
    /No rival is close/,
  );
});
test('directions use the board, never an assumed body orientation', () => {
  assert.equal(boardDirection(actor, { x: 40, y: 50 }), 'to the left of');
  assert.equal(
    boardDirection(actor, { x: 50, y: 20 }),
    'above',
  );
  assert.equal(
    boardDirection(actor, { x: 50, y: 80 }),
    'below',
  );
  assert.equal(boardDirection(actor, { x: 50, y: 50 }), 'right beside');
});
test('all training and match boards get short readings; penalties do not name a target', () => {
  const boards = [
    ...courses
      .flatMap((c) => c.scenarios)
      .map((s) => ({
        players: completeTeamShape(s.players, s.ball),
        ball: s.ball,
        phase: s.mode,
      })),
    ...matchFixtures
      .flatMap((f) => f.moments)
      .flatMap((m) => m.nodes)
      .map((n) => ({ ...n.scene, phase: n.phase })),
  ];
  for (const board of boards) {
    const reading = readThePlay(board);
    assert.ok(reading.ball.length && reading.pressure.length);
    assert.ok(`${reading.ball} ${reading.pressure}`.split(/\s+/).length <= 55);
    assert.doesNotMatch(
      JSON.stringify(reading),
      /undefined|NaN|best|should|correct/,
    );
  }
  for (const keeping of [true, false])
    assert.doesNotMatch(
      JSON.stringify(readPenalty(keeping)),
      /left|right|high|low|best/,
    );
});
