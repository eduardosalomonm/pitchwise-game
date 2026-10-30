import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchFixtures } from '../lib/match-fixtures.ts';
import {
  matchLeadIns,
  getAuthoredLeadIn,
  leadInStart,
} from '../lib/match-lead-ins.ts';

const fixture = matchFixtures.find((f) => f.id === 'original');
const roots = fixture.moments.map((m) =>
  m.nodes.find((n) => n.id === m.rootNodeId),
);
const point = (p) =>
  assert.ok(
    Number.isFinite(p.x) &&
      Number.isFinite(p.y) &&
      p.x >= 4 &&
      p.x <= 96 &&
      p.y >= 6 &&
      p.y <= 94,
  );

test('exactly five authored lead-ins, one per opening scene, stay inside the field', () => {
  assert.equal(matchLeadIns.length, 5);
  assert.deepEqual(
    matchLeadIns.map((c) => c.nodeId),
    roots.map((n) => n.id),
  );
  for (const clip of matchLeadIns) {
    assert.ok(clip.players.length >= 2 && clip.players.length <= 4);
    assert.equal(
      new Set(clip.players.map((p) => p.id)).size,
      clip.players.length,
    );
    for (const p of [
      clip.ball.from,
      clip.ball.end,
      ...clip.players.flatMap((p) => [p.from, ...(p.via ?? []), p.end]),
    ])
      point(p);
  }
});

test('every clip lands on the unmodified decision snapshot with no answer or score inputs', () => {
  for (const node of roots) {
    const before = structuredClone(node);
    const clip = getAuthoredLeadIn(node.id, node.scene);
    assert.ok(clip);
    const start = leadInStart(node.scene, clip);
    assert.equal(start.players.length, 22);
    const end = start.players.map((p) => ({
      ...p,
      ...clip.players.find((m) => m.id === p.id)?.end,
    }));
    assert.deepEqual(end, node.scene.players);
    assert.deepEqual(clip.ball.end, node.scene.ball);
    assert.deepEqual(
      node,
      before,
      'rendering history must not mutate the live scene or decisions',
    );
    assert.equal(start.players.filter((p) => p.active).length, 1);
    const initialOwner = start.players.find(
      (p) => Math.hypot(p.x - start.ball.x, p.y - start.ball.y) < 0.01,
    );
    assert.ok(
      initialOwner,
      `${node.id}: the ball starts at a player, not in unexplained space`,
    );
    const receiver = end.find(
      (p) => Math.hypot(p.x - clip.ball.end.x, p.y - clip.ball.end.y) < 0.01,
    );
    assert.ok(receiver, `${node.id}: a player meets the ball`);
    if (
      receiver.team === initialOwner.team &&
      receiver.id !== initialOwner.id
    ) {
      const receivingStart = start.players.find((p) => p.id === receiver.id);
      const defenders = start.players
        .filter((p) => p.team !== receiver.team)
        .map((p) => p.x)
        .sort((a, b) => b - a);
      assert.ok(
        receivingStart.x <= 50 ||
          receivingStart.x <= Math.max(start.ball.x, defenders[1]),
        `${node.id}: receiver starts onside`,
      );
    }
  }
});

test('authored history is reusable but never renders against an edited or missing endpoint', () => {
  const node = roots[0];
  assert.equal(getAuthoredLeadIn('unknown', node.scene), undefined);
  assert.equal(
    getAuthoredLeadIn(node.id, {
      ...node.scene,
      ball: { x: 10, y: 10 },
    }),
    undefined,
  );
  assert.equal(
    getAuthoredLeadIn(node.id, {
      ...node.scene,
      players: node.scene.players.filter((p) => p.id !== 'a-st'),
    }),
    undefined,
  );
  assert.equal(
    getAuthoredLeadIn(node.id, {
      ...node.scene,
      unavailablePlayerIds: ['a-st'],
    }),
    undefined,
  );
});
