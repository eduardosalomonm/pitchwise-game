'use client';
import { useCallback, useEffect, useState } from 'react';
import type { PlaytestEvent } from '@/lib/playtest-events';
import type { VisitorSessionRow, VisitorSummary } from '@/lib/visitor-report';

type Report = VisitorSummary & {
  enabled: boolean;
  days: number;
  truncated?: boolean;
  error?: string;
};
type Journey = {
  truncated?: boolean;
  sessions: VisitorSessionRow[];
  events: (PlaytestEvent & {
    sessionId: string;
    receivedAt: number;
    description: { activity: string; prompt: string; choice: string } | null;
  })[];
};
const when = (time: number) => new Date(time).toLocaleString();
const name = (v: { label: string | null; visitorId: string }) =>
  v.label ?? `Visitor ${v.visitorId.slice(0, 4)}`;
const pct = (part: number, whole: number) =>
  whole ? `${Math.round((part / whole) * 100)}%` : '—';

function eventText(event: Journey['events'][number]) {
  switch (event.type) {
    case 'guide_skip':
      return 'Skipped the introductory friendly';
    case 'visit':
      return event.entrySource === 'shared_link'
        ? 'Opened a shared link'
        : 'Opened the game';
    case 'activity_start':
      return event.activity === 'course'
        ? `Started training: ${event.courseId}`
        : event.activity === 'match'
          ? `Started match: ${event.fixtureId}`
          : event.activity === 'my_tournament'
            ? 'Opened My Tournament'
            : 'Opened the tournament';
    case 'course_complete':
      return `Finished training ${event.courseId}: ${event.correct}/${event.total}`;
    case 'match_complete':
      return `Full time ${event.fixtureId}: ${event.homeGoals}–${event.awayGoals} (${event.goodDecisions}/${event.decisions} good reads)`;
    case 'tournament_complete':
      return `${event.competition === 'my' ? 'My Tournament' : 'Readers’ Cup'}: ${event.result === 'champion' ? 'won it' : `out in the ${event.stage}`}`;
    case 'course_answer':
    case 'match_decision':
      return event.description
        ? `${event.description.activity} · ${event.description.prompt} → ${event.description.choice}`
        : event.type;
    default:
      return null;
  }
}

export function VisitorReport() {
  const [report, setReport] = useState<Report | null>(null);
  const [journey, setJourney] = useState<{
    title: string;
    visitorId: string;
    data: Journey;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [journeyError, setJourneyError] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/visits/report', { cache: 'no-store' });
      const data = (await response.json()) as Report;
      if (!response.ok) throw new Error(data.error);
      setReport(data);
      setError('');
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : 'Visitor report unavailable.',
      );
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function open(visitor: VisitorSummary['visitors'][number]) {
    try {
      const response = await fetch(
        `/api/visits/report?visitor=${encodeURIComponent(visitor.visitorId)}`,
        { cache: 'no-store' },
      );
      if (!response.ok) throw new Error();
      setJourney({
        title: name(visitor),
        visitorId: visitor.visitorId,
        data: (await response.json()) as Journey,
      });
      setJourneyError('');
    } catch {
      setJourneyError('Could not open this journey. Please retry.');
    }
  }
  async function remove() {
    if (
      !journey ||
      deleting ||
      !window.confirm(
        `Delete all stored visits and choices for ${journey.title}? This cannot be undone.`,
      )
    )
      return;
    setDeleting(true);
    setJourneyError('');
    try {
      const response = await fetch(
        `/api/visits/report?visitor=${encodeURIComponent(journey.visitorId)}`,
        { method: 'DELETE' },
      );
      if (!response.ok) throw new Error();
      setJourney(null);
      await load();
    } catch {
      setJourneyError('Deletion was not confirmed. Please retry.');
    } finally {
      setDeleting(false);
    }
  }

  if (error)
    return (
      <section className="visitor-report">
        <h2>Visitors</h2>
        <p role="alert">{error}</p>
      </section>
    );
  if (!report)
    return (
      <section className="visitor-report">
        <h2>Visitors</h2>
        <p>Loading…</p>
      </section>
    );
  const { totals, funnel } = report;
  const peak = Math.max(1, ...report.daily.map((d) => d.sessions));
  return (
    <section className="visitor-report" aria-labelledby="visitor-heading">
      <p className="eyebrow">Creator only · visits shared with you</p>
      <h2 id="visitor-heading">Who played and what they did</h2>
      {!report.enabled && (
        <p className="visitor-note">
          Visitor tracking is switched off (VISITOR_TRACKING_ENABLED). Showing
          stored data only.
        </p>
      )}
      <p className="visitor-note">
        Last {report.days} days. Send each friend a personal link such as{' '}
        <code>?from=Juan</code> to see their name here.
      </p>
      {report.truncated && <output className="visitor-note">Showing the most recent activity only. This report reached its display limit, so counts and rates are partial.</output>}
      <div className="visitor-kpis">
        <div>
          <strong>{totals.visitors}</strong>
          <span>visitors</span>
        </div>
        <div>
          <strong>{totals.returning}</strong>
          <span>came back</span>
        </div>
        <div>
          <strong>{totals.sessions}</strong>
          <span>visits</span>
        </div>
        <div>
          <strong>{pct(totals.played, totals.sessions)}</strong>
          <span>played something</span>
        </div>
        <div>
          <strong>{totals.medianActiveMinutes}</strong>
          <span>median active min</span>
        </div>
      </div>

      <div className="visitor-grid">
        <div>
          <h3>Where from</h3>
          <ol className="visitor-bars">
            {report.places.map((p) => (
              <li key={p.name}>
                <span>{p.name}</span>
                <b>{p.visitors}</b>
              </li>
            ))}
          </ol>
          <p className="visitor-note">
            Devices: {report.devices.mobile} mobile · {report.devices.tablet}{' '}
            tablet · {report.devices.desktop} desktop visits
          </p>
        </div>
        <div>
          <h3>Last 14 days</h3>
          <div className="visitor-daily" aria-label="Visits per day">
            {report.daily.map((d) => (
              <span
                key={d.day}
                title={`${d.day}: ${d.sessions}`}
                style={{ height: `${Math.max(4, (d.sessions / peak) * 100)}%` }}
              />
            ))}
          </div>
        </div>
        <div>
          <h3>What they start and finish</h3>
          <ul className="visitor-funnel">
            <li>First friendly: {funnel.friendly} started · {funnel.friendlyFinished} finished · {funnel.friendlySkipped} skipped</li>
            <li>
              Training: {funnel.training} started · {funnel.trainingCompleted}{' '}
              finished a course
            </li>
            <li>
              Match Day: {funnel.match} started · {funnel.matchCompleted}{' '}
              finished a match
            </li>
            <li>My League: {funnel.league} started · {funnel.leagueMatches} finished a match</li>
            <li>
              Tournament: {funnel.tournament} opened ·{' '}
              {funnel.tournamentFinished} finished a cup ·{' '}
              {report.tournament.champions} champions
            </li>
            <li>
              My Tournament: {funnel.myTournament} opened ·{' '}
              {funnel.myTournamentMatches} played a match ·{' '}
              {funnel.myTournamentFinished} finished
            </li>
          </ul>
          <h3>Cup drop-off</h3>
          <ol className="visitor-bars">
            {report.tournament.reachedRound.map((n, round) => (
              <li key={round}>
                <span>Completed match {round + 1}</span>
                <b>{n}</b>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {report.hardestDecisions.length > 0 && (
        <>
          <h3>Hardest match decisions</h3>
          <table className="visitor-table">
            <thead>
              <tr>
                <th scope="col">Decision</th>
                <th scope="col">Tries</th>
                <th scope="col">Best choice</th>
              </tr>
            </thead>
            <tbody>
              {report.hardestDecisions.map((d, i) => (
                <tr key={i}>
                  <td>
                    {d.activity} · {d.prompt}
                  </td>
                  <td>{d.attempts}</td>
                  <td>{d.goodRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h3>Visitors</h3>
      {report.visitors.length < totals.visitors && <p className="visitor-note">Showing the {report.visitors.length} most recent visitors of {totals.visitors}.</p>}
      <div className="visitor-table-scroll">
        <table className="visitor-table">
          <thead>
            <tr>
              <th scope="col">Who</th>
              <th scope="col">Where</th>
              <th scope="col">Device</th>
              <th scope="col">Visits</th>
              <th scope="col">Active</th>
              <th scope="col">Reads</th>
              <th scope="col">Cup</th>
              <th scope="col">Last seen</th>
              <th scope="col">
                <span className="sr-only">Journey</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {report.visitors.map((v) => (
              <tr key={v.visitorId}>
                <th scope="row">
                  {name(v)}
                  {v.referrer ? <small> via {v.referrer}</small> : null}
                </th>
                <td>{v.place}</td>
                <td>
                  {v.device}
                  {v.language ? ` · ${v.language}` : ''}
                </td>
                <td>{v.sessions}</td>
                <td>{v.activeMinutes} min</td>
                <td>
                  {v.goodRate === null ? '—' : `${v.goodRate}% of ${v.choices}`}
                </td>
                <td>{v.cup ?? '—'}</td>
                <td>{when(v.lastSeen)}</td>
                <td>
                  <button type="button" onClick={() => void open(v)}>
                    Journey
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {journeyError && <p role="alert">{journeyError}</p>}
      {journey && (
        <section
          className="visitor-journey"
          aria-label={`${journey.title} journey`}
        >
          <h3>{journey.title} · journey</h3>
          {journey.data.truncated && <output className="visitor-note">Showing the most recent 3,000 events. Earlier activity is not included here.</output>}
          <p className="visitor-note">
            {journey.data.sessions.length} visits from{' '}
            {journey.data.sessions
              .map(
                (s) =>
                  [s.city, s.country].filter(Boolean).join(', ') || 'unknown',
              )
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(' / ')}
          </p>
          <ol>
            {journey.data.events.map((event) => {
              const text = eventText(event);
              return text ? (
                <li
                  key={event.eventId}
                  className={
                    event.type === 'match_decision'
                      ? `is-${event.verdict}`
                      : event.type === 'course_answer'
                        ? event.correct
                          ? 'is-positive'
                          : 'is-negative'
                        : ''
                  }
                >
                  <time>{when(event.receivedAt)}</time> {text}
                </li>
              ) : null;
            })}
          </ol>
          <button
            type="button"
            disabled={deleting}
            onClick={() => setJourney(null)}
          >
            Close journey
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void remove()}
          >
            {deleting ? 'Deleting…' : 'Delete this visitor’s visits'}
          </button>
        </section>
      )}
    </section>
  );
}
