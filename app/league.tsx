'use client';
import './league.css';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowRight, Shuffle, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClubKitPicker } from '@/app/club-kit-picker';
import { CompetitionBack } from '@/app/competition-back';
import { CompetitionSession } from '@/app/competition-session';
import { LeagueRecap } from '@/app/league-recap';
import { MatchDay } from '@/app/match-day';
import { HomeTeamContext } from '@/app/home-team';
import { KitSwatch, TeamName, FixtureTeams } from '@/app/team-kit';
import { ResultFeeling } from '@/app/match-reward';
import { KIT_PRESETS, getTeam, makeCustomTeam } from '@/lib/teams';
import { newCupSeed } from '@/lib/tournament-progress';
import {
  activeLeagueGame,
  DEFAULT_LEAGUE_NAME,
  validLeagueName,
  advanceLeagueBye,
  createLeague,
  finishLeagueGame,
  leagueHeadline,
  leagueIsOurs,
  leagueOpponent,
  leagueTable,
  LEAGUE_KEY,
  LEAGUE_MATCH_KEY,
  LEAGUE_NAMES,
  parseLeague,
  serializeLeague,
  type League,
  type LeagueConfig,
} from '@/lib/league';
import { leagueFixture } from '@/lib/league-matches';
import {
  LEAGUE_DIFFICULTIES,
  type LeagueDifficulty,
} from '@/lib/league-difficulty';
import {
  parseLeagueMatch,
  serializeLeagueMatch,
} from '@/lib/league-match-progress';
import type { MatchRun } from '@/lib/match-day';
import type { TournamentGame } from '@/lib/tournament';

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
const top = () => window.scrollTo({ top: 0, behavior: 'instant' });

function LeagueSetup({
  onStart,
  onCancel,
}: {
  onStart: (config: LeagueConfig) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(DEFAULT_LEAGUE_NAME),
    [size, setSize] = useState(6),
    [legs, setLegs] = useState<1 | 2>(1),
    [difficulty, setDifficulty] = useState<LeagueDifficulty>('intermediate'),
    [kitId, setKit] = useState(KIT_PRESETS[0].id);
  const valid = validLeagueName(name.trim());
  return (
    <section className="my-setup" aria-labelledby="league-setup-title">
      <h1 id="league-setup-title">Build your season.</h1>
      <label className="my-field">
        <span>Club name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          autoComplete="off"
          aria-invalid={!valid}
          aria-describedby="league-name-help"
        />
      </label>
      <p className="my-help" id="league-name-help">
        {valid
          ? ''
          : 'Use 2–24 letters or numbers and a name not already taken by a rival.'}{' '}
        <button
          className="my-link"
          type="button"
          onClick={() =>
            setName(
              LEAGUE_NAMES[Math.floor(Math.random() * LEAGUE_NAMES.length)],
            )
          }
        >
          <Shuffle aria-hidden="true" /> Suggest one
        </button>
      </p>
      <ClubKitPicker name={valid ? name.trim() : 'Your Club'} kitId={kitId} onChange={setKit} group="league-kit" />
      <label className="my-field">
        <span>Teams, including yours</span>
        <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
          {Array.from({ length: 9 }, (_, i) => i + 4).map((n) => (
            <option key={n} value={n}>
              {n} teams · {n - 1} rivals
            </option>
          ))}
        </select>
      </label>
      <fieldset className="my-difficulty compact-options">
        <legend>Difficulty</legend>
        {LEAGUE_DIFFICULTIES.map((d) => (
          <label
            key={d.id}
            className={difficulty === d.id ? 'is-selected' : ''}
          >
            <input
              type="radio"
              name="league-difficulty"
              value={d.id}
              checked={difficulty === d.id}
              onChange={() => setDifficulty(d.id)}
            />
            <strong>{d.name}</strong>
          </label>
        ))}
      </fieldset>
      <fieldset className="my-difficulty league-legs compact-options">
        <legend>Meet each rival</legend>
        {([1, 2] as const).map((n) => (
          <label key={n} className={legs === n ? 'is-selected' : ''}>
            <input
              type="radio"
              name="league-legs"
              checked={legs === n}
              onChange={() => setLegs(n)}
            />
            <strong>{n === 1 ? 'Once' : 'Home and away'}</strong>
          </label>
        ))}
      </fieldset>
      <div className="my-preview club-summary" aria-live="polite">
        <KitSwatch
          team={makeCustomTeam(valid ? name.trim() : 'Your Club', kitId)}
        />
        <div>
          <strong>{valid ? name.trim() : 'Your Club'}</strong>
          <p>{size} teams · {legs === 1 ? 'Once' : 'Home & away'} · {LEAGUE_DIFFICULTIES.find((d) => d.id === difficulty)?.name}</p>
          <small>{(size - 1) * legs} matches for your club</small>
        </div>
      </div>
      <div className="my-setup-actions">
        <Button
          disabled={!valid}
          className="cup-kickoff"
          onClick={() =>
            onStart({ name: name.trim(), kitId, size, legs, difficulty })
          }
        >
          Start My League <ArrowRight />
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Keep my current season
          </Button>
        )}
      </div>
    </section>
  );
}
function Form({ row }: { row: ReturnType<typeof leagueTable>[number] }) {
  return (
    <span
      className="cup-form league-form"
      aria-label={`${row.team}: last five results, oldest to newest`}
    >
      {row.form.slice(-5).map((f, i) => (
        <span
          key={i}
          className={`form-${f.result}`}
          title={`${f.result === 'W' ? 'Win' : f.result === 'D' ? 'Draw' : 'Loss'} ${f.score}`}
        >
          {f.result}
        </span>
      ))}
      {!row.form.length && (
        <span className="form-empty" aria-label="No games played">
          —
        </span>
      )}
    </span>
  );
}
function Standings({ league }: { league: League }) {
  return (
    <section
      className="cup-groups league-standings"
      aria-labelledby="league-table-title"
    >
      <h2 id="league-table-title">League table</h2>
      <div className="cup-table-scroll">
        <table>
          <caption>
            {league.config.size} clubs · last five results: W win, D draw, L
            loss
          </caption>
          <thead>
            <tr>
              <th scope="col">Club</th>
              <th scope="col">
                <abbr title="Played">P</abbr>
              </th>
              <th scope="col">
                <abbr title="Goal difference">GD</abbr>
              </th>
              <th scope="col">
                <abbr title="Points">Pts</abbr>
              </th>
              <th scope="col">Last 5</th>
            </tr>
          </thead>
          <tbody>
            {leagueTable(league).map((r, i) => (
              <tr
                key={r.team}
                className={r.team === league.config.name ? 'is-us' : ''}
              >
                <th scope="row">
                  <span className="league-rank">{i + 1}</span>
                  <TeamName name={r.team} short />
                  {r.team === league.config.name && (
                    <span className="league-you">You</span>
                  )}
                </th>
                <td>{r.played}</td>
                <td>
                  {r.gf - r.ga > 0 ? '+' : ''}
                  {r.gf - r.ga}
                </td>
                <td>
                  <strong>{r.points}</strong>
                </td>
                <td>
                  <Form row={r} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="league-rules">
        <summary>Table rules</summary>
        <p>
          3 points for a win, 1 for a draw. Ties: goal difference, then goals
          scored, then the draw order set at the start of this season. League
          draws stand — no penalties.
        </p>
      </details>
    </section>
  );
}
function Fixtures({
  games,
  league,
}: {
  games: TournamentGame[];
  league: League;
}) {
  return (
    <ul className="cup-results league-results">
      {games.map((g) => (
        <li key={g.id} className={leagueIsOurs(league, g) ? 'our-fixture' : ''}>
          <TeamName name={g.home} short />
          <strong>
            {g.homeGoals === undefined ? 'vs' : `${g.homeGoals}–${g.awayGoals}`}
          </strong>
          <TeamName name={g.away} short />
        </li>
      ))}
    </ul>
  );
}
export function LeagueGame(props: { onCompetitions: () => void }) {
  return <CompetitionSession storageKey={LEAGUE_KEY} onBack={props.onCompetitions}><LeagueSeason {...props} /></CompetitionSession>;
}
function LeagueSeason({
  onCompetitions,
}: {
  onCompetitions: () => void;
}) {
  const [league, setLeague] = useState<League | null>(() =>
    parseLeague(read(LEAGUE_KEY)),
  );
  const [view, setView] = useState<'overview' | 'match' | 'report' | 'setup'>(
    'overview',
  );
  const [saveError, setSaveError] = useState(false);
  const [fullOverview, setFullOverview] = useState(false);
  const [report, setReport] = useState<{
    before: League;
    after: League;
  } | null>(null);
  const finished = useRef<League | null>(null);
  const game = league ? activeLeagueGame(league) : undefined;
  const fixture = useMemo(
    () => (league && game ? leagueFixture(league) : undefined),
    [league, game],
  );
  const home = useMemo(
    () =>
      league ? makeCustomTeam(league.config.name, league.config.kitId) : null,
    [league],
  );
  const persist = useCallback((key: string, value: string | null) => {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      setSaveError(true);
    }
  }, []);
  const saveProgress = useCallback(
    (run: MatchRun) => {
      if (!league || !game || finished.current || run.status === 'final')
        return;
      persist(
        LEAGUE_MATCH_KEY,
        serializeLeagueMatch(league.seed, game.id, run),
      );
    },
    [league, game, persist],
  );
  function showOverview() {
    if (finished.current && league) {
      const after = finished.current;
      setReport({ before: league, after });
      setLeague(after);
      finished.current = null;
      setView('report');
    } else setView('overview');
    top();
  }
  function kickOff() {
    finished.current = null;
    setView('match');
    top();
  }
  function continueSeason(after: League) {
    finished.current = null;
    setReport(null);
    setLeague(after);
    setFullOverview(false);
    if (!activeLeagueGame(after) && after.status === 'playing') {
      const next = advanceLeagueBye(after);
      persist(LEAGUE_KEY, serializeLeague(next));
      setLeague(next);
      setReport({ before: after, after: next });
      setView('report');
    } else setView(after.status === 'playing' ? 'match' : 'overview');
    top();
  }
  function openFullLeague(after: League) {
    finished.current = null;
    setLeague(after);
    setReport(null);
    setFullOverview(true);
    setView('overview');
    top();
  }
  function newSeason(config: LeagueConfig) {
    const next = createLeague(newCupSeed(), config);
    persist(LEAGUE_KEY, serializeLeague(next));
    persist(LEAGUE_MATCH_KEY, null);
    setLeague(next);
    setReport(null);
    finished.current = null;
    setView('overview');
    top();
  }
  const saveNotice = saveError && (
    <p className="league-save-warning" role="alert">
      Saving is unavailable in this browser. You can play, but leaving or
      reloading may lose this season.
    </p>
  );
  if (!league || !home || view === 'setup')
    return (
      <section className="tournament-wrap mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <CompetitionBack onBack={onCompetitions} />
        {saveNotice}
        <LeagueSetup
          onStart={newSeason}
          onCancel={league ? () => setView('overview') : undefined}
        />
      </section>
    );
  if (view === 'match' && game && fixture)
    return (
      <HomeTeamContext.Provider value={home}>
        {saveNotice}
        <MatchDay
          key={`${league.seed}/${game.id}`}
          fixture={fixture}
          tournamentMode
          competitionRoute="#league"
          ourSide={game.home === home.name ? 'home' : 'away'}
          initialRun={parseLeagueMatch(
            read(LEAGUE_MATCH_KEY),
            league.seed,
            game.id,
            fixture.moments,
          )}
          onProgress={saveProgress}
          onExit={showOverview}
          onChooseMatch={showOverview}
          competitionSummary={(us, them) => {
            const after = finished.current ?? finishLeagueGame(league, game.id, us, them);
            return <LeagueRecap before={league} after={after}
              onNext={() => { if (finished.current) continueSeason(finished.current); }}
              onOverview={() => { if (finished.current) openFullLeague(finished.current); }}
            />;
          }}
          fullTimeCopy={(us, them) => ({
            title:
              us > them
                ? 'Three points in the bag.'
                : us === them
                  ? 'A point apiece.'
                  : 'A setback, not the season.',
            detail:
              us > them
                ? 'A league is built on afternoons like this.'
                : us === them
                  ? 'The draw stands. On to the next matchweek.'
                  : 'The chase continues. Make the next match count.',
          })}
          onComplete={(_id, us, them) => {
            if (finished.current) return;
            const next = finishLeagueGame(league, game.id, us, them);
            finished.current = next;
            persist(LEAGUE_KEY, serializeLeague(next));
            persist(LEAGUE_MATCH_KEY, null);
          }}
        />
      </HomeTeamContext.Provider>
    );
  const table = leagueTable(league),
    us = table.find((r) => r.team === home.name)!,
    position = table.indexOf(us) + 1;
  const seasonFinished = league.status === 'finished';
  return (
    <HomeTeamContext.Provider value={home}>
      <section className="tournament-wrap league-wrap mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <CompetitionBack onBack={onCompetitions} />
        {saveNotice}
        <div className="cup-title my-title">
          <KitSwatch team={home} />
          <div>
            <p className="eyebrow">
              My League · {league.config.size} clubs
            </p>
            <h1>{home.name}</h1>
          </div>
        </div>
        {view === 'report' && report && <section className="league-round-report">
          <p className="eyebrow">Matchweek {report.before.round + 1} · results are in</p>
          <LeagueRecap before={report.before} after={report.after}
            onNext={() => continueSeason(report.after)} onOverview={() => openFullLeague(report.after)} />
          <details className="competition-details"><summary>All matchweek results</summary>
            <Fixtures games={league.rounds[report.before.round]} league={league} />
          </details>
        </section>}
        {view !== 'report' && (
          <>
            {seasonFinished ? (
              <div className="cup-hero">
                <ResultFeeling
                  won={position === 1}
                  title={
                    position === 1
                      ? `${home.name} are league champions!`
                      : 'The final table is in.'
                  }
                  detail={
                    position === 1
                      ? `${us.won} wins, ${us.points} points. A season to remember.`
                      : `${position}${position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'} place. ${table[0].team} lift the trophy.`
                  }
                >
                <Button
                  className="cup-kickoff"
                  onClick={() => setView('setup')}
                >
                  Play a new season <Trophy />
                </Button>
                </ResultFeeling>
                <div className="league-season-stats">
                  <span>
                    <strong>{us.won}</strong>Wins
                  </span>
                  <span>
                    <strong>{us.drawn}</strong>Draws
                  </span>
                  <span>
                    <strong>{us.gf}</strong>Goals scored
                  </span>
                </div>

              </div>
            ) : game ? (
              <section className="cup-next" aria-labelledby="league-next-title">
                <p className="eyebrow">
                  Matchweek {league.round + 1} of {league.rounds.length}
                </p>
                <h2 id="league-next-title" className="fixture-matchup">
                  <FixtureTeams opponent={getTeam(leagueOpponent(league, game))} ourSide={game.home === home.name ? 'home' : 'away'} />
                </h2>
                {us.played > 0 && <p className="cup-talk">{leagueHeadline(league)}</p>}
                <Button className="cup-kickoff" onClick={kickOff}>
                  {parseLeagueMatch(
                    read(LEAGUE_MATCH_KEY),
                    league.seed,
                    game.id,
                    fixture!.moments,
                  )
                    ? 'Continue match'
                    : 'Kick off'}{' '}
                  <ArrowRight />
                </Button>
              </section>
            ) : (
              <section className="cup-next">
                <p className="eyebrow">Matchweek {league.round + 1}</p>
                <h2>A breather this week.</h2>
                <p>
                  The other clubs play. Our next fixture follows this rest
                  round.
                </p>
                <Button
                  className="cup-kickoff"
                  onClick={() => {
                    const next = advanceLeagueBye(league);
                    persist(LEAGUE_KEY, serializeLeague(next));
                    setReport({ before: league, after: next });
                    setLeague(next);
                    setView('report');
                    top();
                  }}
                >
                  See this week’s results <ArrowRight />
                </Button>
              </section>
            )}
          </>
        )}
        {view !== 'report' && <>
        <label className="league-progress">
          <span>
            {us.played} of {(league.config.size - 1) * league.config.legs}{' '}
            matches played
          </span>
          <progress
            aria-label="Season progress"
            value={us.played}
            max={(league.config.size - 1) * league.config.legs}
          />
        </label>
        <Standings league={league} />
        <details className="league-calendar" open={fullOverview}>
          <summary>Fixtures &amp; results</summary>
          {league.rounds.map((games, i) => (
            <section key={i}>
              <h3>
                Matchweek {i + 1}
                {games.some((g) => leagueIsOurs(league, g))
                  ? ''
                  : ' · Our rest week'}
              </h3>
              <Fixtures games={games} league={league} />
            </section>
          ))}
        </details>
        </>}
        {!seasonFinished && view !== 'report' && (
          <Button
            variant="outline"
            onClick={() => {
              if (
                window.confirm(
                  'Replace this season? Your current league will be lost.',
                )
              )
                setView('setup');
            }}
          >
            Start a new season
          </Button>
        )}
      </section>
    </HomeTeamContext.Provider>
  );
}
