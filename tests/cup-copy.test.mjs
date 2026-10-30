import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cupFullTime, cupReadsSummary, cupShootout, recordCupReads } from '../lib/cup-copy.ts';
import { emptyMatchStats } from '../lib/match-stats.ts';

test('detailed reads preserve legacy scores, partial coverage, backfills and locked records', () => {
  const detail = { ...emptyMatchStats(), attacking: { correct: 1, total: 2 }, decisions: { positive: 1, neutral: 1, negative: 0 }, plays: { positive: 1, neutral: 0, negative: 0 } };
  let stored = JSON.stringify(recordCupReads(null, 5, 'old', 80, 'Striker'));
  stored = JSON.stringify(recordCupReads(stored, 5, 'new', 60, 'Striker', detail));
  assert.deepEqual(cupReadsSummary(stored, 5), { accuracy: 70, player: 'Striker', awards: 2, details: { matches: 1, totalMatches: 2, stats: detail } });
  stored = JSON.stringify(recordCupReads(stored, 5, 'old', 0, 'Goalkeeper', detail));
  const summary = cupReadsSummary(stored, 5);
  assert.equal(summary.accuracy, 70);
  assert.equal(summary.awards, 2);
  assert.equal(summary.details.matches, 2);
  assert.equal(summary.details.stats.attacking.total, 4);
  assert.deepEqual(recordCupReads(stored, 5, 'new', 0, 'Goalkeeper', emptyMatchStats()), JSON.parse(stored), 'repeated results cannot overwrite counts');
  assert.equal(cupReadsSummary(stored, 6), null);
  const malformed = JSON.parse(stored);
  malformed.details.orphan = detail;
  malformed.details.old.attacking.correct = 100;
  malformed.reads.bad = -1;
  const clean = cupReadsSummary(JSON.stringify(malformed), 5);
  assert.equal(clean.accuracy, 70);
  assert.deepEqual(clean.details, { matches: 1, totalMatches: 2, stats: detail });
});

test('full-time words follow the round, the result and what it means for the cup', () => {
  assert.equal(cupFullTime('readers', 0, 2, 0, 'X', 'playing').title, 'A winning start!');
  assert.equal(cupFullTime('readers', 1, 0, 1, 'X', 'playing').title, 'The pressure is on.');
  assert.equal(cupFullTime('readers', 2, 1, 0, 'X', 'playing').title, 'Through to the knockouts!');
  assert.equal(cupFullTime('readers', 2, 0, 0, 'X', 'playing').title, 'Through — just!');
  assert.equal(cupFullTime('readers', 2, 0, 1, 'X', 'eliminated').title, 'Out in the group stage.');
  assert.equal(cupFullTime('readers', 3, 2, 1, 'X', 'playing').title, 'Into the quarter-finals!');
  assert.equal(cupFullTime('readers', 5, 1, 0, 'X', 'playing').title, 'WE’RE IN THE FINAL!');
  assert.equal(cupFullTime('readers', 6, 3, 1, 'X', 'champion').title, 'CHAMPIONS!');
  assert.equal(cupFullTime('readers', 6, 0, 1, 'X', 'eliminated').title, 'So close.');
  assert.equal(cupFullTime('readers', 4, 0, 2, 'X', 'eliminated').title, 'Out in the quarter-final.');
  assert.equal(cupFullTime('my', 3, 1, 0, 'X', 'playing').title, 'Into the semi-finals!');
  assert.equal(cupShootout('readers', 6, true).title, 'CHAMPIONS ON PENALTIES!');
  assert.equal(cupShootout('my', 4, false).title, 'A tough exit.');
});

test('reading accuracy and the player of the tournament accumulate once per match and per cup', () => {
  let stored = JSON.stringify(recordCupReads(null, 5, 'g1', 80, 'Striker'));
  stored = JSON.stringify(recordCupReads(stored, 5, 'g1', 10, 'Goalkeeper'));
  stored = JSON.stringify(recordCupReads(stored, 5, 'g2', 60, 'Striker'));
  assert.deepEqual(cupReadsSummary(stored, 5), { accuracy: 70, player: 'Striker', awards: 2 });
  assert.equal(cupReadsSummary(stored, 6), null, 'a new cup starts fresh');
  assert.deepEqual(recordCupReads(stored, 6, 'g1', 50).reads, { g1: 50 });
});
