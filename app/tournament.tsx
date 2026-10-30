'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlaytest } from '@/app/playtest-provider';
import { MatchDay } from '@/app/match-day';
import { CompetitionBack } from '@/app/competition-back';
import { CompetitionSession } from '@/app/competition-session';
import { CompetitionBracket } from '@/app/competition-bracket';
import { PenaltyShootout } from '@/app/penalty-shootout';
import { ResultFeeling } from '@/app/match-reward';
import { RoundReportScreen } from '@/app/round-report';
import { buildRoundReport } from '@/lib/round-report';
import { gameForDisplay, ourSideForRound } from '@/lib/fixture-order';
import { CupCelebration } from '@/app/cup-celebration';
import { KnockoutResults } from '@/app/knockout-results';
import { ourFixtureHistory } from '@/lib/competition-history';
import { cupFullTime, cupReadsSummary, cupShootout, recordCupReads } from '@/lib/cup-copy';
import { cupFixture } from '@/lib/tournament-stories';
import { TeamName, FixtureTeams } from '@/app/team-kit';
import { getTeam, HOME_TEAM } from '@/lib/teams';
import {
  OUR_TEAM,
  ROUND_NAMES,
  createTournament,
  currentTournamentGame,
  finishTournamentGame,
  groupTable,
  type TournamentGame,
  type TournamentRun,
} from '@/lib/tournament';
import {
  CUP_STORAGE_KEY,
  HONOURS_STORAGE_KEY,
  STAGE_NAMES,
  cupStage,
  emptyHonours,
  parseHonours,
  recordCup,
  type CupHonours,
  groupStakes,
  newCupSeed,
  parseSavedCup,
  serializeCup,
  teamForm,
} from '@/lib/tournament-progress';
import { confirmLeave } from '@/lib/navigation-guard';
import { useCupLeaveGuard } from '@/app/use-cup-leave-guard';

function loadCup(): TournamentRun {
  try {
    const saved = parseSavedCup(localStorage.getItem(CUP_STORAGE_KEY));
    if (saved) return saved;
  } catch {
    // Storage can be unavailable; the cup still plays for this visit.
  }
  return createTournament(newCupSeed());
}
function saveCup(run: TournamentRun) {
  try {
    localStorage.setItem(CUP_STORAGE_KEY, serializeCup(run));
  } catch {
    // Saving is a convenience; play continues without it.
  }
}
const READS_KEY = 'pitchwise-cup-reads-v1';
function readStored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function cupPath(run: TournamentRun) {
  return run.games.flatMap((round, i) =>
    round
      .filter((g) => (g.home === OUR_TEAM || g.away === OUR_TEAM) && g.homeGoals !== undefined)
      .map((g) => {
        const home = g.home === OUR_TEAM;
        return {
          round: ROUND_NAMES[i],
          opponent: home ? g.away : g.home,
          us: home ? g.homeGoals! : g.awayGoals!,
          them: home ? g.awayGoals! : g.homeGoals!,
          penalties: g.penalties ? ((home ? g.penalties : [g.penalties[1], g.penalties[0]]) as [number, number]) : undefined,
        };
      }),
  );
}
function loadHonours(): CupHonours {
  try {
    return parseHonours(localStorage.getItem(HONOURS_STORAGE_KEY));
  } catch {
    return emptyHonours();
  }
}

function ResultLine({ game: original, round }: { game: TournamentGame; round: number }) {
  const game = gameForDisplay(original, OUR_TEAM, round);
  return (
    <li
      className={
        game.home === OUR_TEAM || game.away === OUR_TEAM ? 'our-fixture' : ''
      }
    >
      <TeamName name={game.home} />
      <strong>
        {game.homeGoals === undefined
          ? 'vs'
          : `${game.homeGoals}–${game.awayGoals}`}
      </strong>
      <TeamName name={game.away} />
      {game.penalties && <small>Penalties {game.penalties.join('–')}</small>}
    </li>
  );
}
type MatchScore = { home: number; away: number };
export function Tournament(props: { onTournaments: () => void }) {
  return <CompetitionSession storageKey={CUP_STORAGE_KEY} onBack={props.onTournaments}><ReadersCup {...props} /></CompetitionSession>;
}
function ReadersCup({
  onTournaments,
}: {
  onTournaments: () => void;
}) {
  const [run, setRunState] = useState(loadCup);
  // Every completed fixture is written straight away, so leaving or refreshing keeps the cup.
  const setRun = (next: TournamentRun) => {
    setRunState(next);
    saveCup(next);
  };
  useEffect(() => saveCup(run), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [honours, setHonours] = useState(loadHonours);
  const [newBest, setNewBest] = useState(false);
  const { track } = usePlaytest();
  const trackedStart = useRef(false);
  useEffect(() => {
    if (!trackedStart.current) {
      trackedStart.current = true;
      track({ type: 'activity_start', activity: 'tournament' });
    }
  }, [track]);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<MatchScore | null>(null);
  const resultRef = useRef<MatchScore | null>(null);
  const penaltiesRef = useRef<[number, number] | null>(null);
  const [shootout, setShootout] = useState(false);
  const [report, setReport] = useState<{ before: TournamentRun; after: TournamentRun; round: number } | null>(null);
  const [group, setGroup] = useState(0);
  const fixtureHeading = useRef<HTMLHeadingElement>(null);
  const [fullOverview, setFullOverview] = useState(false);
  const game = currentTournamentGame(run);
  const opponent = game ? (game.home === OUR_TEAM ? game.away : game.home) : '';
  const fixture = cupFixture(run.round, opponent);
  const knockoutDraw = (score: MatchScore) => run.round >= 3 && score.home === score.away && !penaltiesRef.current;
  useEffect(() => {
    if (!playing && !shootout) {
      fixtureHeading.current?.focus({ preventScroll: true });
    }
  }, [game?.id, playing, shootout]);
  function projected(penalties?: [number, number], final = result) {
    return game && final
      ? finishTournamentGame(run, game.id, final.home, final.away, penalties)
      : null;
  }
  function saveCompletedCup(next: TournamentRun) {
    saveCup(next);
    if (next.status !== 'playing') {
      const updated = recordCup(honours, next);
      setNewBest(updated.best > honours.best && honours.cups > 0);
      setHonours(updated);
      try {
        localStorage.setItem(HONOURS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Honours are optional.
      }
      const matchesPlayed = next.games.filter((round) =>
        round.some(
          (g) =>
            (g.home === OUR_TEAM || g.away === OUR_TEAM) &&
            g.homeGoals !== undefined,
        ),
      ).length;
      const stage = (
        [
          'group',
          'group',
          'group',
          'round16',
          'quarterfinal',
          'semifinal',
          'final',
        ] as const
      )[matchesPlayed - 1];
      track({
        type: 'tournament_complete',
        result: next.status === 'champion' ? 'champion' : 'eliminated',
        stage,
        matchesPlayed,
      });
    }
  }
  function completeResult(penalties = penaltiesRef.current ?? undefined, destination: 'report' | 'next' | 'overview' = 'report') {
    const next = projected(penalties, resultRef.current);
    if (!next) return;
    // Clear synchronously: double taps cannot submit this result twice.
    resultRef.current = null;
    penaltiesRef.current = null;
    setResult(null);
    setRun(next);

    setPlaying(destination === 'next' && next.status === 'playing');
    setReport(destination === 'report' ? { before: run, after: next, round: run.round } : null);
    setFullOverview(destination === 'overview');
    setShootout(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function leaveMatch() {
    if (resultRef.current) {
      completeResult();
      return;
    }
    if (
      window.confirm(
        'Leave this match? Its decisions will reset. Completed cup results are saved.',
      )
    ) {
      setPlaying(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
  // Global navigation asks before discarding a match in progress. A finished match is
  // recorded on the way out instead, so a result is never lost to a stray tap.
  useCupLeaveGuard({
    active: playing || shootout,
    canSaveResult: () => Boolean(resultRef.current && !knockoutDraw(resultRef.current)),
    saveResult: completeResult,
    message: 'Leave this match? Its decisions will reset. Completed cup results are saved.',
  });
  function leaveCup(action: () => void) {
    if (confirmLeave()) action();
  }
  if (playing && game) {
    return (
      <MatchDay
        key={game.id}
        fixture={fixture}
        ourSide={ourSideForRound(run.round)}
        tournamentMode
        onExit={leaveMatch}
        onChooseMatch={leaveMatch}
        competitionSummary={(home, away) => {
          if (run.round >= 3 && home === away) return null;
          const after = finishTournamentGame(run, game.id, home, away);
          return <RoundReportScreen embedded
            report={buildRoundReport({ before: run, after, round: run.round, us: OUR_TEAM, table: groupTable, roundNames: ROUND_NAMES })}
            club={HOME_TEAM.name}
            onNext={() => completeResult(undefined, 'next')}
            onOverview={() => completeResult(undefined, 'overview')}
          />;
        }}
        fullTimeCopy={(home, away) => {
          if (run.round >= 3 && home === away) return undefined;
          const next = finishTournamentGame(run, game.id, home, away);
          return cupFullTime('readers', run.round, home, away, opponent, next.status);
        }}
        onComplete={(_id, home, away, accuracy, standout, stats) => {
          if (resultRef.current) return;
          try {
            localStorage.setItem(READS_KEY, JSON.stringify(recordCupReads(readStored(READS_KEY), run.seed, game.id, accuracy, standout, stats)));
          } catch {
            /* Optional summary data. */
          }
          resultRef.current = { home, away };
          setResult({ home, away });
          if (run.round >= 3 && home === away) {
            setPlaying(false);
            setShootout(true);
            window.scrollTo({ top: 0, behavior: 'instant' });
          } else {
            const finished = finishTournamentGame(run, game.id, home, away);
            saveCompletedCup(finished);
          }
        }}
      />
    );
  }
  if (shootout && game && result)
    return (
      <section className="tournament-wrap mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <PenaltyShootout
            ourSide={ourSideForRound(run.round)}
          key={game.id}
          gameId={game.id}
          seed={run.seed}
          opponent={opponent}
          fullTime={`${result.home}–${result.away}`}
          canContinue={() => false}
          resultCopy={(won) => cupShootout('readers', run.round, won)}
          onResolved={(penalties) => {
            if (penaltiesRef.current) return;
            penaltiesRef.current = penalties;
            const finished = projected(penalties, resultRef.current);
            if (!finished) return;
            saveCompletedCup(finished);
          }}
          onFinish={(score) => completeResult(score)}
        />
      </section>
    );
  if (report)
    return (
      <section className="tournament-wrap mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <RoundReportScreen
          report={buildRoundReport({ ...report, us: OUR_TEAM, table: groupTable, roundNames: ROUND_NAMES })}
          club={HOME_TEAM.name}
          onNext={() => {
            setReport(null);
            setPlaying(true);
          }}
          onOverview={() => { setReport(null); setFullOverview(true); window.scrollTo({ top: 0, behavior: 'instant' }); }}
        />
      </section>
    );
  const ourFixtures = ourFixtureHistory(run.games, OUR_TEAM);
  return (
    <section className="tournament-wrap mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <CompetitionBack onBack={() => leaveCup(onTournaments)} />
      {run.status === 'playing' ? (
        <div className="cup-title">
          <Trophy aria-hidden="true" />
          <div>
            <h1>The Readers’ Cup</h1>
            {honours.cups > 0 && (
              <p className="cup-honours">
                Cups played {honours.cups} · Titles {honours.titles} · Best run:{' '}
                {STAGE_NAMES[honours.best] ?? '—'}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="cup-hero">
          <ResultFeeling
            won={run.status === 'champion'}
            title={
              run.status === 'champion'
                ? 'You won the cup.'
                : 'Your cup run ends here.'
            }
            detail={
              run.status === 'champion'
                ? 'Seven matches. One team. Champions.'
                : `${run.champion} lift the trophy. ${cupStage(run) < 3 ? 'Our run ended in the group stage.' : `We reached the ${STAGE_NAMES[cupStage(run)].toLowerCase()}.`}`
            }
          >
            <Button className="cup-kickoff" onClick={() => {
              setRun(createTournament(newCupSeed()));
              track({ type: 'activity_start', activity: 'tournament' });
              setResult(null);
              resultRef.current = null;
              setShootout(false);
              setPlaying(false);
              setGroup(0);
              setNewBest(false);
              setReport(null);
              setFullOverview(false);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}>Play a new cup <ArrowRight /></Button>
          </ResultFeeling>
          {newBest && <p className="cup-new-best">New best cup run!</p>}
          <CupCelebration
            champion={run.status === 'champion'}
            club={HOME_TEAM.name}
            path={cupPath(run)}
            reads={cupReadsSummary(readStored(READS_KEY), run.seed)}
          />
          {honours.cups > 0 && (
            <p className="cup-honours">
              Cups played {honours.cups} · Titles {honours.titles} · Best run: {STAGE_NAMES[honours.best] ?? '—'}
            </p>
          )}
        </div>
      )}
      {game && (
        <section className="cup-next" aria-labelledby="fixture-heading">
          <p className="eyebrow">{ROUND_NAMES[run.round]}</p>
          <h2 id="fixture-heading" className="fixture-matchup" ref={fixtureHeading} tabIndex={-1}>
            <FixtureTeams opponent={getTeam(opponent)} ourSide={ourSideForRound(run.round)} />
          </h2>
          {(groupStakes(run) || run.round >= 3) && <p className="cup-stakes">{groupStakes(run) || 'Win to stay in the cup.'}</p>}
          <p className="cup-opponent">
            {teamForm(run, opponent).length > 0 && (
              <span className="cup-form" aria-label={`${opponent} form`}>
                {teamForm(run, opponent).map((f, i) => (
                  <span key={i} className={`form-${f.result}`} title={`${f.score}${f.penalties ? ' (pens)' : ''}`}>
                    {f.result}
                  </span>
                ))}
              </span>
            )}
          </p>
          <Button
            className="cup-kickoff"
            onClick={() => {
              setPlaying(true);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          >
            Kick off <ArrowRight />
          </Button>
        </section>
      )}
      <KnockoutResults games={run.games} club={OUR_TEAM} roundNames={ROUND_NAMES} />
      <details className="cup-fixtures competition-details" id="cup-fixtures" open={fullOverview}>
        <summary>Our fixtures &amp; results</summary>
        <ul className="cup-results">
          {ourFixtures.map(({ game: g, round }) => (
            <ResultLine key={g.id} game={g} round={round} />
          ))}
        </ul>
      </details>
      <details className="competition-details" open={fullOverview || run.round < 3} key={run.round < 3 ? 'groups' : 'knockouts'}>
      <summary>Group stage</summary>
      <section className="cup-groups" id="cup-groups">
        <h2>Group stage</h2>
        <label htmlFor="cup-group">Group</label>
        <select
          id="cup-group"
          value={group}
          onChange={(event) => setGroup(Number(event.target.value))}
        >
          {run.groups.map((_, i) => (
            <option key={i} value={i}>
              {String.fromCharCode(65 + i)}
              {i === 0 ? ` · ${HOME_TEAM.shortName}` : ''}
            </option>
          ))}
        </select>
        <div className="cup-table-scroll">
          <table>
            <caption>
              Group {String.fromCharCode(65 + group)} · top two qualify
            </caption>
            <thead>
              <tr>
                <th scope="col">Team</th>
                <th scope="col">
                  <abbr title="Played">P</abbr>
                </th>
                <th scope="col">
                  <abbr title="Goal difference">GD</abbr>
                </th>
                <th scope="col">
                  <abbr title="Goals scored">GF</abbr>
                </th>
                <th scope="col">
                  <abbr title="Points">Pts</abbr>
                </th>
              </tr>
            </thead>
            <tbody>
              {groupTable(run, group).map((row, index) => (
                <tr
                  key={row.team}
                  className={row.team === OUR_TEAM ? 'is-us' : ''}
                >
                  <th scope="row">
                    {index + 1}. <TeamName name={row.team} />
                    {index < 2 && row.played === 3 ? ' ✓' : ''}
                  </th>
                  <td>{row.played}</td>
                  <td>{row.gf - row.ga}</td>
                  <td>{row.gf}</td>
                  <td>
                    <strong>{row.points}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details>
          <summary>
            Group {String.fromCharCode(65 + group)} results & rules
          </summary>
          <p className="cup-rules">
            Win 3 points · draw 1. Ties: goal difference, goals scored, then a
            seeded draw.
          </p>
          {run.games.slice(0, 3).map((round, i) => ({ round, i })).reverse().map(({ round, i }) => (
            <div key={i}>
              <h3>Round {i + 1}</h3>
              <ul className="cup-results">
                {round
                  .filter((g) => run.groups[group].includes(g.home))
                  .map((g) => (
                    <ResultLine key={g.id} game={g} round={i} />
                  ))}
              </ul>
            </div>
          ))}
        </details>
      </section>
      </details>
      <details className="competition-details" open={fullOverview || run.status !== 'playing'}>
        <summary>Full knockout bracket</summary>
        <CompetitionBracket run={run} />
      </details>
      <p className="cup-rules">
        Your cup is saved on this device after every match. A match in progress
        restarts if you leave it.
      </p>
      {run.status === 'playing' && <Button
        variant="outline"
        onClick={() => {
          if (window.confirm('Start a new cup and clear these results?')) {
            setRun(createTournament(newCupSeed()));
            track({ type: 'activity_start', activity: 'tournament' });
            setResult(null);
            resultRef.current = null;
            setShootout(false);
            setPlaying(false);
            setGroup(0);
            setNewBest(false);
            setReport(null);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }
        }}
      >
        Start a new cup
      </Button>}
    </section>
  );
}
