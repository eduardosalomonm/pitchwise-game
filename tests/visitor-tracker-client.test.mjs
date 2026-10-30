import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createVisitorTracker } from '../app/visitor-tracker.ts';

function browser(t, transport) {
  const storage = new Map();
  const globals = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    location: { search: '?from=Tester', hostname: 'localhost' },
    document: { referrer: '' },
    navigator: { language: 'es' },
    innerWidth: 320,
  };
  for (const [key, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, key, original);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  const fetch = t.mock.method(globalThis, 'fetch', transport);
  return { tracker: createVisitorTracker(), fetch, storage };
}

// A bounded microtask drain detects the old retry storm without waiting on timers.
async function settled() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

for (const failure of ['offline', 500, 503]) {
  test(`visitor tracking does not spin after ${failure}; a later flush retries identical events`, async (t) => {
    let online = false;
    const { tracker, fetch } = browser(t, async () => {
      if (!online && failure === 'offline') throw new Error('Offline');
      return new Response('{}', { status: online ? 200 : failure });
    });
    tracker.start();
    await settled();
    const attempts = fetch.mock.callCount();
    // Stop any buggy background loop before asserting, so a red test terminates.
    online = true;
    await settled();
    assert.equal(attempts, 1, 'a failed batch waits for a later trigger');
    // Restart the failure with a new event, then recover through the public flush.
    online = false;
    tracker.track({ type: 'session_activity' });
    await settled();
    const failedBody = fetch.mock.calls.at(-1).arguments[1].body;
    online = true;
    await tracker.flush();
    await settled();
    assert.equal(
      fetch.mock.calls.at(-1).arguments[1].body,
      failedBody,
      'retry preserves IDs and payload',
    );
    const count = fetch.mock.callCount();
    await tracker.flush();
    assert.equal(fetch.mock.callCount(), count, 'accepted events are removed');
  });
}

test('a disabled collector stops recording; a rejected batch is not retried', async (t) => {
  const { tracker, fetch } = browser(
    t,
    async () => new Response('{"code":"TRACKING_DISABLED"}', { status: 503 }),
  );
  tracker.start();
  await settled();
  assert.equal(tracker.started, false);
  tracker.track({ type: 'session_activity' });
  assert.equal(fetch.mock.callCount(), 1);
});

test('a saved opt-out prevents even the first visit request', async (t) => {
  const { tracker, fetch, storage } = browser(
    t,
    async () => new Response('{}'),
  );
  storage.set('pitchwise-visitor-sharing', 'off');
  tracker.start();
  tracker.track({ type: 'session_activity' });
  await settled();
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(tracker.started, false);
});

test('stopping aborts in-flight requests and an old response cannot alter a new session', async (t) => {
  let resolveOld;
  const { tracker, fetch } = browser(t, async () => {
    if (!resolveOld)
      return new Promise((resolve) => {
        resolveOld = resolve;
      });
    return new Response('{}');
  });
  tracker.start();
  const first = fetch.mock.calls[0].arguments[1];
  tracker.track({ type: 'session_activity' });
  tracker.stop();
  assert.equal(first.signal.aborted, true);
  tracker.track({ type: 'session_activity' });
  assert.equal(fetch.mock.callCount(), 1);
  tracker.start();
  await settled();
  const second = JSON.parse(fetch.mock.calls[1].arguments[1].body);
  assert.notEqual(second.sessionId, JSON.parse(first.body).sessionId);
  assert.equal(second.events.length, 1);
  resolveOld(new Response('{"code":"TRACKING_DISABLED"}', { status: 503 }));
  await settled();
  assert.equal(tracker.started, true);
  tracker.track({ type: 'session_activity' });
  await settled();
  assert.equal(fetch.mock.callCount(), 3);
});

test('client errors discard the rejected batch without blocking subsequent events', async (t) => {
  const { tracker, fetch } = browser(
    t,
    async () => new Response('{}', { status: 400 }),
  );
  tracker.start();
  await settled();
  await tracker.flush();
  assert.equal(fetch.mock.callCount(), 1);
  tracker.track({ type: 'session_activity' });
  await settled();
  assert.equal(fetch.mock.callCount(), 2);
});

test('a full offline queue recovers on the next heartbeat and drains bounded batches', async (t) => {
  let online = false;
  const delivered = [];
  const { tracker, fetch } = browser(t, async (_url, options) => {
    if (online) delivered.push(...JSON.parse(options.body).events);
    return new Response('{}', { status: online ? 200 : 500 });
  });
  tracker.start();
  for (let i = 0; i < 250; i++) tracker.track({ type: 'session_activity' });
  await settled();
  const before = fetch.mock.callCount();
  online = true;
  tracker.track({ type: 'session_activity' }); // The provider's heartbeat uses this seam.
  for (let i = 0; i < 50; i++) await Promise.resolve();
  assert.ok(
    fetch.mock.callCount() > before,
    'queue capacity must not disable retry',
  );
  assert.equal(
    delivered.length,
    200,
    'the queue stays bounded and all queued events drain',
  );
  assert.equal(new Set(delivered.map((e) => e.eventId)).size, 200);
  const count = fetch.mock.callCount();
  await tracker.flush();
  assert.equal(fetch.mock.callCount(), count);
});
