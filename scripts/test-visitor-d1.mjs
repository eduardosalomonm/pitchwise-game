import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { visitorSql } from '../db/visitor-statements.ts';

// A fresh in-memory D1 runtime: no project DB, env file, personal records or network collector.
const runtime = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("test"); } }', d1Databases: { DB: 'visitor-test' }, d1Persist: false });
try {
  const db = await runtime.getD1Database('DB');
  for (const file of readdirSync(new URL('../drizzle/', import.meta.url)).filter((f) => f.endsWith('.sql')).sort())
    for (const sql of readFileSync(new URL(`../drizzle/${file}`, import.meta.url), 'utf8').split('--> statement-breakpoint').filter((s) => s.trim()))
      await db.prepare(sql).run();
  const session = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const visitor = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const now = 1000;
  const batch = (ids) => db.batch([
    db.prepare(visitorSql.ensureDaily).bind(1),
    db.prepare(visitorSql.createSession).bind(session, visitor, 'Synthetic Tester', 'mobile', 'en', null, null, null, null, null, now, now, 1, 10),
    db.prepare(visitorSql.countSession).bind(1),
    db.prepare(visitorSql.touchSession).bind(now, null, session),
    ...ids.flatMap((id) => [
      db.prepare(visitorSql.insertEvent).bind(id, session, 'visit', '{}', now, now, session, 1, 2, session, 10),
      db.prepare(visitorSql.countEvent).bind(1),
    ]),
  ]);
  await batch(['one', 'one']);
  await batch(['one', 'two']);
  assert.deepEqual(await db.prepare('SELECT sessions, events FROM visitor_daily_limits WHERE day = 1').first(), { sessions: 1, events: 2 });
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM visitor_events').first()).n, 2);
  await batch(['three']);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM visitor_events').first()).n, 2, 'quota rejects the third distinct event, not the second');
  await db.prepare(visitorSql.touchSession).bind(9000, null, session).run();
  await db.prepare(visitorSql.purgeSessions).bind(now).run();
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM visitor_events').first()).n, 0, 'expiry cascades in D1');
  console.log('PASS: actual ephemeral D1 batch counts simultaneous duplicates once, enforces quota and expires active sessions.');
} finally {
  await runtime.dispose();
}
