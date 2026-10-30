'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { PlaytestEvent, PlaytestPayload } from '@/lib/playtest-events';
import {
  CONSENT_VERSION,
  MAX_BATCH_EVENTS,
  validAlias,
} from '@/lib/playtest-policy';
import Link from 'next/link';
import {
  createVisitorTracker,
  saveVisitorSharingPreference,
  visitorSharingPreference,
  VISITOR_SHARING_KEY,
} from '@/app/visitor-tracker';

type Session = {
  sessionId: string;
  token: string;
  alias: string;
  ipStored: boolean;
};
type Config = {
  enabled: boolean;
  visitorTracking?: boolean;
  contact: string;
  retentionDays: number;
};
type Context = {
  config: Config | null;
  session: Session | null;
  busy: boolean;
  error: string;
  pending: number;
  begin: (alias: string, shareIp: boolean) => Promise<void>;
  stopAndDelete: () => Promise<void>;
  track: (payload: PlaytestPayload) => void;
};
const PlaytestContext = createContext<Context | null>(null);
export function usePlaytest() {
  const context = useContext(PlaytestContext);
  if (!context) throw new Error('Playtest provider missing.');
  return context;
}

export function PlaytestProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(0);
  const [visitorSharing, setVisitorSharing] = useState(true);
  const sessionRef = useRef<Session | null>(null);
  const queue = useRef<PlaytestEvent[]>([]);
  const sending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const activeMs = useRef(0);
  const lastInteraction = useRef(0);
  const epoch = useRef(0);
  const startLock = useRef(false);
  // Visitor sharing has its own persistent opt-out, separate from the optional alias/IP test.
  const visitors = useRef<ReturnType<typeof createVisitorTracker> | null>(null);
  const configReady = useRef(false);
  const earlyEvents = useRef<PlaytestPayload[]>([]);
  const flushRef = useRef<(keepalive?: boolean) => Promise<void>>(
    async () => {},
  );

  const flush = useCallback(async (keepalive = true): Promise<void> => {
    const current = sessionRef.current;
    if (!current || sending.current || !queue.current.length) return;
    sending.current = true;
    const generation = epoch.current;
    const batch = queue.current.slice(0, MAX_BATCH_EVENTS);
    const abort = new AbortController();
    controller.current = abort;
    let sent = false;
    try {
      const response = await fetch('/api/playtest/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${current.token}`,
        },
        body: JSON.stringify({ events: batch }),
        signal: abort.signal,
        keepalive,
      });
      if (epoch.current !== generation) return;
      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          queue.current = []; // Don't loop forever on expired/invalid batches.
          sessionRef.current = null;
          setError(
            'Sharing paused. Stop and delete this session, or continue playing.',
          );
        }
        return; // Transient failure: retry identical event IDs, not new events.
      }
      const ids = new Set(batch.map((event) => event.eventId));
      queue.current = queue.current.filter((event) => !ids.has(event.eventId));
      sent = true;
      setError('');
    } catch {
      /* Offline play is unaffected; a bounded queue retries later. */
    } finally {
      if (epoch.current === generation) {
        sending.current = false;
        setPending(queue.current.length);
        if (sent && queue.current.length)
          queueMicrotask(() => {
            void flushRef.current();
          });
      }
    }
  }, []);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const track = useCallback(
    (payload: PlaytestPayload) => {
      if (!configReady.current && earlyEvents.current.length < 100)
        earlyEvents.current.push(payload);
      visitors.current?.track(payload);
      const current = sessionRef.current;
      if (!current || queue.current.length >= 100) return;
      queue.current.push({
        ...payload,
        schemaVersion: 1,
        eventId: crypto.randomUUID(),
        sessionId: current.sessionId,
        occurredAt: Date.now(),
        activeMs: Math.round(Math.min(activeMs.current, 86_400_000)),
      } as PlaytestEvent);
      setPending(queue.current.length);
      void flush();
    },
    [flush],
  );

  const begin = useCallback(
    async (alias: string, shareIp: boolean) => {
      if (startLock.current || sessionRef.current) return;
      if (!validAlias(alias)) {
        setError('Use a nickname of 1–24 characters, not an email or IP.');
        return;
      }
      startLock.current = true;
      setBusy(true);
      setError('');
      try {
        const response = await fetch('/api/playtest/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alias,
            shareIp,
            consentVersion: CONSENT_VERSION,
          }),
        });
        const data = (await response.json()) as Session & { error?: string };
        if (!response.ok)
          throw new Error(
            data.error ?? 'Sharing is unavailable. You can still play.',
          );
        epoch.current++;
        activeMs.current = 0;
        lastInteraction.current = performance.now();
        sessionRef.current = data;
        setSession(data);
        track({
          type: 'visit',
          entrySource:
            new URLSearchParams(location.search).get('via') === 'friend'
              ? 'shared_link'
              : 'direct',
        });
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Sharing is unavailable. You can still play.',
        );
      } finally {
        startLock.current = false;
        setBusy(false);
      }
    },
    [track],
  );

  const stopAndDelete = useCallback(async () => {
    if (startLock.current) return;
    const current = sessionRef.current ?? session;
    if (!current) return;
    startLock.current = true;
    setBusy(true);
    setError('');
    // Stop first, regardless of deletion/network success. Keep the token only
    // for a deletion retry, never for further recording.
    sessionRef.current = null;
    epoch.current++;
    controller.current?.abort();
    sending.current = false;
    queue.current = [];
    setPending(0);
    try {
      const response = await fetch('/api/playtest/session', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${current.token}` },
      });
      if (!response.ok) throw new Error();
      setSession(null);
    } catch {
      setError(
        'Optional playtest recording stopped, but deletion is not confirmed. Retry below before closing this tab.',
      );
      // The UI retains the deletion capability, with recording still stopped.
    } finally {
      startLock.current = false;
      setBusy(false);
    }
  }, [session]);

  useEffect(() => {
    const abort = new AbortController();
    fetch('/api/playtest/config', { signal: abort.signal })
      .then((response) => response.json())
      .then((data) => {
        if (abort.signal.aborted) return;
        const loaded = data as Config;
        setConfig(loaded);
        setVisitorSharing(visitorSharingPreference());
        if (loaded.visitorTracking) {
          visitors.current ??= createVisitorTracker();
          visitors.current.start();
        }
        configReady.current = true;
        for (const payload of earlyEvents.current) visitors.current?.track(payload);
        earlyEvents.current = [];
      })
      .catch(() => {
        if (!abort.signal.aborted) { configReady.current = true; earlyEvents.current = []; }
      });
    return () => {
      abort.abort();
      visitors.current?.stop();
    };
  }, []);
  const changeVisitorSharing = useCallback((enabled: boolean) => {
    saveVisitorSharingPreference(enabled);
    setVisitorSharing(enabled);
    if (enabled) visitors.current?.start();
    else visitors.current?.stop();
  }, []);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === VISITOR_SHARING_KEY || event.key === null) {
        const enabled = visitorSharingPreference();
        setVisitorSharing(enabled);
        if (enabled) visitors.current?.start();
        else visitors.current?.stop();
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => {
    let previous = performance.now();
    function interacted() {
      lastInteraction.current = performance.now();
    }
    function leaving() {
      track({ type: 'session_activity' });
      void flush(true);
      void visitors.current?.flush(true);
    }
    function visibility() {
      previous = performance.now();
      if (document.hidden) leaving();
    }
    window.addEventListener('pointerdown', interacted, { passive: true });
    window.addEventListener('keydown', interacted);
    window.addEventListener('scroll', interacted, { passive: true });
    window.addEventListener('pagehide', leaving);
    window.addEventListener('online', leaving);
    document.addEventListener('visibilitychange', visibility);
    const ticker = window.setInterval(() => {
      const now = performance.now();
      const active = !document.hidden && now - lastInteraction.current < 60_000;
      if (active) visitors.current?.addActive(Math.min(now - previous, 2_000));
      if (sessionRef.current && active)
        activeMs.current += Math.min(now - previous, 2_000);
      previous = now;
    }, 1_000);
    const heartbeat = window.setInterval(() => {
      track({ type: 'session_activity' });
      void flush();
    }, 30_000);
    return () => {
      clearInterval(ticker);
      clearInterval(heartbeat);
      window.removeEventListener('pointerdown', interacted);
      window.removeEventListener('keydown', interacted);
      window.removeEventListener('scroll', interacted);
      window.removeEventListener('pagehide', leaving);
      window.removeEventListener('online', leaving);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [track, flush]);

  return (
    <PlaytestContext.Provider
      value={{
        config,
        session,
        busy,
        error,
        pending,
        begin,
        stopAndDelete,
        track,
      }}
    >
      {config?.visitorTracking && (
        <aside
          className="visitor-sharing-notice"
          aria-label="Visitor recording"
        >
          <p>
            {visitorSharing
              ? 'Your choices, results and approximate location are shared with the creator for 90 days. No IP address is stored.'
              : 'Visitor recording is off. You can keep playing.'}{' '}
            <Link href="/privacy" prefetch={false}>
              Privacy
            </Link>
          </p>
          <button
            type="button"
            onClick={() => changeVisitorSharing(!visitorSharing)}
          >
            {visitorSharing ? 'Play without recording' : 'Share my visits'}
          </button>
        </aside>
      )}
      {children}
    </PlaytestContext.Provider>
  );
}
