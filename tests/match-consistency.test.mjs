import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchFixtures } from '../lib/match-fixtures.ts';

// The last frame of a finished possession must agree with its outcome: whoever keeps
// the ball is standing on it, goals end in the right net, and nobody leaves the pitch.
test('terminal alternatives end with the ball where the outcome says it is', () => {
  let checked = 0;
  for (const fixture of matchFixtures)
    for (const moment of fixture.moments)
      for (const node of moment.nodes)
        for (const choice of node.choices) {
          if (!choice.outcome) continue;
          if (fixture.difficulty === 'Standard' && !choice.id.startsWith('alt-')) continue;
          checked++;
          const id = `${node.id}/${choice.id}`;
          const end = choice.ballTo;
          const after = node.scene.players.map((p) => {
            const move = choice.movement.find((m) => m.playerId === p.id);
            return move ? { ...p, ...move.to } : p;
          });
          assert.ok(after.every((p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100), id);
          const onBall = after.filter((p) => Math.hypot(p.x - end.x, (p.y - end.y) * 0.7) <= 3);
          const { possession, homeGoals, awayGoals, result } = choice.outcome;
          if (awayGoals) assert.ok(end.x < 4 && end.y >= 40 && end.y <= 60, id);
          else if (homeGoals) assert.ok(end.x > 95 && end.y >= 40 && end.y <= 60, id);
          else if (possession === 'home') assert.ok(onBall.some((p) => p.team === 'home'), `${id}: our player on the ball`);
          else if (result === 'lost') assert.ok(onBall.some((p) => p.team === 'away'), `${id}: rival on the ball`);
        }
  assert.ok(checked >= 250, `checked ${checked}`);
});
