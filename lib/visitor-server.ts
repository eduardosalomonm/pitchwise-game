import { env } from 'cloudflare:workers';
import { visitorSql } from '../db/visitor-statements';
import { getPlaytestDb } from '../db/index';
import { catalogEvent, describePlaytestChoice } from './playtest-catalog';
import { validatePlaytestEvent, type PlaytestEvent } from './playtest-events';
import { MAX_BATCH_EVENTS } from './playtest-policy';
import {
  exactKeys,
  ownerAccess,
  privateJson,
  readJson,
  sameOrigin,
} from './playtest-server';
import {
  DEVICE_CLASSES,
  VISITOR_DAILY_EVENT_CAP,
  VISITOR_DAILY_SESSION_CAP,
  VISITOR_MAX_EVENTS_PER_SESSION,
  VISITOR_REPORT_DAYS,
  VISITOR_RETENTION_DAYS,
  visitorTrackingReady,
  cleanGeo,
  cleanLabel,
  cleanLanguage,
  cleanReferrer,
  type DeviceClass,
} from './visitor-policy';
import {
  summarizeVisitors,
  type VisitorEventRow,
  type VisitorSessionRow,
} from './visitor-report';

// Off unless explicitly enabled for the invited test phase.
export const visitorTrackingEnabled = () => visitorTrackingReady(env);

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BODY_KEYS = [
  'sessionId',
  'visitorId',
  'label',
  'device',
  'language',
  'referrer',
  'events',
];

export async function collectVisits(request: Request) {
  if (!visitorTrackingEnabled())
    return privateJson(
      { error: 'Tracking is off.', code: 'TRACKING_DISABLED' },
      503,
    );
  let validated = false;
  try {
    const data = await readJson(request);
    if (
      !exactKeys(data, BODY_KEYS) ||
      typeof data.sessionId !== 'string' ||
      !uuid.test(data.sessionId) ||
      typeof data.visitorId !== 'string' ||
      !uuid.test(data.visitorId) ||
      !DEVICE_CLASSES.includes(data.device as DeviceClass) ||
      !Array.isArray(data.events) ||
      data.events.length < 1 ||
      data.events.length > MAX_BATCH_EVENTS ||
      (data.label !== null && !cleanLabel(data.label)) ||
      (data.language !== null && !cleanLanguage(data.language)) ||
      (data.referrer !== null && !cleanReferrer(data.referrer))
    )
      return privateJson({ error: 'Invalid batch.' }, 400);
    const now = Date.now();
    const events: PlaytestEvent[] = [];
    for (const input of data.events) {
      const parsed = validatePlaytestEvent(input);
      if (
        !parsed.ok ||
        parsed.event.sessionId !== data.sessionId ||
        parsed.event.alias !== undefined ||
        parsed.event.occurredAt < now - 12 * 3_600_000 ||
        parsed.event.occurredAt > now + 60_000
      )
        return privateJson({ error: 'Invalid event.' }, 400);
      const event = catalogEvent(parsed.event);
      if (!event) return privateJson({ error: 'Unknown game content.' }, 400);
      events.push(event);
    }
    validated = true;
    const db = getPlaytestDb();
    const existing = await db
      .prepare(visitorSql.sessionVisitor)
      .bind(data.sessionId)
      .first<{ visitor_id: string }>();
    if (existing && existing.visitor_id !== data.visitorId)
      return privateJson({ error: 'Invalid session.' }, 400);
    const day = Math.floor(now / 86_400_000);
    const geo = cleanGeo((request as Request & { cf?: unknown }).cf);
    const label = cleanLabel(data.label);
    const result = await db.batch([
      db.prepare(visitorSql.ensureDaily).bind(day),
      db
        .prepare(visitorSql.createSession)
        .bind(
          data.sessionId,
          data.visitorId,
          label,
          data.device,
          cleanLanguage(data.language),
          cleanReferrer(data.referrer),
          geo.country,
          geo.region,
          geo.city,
          geo.timezone,
          now,
          now,
          day,
          VISITOR_DAILY_SESSION_CAP,
        ),
      db.prepare(visitorSql.countSession).bind(day),
      db.prepare(visitorSql.touchSession).bind(now, label, data.sessionId),
      ...events.flatMap((event) => [
        db
          .prepare(visitorSql.insertEvent)
          .bind(
            event.eventId,
            data.sessionId,
            event.type,
            JSON.stringify(event),
            event.occurredAt,
            now,
            data.sessionId,
            day,
            VISITOR_DAILY_EVENT_CAP,
            data.sessionId,
            VISITOR_MAX_EVENTS_PER_SESSION,
          ),
        db.prepare(visitorSql.countEvent).bind(day),
      ]),
    ]);
    const accepted = result
      .slice(4)
      .filter((_, i) => i % 2 === 0)
      .reduce((n, row) => n + (row.meta.changes ?? 0), 0);
    return privateJson({ accepted });
  } catch {
    return validated
      ? privateJson(
          {
            error: 'Storage temporarily unavailable.',
            code: 'STORAGE_UNAVAILABLE',
          },
          503,
        )
      : privateJson({ error: 'Invalid batch.' }, 400);
  }
}

export async function deleteVisitor(request: Request) {
  if ((await ownerAccess()) !== 'owner' || !sameOrigin(request))
    return privateJson(
      { error: 'Owner access and same origin required.' },
      403,
    );
  const visitor = new URL(request.url).searchParams.get('visitor');
  if (!visitor || !uuid.test(visitor))
    return privateJson({ error: 'Invalid visitor.' }, 400);
  try {
    // D1 meta.changes includes cascaded event rows; count returned session IDs instead.
    const result = await getPlaytestDb()
      .prepare(visitorSql.deleteVisitor)
      .bind(visitor)
      .all<{ id: string }>();
    return privateJson({ deleted: result.results.length });
  } catch {
    return privateJson({ error: 'Deletion unavailable. Please retry.' }, 503);
  }
}

type SessionSql = {
  id: string;
  visitor_id: string;
  label: string | null;
  device: DeviceClass;
  language: string | null;
  referrer: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  created_at: number;
  last_seen_at: number;
};
const toSession = (r: SessionSql): VisitorSessionRow => ({
  id: r.id,
  visitorId: r.visitor_id,
  label: r.label,
  device: r.device,
  language: r.language,
  referrer: r.referrer,
  country: r.country,
  region: r.region,
  city: r.city,
  timezone: r.timezone,
  createdAt: r.created_at,
  lastSeenAt: r.last_seen_at,
});
const toEvents = (
  rows: { session_id: string; payload: string; received_at: number }[],
): VisitorEventRow[] =>
  rows.map((r) => ({
    sessionId: r.session_id,
    receivedAt: r.received_at,
    event: JSON.parse(r.payload) as PlaytestEvent,
  }));

export async function visitorReport(request: Request) {
  if ((await ownerAccess()) !== 'owner')
    return privateJson({ error: 'Owner access required.' }, 403);
  try {
    const db = getPlaytestDb();
    const now = Date.now();
    const visitor = new URL(request.url).searchParams.get('visitor');
    const expiresBefore = now - VISITOR_RETENTION_DAYS * 86_400_000;
    if (visitor) {
      if (!uuid.test(visitor))
        return privateJson({ error: 'Invalid visitor.' }, 400);
      const sessions = (
        await db
          .prepare(visitorSql.visitorSessions)
          .bind(visitor, expiresBefore)
          .all<SessionSql>()
      ).results.map(toSession);
      const eventRows = (
          await db
            .prepare(visitorSql.visitorEvents)
            .bind(visitor, expiresBefore)
            .all<{ session_id: string; payload: string; received_at: number }>()
        ).results;
      const events = toEvents(eventRows.slice(0, 3000).reverse());
      return privateJson({
        sessions,
        truncated: eventRows.length > 3000,
        events: events.map((e) => ({
          ...e.event,
          sessionId: e.sessionId,
          receivedAt: e.receivedAt,
          description: describePlaytestChoice(e.event),
        })),
      });
    }
    const since = now - VISITOR_REPORT_DAYS * 86_400_000;
    const sessionRows = (
      await db
        .prepare(visitorSql.reportSessions)
        .bind(since, expiresBefore, 5_001)
        .all<SessionSql>()
    ).results;
    const sessions = sessionRows.slice(0, 5_000).map(toSession);
    const eventRows = (
        await db
          .prepare(visitorSql.reportEvents)
          .bind(since, expiresBefore, since, 60_001)
          .all<{ session_id: string; payload: string; received_at: number }>()
      ).results;
    const events = toEvents(eventRows.slice(0, 60_000).reverse());
    return privateJson({
      enabled: visitorTrackingEnabled(),
      days: VISITOR_REPORT_DAYS,
      truncated: sessionRows.length > 5_000 || eventRows.length > 60_000,
      ...summarizeVisitors(sessions, events, now, describePlaytestChoice),
    });
  } catch {
    return privateJson({ error: 'Visitor report unavailable.' }, 503);
  }
}
