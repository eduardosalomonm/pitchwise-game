import assert from 'node:assert/strict';
import { test } from 'node:test';
import { courses, validateScenarios } from '../lib/scenarios.ts';

const scenarios = courses.flatMap((course) => course.scenarios);

test('every lesson has unique commentary and a valid spotlight', () => {
  assert.equal(scenarios.length, 55);
  assert.equal(new Set(scenarios.map((scenario) => scenario.reveal.touchline)).size, 55);
  assert.equal(validateScenarios(scenarios), true);
  for (const scenario of scenarios) {
    if (scenario.illustration) assert.ok(scenario.illustration.src);
    assert.ok(scenario.reveal.focus.label);
    for (const movement of scenario.reveal.movements) {
      assert.ok(scenario.players.some((player) => player.id === movement.playerId));
    }
  }
});

test('the full XI has five playable situations per position', () => {
  assert.equal(courses.length, 11);
  assert.equal(new Set(courses.map((course) => course.id)).size, 11);
  for (const course of courses) assert.equal(course.scenarios.length, 5);
  assert.equal(new Set(scenarios.map((scenario) => scenario.id)).size, 55);
});

test('passing options end at the intended teammate, after their movement', () => {
  const withLanes = scenarios.filter((scenario) => scenario.reveal.passingLane);
  assert.ok(withLanes.length > 0, 'there are authored passing lanes to validate');
  for (const scenario of withLanes) {
    const { to } = scenario.reveal.passingLane;
    const finalHomePositions = scenario.players.filter((player) => player.team === 'home').map((player) =>
      scenario.reveal.movements.find((movement) => movement.playerId === player.id)?.to ?? player);
    assert.ok(finalHomePositions.some((point) => point.x === to.x && point.y === to.y));
  }
});

test('centre-back course has five distinct illustrations and a coordinated carry', () => {
  const course = courses.find((item) => item.id === 'centre-back');
  assert.equal(course.scenarios.length, 5);
  assert.equal(new Set(course.scenarios.map((item) => item.illustration.src)).size, 5);
  const carry = course.scenarios.find((item) => item.id === 'cb-carry');
  const movement = carry.reveal.movements[0];
  const player = carry.players.find((item) => item.id === movement.playerId);
  assert.equal(movement.to.x - player.x, carry.reveal.ballTo.x - carry.ball.x);
  assert.equal(movement.to.y - player.y, carry.reveal.ballTo.y - carry.ball.y);
  const invalidBall = structuredClone(carry);
  invalidBall.reveal.ballTo.x = 101;
  assert.throws(() => validateScenarios([invalidBall]), /coordinate/);
});

test('rejects missing commentary and invalid spotlight data', () => {
  const copy = () => structuredClone(scenarios[0]);
  const missingCopy = copy();
  missingCopy.reveal.touchline = ' ';
  assert.throws(() => validateScenarios([missingCopy]), /commentary/);
  const invalidRadius = copy();
  invalidRadius.reveal.focus.radiusX = 101;
  assert.throws(() => validateScenarios([invalidRadius]), /spotlight/);
  const invalidPoint = copy();
  invalidPoint.reveal.focus.x = NaN;
  assert.throws(() => validateScenarios([invalidPoint]), /coordinate/);
  const invalidLane = copy();
  invalidLane.reveal.passingLane.to.y = 101;
  assert.throws(() => validateScenarios([invalidLane]), /coordinate/);
});
