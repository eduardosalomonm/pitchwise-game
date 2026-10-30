import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { visitorSql } from '../db/visitor-statements.ts';
import { cleanGeo, cleanLabel, cleanLanguage, cleanReferrer, deviceClass, visitorTrackingReady } from '../lib/visitor-policy.ts';
import { summarizeVisitors } from '../lib/visitor-report.ts';

function database() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync(new URL('../drizzle/', import.meta.url)).filter((f) => f.endsWith('.sql')).sort())
    db.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), 'utf8').replaceAll('--> statement-breakpoint', ''));
  return db;
}
const S = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const V = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function create(db, id, visitor, now, day, cap = 3000) {
  db.prepare(visitorSql.ensureDaily).run(day);
  db.prepare(visitorSql.createSession).run(id, visitor, 'Juan', 'mobile', 'es-MX', 'wa.me', 'MX', 'CDMX', 'Mexico City', 'America/Mexico_City', now, now, day, cap);
  db.prepare(visitorSql.countSession).run(day);
}
const count = (db, sql) => db.prepare(sql).get().n;

test('owner deletion removes all sessions for one visitor only, cascades and is idempotent', () => {
  const db = database();
  try {
    create(db, S, V, 1000, 1);
    create(db, 'second-session', V, 1001, 1);
    create(db, 'other-session', 'other-visitor', 1002, 1);
    for (const id of [S, 'second-session', 'other-session'])
      db.prepare(visitorSql.insertEvent).run(`event-${id}`, id, 'visit', '{}', 1003, 1003, id, 1, 10, id, 10);
    assert.equal(db.prepare(visitorSql.deleteVisitor).run(V).changes, 2);
    assert.equal(db.prepare(visitorSql.deleteVisitor).run(V).changes, 0);
    assert.equal(count(db, 'SELECT COUNT(*) AS n FROM visitor_sessions'), 1);
    assert.equal(count(db, 'SELECT COUNT(*) AS n FROM visitor_events'), 1);
    assert.equal(db.prepare('SELECT visitor_id FROM visitor_sessions').get().visitor_id, 'other-visitor');
  } finally { db.close(); }
});

test('recording requires verified cleanup, storage, an owner and a contact even without the optional playtest', () => {
  const ready = { VISITOR_TRACKING_ENABLED: 'true', PLAYTEST_RETENTION_READY: 'true', DB: {}, PLAYTEST_OWNER_EMAIL: 'owner@example.test', PLAYTEST_CONTACT: 'Contact the test organiser.' };
  assert.equal(visitorTrackingReady(ready), true);
  for (const field of Object.keys(ready)) assert.equal(visitorTrackingReady({ ...ready, [field]: undefined }), false, field);
  assert.equal(visitorTrackingReady({ ...ready, VISITOR_TRACKING_ENABLED: 'false' }), false);
  assert.equal(visitorTrackingReady({ ...ready, PLAYTEST_RETENTION_READY: 'false' }), false);
  assert.equal(visitorTrackingReady({ ...ready, PLAYTEST_CONTACT: ' ' }), false);
});

test('activity cannot extend retention, and expired visitor details are absent before scheduled cleanup', () => {
  const db = database();
  try {
    create(db, S, V, 1000, 1);
    db.prepare(visitorSql.insertEvent).run('expired', S, 'visit', '{}', 1000, 1000, S, 1, 10, S, 10);
    db.prepare(visitorSql.touchSession).run(10_000, null, S);
    assert.equal(db.prepare(visitorSql.visitorSessions).all(V, 1000).length, 0);
    assert.equal(db.prepare(visitorSql.visitorEvents).all(V, 1000).length, 0);
    assert.equal(db.prepare(visitorSql.reportSessions).all(0, 1000, 10).length, 0, 'summary excludes expired sessions too');
    assert.equal(db.prepare(visitorSql.reportEvents).all(0, 1000, 0, 10).length, 0, 'summary excludes their events');
    db.prepare(visitorSql.purgeSessions).run(1000);
    assert.equal(count(db, 'SELECT COUNT(*) AS n FROM visitor_sessions'), 0);
    assert.equal(count(db, 'SELECT COUNT(*) AS n FROM visitor_events'), 0);
  } finally { db.close(); }
});

test('sessions and events are idempotent, capped per session and per day, and counted once', () => {
  const db = database();
  create(db, S, V, 1000, 1);
  create(db, S, V, 1000, 1); // duplicate in the same millisecond must not consume quota
  create(db, S, V, 2000, 1); // a later batch for the same tab does not recreate or recount
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM visitor_sessions'), 1);
  assert.equal(db.prepare('SELECT sessions FROM visitor_daily_limits WHERE day = 1').get().sessions, 1);
  assert.equal(db.prepare(visitorSql.sessionVisitor).get(S).visitor_id, V);
  const insert = (id, now, sessionCap = 1000, dailyCap = 60000) => {
    db.prepare(visitorSql.insertEvent).run(id, S, 'visit', '{}', now, now, S, 1, dailyCap, S, sessionCap);
    db.prepare(visitorSql.countEvent).run(1);
  };
  insert('e1', 10);
  insert('e1', 10); // duplicate IDs can arrive within one request
  insert('e1', 20); // retried batch
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM visitor_events'), 1);
  assert.equal(db.prepare('SELECT events FROM visitor_daily_limits WHERE day = 1').get().events, 1);
  insert('e2', 30, 1); // session cap reached
  insert('e3', 30, 1000, 1); // daily cap reached
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM visitor_events'), 1);
  db.prepare(visitorSql.touchSession).run(5000, 'Ignored', S);
  assert.equal(db.prepare('SELECT label, last_seen_at FROM visitor_sessions').get().label, 'Juan');
  db.prepare(visitorSql.purgeSessions).run(5000);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM visitor_events'), 0, 'expiry deletes events by cascade');
  create(db, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', V, 9000, 2, 0);
  assert.equal(count(db, 'SELECT COUNT(*) AS n FROM visitor_sessions'), 0, 'daily session cap refuses new tabs');
});

test('client-supplied fields and network location are cleaned before storage', () => {
  assert.equal(cleanLabel(' Juan '), 'Juan');
  assert.equal(cleanLabel('juan@mail.com'), null);
  assert.equal(cleanLabel('x'.repeat(40)), null);
  assert.equal(cleanLanguage('es-419'), 'es-419');
  assert.equal(cleanLanguage('<script>'), null);
  assert.equal(cleanReferrer('WA.ME'), 'wa.me');
  assert.equal(cleanReferrer('https://evil.example/path'), null);
  assert.deepEqual(cleanGeo({ country: 'MX', city: 'Mexico\u0000 City', region: 7 }), { country: 'MX', region: null, city: 'Mexico City', timezone: null });
  assert.deepEqual(cleanGeo(undefined), { country: null, region: null, city: null, timezone: null });
  assert.deepEqual([deviceClass(375), deviceClass(800), deviceClass(1440)], ['mobile', 'tablet', 'desktop']);
});

test('the report groups visits by visitor, place and progress', () => {
  const now = Date.UTC(2026, 9, 4, 12);
  const session = (id, visitorId, label, city, at) => ({ id, visitorId, label, device: 'mobile', language: 'es', referrer: 'wa.me', country: 'MX', region: 'CDMX', city, timezone: null, createdAt: at, lastSeenAt: at + 60_000 });
  const sessions = [session('s1', 'v1', 'Juan', 'Mexico City', now - 86_400_000), session('s2', 'v1', null, 'Mexico City', now - 3_600_000), session('s3', 'v2', null, 'Bogotá', now - 7_200_000)];
  const e = (sessionId, event) => ({ sessionId, receivedAt: now, event: { schemaVersion: 1, eventId: crypto.randomUUID(), sessionId, occurredAt: now, ...event } });
  const decision = (sessionId, verdict) => e(sessionId, { type: 'match_decision', fixtureId: 'cup-0', nodeId: 'n1', choiceId: 'c', verdict, activeMs: 120_000 });
  const events = [
    e('s1', { type: 'visit', entrySource: 'shared_link' }),
    e('s1', { type: 'activity_start', activity: 'tournament' }),
    decision('s1', 'negative'), decision('s2', 'negative'), decision('s3', 'positive'),
    e('s2', { type: 'activity_start', activity: 'match', fixtureId: 'cup-0' }),
    e('s2', { type: 'match_complete', fixtureId: 'cup-0', homeGoals: 1, awayGoals: 0, decisions: 4, goodDecisions: 3 }),
    e('s3', { type: 'course_answer', courseId: 'goalkeeper', nodeId: 'a', choiceId: 'b', correct: true }),
  ];
  const report = summarizeVisitors(sessions, events, now, () => ({ activity: 'Cup', prompt: 'Where?', choice: 'x' }));
  assert.deepEqual([report.totals.visitors, report.totals.returning, report.totals.sessions, report.totals.fromPersonalLinks], [2, 1, 3, 1]);
  assert.deepEqual(report.places[0], { name: 'Mexico City, CDMX, MX', visitors: 1 });
  assert.equal(report.tournament.reachedRound[0], 1);
  assert.equal(report.funnel.match, 0, 'cup matches are not counted as Match Day');
  assert.equal(report.visitors.find((v) => v.visitorId === 'v1').matchesCompleted, 0);
  assert.deepEqual(report.hardestDecisions[0], { attempts: 3, goodRate: 33, activity: 'Cup', prompt: 'Where?' });
  const juan = report.visitors.find((v) => v.visitorId === 'v1');
  assert.equal(juan.label, 'Juan');
  assert.equal(juan.sessions, 2);
  assert.equal(juan.cup, 'Playing: 1 of 7 played');
  assert.equal(juan.goodRate, 0);
  assert.equal(report.courses[0].correctRate, 100);
  assert.equal(report.daily.length, 14);
});
