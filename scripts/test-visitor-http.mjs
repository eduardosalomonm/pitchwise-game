import assert from 'node:assert/strict';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { getPlatformProxy, unstable_DevEnv } from 'wrangler';
import { VISITOR_DAILY_EVENT_CAP } from '../lib/visitor-policy.ts';
import { CONSENT_VERSION, MAX_BODY_BYTES } from '../lib/playtest-policy.ts';

// HTTP integration against the real compiled Worker, never the preview or public DB.
const root = resolve(import.meta.dirname, '..');
const config = resolve(root, 'dist/server/wrangler.json');
const isolated = mkdtempSync(resolve(tmpdir(), 'pitchwise-http-test-'));
const envFiles = [resolve(isolated, 'absent-synthetic.env')];
process.env.WRANGLER_SEND_METRICS = 'false';
process.env.WRANGLER_WRITE_LOGS = 'false';
process.env.WRANGLER_LOG_PATH = resolve(isolated, 'logs');
process.env.CLOUDFLARE_INCLUDE_PROCESS_ENV = 'false';
const runtime = new unstable_DevEnv();
let worker, proxy, timeout;
try {
  proxy = await getPlatformProxy({
    configPath: config,
    envFiles,
    persist: { path: resolve(isolated, 'v3') },
  });
  const db = proxy.env.DB;
  for (const file of readdirSync(resolve(root, 'drizzle'))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    for (const sql of readFileSync(resolve(root, 'drizzle', file), 'utf8')
      .split('--> statement-breakpoint')
      .filter((s) => s.trim()))
      await db.prepare(sql).run();
  const readyPromise = once(runtime, 'reloadComplete');
  worker = await runtime.startWorker({
    config,
    envFiles,
    sendMetrics: false,
    bindings: Object.fromEntries(
      Object.entries({
        VISITOR_TRACKING_ENABLED: 'true',
        PLAYTEST_RETENTION_READY: 'true',
        PLAYTEST_ENABLED: 'false',
        PLAYTEST_OWNER_EMAIL: 'owner@example.test',
        PLAYTEST_CONTACT: 'Synthetic test organiser',
      }).map(([key, value]) => [key, { type: 'plain_text', value }]),
    ),
    dev: {
      remote: false,
      persist: isolated,
      watch: false,
      logLevel: 'error',
      inspector: false,
      server: { hostname: '127.0.0.1', port: 3002 },
    },
  });
  const [ready] = await Promise.race([
    readyPromise,
    new Promise((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error('Worker startup timeout')),
        30_000,
      );
    }),
  ]);
  clearTimeout(timeout);
  const user = ready.proxyData.userWorkerUrl;
  let origin = `${user.protocol}//${user.hostname}:${user.port}`;
  let transport = {
    ...ready.proxyData.headers,
    'MF-Route-Override': worker.config.name,
  };
  // Simulates dispatcher-verified identity, not a test of Sites header stripping.
  const owner = {
    'oai-authenticated-user-id': 'synthetic-owner',
    'oai-authenticated-user-email': 'owner@example.test',
  };
  async function api(
    path,
    { method = 'GET', body, headers = {}, rawBody } = {},
  ) {
    const response = await fetch(origin + path, {
      method,
      headers: {
        ...transport,
        ...(method !== 'GET' ? { Origin: origin } : {}),
        ...(body || rawBody ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      ...(rawBody ? { body: rawBody, duplex: 'half' } : {}),
      signal: AbortSignal.timeout(10_000),
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
    if (response.headers.get('content-type')?.includes('application/json')) {
      assert.match(response.headers.get('cache-control'), /private.*no-store/);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    }
    return { status: response.status, data };
  }
  function batch(visitorId = crypto.randomUUID()) {
    const sessionId = crypto.randomUUID();
    return {
      visitorId,
      sessionId,
      label: 'Synthetic Tester',
      device: 'mobile',
      language: 'en',
      referrer: null,
      events: [
        {
          schemaVersion: 1,
          eventId: crypto.randomUUID(),
          sessionId,
          occurredAt: Date.now(),
          activeMs: 0,
          type: 'visit',
          entrySource: 'direct',
        },
      ],
    };
  }
  const a = batch(),
    a2 = batch(a.visitorId),
    b = batch();
  const configResponse = await api('/api/playtest/config');
  assert.equal(configResponse.data.enabled, false);
  assert.equal(configResponse.data.visitorTracking, true);
  assert.equal(
    (await api('/api/visits', { method: 'POST', body: a })).data.accepted,
    1,
  );
  assert.equal(
    (await api('/api/visits', { method: 'POST', body: a })).data.accepted,
    0,
  );
  for (const body of [a2, b])
    assert.equal(
      (await api('/api/visits', { method: 'POST', body })).data.accepted,
      1,
    );
  const before = (
    await db.prepare('SELECT COUNT(*) AS n FROM visitor_events').first()
  ).n;
  for (const headers of [
    { Origin: 'https://other.example.test' },
    { 'Sec-Fetch-Site': 'cross-site' },
  ]) {
    const rejection = await api('/api/visits', {
      method: 'POST',
      body: batch(),
      headers,
    });
    assert.ok(
      [400, 403].includes(rejection.status),
      'cross-origin input rejected',
    );
  }
  for (const body of [
    { ...a, visitorId: b.visitorId },
    { ...a, visitorId: 'invalid' },
    { ...a, extra: true },
  ])
    assert.equal(
      (await api('/api/visits', { method: 'POST', body })).status,
      400,
    );
  const forged = batch();
  forged.events = [
    {
      ...forged.events[0],
      type: 'activity_start',
      activity: 'course',
      courseId: 'missing-course',
    },
  ];
  assert.equal(
    (await api('/api/visits', { method: 'POST', body: forged })).status,
    400,
  );
  const malformed = await api('/api/visits', { method: 'POST', rawBody: '{' });
  assert.equal(malformed.status, 400);
  const bytes = new TextEncoder().encode(
    JSON.stringify(batch()) + ' '.repeat(MAX_BODY_BYTES),
  );
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.slice(0, 16_000));
      controller.enqueue(bytes.slice(16_000));
      controller.close();
    },
  });
  assert.equal(
    (await api('/api/visits', { method: 'POST', rawBody: stream })).status,
    400,
    'actual streamed body is bounded without Content-Length',
  );
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS n FROM visitor_events').first()).n,
    before,
  );
  assert.equal((await api('/api/visits/report')).status, 403);
  assert.equal(
    (
      await api('/api/visits/report', {
        headers: {
          ...owner,
          'oai-authenticated-user-email': 'other@example.test',
        },
      })
    ).status,
    403,
  );
  assert.equal(
    (await api('/api/visits/report', { headers: owner })).status,
    200,
  );
  const deletion = `/api/visits/report?visitor=${a.visitorId}`;
  assert.equal((await api(deletion, { method: 'DELETE' })).status, 403);
  assert.equal(
    (
      await api(deletion, {
        method: 'DELETE',
        headers: { ...owner, Origin: 'https://other.example.test' },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await api('/api/visits/report?visitor=invalid', {
        method: 'DELETE',
        headers: owner,
      })
    ).status,
    400,
  );
  assert.equal(
    (await api(deletion, { method: 'DELETE', headers: owner })).data.deleted,
    2,
  );
  assert.equal(
    (await api(deletion, { method: 'DELETE', headers: owner })).data.deleted,
    0,
  );
  assert.equal((await api(deletion, { headers: owner })).data.events.length, 0);
  assert.equal(
    (await api(`/api/visits/report?visitor=${b.visitorId}`, { headers: owner }))
      .data.events.length,
    1,
  );
  // A returning visitor can exceed a journey's display limit without exceeding any session cap.
  const frequent = crypto.randomUUID();
  let newest;
  for (let visit = 0; visit < 4; visit++) {
    const body = batch(frequent);
    assert.equal((await api('/api/visits', { method: 'POST', body })).status, 200);
    for (let offset = 0; offset < 750; offset += 100) {
      const statements = Array.from({ length: Math.min(100, 750 - offset) }, () => {
        newest = crypto.randomUUID();
        const payload = { ...body.events[0], eventId: newest };
        return db.prepare('INSERT INTO visitor_events VALUES (?, ?, ?, ?, ?, ?)')
          .bind(newest, body.sessionId, 'visit', JSON.stringify(payload), payload.occurredAt, Date.now());
      });
      await db.batch(statements);
    }
  }
  const journey = await api(`/api/visits/report?visitor=${frequent}`, { headers: owner });
  assert.equal(journey.status, 200);
  assert.equal(journey.data.truncated, true);
  assert.equal(journey.data.events.length, 3000);
  assert.equal(journey.data.events.at(-1).eventId, newest, 'the newest event survives truncation');
  const overview = await api('/api/visits/report', { headers: owner });
  assert.equal(overview.data.truncated, false, 'the overview is still complete at this size');
  const day = Math.floor(Date.now() / 86_400_000);
  await db
    .prepare('UPDATE visitor_daily_limits SET events = ? WHERE day = ?')
    .bind(VISITOR_DAILY_EVENT_CAP, day)
    .run();
  assert.equal(
    (await api('/api/visits', { method: 'POST', body: batch() })).data.accepted,
    0,
  );
  // Deliberately break only the fresh synthetic DB, after all successful checks.
  await db.prepare('DROP TABLE visitor_events').run();
  const outage = await api('/api/visits', { method: 'POST', body: batch() });
  assert.equal(outage.status, 503);
  assert.equal(outage.data.code, 'STORAGE_UNAVAILABLE');

  // Exercise the optional collector separately. The first phase intentionally
  // keeps it off to prove visitor reporting does not depend on the playtest card.
  const reloaded = once(runtime, 'reloadComplete');
  await worker.patchConfig({ bindings: {
    ...worker.config.bindings,
    PLAYTEST_ENABLED: { type: 'plain_text', value: 'true' },
  } });
  const [enabled] = await Promise.race([
    reloaded,
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Worker reload timeout')), 30_000);
    }),
  ]);
  clearTimeout(timeout);
  const nextUser = enabled.proxyData.userWorkerUrl;
  origin = `${nextUser.protocol}//${nextUser.hostname}:${nextUser.port}`;
  transport = { ...enabled.proxyData.headers, 'MF-Route-Override': worker.config.name };
  assert.equal((await api('/api/playtest/config')).data.enabled, true);
  const session = await api('/api/playtest/session', {
    method: 'POST',
    body: { alias: 'Synthetic Tester', shareIp: false, consentVersion: CONSENT_VERSION },
  });
  assert.equal(session.status, 201);
  const authorization = { Authorization: `Bearer ${session.data.token}` };
  const event = () => ({ ...batch().events[0], sessionId: session.data.sessionId });
  const send = (events, headers = authorization) => api('/api/playtest/events', { method: 'POST', body: { events }, headers });
  const firstEvent = event();
  assert.equal((await send([firstEvent])).data.accepted, 1);
  assert.equal((await send([firstEvent])).data.accepted, 0, 'retries are idempotent');
  assert.equal((await send([event()], {})).status, 401);
  assert.equal((await send([{ ...event(), eventId: 'invalid' }])).status, 400);
  assert.equal((await api('/api/playtest/events', { method: 'POST', rawBody: '{', headers: authorization })).status, 400);
  for (const table of ['playtest_sessions', 'playtest_events']) {
    const retryEvent = event();
    // Break only this synthetic DB, then restore it before retrying the same ID.
    await db.prepare(`ALTER TABLE ${table} RENAME TO ${table}_unavailable`).run();
    try {
      assert.equal((await send([retryEvent])).status, 503, `${table}: storage failures must remain retryable, not invalid input`);
    } finally {
      await db.prepare(`ALTER TABLE ${table}_unavailable RENAME TO ${table}`).run();
    }
    assert.equal((await send([retryEvent])).data.accepted, 1, `${table}: the unsaved event can be retried`);
    assert.equal((await send([retryEvent])).data.accepted, 0);
  }
  console.log(
    'PASS: compiled HTTP routes, private auth, request bounds, deletion, quotas and retryable outages in both collectors; isolated synthetic D1.',
  );
} finally {
  clearTimeout(timeout);
  await worker?.dispose();
  await runtime.teardown();
  await proxy?.dispose();
}
