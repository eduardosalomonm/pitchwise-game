import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  activityChunkMatcher,
  isolateGameTelemetry,
  previewOrigin,
  runBrowserTasks,
} from '../scripts/browser-test-support.mjs';

test('lazy failures target both development modules and compiled activity chunks', () => {
  const origin = 'http://localhost:3000';
  for (const activity of [
    'match-day-loader',
    'tournament',
    'my-tournament',
    'league',
  ]) {
    const match = activityChunkMatcher(origin, activity);
    for (const path of [
      `/app/${activity}.tsx?v=1`,
      `/_next/static/chunks/${activity}-C0v-66R9.js`,
      `/assets/${activity}.js?v=1`,
    ])
      assert.equal(match(new URL(path, origin)), true, path);
    assert.equal(
      match(new URL(`/app/${activity}.tsx`, 'https://other.example')),
      false,
    );
    assert.equal(match(new URL('/assets/page-123.js', origin)), false);
  }
  assert.equal(
    activityChunkMatcher(
      origin,
      'tournament',
    )(new URL('/app/my-tournament.tsx', origin)),
    false,
  );
  assert.throws(
    () => activityChunkMatcher(origin, 'page'),
    /Unknown lazy activity/,
  );
});

test('data-writing browser tests reject remote targets before browser launch or credential reads', () => {
  for (const url of [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://[::1]:3000',
  ])
    assert.equal(previewOrigin(url, { localOnly: true }), url);
  for (const url of [
    'https://example.com',
    'https://localhost.example.com',
    'http://127.0.0.1.example.com',
    'file:///tmp/test',
    'http://user:password@localhost:3000',
    'http://localhost:3000/path',
  ])
    assert.throws(() => previewOrigin(url, { localOnly: true }));
  assert.equal(previewOrigin('https://example.com'), 'https://example.com');
});

test('gameplay telemetry isolation also blocks queried visitor URLs and aborts unexpected writes', async () => {
  const routes = [];
  await isolateGameTelemetry({
    route: async (pattern, handler) => routes.push({ pattern, handler }),
  });
  const visitors = routes.find(({ pattern }) => pattern instanceof RegExp);
  for (const url of [
    'http://localhost:3000/api/visits',
    'https://example.com/api/visits?retry=1',
  ])
    assert.ok(visitors.pattern.test(url));
  assert.equal(
    visitors.pattern.test('https://example.com/api/visits/report'),
    false,
  );
  let response,
    aborted = false;
  await visitors.handler({
    fulfill: async (value) => {
      response = value;
    },
  });
  assert.deepEqual(response.json, { accepted: 0 });
  const playtest = routes.find(({ pattern }) => typeof pattern === 'string');
  await playtest.handler({
    request: () => ({ method: () => 'GET' }),
    fulfill: async (value) => {
      response = value;
    },
  });
  assert.equal(response.json.enabled, false);
  assert.equal(response.json.visitorTracking, false);
  await assert.rejects(
    playtest.handler({
      request: () => ({ method: () => 'POST' }),
      abort: async () => {
        aborted = true;
      },
    }),
    /Unexpected playtest mutation/,
  );
  assert.equal(aborted, true, 'abort before reporting a forbidden write');
});

test('browser task pool keeps order, bounds concurrency and rejects invalid limits', async () => {
  let active = 0,
    peak = 0;
  const gates = [];
  const pending = runBrowserTasks(
    [1, 2, 3, 4],
    async (id) => {
      peak = Math.max(peak, ++active);
      await new Promise((resolve) => gates.push(resolve));
      active--;
      return id * 2;
    },
    2,
  );
  assert.equal(gates.length, 2);
  gates.shift()();
  gates.shift()();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(gates.length, 2);
  gates.shift()();
  gates.shift()();
  assert.deepEqual(await pending, [2, 4, 6, 8]);
  assert.equal(peak, 2);
  for (const jobs of [0, -1, 1.5, NaN])
    await assert.rejects(
      runBrowserTasks([], () => {}, jobs),
      /positive integer/,
    );
  assert.deepEqual(await runBrowserTasks([], () => {}), []);
});
