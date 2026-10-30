import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { playtestSql } from '../db/playtest-statements.ts';
import { readFileSync } from 'node:fs';
import {
  CONSENT_VERSION,
  hashToken,
  isPlaytestOwner,
  randomAlias,
  trustedVisitorIp,
  validAlias,
} from '../lib/playtest-policy.ts';
import { catalogEvent } from '../lib/playtest-catalog.ts';
import { courses } from '../lib/scenarios.ts';
import { matchFixtures } from '../lib/match-fixtures.ts';
import {
  validatePlaytestEvent,
  summarizePlaytestEvents,
} from '../lib/playtest-events.ts';

test('nicknames are visible, bounded and never require email or real names', () => {
  for (let i = 0; i < 30; i++) assert.ok(validAlias(randomAlias()));
  for (const alias of [
    '',
    ' ',
    ' nickname ',
    'x'.repeat(25),
    'a\u200bb',
    'name@example.com',
    '127.0.0.1',
    '::1',
  ])
    assert.equal(validAlias(alias), false, alias);
  assert.equal(validAlias('José ⚽'), true);
});
test('owner authorization fails closed and does not use aliases or IPs', () => {
  assert.equal(isPlaytestOwner(null, 'owner@example.test'), false);
  assert.equal(isPlaytestOwner('anyone@example.test', undefined), false);
  assert.equal(
    isPlaytestOwner('someone@example.test', 'owner@example.test'),
    false,
  );
  assert.equal(
    isPlaytestOwner('Owner@example.test', ' owner@example.test '),
    true,
  );
});
test('IP requires trusted provenance; spoofed, synthetic or invalid addresses are absent', () => {
  assert.equal(
    trustedVisitorIp(new Headers({ 'cf-connecting-ip': '203.0.113.4' }), false),
    null,
  );
  assert.equal(
    trustedVisitorIp(new Headers({ 'x-forwarded-for': '203.0.113.4' }), true),
    null,
  );
  assert.equal(
    trustedVisitorIp(new Headers({ 'cf-connecting-ip': '203.0.113.4' }), true),
    '203.0.113.4',
  );
  assert.equal(
    trustedVisitorIp(new Headers({ 'cf-connecting-ip': '256.1.1.1' }), true),
    null,
  );
  assert.equal(
    trustedVisitorIp(
      new Headers({ 'cf-connecting-ip': '2a06:98c0:3600::103' }),
      true,
    ),
    null,
  );
  assert.equal(
    trustedVisitorIp(
      new Headers({
        'cf-connecting-ip': '2001:db8::1',
        'cf-worker': 'proxy.test',
      }),
      true,
    ),
    null,
  );
  assert.equal(
    trustedVisitorIp(
      new Headers({
        'cf-connecting-ip': '192.0.2.1',
        'cf-connecting-ipv6': '2001:db8::1',
      }),
      true,
    ),
    '192.0.2.1',
  );
  assert.equal(
    trustedVisitorIp(new Headers({ 'cf-connecting-ip': '2001:db8::1' }), true),
    '2001:db8::1',
  );
  assert.equal(
    trustedVisitorIp(new Headers({ 'cf-connecting-ip': '240.1.2.3' }), true),
    null,
  );
});
test('only token hashes belong in storage', async () => {
  const token = 'abcd'.repeat(16);
  const hash = await hashToken(token);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(hash, token);
  assert.equal(await hashToken(token), hash);
});
test('collector checks authored courses and normalizes correctness, not a forged claim', () => {
  const course = courses[0],
    scene = course.scenarios[0];
  assert.equal(
    catalogEvent({
      type: 'course_answer',
      courseId: course.id,
      nodeId: scene.id,
      choiceId: scene.correctChoiceId,
      correct: false,
    }).correct,
    true,
  );
  assert.equal(
    catalogEvent({
      type: 'course_answer',
      courseId: course.id,
      nodeId: scene.id,
      choiceId: 'made-up',
      correct: true,
    }),
    null,
  );
  assert.equal(
    catalogEvent({
      type: 'course_complete',
      courseId: course.id,
      total: 55,
      correct: 0,
    }),
    null,
  );
  assert.equal(
    catalogEvent({
      type: 'activity_start',
      activity: 'match',
      fixtureId: 'made-up',
    }),
    null,
  );
  const fixture = matchFixtures[0],
    node = fixture.moments[0].nodes[0];
  assert.ok(
    catalogEvent({
      type: 'match_decision',
      fixtureId: fixture.id,
      nodeId: node.id,
      choiceId: node.choices[0].id,
      verdict: 'negative',
    }),
  );
});
test('activity heartbeat adds active time without another visit, choice or completion', () => {
  const event = {
    schemaVersion: 1,
    eventId: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    occurredAt: Date.now(),
    type: 'session_activity',
    activeMs: 3000,
  };
  assert.equal(validatePlaytestEvent(event).ok, true);
  const summary = summarizePlaytestEvents([event]);
  assert.equal(summary.visits, 0);
  assert.equal(summary.sessions[0].activeMs, 3000);
  assert.equal(summary.sessions[0].choices.length, 0);
});
test('generated migration deletes events by cascade, including expiry, with idempotent event keys', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(
    readFileSync(
      new URL('../drizzle/0000_solid_paper_doll.sql', import.meta.url),
      'utf8',
    ),
  );
  db.prepare(
    'INSERT INTO playtest_sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run('session', 'Friend', 'hash', CONSENT_VERSION, 0, null, 1, 30);
  const insert = db.prepare(
    'INSERT OR IGNORE INTO playtest_events VALUES (?, ?, ?, ?, ?, ?)',
  );
  insert.run('event', 'session', 'visit', '{}', 1, 1);
  insert.run('event', 'session', 'visit', '{}', 1, 1);
  assert.equal(
    db.prepare('SELECT COUNT(*) AS n FROM playtest_events').get().n,
    1,
  );
  db.prepare('DELETE FROM playtest_sessions WHERE expires_at <= ?').run(31);
  assert.equal(
    db.prepare('SELECT COUNT(*) AS n FROM playtest_events').get().n,
    0,
  );
  assert.throws(() => insert.run('late', 'session', 'visit', '{}', 1, 1));
  db.close();
});

test('creation cap survives create/delete loops without retaining visitor identifiers', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const file of [
    '0000_solid_paper_doll.sql',
    '0001_hesitant_tombstone.sql',
  ])
    db.exec(
      readFileSync(new URL(`../drizzle/${file}`, import.meta.url), 'utf8'),
    );
  const day = 100;
  const create = (id) => {
    db.exec('BEGIN');
    db.prepare(playtestSql.ensureDailyLimit).run(day);
    const inserted = db
      .prepare(playtestSql.createSession)
      .run(id, 'Friend', id, CONSENT_VERSION, 0, null, 1, 10, day).changes;
    db.prepare(playtestSql.consumeDailyLimit).run(day, id);
    db.exec('COMMIT');
    return inserted;
  };
  for (let i = 0; i < 2000; i++) {
    assert.equal(create(String(i)), 1);
    db.prepare(playtestSql.deleteSession).run(String(i));
  }
  assert.equal(create('over-limit'), 0);
  assert.equal(
    db.prepare('SELECT creations FROM playtest_daily_limits').get().creations,
    2000,
  );
  assert.equal(
    db.prepare('SELECT COUNT(*) AS n FROM playtest_sessions').get().n,
    0,
  );
  db.close();
});

test('expired tokens can delete, late writes cannot resurrect and scheduled purge removes rows', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const file of [
    '0000_solid_paper_doll.sql',
    '0001_hesitant_tombstone.sql',
  ])
    db.exec(
      readFileSync(new URL(`../drizzle/${file}`, import.meta.url), 'utf8'),
    );
  db.prepare(
    'INSERT INTO playtest_sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run('session', 'Friend', 'hash', CONSENT_VERSION, 1, '192.0.2.1', 1, 30);
  assert.equal(
    db.prepare(playtestSql.authorizeActive).get('hash', 31),
    undefined,
  );
  assert.equal(db.prepare(playtestSql.authorizeAny).get('hash').id, 'session');
  db.prepare(playtestSql.deleteSession).run('session');
  assert.equal(
    db
      .prepare(playtestSql.insertEvent)
      .run(
        'event',
        'session',
        'visit',
        '{}',
        1,
        31,
        'session',
        31,
        'session',
        1000,
      ).changes,
    0,
  );
  db.prepare(
    'INSERT INTO playtest_sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run('expired', 'Friend', 'hash2', CONSENT_VERSION, 1, '192.0.2.2', 1, 30);
  db.prepare('INSERT INTO playtest_events VALUES (?, ?, ?, ?, ?, ?)').run(
    'event2',
    'expired',
    'visit',
    '{}',
    1,
    1,
  );
  db.prepare(playtestSql.purgeSessions).run(31);
  assert.equal(
    db.prepare('SELECT COUNT(*) AS n FROM playtest_events').get().n,
    0,
  );
  assert.equal(
    db.prepare('SELECT COUNT(*) AS n FROM playtest_sessions').get().n,
    0,
  );
  db.close();
});
