import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { getPlatformProxy, unstable_DevEnv } from 'wrangler';
const root = resolve(import.meta.dirname, '..');
const config = resolve(root, 'dist/server/wrangler.json');
// Never purge the preview's real records. Both runtimes share a new synthetic DB.
const isolated = mkdtempSync(resolve(tmpdir(), 'pitchwise-cleanup-test-'));
const state = resolve(isolated, 'v3');
const syntheticEnv = resolve(isolated, 'synthetic-only.env');
process.env.CLOUDFLARE_INCLUDE_PROCESS_ENV = 'false';
process.env.WRANGLER_SEND_METRICS = 'false';
process.env.WRANGLER_WRITE_LOGS = 'false';
process.env.WRANGLER_LOG_PATH = resolve(isolated, 'logs');
const id = crypto.randomUUID();
const eventId = crypto.randomUUID();
let worker;
const runtime = new unstable_DevEnv();
const reload = new Promise((resolve) =>
  runtime.once('reloadComplete', resolve),
);
const proxy = await getPlatformProxy({
  configPath: config,
  envFiles: [syntheticEnv],
  persist: { path: state },
});
try {
  const db = proxy.env.DB;
  for (const file of readdirSync(resolve(root, 'drizzle')).filter((f) => f.endsWith('.sql')).sort())
    for (const sql of readFileSync(resolve(root, 'drizzle', file), 'utf8').split('--> statement-breakpoint').filter((s) => s.trim()))
      await db.prepare(sql).run();
  await db
    .prepare('INSERT INTO playtest_sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(
      id,
      'Scheduler Test',
      crypto.randomUUID(),
      'test-only',
      1,
      '192.0.2.1',
      Date.now() - 1000,
      Date.now() - 1,
    )
    .run();
  await db
    .prepare('INSERT INTO playtest_events VALUES (?, ?, ?, ?, ?, ?)')
    .bind(eventId, id, 'visit', '{}', Date.now(), Date.now())
    .run();
  worker = await runtime.startWorker({
    config,
    envFiles: [syntheticEnv],
    sendMetrics: false,
    dev: {
      remote: false,
      persist: isolated,
      watch: false,
      logLevel: 'error',
      server: { hostname: '127.0.0.1', port: 3001 },
    },
  });
  // Call the compiled Worker's scheduled handler directly. With no_bundle,
  // Wrangler's HTTP test endpoint targets its proxy, not the application.
  const ready = await reload;
  const user = ready.proxyData.userWorkerUrl;
  const endpoint = `${user.protocol}//${user.hostname}:${user.port}/cdn-cgi/handler/scheduled?cron=17+3+*+*+*`;
  const result = await fetch(endpoint, {
    headers: {
      ...ready.proxyData.headers,
      'MF-Route-Override': worker.config.name,
    },
  });
  assert.equal(result.status, 200);
  assert.equal(await result.text(), 'ok');
  assert.equal(
    await db
      .prepare('SELECT id FROM playtest_sessions WHERE id = ?')
      .bind(id)
      .first(),
    null,
  );
  assert.equal(
    await db
      .prepare('SELECT id FROM playtest_events WHERE id = ?')
      .bind(eventId)
      .first(),
    null,
  );
  console.log(
    'PASS: compiled production scheduled handler deletes synthetic records in an isolated local D1, never the preview database.',
  );
} finally {
  await proxy.env.DB.prepare('DELETE FROM playtest_sessions WHERE id = ?')
    .bind(id)
    .run();
  await worker?.dispose();
  await runtime.teardown();
  await proxy.dispose();
}
