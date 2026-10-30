import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchFixtures } from '../lib/match-fixtures.ts';
import { decisionPoints, focusViewBox, FULL_PITCH } from '../lib/pitch-focus.ts';

test('the mobile focus window keeps every moving part of a decision in view', () => {
  let zoomed = 0;
  let total = 0;
  for (const fixture of matchFixtures)
    for (const moment of fixture.moments)
      for (const node of moment.nodes) {
        total++;
        const box = focusViewBox(node);
        assert.ok(Math.abs(box.width / box.height - 10 / 7) < 1e-9, node.id);
        assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 1000 + 1e-9 && box.y + box.height <= 700 + 1e-9, node.id);
        for (const p of decisionPoints(node)) {
          assert.ok(p.x * 10 >= box.x && p.x * 10 <= box.x + box.width, `${node.id} x ${p.x}`);
          assert.ok(p.y * 7 >= box.y && p.y * 7 <= box.y + box.height, `${node.id} y ${p.y}`);
        }
        if (box !== FULL_PITCH) zoomed++;
      }
  assert.ok(zoomed / total > 0.6, `zoomed ${zoomed}/${total}`);
});
