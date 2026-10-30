import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { visitorSql } from '../db/visitor-statements.ts';
import { summarizeVisitors } from '../lib/visitor-report.ts';
import { validatePlaytestEvent } from '../lib/playtest-events.ts';
import { catalogEvent } from '../lib/playtest-catalog.ts';
import { firstMatchMoments } from '../lib/first-match.ts';

const now = Date.UTC(2026, 9, 30);
const session = (id, at) => ({ id, visitorId: 'same-browser', label: null, device: 'mobile', language: 'en', referrer: null, country: null, region: null, city: null, timezone: null, createdAt: at, lastSeenAt: at });
const row = (sessionId, at, payload) => ({ sessionId, receivedAt: at, event: { schemaVersion: 1, eventId: crypto.randomUUID(), sessionId, occurredAt: at, ...payload } });

test('the latest completed cup wins regardless of visit order or event order', () => {
  const sessions = [session('new', now), session('old', now - 1000)];
  const completed = (id, at, result) => row(id, at, { type: 'tournament_complete', result, stage: 'final', matchesPlayed: 7 });
  const events = [completed('old', now - 1000, 'eliminated'), completed('new', now, 'champion')];
  for (const visits of [sessions, [...sessions].reverse()]) for (const actions of [events, [...events].reverse()])
    assert.equal(summarizeVisitors(visits, actions, now, () => null).visitors[0].cup, 'Champion');
  const sameVisit = [completed('new', now, 'champion'), completed('new', now - 500, 'eliminated')];
  assert.equal(summarizeVisitors(sessions, sameVisit, now, () => null).visitors[0].cup, 'Champion');
});

test('league and first-friendly play stay separate from standalone matches, including skips', () => {
  const sessions = ['league', 'friendly', 'skip', 'standalone'].map((id) => session(id, now));
  const events = sessions.flatMap((s) => {
    const fixtureId = s.id === 'league' ? 'league' : s.id === 'standalone' ? 'original' : 'first-friendly';
    return [row(s.id, now, { type: 'activity_start', activity: 'match', fixtureId }), row(s.id, now, s.id === 'skip' ? { type: 'guide_skip' } : { type: 'match_complete', fixtureId, homeGoals: 1, awayGoals: 0, decisions: 4, goodDecisions: 3 })];
  });
  const report = summarizeVisitors(sessions, events, now, () => null);
  assert.deepEqual([report.funnel.match, report.funnel.matchCompleted, report.funnel.league, report.funnel.leagueMatches, report.funnel.friendly, report.funnel.friendlyFinished, report.funnel.friendlySkipped], [1, 1, 1, 1, 2, 1, 1]);
  assert.equal(report.totals.played, 4);
  assert.equal(report.visitors[0].matchesCompleted, 1);
});

test('the collector accepts real guide actions and rejects invented answers and extra skip fields', () => {
  const base = { schemaVersion: 1, eventId: crypto.randomUUID(), sessionId: crypto.randomUUID(), occurredAt: now };
  const skip = validatePlaytestEvent({ ...base, type: 'guide_skip' });
  assert.equal(skip.ok, true);
  assert.ok(catalogEvent(skip.event));
  assert.equal(validatePlaytestEvent({ ...base, type: 'guide_skip', unexpected: true }).ok, false);
  const n = firstMatchMoments[0].nodes[0];
  const action = { ...base, type: 'match_decision', fixtureId: 'first-friendly', nodeId: n.id, choiceId: n.choices[0].id, verdict: 'positive' };
  assert.ok(catalogEvent(action));
  assert.equal(catalogEvent({ ...action, choiceId: 'invented' }), null);
});

test('bounded reports keep newest events, including tied timestamps, and retain a sentinel for truncation', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys=ON');
    for (const f of readdirSync(new URL('../drizzle/', import.meta.url)).filter((f) => f.endsWith('.sql')).sort()) db.exec(readFileSync(new URL('../drizzle/' + f, import.meta.url), 'utf8').replaceAll('--> statement-breakpoint', ''));
    db.prepare('INSERT INTO visitor_sessions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run('s', 'v', null, 'mobile', null, null, null, null, null, null, now, now);
    const insert = db.prepare('INSERT INTO visitor_events VALUES (?,?,?,?,?,?)');
    db.exec('BEGIN');
    for (let i = 0; i < 3002; i++) insert.run(String(i), 's', 'visit', JSON.stringify({ index: i }), now, now);
    db.exec('COMMIT');
    const journey = db.prepare(visitorSql.visitorEvents).all('v', 0);
    assert.equal(journey.length, 3001);
    assert.equal(JSON.parse(journey[0].payload).index, 3001);
    assert.equal(JSON.parse(journey[2999].payload).index, 2);
    const recent = db.prepare(visitorSql.reportEvents).all(0, 0, 0, 3);
    assert.deepEqual(recent.map((r) => JSON.parse(r.payload).index), [3001, 3000, 2999]);
  } finally { db.close(); }
});
