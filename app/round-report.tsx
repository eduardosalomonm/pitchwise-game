'use client';
import { useEffect, useRef } from 'react';
import { ArrowRight, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamName } from '@/app/team-kit';
import type { RoundReport } from '@/lib/round-report';
import { inFixtureOrder } from '@/lib/fixture-order';

// Between matches: our result, the group or bracket picture, headlines and what is next.
export function RoundReportScreen({
  report,
  club,
  onNext,
  onOverview,
  embedded = false,
}: {
  report: RoundReport;
  club: string;
  onNext?: () => void;
  onOverview: () => void;
  embedded?: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (embedded) return;
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [embedded]);
  const { result } = report;
  const [left, right] = inFixtureOrder(club, result.opponent, result.ourSide);
  const [leftScore, rightScore] = inFixtureOrder(result.us, result.them, result.ourSide);
  const penalties = result.penalties ? inFixtureOrder(...result.penalties, result.ourSide) : undefined;
  const place = report.group?.rows.findIndex((row) => row.team === club);
  const row = place === undefined ? undefined : report.group?.rows[place];
  return (
    <section className={`round-report competition-recap ${embedded ? 'is-embedded' : ''}`} aria-label="Tournament summary">
      {!embedded && <>
      <p className="eyebrow">
        <Newspaper aria-hidden="true" /> {report.title}
      </p>
      <h1 id="round-report-heading" ref={heading} tabIndex={-1} className={`round-result is-${result.outcome}`}>
        <span>{left}</span>
        <strong>
          {leftScore}–{rightScore}
        </strong>
        <span>{right}</span>
      </h1>
      {result.penalties && (
        <p className="round-pens">
          Penalties {penalties![0]}–{penalties![1]}
        </p>
      )}
      </>}

      {row && <dl className="recap-stats">
        <div><dt>Group position</dt><dd>{place! + 1} / {report.group!.rows.length}</dd></div>
        <div><dt>Points</dt><dd>{row.points}</dd></div>
        <div><dt>Movement</dt><dd>{row.move > 0 ? `↑ ${row.move}` : row.move < 0 ? `↓ ${-row.move}` : '—'}</dd></div>
      </dl>}

      {report.headlines.length > 0 && (
        <div className="recap-status">
          <ul className="round-headlines">
            {report.headlines.slice(0, 1).map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {report.next ? (
        <div className="round-next">
          <h2>Next up · {report.next.round}</h2>
          <p className="round-opponent">
            <TeamName name={report.next.opponent} />
          </p>
        </div>
      ) : report.finished ? (
        <div className="round-next">
          <h2>{report.finished.status === 'champion' ? 'Champions!' : 'Our cup is over'}</h2>
          <p className="round-note">
            {report.finished.status === 'champion' ? 'The trophy is ours.' : 'This run is over. A new cup brings a new draw.'}
          </p>
        </div>
      ) : null}

      <div className="cup-result-actions">
        {onNext && report.next && (
          <Button className="cup-kickoff" onClick={onNext}>
            Play next match <ArrowRight />
          </Button>
        )}
        <Button variant={onNext && report.next ? 'outline' : 'default'} className="cup-kickoff" onClick={onOverview}>
          View full tournament
        </Button>
      </div>
    </section>
  );
}
