import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchFixtures } from '../lib/match-fixtures.ts';

const moment = (id, index) => matchFixtures.find((f) => f.id === id).moments[index - 1];
const root = (m) => m.nodes.find((n) => n.id === m.rootNodeId);
const selected = (node, id) => {
  const choice = node.choices.find((c) => c.id === id);
  assert.ok(choice, `${node.id}/${id}`);
  return choice;
};
const endPlayer = (node, choice, playerId) =>
  choice.movement.find((m) => m.playerId === playerId)?.to ??
  node.scene.players.find((p) => p.id === playerId);

test('a narrated header or corner clearance actually contacts the defender before the next receiver', () => {
  for (const [fixtureId, index, defenderId, expected] of [
    ['towers-rebounds', 3, 'h-lcb', { x: 13, y: 37 }],
    ['banks-block', 3, 'a-rcb', { x: 92, y: 40 }],
  ]) {
    const node = root(moment(fixtureId, index));
    for (const choice of node.choices) {
      assert.deepEqual(choice.ballPath[0], expected, `${node.id}/${choice.id}: clearance contact`);
      const defender = endPlayer(node, choice, defenderId);
      assert.deepEqual({ x: defender.x, y: defender.y }, expected);
      assert.ok(choice.ballPath.length >= 2, `${node.id}/${choice.id}: ball leaves the defender`);
    }
  }
  const node = root(moment('runners-tracking', 1));
  const choice = selected(node, 'option-3');
  const fullBack = endPlayer(node, choice, 'a-rb');
  const centreBack = endPlayer(node, choice, 'h-lcb');
  assert.deepEqual(choice.ballPath.slice(0, 2), [
    { x: fullBack.x, y: fullBack.y },
    { x: centreBack.x, y: centreBack.y },
  ]);
  assert.equal(choice.ballPath.length, 3);
});

test('receive-and-return resets visit the receiver instead of passing directly back to the starting carrier', () => {
  for (const [fixtureId, index, choiceId, receiverId] of [
    ['harbour-outlets', 3, 'option-3', 'a-st'],
    ['harbour-outlets', 3, 'option-4', 'a-st'],
    ['runners-tracking', 5, 'option-4', 'a-r8'],
  ]) {
    const node = root(moment(fixtureId, index));
    const choice = selected(node, choiceId);
    const receiver = endPlayer(node, choice, receiverId);
    assert.ok(choice.ballPath.length >= 2, `${node.id}/${choice.id}`);
    assert.deepEqual(choice.ballPath[0], { x: receiver.x, y: receiver.y });
    assert.notDeepEqual(choice.ballPath[0], choice.ballPath.at(-1));
  }
});

test('the recovering six is behind the counter ball in the next frame', () => {
  const m = moment('banks-block', 3);
  const first = root(m);
  const next = m.nodes.find((n) => n.id === first.choices.find((c) => c.tone === 'positive').nextNodeId);
  assert.ok(next.scene.players.find((p) => p.id === 'h-six').x < next.scene.ball.x);
  assert.equal(next.phase, 'Defending');
});

test('the switch shows a midfield shifted right, continuing to move away from the far-wing outlet', () => {
  const m = moment('banks-block', 4);
  const first = root(m);
  const next = m.nodes.find((n) => n.id === first.choices.find((c) => c.tone === 'positive').nextNodeId);
  for (const id of ['a-l8', 'a-r8']) {
    const before = first.scene.players.find((p) => p.id === id);
    const after = next.scene.players.find((p) => p.id === id);
    assert.ok(before.y > 50, `${id}: starts on the crowded side`);
    assert.ok(after.y > before.y, `${id}: continues toward our right flank`);
  }
  assert.ok(next.scene.players.find((p) => p.id === 'h-lw').y < 15);
});
