'use client';
import { useId, useState, type CSSProperties } from 'react';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CupReadingSummary } from '@/lib/cup-copy';
import { inFixtureOrder, ourSideForRound } from '@/lib/fixture-order';

export type CupPathEntry = {
  round: string;
  opponent: string;
  us: number;
  them: number;
  penalties?: [number, number];
};

// The end-of-cup moment: confetti for champions, and the road we took either way.
export function CupCelebration({
  champion,
  club,
  path,
  reads,
}: {
  champion: boolean;
  club: string;
  path: CupPathEntry[];
  reads: CupReadingSummary | null;
}) {
  const [showStats, setShowStats] = useState(false);
  const detailsId = useId();
  const scored = path.reduce((n, p) => n + p.us, 0);
  const conceded = path.reduce((n, p) => n + p.them, 0);
  return (
    <section
      className={`cup-celebration ${champion ? 'is-champion' : ''}`}
      aria-label={champion ? `${club} won the cup` : 'Our cup run'}
    >
      {champion && (
        <div className="cup-confetti" aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => (
            <i
              key={i}
              style={
                {
                  '--x': `${(i * 37) % 100}%`,
                  '--d': `${(i % 7) * 120}ms`,
                  '--r': `${i * 53}deg`,
                  '--c': ['#e86a32', '#f2c94c', '#2f7d4f', '#fff4e6'][i % 4],
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
      {champion && <Trophy className="cup-trophy" aria-hidden="true" />}
      <h3>{champion ? 'The road to the trophy' : 'Our cup run'}</h3>
      <ol className="cup-path">
        {path.map((p, index) => ({ p, index })).reverse().map(({ p, index }) => {
          const side = ourSideForRound(index);
          const [left, right] = inFixtureOrder(club, p.opponent, side);
          const [leftScore, rightScore] = inFixtureOrder(p.us, p.them, side);
          const penalties = p.penalties ? inFixtureOrder(...p.penalties, side) : undefined;
          return (
          <li
            key={p.round}
            aria-label={`${p.round}: ${left} ${leftScore}–${rightScore} ${right}${penalties ? `, penalties ${penalties.join('–')}` : ''}`}
            className={
              p.penalties
                ? p.penalties[0] > p.penalties[1]
                  ? 'is-win'
                  : 'is-loss'
                : p.us > p.them
                  ? 'is-win'
                  : p.us === p.them
                    ? 'is-draw'
                    : 'is-loss'
            }
          >
            <span>{p.round}<small className="cup-path-venue">{side === 'home' ? 'Home' : 'Away'}</small></span>
            <strong>
              {leftScore}–{rightScore}
              {penalties ? (
                <small>
                  {' '}
                  ({penalties[0]}–{penalties[1]} pens)
                </small>
              ) : null}
            </strong>
            <span>{p.opponent}</span>
          </li>
          );
        })}
      </ol>
      <dl className="cup-totals">
        <div>
          <dt>Goals</dt>
          <dd>
            {scored}–{conceded}
          </dd>
        </div>
        {reads && (
          <div>
            <dt>Average good reads</dt>
            <dd>{reads.accuracy}%</dd>
          </div>
        )}
        {reads?.player && reads.awards > 0 && (
          <div className="cup-player">
            <dt>Player of the tournament</dt>
            <dd>Our {reads.player.toLowerCase()}</dd>
          </div>
        )}
      </dl>
      <Button variant="outline" className="cup-stats-toggle" aria-expanded={showStats} aria-controls={detailsId} onClick={() => setShowStats((v) => !v)}>
        {showStats ? 'Hide statistics' : 'Tournament statistics'}
      </Button>
      {showStats && (
        <div className="cup-stat-details" id={detailsId}>
          <h4>Your tournament in numbers</h4>
          <dl>
            <div><dt>Matches</dt><dd>{path.length}</dd></div>
            <div><dt>Goals scored</dt><dd>{scored}</dd></div>
            <div><dt>Goals conceded</dt><dd>{conceded}</dd></div>
            <div><dt>Clean sheets</dt><dd>{path.filter((p) => p.them === 0).length}</dd></div>
            <div><dt>Wins / draws / losses</dt><dd>{path.filter((p) => p.us > p.them).length} / {path.filter((p) => p.us === p.them).length} / {path.filter((p) => p.us < p.them).length}</dd></div>
          </dl>
          <p className="cup-stat-note">Match records use the score before penalties.</p>
          {reads?.details ? (
            <>
              <h4>Reading the play</h4>
              <p className="cup-stat-note">Detailed reads cover {reads.details.matches} of {path.length} matches. Defensive reads include recovery after a turnover.</p>
              <dl>
                <div><dt>Attacking good reads</dt><dd>{reads.details.stats.attacking.correct} / {reads.details.stats.attacking.total}</dd></div>
                <div><dt>Defending good reads</dt><dd>{reads.details.stats.defending.correct} / {reads.details.stats.defending.total}</dd></div>
                <div><dt>Good / neutral / risky decisions</dt><dd>{reads.details.stats.decisions.positive} / {reads.details.stats.decisions.neutral} / {reads.details.stats.decisions.negative}</dd></div>
                <div><dt>Bookings</dt><dd>{reads.details.stats.bookings}</dd></div>
              </dl>
              <h4>How plays ended</h4>
              <dl>
                <div><dt>Positive outcomes</dt><dd>{reads.details.stats.plays.positive}</dd></div>
                <div><dt>Neutral outcomes</dt><dd>{reads.details.stats.plays.neutral}</dd></div>
                <div><dt>Negative outcomes</dt><dd>{reads.details.stats.plays.negative}</dd></div>
              </dl>
            </>
          ) : <p className="cup-stat-note">Detailed reads will be recorded in your next matches. Older scores are kept.</p>}
        </div>
      )}
    </section>
  );
}
