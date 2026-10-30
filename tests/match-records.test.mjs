import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRecords, recordMatch, recordVerdict } from '../lib/match-records.ts';

test('records survive repeated reloads beyond twenty completed matches', () => {
  let records = {};
  for (let plays = 1; plays <= 100; plays++) {
    records = parseRecords(JSON.stringify(recordMatch(records, 'original', 3, 0, 100)));
    assert.deepEqual(records.original, { home: 3, away: 0, plays, bestAccuracy: 100 });
  }
  for (const plays of [-1, 1.5, '21', null, Number.MAX_SAFE_INTEGER + 1]) {
    assert.deepEqual(parseRecords(JSON.stringify({ original: { home: 3, away: 0, plays } })), {});
  }
});

test('keeps the best full-time result per match and counts every play', () => {
  let records = recordMatch({}, 'low-block', 1, 2);
  records = recordMatch(records, 'low-block', 2, 0);
  records = recordMatch(records, 'low-block', 0, 3);
  records = recordMatch(records, 'low-block', 3, 1);
  // Equal goal difference: more goals scored wins the tie.
  assert.deepEqual(records['low-block'], { home: 3, away: 1, plays: 4 });
  assert.deepEqual(recordMatch(records, 'low-block', 1, 0)['low-block'], { home: 3, away: 1, plays: 5 });
  assert.deepEqual(recordMatch({ x: { home: 1, away: 0, plays: 1 } }, 'x', 2, 1).x, { home: 2, away: 1, plays: 2 });
  assert.equal(recordVerdict({ home: 1, away: 1 }), 'Draw');
});

test('keeps the best reading accuracy separately from the best score', () => {
  let records = recordMatch({}, 'x', 1, 0, 60);
  records = recordMatch(records, 'x', 0, 2, 75);
  records = recordMatch(records, 'x', 0, 0);
  assert.deepEqual(records.x, { home: 1, away: 0, plays: 3, bestAccuracy: 75 });
  assert.equal(parseRecords(JSON.stringify({ y: { home: 1, away: 0, plays: 1, bestAccuracy: 140 } })).y, undefined);
});

test('stored records are safe to parse', () => {
  assert.deepEqual(parseRecords(null), {});
  assert.deepEqual(parseRecords('not json'), {});
  assert.deepEqual(parseRecords('[1]'), {});
  assert.deepEqual(
    parseRecords(JSON.stringify({ a: { home: 1, away: 0, plays: 2 }, b: { home: -1, away: 0, plays: 1 }, c: 'x' })),
    { a: { home: 1, away: 0, plays: 2 } },
  );
});
