import { playtestSql } from '../db/playtest-statements';
import { env } from 'cloudflare:workers';
import { getPlaytestDb, purgeExpiredPlaytests } from '../db/index';
import { getChatGPTUser } from '../app/chatgpt-auth';
import { catalogEvent, describePlaytestChoice } from './playtest-catalog';
import { validatePlaytestEvent } from './playtest-events';
import {
  CONSENT_VERSION,
  RETENTION_DAYS,
  MAX_BODY_BYTES,
  MAX_BATCH_EVENTS,
  MAX_EVENTS_PER_SESSION,
  hashToken,
  isPlaytestOwner,
  trustedVisitorIp,
  validAlias,
} from './playtest-policy';

export function privateJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
export function playtestEnabled() {
  return (
    env.PLAYTEST_ENABLED === 'true' &&
    env.PLAYTEST_RETENTION_READY === 'true' &&
    Boolean(
      env.DB &&
      env.PLAYTEST_OWNER_EMAIL?.trim() &&
      env.PLAYTEST_CONTACT?.trim(),
    )
  );
}
export async function ownerAccess(): Promise<
  'owner' | 'signed-out' | 'forbidden'
> {
  const user = await getChatGPTUser();
  // The official Sites plugin strips forged headers and supplies this mock
  // identity only on loopback. Vite removes this branch from production builds.
  if (
    import.meta.env.DEV &&
    user?.id === 'local_seedy' &&
    user.email === 'seedy@sites.test'
  )
    return 'owner';
  return !user
    ? 'signed-out'
    : isPlaytestOwner(user.email, env.PLAYTEST_OWNER_EMAIL)
      ? 'owner'
      : 'forbidden';
}
export function sameOrigin(request: Request) {
  return (
    request.headers.get('origin') === new URL(request.url).origin &&
    request.headers.get('sec-fetch-site') !== 'cross-site'
  );
}
export async function readJson(request: Request) {
  if (
    !sameOrigin(request) ||
    !request.headers.get('content-type')?.startsWith('application/json')
  )
    throw new Error('invalid');
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) throw new Error('invalid');
  // Bound actual streaming input even when Content-Length is absent or untrue.
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid');
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error('invalid');
    }
    parts.push(part.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export function exactKeys(
  value: unknown,
  keys: string[],
): value is Record<string, unknown> {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key)),
  );
}
async function authorizedSession(request: Request, includeExpired = false) {
  const token = request.headers
    .get('authorization')
    ?.match(/^Bearer ([0-9a-f]{64})$/)?.[1];
  if (!token) return null;
  const hash = await hashToken(token);
  const statement = includeExpired
    ? getPlaytestDb().prepare(playtestSql.authorizeAny).bind(hash)
    : getPlaytestDb()
        .prepare(playtestSql.authorizeActive)
        .bind(hash, Date.now());
  return statement.first<{ id: string; alias: string; created_at: number }>();
}
export async function createPlaytestSession(request: Request) {
  if (!playtestEnabled())
    return privateJson(
      { error: 'Playtest sharing is unavailable. You can still play.' },
      503,
    );
  let data: Record<string, unknown>;
  try {
    const value = await readJson(request);
    if (
      !exactKeys(value, ['alias', 'shareIp', 'consentVersion']) ||
      !validAlias(value.alias) ||
      typeof value.shareIp !== 'boolean' ||
      value.consentVersion !== CONSENT_VERSION
    )
      throw new Error('invalid');
    data = value;
  } catch {
    return privateJson(
      {
        error:
          'Choose a nickname of 1–24 characters and accept the current notice.',
      },
      400,
    );
  }
  try {
    const db = getPlaytestDb();
    await purgeExpiredPlaytests(db);
    const now = Date.now();
    const id = crypto.randomUUID();
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
    const cf = (request as Request & { cf?: unknown }).cf;
    const ip = data.shareIp
      ? trustedVisitorIp(
          request.headers,
          Boolean(cf) && env.PLAYTEST_TRUST_CF_IP === 'true',
        )
      : null;
    // Global daily cap without silently retaining non-consenting visitors' IPs.
    const day = Math.floor(now / 86_400_000);
    const created = await db.batch([
      db.prepare(playtestSql.ensureDailyLimit).bind(day),
      db
        .prepare(playtestSql.createSession)
        .bind(
          id,
          data.alias,
          await hashToken(token),
          CONSENT_VERSION,
          data.shareIp ? 1 : 0,
          ip,
          now,
          now + RETENTION_DAYS * 86_400_000,
          day,
        ),
      db.prepare(playtestSql.consumeDailyLimit).bind(day, id),
    ]);
    if (!created[1].meta.changes)
      return privateJson(
        { error: 'Playtest sharing is temporarily full. You can still play.' },
        429,
      );
    return privateJson(
      { sessionId: id, token, alias: data.alias, ipStored: Boolean(ip) },
      201,
    );
  } catch {
    return privateJson(
      { error: 'Sharing is unavailable. You can still play.' },
      503,
    );
  }
}
export async function collectPlaytestEvents(request: Request) {
  if (!playtestEnabled())
    return privateJson({ error: 'Sharing is unavailable.' }, 503);
  let session: Awaited<ReturnType<typeof authorizedSession>>;
  try {
    session = await authorizedSession(request);
  } catch {
    return privateJson({ error: 'Sharing is temporarily unavailable.' }, 503);
  }
  if (!session)
    return privateJson({ error: 'This sharing session has ended.' }, 401);
  let validated = false;
  try {
    const data = await readJson(request);
    if (
      !exactKeys(data, ['events']) ||
      !Array.isArray(data.events) ||
      data.events.length < 1 ||
      data.events.length > MAX_BATCH_EVENTS
    )
      return privateJson({ error: 'Invalid event batch.' }, 400);
    const now = Date.now();
    const events = [];
    for (const input of data.events) {
      const parsed = validatePlaytestEvent(input);
      if (
        !parsed.ok ||
        parsed.event.sessionId !== session.id ||
        parsed.event.occurredAt < session.created_at - 60_000 ||
        parsed.event.occurredAt > now + 60_000 ||
        parsed.event.alias !== undefined
      )
        return privateJson({ error: 'Invalid playtest event.' }, 400);
      const event = catalogEvent(parsed.event);
      if (!event) return privateJson({ error: 'Unknown game content.' }, 400);
      events.push(event);
    }
    validated = true;
    // Each atomic insert rechecks existence, expiry and cap. Withdrawal racing
    // with an in-flight batch cannot recreate a deleted session or its events.
    const result = await getPlaytestDb().batch(
      events.map((event) =>
        getPlaytestDb()
          .prepare(playtestSql.insertEvent)
          .bind(
            event.eventId,
            session.id,
            event.type,
            JSON.stringify(event),
            event.occurredAt,
            now,
            session.id,
            now,
            session.id,
            MAX_EVENTS_PER_SESSION,
          ),
      ),
    );
    return privateJson({
      accepted: result.reduce(
        (count, row) => count + (row.meta.changes ?? 0),
        0,
      ),
    });
  } catch {
    // Only malformed input is permanent. Storage outages must leave the client
    // queue intact so the same event IDs can be retried without duplication.
    return privateJson({ error: 'Could not save this batch.' }, validated ? 503 : 400);
  }
}
export async function deletePlaytestSession(request: Request) {
  if (!sameOrigin(request))
    return privateJson({ error: 'Invalid request.' }, 403);
  try {
    const session = await authorizedSession(request, true);
    if (!session) return privateJson({ deleted: true });
    await getPlaytestDb()
      .prepare(playtestSql.deleteSession)
      .bind(session.id)
      .run();
    return privateJson({ deleted: true });
  } catch {
    return privateJson(
      { error: 'Deletion could not be confirmed. Try again.' },
      503,
    );
  }
}
export async function playtestReport(request: Request) {
  if ((await ownerAccess()) !== 'owner')
    return privateJson({ error: 'Owner access required.' }, 403);
  try {
    const db = getPlaytestDb();
    const now = Date.now();
    const id = new URL(request.url).searchParams.get('session');
    if (id) {
      if (!/^[0-9a-f-]{36}$/.test(id))
        return privateJson({ error: 'Invalid session.' }, 400);
      const session = await db
        .prepare(
          'SELECT id, alias, ip_address, ip_consent, created_at, expires_at FROM playtest_sessions WHERE id = ? AND expires_at > ?',
        )
        .bind(id, now)
        .first();
      if (!session) return privateJson({ error: 'Session unavailable.' }, 404);
      const rows = await db
        .prepare(
          'SELECT payload, received_at FROM playtest_events WHERE session_id = ? ORDER BY received_at, rowid LIMIT 1000',
        )
        .bind(id)
        .all<{ payload: string; received_at: number }>();
      return privateJson({
        session,
        events: rows.results.map((row) => {
          const event = JSON.parse(row.payload);
          return {
            ...event,
            receivedAt: row.received_at,
            description: describePlaytestChoice(event),
          };
        }),
      });
    }
    const sessions = await db
      .prepare(`SELECT s.id, s.alias, s.ip_address, s.ip_consent, s.created_at, s.expires_at,
      COUNT(e.id) AS events, COALESCE(MAX(json_extract(e.payload, '$.activeMs')), 0) AS active_ms,
      SUM(CASE WHEN e.type IN ('course_answer', 'match_decision') THEN 1 ELSE 0 END) AS choices,
      SUM(CASE WHEN e.type IN ('course_complete', 'match_complete', 'tournament_complete') THEN 1 ELSE 0 END) AS completions
      FROM playtest_sessions s LEFT JOIN playtest_events e ON e.session_id = s.id
      WHERE s.expires_at > ? GROUP BY s.id ORDER BY s.created_at DESC LIMIT 100`)
      .bind(now)
      .all();
    const totals = await db
      .prepare(
        'SELECT COUNT(*) AS sessions FROM playtest_sessions WHERE expires_at > ?',
      )
      .bind(now)
      .first();
    return privateJson({
      sessions: sessions.results,
      totals,
      retentionDays: RETENTION_DAYS,
    });
  } catch {
    return privateJson({ error: 'Report storage unavailable.' }, 503);
  }
}
export async function deleteOwnerPlaytest(request: Request) {
  if ((await ownerAccess()) !== 'owner' || !sameOrigin(request))
    return privateJson({ error: 'Owner access required.' }, 403);
  const id = new URL(request.url).searchParams.get('session');
  if (!id || !/^[0-9a-f-]{36}$/.test(id))
    return privateJson({ error: 'Invalid session.' }, 400);
  try {
    await getPlaytestDb().prepare(playtestSql.deleteSession).bind(id).run();
    return privateJson({ deleted: true });
  } catch {
    return privateJson({ error: 'Deletion could not be confirmed.' }, 503);
  }
}
