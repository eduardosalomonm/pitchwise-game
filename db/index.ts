import { playtestSql } from './playtest-statements';
import { visitorSql } from './visitor-statements';
import { VISITOR_RETENTION_DAYS } from '../lib/visitor-policy';
import { env } from 'cloudflare:workers';
export function getPlaytestDb(): D1Database {
  if (!env.DB) throw new Error('Playtest storage is unavailable.');
  return env.DB;
}
// Also run on writes as a fallback; server time, never a client timestamp.
export async function purgeExpiredPlaytests(db: D1Database, now = Date.now()) {
  await db.batch([
    db.prepare(playtestSql.purgeSessions).bind(now),
    db.prepare(playtestSql.purgeLimits).bind(Math.floor(now / 86_400_000) - 2),
    db.prepare(visitorSql.purgeSessions).bind(now - VISITOR_RETENTION_DAYS * 86_400_000),
    db.prepare(visitorSql.purgeLimits).bind(Math.floor(now / 86_400_000) - 2),
  ]);
}
