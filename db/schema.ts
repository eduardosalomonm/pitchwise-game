import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
// Aggregate resource limit, no alias, IP, token or link to a deleted session.
export const playtestDailyLimits = sqliteTable('playtest_daily_limits', {
  day: integer('day').primaryKey(),
  creations: integer('creations').notNull(),
});

export const playtestSessions = sqliteTable(
  'playtest_sessions',
  {
    id: text('id').primaryKey(),
    alias: text('alias').notNull(),
    tokenHash: text('token_hash').notNull(),
    consentVersion: text('consent_version').notNull(),
    ipConsent: integer('ip_consent').notNull(),
    ipAddress: text('ip_address'),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [
    uniqueIndex('playtest_token').on(table.tokenHash),
    index('playtest_expiry').on(table.expiresAt),
  ],
);

export const playtestEvents = sqliteTable(
  'playtest_events',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => playtestSessions.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    payload: text('payload').notNull(),
    occurredAt: integer('occurred_at').notNull(),
    receivedAt: integer('received_at').notNull(),
  },
  (table) => [
    index('playtest_session_events').on(table.sessionId, table.receivedAt),
  ],
);

// Invited-tester tracking (requested for the friends-only test phase): every visit is
// recorded with a device-stored visitor ID, an optional name from a personal link
// (?from=Name), coarse network location (country/region/city from Cloudflare, never the
// IP), device class, language, referrer host and validated game events.
export const visitorDailyLimits = sqliteTable('visitor_daily_limits', {
  day: integer('day').primaryKey(),
  sessions: integer('sessions').notNull(),
  events: integer('events').notNull(),
});

export const visitorSessions = sqliteTable(
  'visitor_sessions',
  {
    id: text('id').primaryKey(),
    visitorId: text('visitor_id').notNull(),
    label: text('label'),
    device: text('device').notNull(),
    language: text('language'),
    referrer: text('referrer'),
    country: text('country'),
    region: text('region'),
    city: text('city'),
    timezone: text('timezone'),
    createdAt: integer('created_at').notNull(),
    lastSeenAt: integer('last_seen_at').notNull(),
  },
  (table) => [
    index('visitor_sessions_visitor').on(table.visitorId),
    index('visitor_sessions_seen').on(table.lastSeenAt),
  ],
);

export const visitorEvents = sqliteTable(
  'visitor_events',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => visitorSessions.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    payload: text('payload').notNull(),
    occurredAt: integer('occurred_at').notNull(),
    receivedAt: integer('received_at').notNull(),
  },
  (table) => [index('visitor_events_session').on(table.sessionId, table.receivedAt)],
)
;
