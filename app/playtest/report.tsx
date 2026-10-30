'use client';
// Sign-out is owned by Sites and must bypass framework prefetch/navigation.
/* oxlint-disable next/no-html-link-for-pages */
import { useCallback, useEffect, useState } from 'react';
import type { PlaytestEvent } from '@/lib/playtest-events';
type Session = {
  id: string;
  alias: string;
  ip_address: string | null;
  ip_consent: number;
  created_at: number;
  expires_at: number;
  active_ms?: number;
  choices?: number;
  completions?: number;
};
type Report = {
  sessions: Session[];
  totals: { sessions: number };
  retentionDays: number;
};
type Detail = {
  session: Session;
  events: (PlaytestEvent & {
    receivedAt: number;
    description: { activity: string; prompt: string; choice: string } | null;
  })[];
};
const date = (time: number) => new Date(time).toLocaleString();
export function PlaytestReport() {
  const [report, setReport] = useState<Report | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const load = useCallback(async (id?: string) => {
    try {
      const response = await fetch(
        `/api/playtest/reports${id ? `?session=${encodeURIComponent(id)}` : ''}`,
        { cache: 'no-store' },
      );
      const data = (await response.json()) as Report &
        Detail & { error?: string };
      if (!response.ok) throw new Error(data.error);
      if (id) setDetail(data);
      else {
        setReport(data);
        setDetail(null);
      }
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Report unavailable.');
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);
  async function removeSession() {
    if (
      !detail ||
      !window.confirm(
        `Delete ${detail.session.alias}’s playtest and its events?`,
      )
    )
      return;
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/playtest/reports?session=${encodeURIComponent(detail.session.id)}`,
        { method: 'DELETE' },
      );
      if (!response.ok) throw new Error('Deletion could not be confirmed.');
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Deletion unavailable.',
      );
    } finally {
      setDeleting(false);
    }
  }
  return (
    <>
      <p className="eyebrow">Creator only · optional playtest</p>
      <h1>What your friends explored.</h1>
      <p>
        Sessions, not unique people. Aliases and IPs do not verify identity.
        Only opted-in actions are included; a session can begin partway through
        a game. Results are playtest telemetry, not verified competition scores.
      </p>
      <div className="playtest-actions">
        <button type="button" onClick={() => load()}>
          Refresh sessions
        </button>
        <a href="/signout-with-chatgpt?return_to=%2Fplaytest" target="_top">
          Sign out
        </a>
      </div>
      {error && <p role="alert">{error}</p>}
      {report && (
        <>
          <p>
            <strong>{report.totals.sessions}</strong> retained sessions · latest{' '}
            {report.sessions.length} shown · {report.retentionDays}-day
            retention
          </p>
          <div className="playtest-session-list">
            {report.sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => load(session.id)}
              >
                <strong>{session.alias}</strong>
                <span>{date(session.created_at)}</span>
                <span>
                  {Math.round((session.active_ms ?? 0) / 60_000)} min active ·{' '}
                  {session.choices ?? 0} choices · {session.completions ?? 0}{' '}
                  finishes
                </span>
                <small>
                  {session.ip_address
                    ? `IP: ${session.ip_address}`
                    : session.ip_consent
                      ? 'IP requested, unavailable'
                      : 'IP not shared'}
                </small>
              </button>
            ))}
          </div>
          {!report.sessions.length && (
            <p>
              No shared sessions yet. Playing without sharing is not counted.
            </p>
          )}
        </>
      )}
      {detail && (
        <section className="playtest-detail">
          <h2>{detail.session.alias} · the journey</h2>
          <p>
            Reference: <code>{detail.session.id}</code>
          </p>
          <p>
            {detail.session.ip_address
              ? `IP: ${detail.session.ip_address}`
              : 'No IP stored.'}{' '}
            · expires {date(detail.session.expires_at)}
          </p>
          <button type="button" disabled={deleting} onClick={removeSession}>
            {deleting ? 'Deleting…' : 'Delete this session & its events'}
          </button>
          <ol>
            {detail.events.map((event) => (
              <li key={event.eventId}>
                <small>{date(event.receivedAt)}</small>
                {event.description ? (
                  <>
                    <strong>{event.description.activity}</strong>
                    <p>{event.description.prompt}</p>
                    <p>Chose: {event.description.choice}</p>
                    <span
                      className={`playtest-verdict ${event.type === 'course_answer' ? (event.correct ? 'positive' : 'negative') : event.type === 'match_decision' ? event.verdict : ''}`}
                    >
                      {event.type === 'course_answer'
                        ? event.correct
                          ? 'Best read'
                          : 'Alternative read'
                        : event.type === 'match_decision'
                          ? event.verdict === 'positive'
                            ? 'Advantage found'
                            : event.verdict === 'neutral'
                              ? 'Play balanced'
                              : 'Danger increased'
                          : ''}
                    </span>
                  </>
                ) : (
                  <p>
                    {event.type === 'visit'
                      ? 'Agreed to share this playtest'
                      : event.type === 'activity_start'
                        ? `Started ${event.activity}${'courseId' in event ? ` · ${event.courseId}` : 'fixtureId' in event ? ` · ${event.fixtureId}` : ''}`
                        : event.type === 'course_complete'
                          ? `Lesson finished · ${event.correct}/${event.total}`
                          : event.type === 'match_complete'
                            ? `Match finished · ${event.fixtureId} · ${event.homeGoals}–${event.awayGoals}`
                            : event.type === 'tournament_complete'
                              ? `Cup finished · ${event.result} · ${event.stage}`
                              : `Active time · ${Math.round((event.activeMs ?? 0) / 1_000)} seconds`}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
