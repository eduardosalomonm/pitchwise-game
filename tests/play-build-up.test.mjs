import assert from 'node:assert/strict';
import { test } from 'node:test';
import { leaguePool } from '../lib/league-matches.ts';
import { redCardPlays } from '../lib/red-card-plays.ts';
import { cupFixture, closingMoment } from '../lib/tournament-stories.ts';
import { firstMatchMoments } from '../lib/first-match.ts';
import { courses } from '../lib/scenarios.ts';
import { createMatchRun } from '../lib/match-day.ts';
import {
  buildUpForPlay,
  matchBuildUp,
  ballCarrier,
} from '../lib/play-build-up.ts';
import { trainingBuildUp, trainingSetups } from '../lib/training-build-ups.ts';
import { leadInStart } from '../lib/match-lead-ins.ts';
import { completeTeamShape } from '../lib/team-shape.ts';

const moments = [...leaguePool(), ...redCardPlays]
  .map((p) => p.moment)
  .concat(
    firstMatchMoments,
    ...Array.from({ length: 7 }, (_, i) => cupFixture(i, 'Test Club').moments),
    ...Array.from({ length: 7 }, (_, i) =>
      [
        [0, 0],
        [1, 0],
        [0, 1],
      ].map(([a, b]) => closingMoment(`cup-${i}-clock`, a, b)),
    ),
  );
const point = (p) => ({ x: p.x, y: p.y });
function checkClip(scene, clip) {
  assert.deepEqual(clip.ball.end, scene.ball);
  assert.equal(
    new Set(clip.players.map((p) => p.id)).size,
    clip.players.length,
  );
  for (const p of [
    clip.ball.from,
    clip.ball.end,
    ...(clip.ballPath ?? []),
    ...clip.players.flatMap((p) => [p.from, ...(p.via ?? []), p.end]),
  ])
    assert.ok(
      Number.isFinite(p.x) &&
        Number.isFinite(p.y) &&
        p.x >= 0 &&
        p.x <= 100 &&
        p.y >= 0 &&
        p.y <= 100,
      `${clip.nodeId}: invalid coordinate ${JSON.stringify(p)}`,
    );
  for (const move of clip.players) {
    assert.ok(
      !scene.unavailablePlayerIds?.includes(move.id),
      `${clip.nodeId}: dismissed player`,
    );
    assert.deepEqual(
      move.end,
      point(scene.players.find((p) => p.id === move.id)),
    );
  }
  const start = leadInStart(scene, clip);
  assert.deepEqual(
    start.players.map((p) => ({
      ...p,
      ...clip.players.find((m) => m.id === p.id)?.end,
    })),
    scene.players,
  );
  assert.ok(
    clip.players.length ||
      JSON.stringify(clip.ball.from) !== JSON.stringify(clip.ball.end),
    `${clip.nodeId}: empty playback`,
  );
}

test('all match, cup, league, red-card and friendly scenes have bounded pre-decision movement with exact endpoints', () => {
  assert.ok(moments.length > 300);
  for (const m of moments)
    for (const n of m.nodes) {
      const before = structuredClone(n);
      checkClip(n.scene, buildUpForPlay(n));
      assert.deepEqual(n, before);
    }
});

test('every connected decision replays the actual chosen branch, including negative and neutral paths', () => {
  let edges = 0;
  for (const m of moments)
    for (const n of m.nodes)
      for (const c of n.choices) {
        if (!c.nextNodeId) continue;
        const next = m.nodes.find((p) => p.id === c.nextNodeId);
        const run = {
          ...createMatchRun([m]),
          nodeId: next.id,
          decisions: [{ momentId: m.id, nodeId: n.id, choiceId: c.id }],
        };
        const before = structuredClone(run);
        const clip = matchBuildUp(next, m, run);
        assert.equal(
          clip.source,
          'history',
          `${n.id}/${c.id}: must not invent the preceding action`,
        );
        checkClip(next.scene, clip);
        assert.deepEqual(clip.ball.from, n.scene.ball);
        assert.deepEqual(
          clip.ballPath,
          c.ballPath?.length ? c.ballPath : [c.ballTo ?? n.scene.ball],
        );
        assert.deepEqual(
          run,
          before,
          'playback never changes decisions, possession or score',
        );
        edges++;
      }
  assert.ok(edges > 450);
});

test('isolated build-ups cannot inspect future answers or reveal data', () => {
  const deny = (obj) =>
    new Proxy(obj, {
      get(target, key) {
        if (['choices', 'correctChoiceId', 'reveal', 'prompt'].includes(key))
          throw Error(`Spoiler read: ${String(key)}`);
        return Reflect.get(target, key);
      },
    });
  for (const m of moments)
    buildUpForPlay(deny(m.nodes.find((n) => n.id === m.rootNodeId)));
  for (const c of courses)
    for (const s of c.scenarios) trainingBuildUp(deny(s));
});

test('all 55 training setups are explicitly authored, keep the active player undecided and pass to onside receivers', () => {
  const scenarios = courses.flatMap((c) => c.scenarios);
  assert.equal(scenarios.length, 55);
  assert.deepEqual(
    Object.keys(trainingSetups).sort(),
    scenarios.map((s) => s.id).sort(),
  );
  for (const s of scenarios) {
    const spec = trainingSetups[s.id],
      clip = trainingBuildUp(s);
    for (const [id] of spec.moves)
      assert.ok(
        s.players.some((p) => p.id === id && !p.active),
        `${s.id}: unknown/active mover ${id}`,
      );
    checkClip({ players: s.players, ball: s.ball }, clip);
    assert.ok(
      clip.players.every((m) => !s.players.find((p) => p.id === m.id).active),
    );
    if (!spec.passFrom) continue;
    const passer = s.players.find((p) => p.id === spec.passFrom);
    assert.ok(passer, `${s.id}: named passer exists`);
    const receiver = ballCarrier({ players: s.players, ball: s.ball });
    assert.ok(
      receiver && receiver.team === passer.team,
      `${s.id}: pass has a receiver on the same team`,
    );
    const start = leadInStart(
      { players: completeTeamShape(s.players, s.ball), ball: s.ball },
      clip,
    );
    const r = start.players.find((p) => p.id === receiver.id),
      d = receiver.team === 'home' ? 1 : -1;
    const defenders = start.players
      .filter((p) => p.team !== receiver.team)
      .map((p) => p.x * d)
      .sort((a, b) => b - a);
    assert.ok(
      r.x * d <= 50 * d || r.x * d <= Math.max(start.ball.x * d, defenders[1]),
      `${s.id}: receiver onside at the pass`,
    );
  }
});

test('dead balls stay still, held catches are not dribbled and loose rebounds are not falsely controlled', () => {
  const nodes = moments.flatMap((m) => m.nodes);
  for (const id of ['banks-block-5-1', 'lg2-h-free-kick-disguised-return-1', 'lg-punch-corner-distance-1']) {
    const n = nodes.find((n) => n.id === id),
      clip = buildUpForPlay(n);
    assert.equal(clip.source, 'restart');
    assert.deepEqual(clip.ball.from, n.scene.ball);
    assert.ok(
      clip.players.every(
        (m) => !n.scene.players.find((p) => p.id === m.id).active,
      ),
    );
  }
  const n = nodes.find((n) => n.id === 'mt-rebound-keeper-1');
  assert.equal(buildUpForPlay(n).source, 'loose');
  const held = {
    id: 'held',
    context: 'You have caught the ball and hold it in your hands.',
    scene: {
      ball: { x: 8, y: 50 },
      players: [
        {
          id: 'gk',
          role: 'Goalkeeper',
          team: 'home',
          active: true,
          x: 8,
          y: 50,
        },
        { id: 'lb', role: 'Left-back', team: 'home', x: 22, y: 14 },
      ],
    },
  };
  const clip = buildUpForPlay(held);
  assert.equal(clip.source, 'shape');
  assert.deepEqual(clip.ball.from, held.scene.ball);
  assert.ok(clip.players.every((p) => p.id !== 'gk'));
});
