import type { PlaytestEvent, PlaytestPayload } from '../lib/playtest-events.ts';
import { MAX_BATCH_EVENTS } from '../lib/playtest-policy.ts';
import {
  cleanLabel,
  cleanLanguage,
  deviceClass,
} from '../lib/visitor-policy.ts';

// Optional visitor sharing. The visitor ID and the
// personal-link name persist in this browser; the session ID lives only in this tab.
const VISITOR_KEY = 'pitchwise-visitor-id';
const LABEL_KEY = 'pitchwise-visitor-label';
export const VISITOR_SHARING_KEY = 'pitchwise-visitor-sharing';
export const visitorSharingPreference = () =>
  read(VISITOR_SHARING_KEY) !== 'off';
export const saveVisitorSharingPreference = (enabled: boolean) =>
  write(VISITOR_SHARING_KEY, enabled ? 'on' : 'off');

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Storage can be unavailable; this visit is still tracked. */
  }
}

export function createVisitorTracker() {
  let started = false;
  let sending = false;
  let activeMs = 0;
  let generation = 0;
  let controller: AbortController | null = null;
  let queue: PlaytestEvent[] = [];
  let context: {
    sessionId: string;
    visitorId: string;
    label: string | null;
    device: string;
    language: string | null;
    referrer: string | null;
  } | null = null;

  async function flush(keepalive = false) {
    if (!started || !context || sending || !queue.length) return;
    sending = true;
    const currentGeneration = generation;
    const abort = new AbortController();
    controller = abort;
    const batch = queue.slice(0, MAX_BATCH_EVENTS);
    let progressed = false;
    try {
      const response = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...context, events: batch }),
        keepalive,
        signal: abort.signal,
      });
      if (currentGeneration !== generation) return;
      // Drop rejected batches rather than retrying them forever; keep transient failures.
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        const sent = new Set(batch.map((event) => event.eventId));
        queue = queue.filter((event) => !sent.has(event.eventId));
        progressed = true;
      }
      if (response.status === 503) {
        const data = (await response.json().catch(() => null)) as {
          code?: string;
        } | null;
        if (currentGeneration !== generation) return;
        if (data?.code === 'TRACKING_DISABLED') stop();
      }
    } catch {
      /* Offline play continues; the bounded queue retries later. */
    } finally {
      if (currentGeneration === generation) {
        sending = false;
        controller = null;
        // Drain only after progress. Transient errors wait for a later trigger.
        if (progressed && queue.length && started)
          queueMicrotask(() => void flush());
      }
    }
  }

  function track(payload: PlaytestPayload) {
    if (!started || !context) return;
    if (queue.length >= 200) {
      // A full queue still needs the heartbeat/interaction retry trigger.
      void flush();
      return;
    }
    queue.push({
      ...payload,
      schemaVersion: 1,
      eventId: crypto.randomUUID(),
      sessionId: context.sessionId,
      occurredAt: Date.now(),
      activeMs: Math.round(Math.min(activeMs, 86_400_000)),
    } as PlaytestEvent);
    void flush();
  }

  function start() {
    if (started || !visitorSharingPreference()) return;
    generation++;
    activeMs = 0;
    const params = new URLSearchParams(location.search);
    const fromLink = cleanLabel(params.get('from'));
    let referrer: string | null = null;
    try {
      const host = document.referrer ? new URL(document.referrer).hostname : '';
      referrer = host && host !== location.hostname ? host : null;
    } catch {
      referrer = null;
    }
    const saved = read(VISITOR_KEY);
    const visitorId =
      saved && /^[0-9a-f-]{36}$/i.test(saved) ? saved : crypto.randomUUID();
    write(VISITOR_KEY, visitorId);
    // A newer personal link renames the visitor; otherwise keep the remembered name.
    if (fromLink) write(LABEL_KEY, fromLink);
    context = {
      sessionId: crypto.randomUUID(),
      visitorId,
      label: fromLink ?? cleanLabel(read(LABEL_KEY)),
      device: deviceClass(innerWidth),
      language: cleanLanguage(navigator.language),
      referrer,
    };
    started = true;
    track({
      type: 'visit',
      entrySource:
        fromLink || params.get('via') === 'friend' ? 'shared_link' : 'direct',
    });
  }

  function stop() {
    generation++;
    started = false;
    controller?.abort();
    controller = null;
    sending = false;
    queue = [];
    context = null;
    activeMs = 0;
  }

  return {
    start,
    stop,
    track,
    flush,
    addActive(ms: number) {
      if (started) activeMs += ms;
    },
    get started() {
      return started;
    },
  };
}
