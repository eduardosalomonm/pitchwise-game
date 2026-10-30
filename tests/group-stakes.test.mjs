import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lastGroupStakes } from '../lib/group-stakes.ts';

test('qualification promises hold for every remaining points outcome, including adverse ties', () => {
  const game = { id: 'ours', home: 'Us', away: 'A' };
  const other = { id: 'other', home: 'B', away: 'C' };
  for (let u = 0; u <= 6; u++) for (let a = 0; a <= 6; a++) for (let b = 0; b <= 6; b++) for (let c = 0; c <= 6; c++) {
    const rows = [['Us', u], ['A', a], ['B', b], ['C', c]].map(([team, points]) => ({ team, points }));
    const copy = lastGroupStakes(rows, 'Us', game, other);
    const minimum = copy.startsWith('Already through') ? 0 : copy.startsWith('A draw takes us through') ? 1 : copy === 'Win and we are through.' ? 3 : undefined;
    if (minimum === undefined) continue;
    for (const [us, them] of [[3, 0], [1, 1], [0, 3]].filter(([p]) => p >= minimum))
      for (const [home, away] of [[3, 0], [1, 1], [0, 3]])
        assert.ok([a + them, b + home, c + away].filter((p) => p >= u + us).length < 2, copy);
  }
});
