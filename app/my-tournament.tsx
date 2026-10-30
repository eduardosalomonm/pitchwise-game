'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlaytest } from '@/app/playtest-provider';
import { MatchDay } from '@/app/match-day';
import { CompetitionBack } from '@/app/competition-back';
import { CompetitionSession } from '@/app/competition-session';
import { ClubKitPicker } from '@/app/club-kit-picker';
import { PenaltyShootout } from '@/app/penalty-shootout';
import { ResultFeeling } from '@/app/match-reward';
import { RoundReportScreen } from '@/app/round-report';
import { buildRoundReport } from '@/lib/round-report';
import { gameForDisplay, ourSideForRound } from '@/lib/fixture-order';
import { CupCelebration } from '@/app/cup-celebration';
import { KnockoutResults } from '@/app/knockout-results';
import { ourFixtureHistory } from '@/lib/competition-history';
import { cupFullTime, cupReadsSummary, cupShootout, recordCupReads } from '@/lib/cup-copy';
import { HomeTeamContext } from '@/app/home-team';
import { KitSwatch, TeamName, FixtureTeams } from '@/app/team-kit';
import { KIT_PRESETS, getTeam, makeCustomTeam, validClubName } from '@/lib/teams';
import { confirmLeave } from '@/lib/navigation-guard';
import { useCupLeaveGuard } from '@/app/use-cup-leave-guard';
import { newCupSeed, teamForm } from '@/lib/tournament-progress';
import type { TournamentGame } from '@/lib/tournament';
import { myCupFixture } from '@/lib/my-tournament-matches';
import {
  MY_CUP_STORAGE_KEY,
  MY_HONOURS_STORAGE_KEY,
  MY_STAGE_NAMES,
  myRoundNames,
  sizeOf,
  type MyLength,
  type MySize,
  createMyCup,
  currentMyGame,
  finishMyGame,
  isOurs,
  myGroupStakes,
  myGroupTable,
  myOpponent,
  myStage,
  parseMyHonours,
  parseSavedMyCup,
  recordMyCup,
  serializeMyCup,
  type MyCup,
  type MyDifficulty,
  type MyHonours,
  difficultyOf,
} from '@/lib/my-tournament';

type Score = { home: number; away: number };
const storage = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Saving is a convenience; play continues without it. */
    }
  },
};
const READS_KEY = 'pitchwise-my-cup-reads-v1';
const NAME_IDEAS = ['Real Barrio', 'Atlético Callejón', 'Sporting Domingo', 'Union Halftime', 'Deportivo Esquina', 'Rovers del Parque'];

function ResultLine({ cup, game: original }: { cup: MyCup; game: TournamentGame }) {
  const round = cup.games.findIndex((r) => r.some((g) => g.id === original.id));
  const game = gameForDisplay(original, cup.team.name, round);
  return (
    <li className={isOurs(cup, game) ? 'our-fixture' : ''}>
      <TeamName name={game.home} />
      <strong>{game.homeGoals === undefined ? 'vs' : `${game.homeGoals}–${game.awayGoals}`}</strong>
      <TeamName name={game.away} />
      {game.penalties && <small>Penalties {game.penalties.join('–')}</small>}
    </li>
  );
}

const DIFFICULTY_OPTIONS: { id: MyDifficulty; name: string; detail: string }[] = [
  { id: 'easy', name: 'Easy', detail: 'Mostly easier plays. A good first tournament.' },
  { id: 'intermediate', name: 'Intermediate', detail: 'A real test, with a tough final.' },
  { id: 'hard', name: 'Hard', detail: 'Mostly hard plays. For sharp readers.' },
];

const LENGTH_OPTIONS: { id: MyLength; name: string; detail: string }[] = [
  { id: 'short', name: 'Short', detail: 'Compact matches, starting with four plays.' },
  { id: 'standard', name: 'Standard', detail: 'Five plays. Room for a match to turn.' },
  { id: 'long', name: 'Long', detail: 'Six plays. More time to shape the result.' },
];
const SIZE_OPTIONS: { id: MySize; name: string; detail: string }[] = [
  { id: 8, name: '8 teams', detail: '2 groups · semi-final · final. 5 matches.' },
  { id: 16, name: '16 teams', detail: '4 groups · quarter-finals to the final. 6 matches.' },
  { id: 32, name: '32 teams', detail: '8 groups · round of 16 to the final. 7 matches.' },
];
type Settings = { difficulty: MyDifficulty; length: MyLength; size: MySize };
const DEFAULT_SETTINGS: Settings = { difficulty: 'intermediate', length: 'standard', size: 16 };

function Choice<T extends string | number>({ legend, name, options, value, onChange }: { legend: string; name: string; options: { id: T; name: string; detail: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <fieldset className={`my-difficulty ${name === 'difficulty' ? 'compact-options' : ''}`}>
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.id} className={option.id === value ? 'is-selected' : ''}>
          <input type="radio" name={name} value={option.id} checked={option.id === value} onChange={() => onChange(option.id)} />
          <strong>{option.name}</strong>
          {name !== 'difficulty' && <span>{option.detail}</span>}
        </label>
      ))}
    </fieldset>
  );
}

function ClubSetup({ onStart, onBack }: { onStart: (name: string, kitId: string, settings: Settings) => void; onBack?: () => void }) {
  const [name, setName] = useState('Pitchwise FC');
  const [advanced, setAdvanced] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [kitId, setKitId] = useState(KIT_PRESETS[0].id);
  const trimmed = name.trim();
  const valid = validClubName(trimmed);
  return (
    <section className="my-setup" aria-labelledby="my-setup-heading">
      <h1 id="my-setup-heading">Create your club.</h1>
      <label className="my-field">
        <span>Club name</span>
        <input
          value={name}
          maxLength={24}
          autoComplete="off"
          placeholder="Real Barrio"
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(trimmed) && !valid}
          aria-describedby="my-name-help"
        />
      </label>
      <p id="my-name-help" className="my-help">
        {!valid ? '2–24 letters or numbers, and not the name of a rival club.' : ''}{' '}
        <button type="button" className="my-link" onClick={() => setName(NAME_IDEAS[Math.floor(Math.random() * NAME_IDEAS.length)])}>
          <Shuffle aria-hidden="true" /> Suggest one
        </button>
      </p>
      <ClubKitPicker name={valid ? trimmed : 'Your Club'} kitId={kitId} onChange={setKitId} group="kit" />
      <label className="my-advanced-toggle" htmlFor="my-tournament-format" aria-label="Change tournament format">
        <input id="my-tournament-format" type="checkbox" checked={advanced} onChange={(event) => setAdvanced(event.target.checked)} />
        <span>
          <strong>Change format</strong>
          <small>
            {advanced
              ? 'Choose difficulty, match length and size.'
              : `${DIFFICULTY_OPTIONS.find((d) => d.id === settings.difficulty)!.name} · ${LENGTH_OPTIONS.find((l) => l.id === settings.length)!.name} matches · ${settings.size} teams`}
          </small>
        </span>
      </label>
      {advanced && (
        <div className="my-advanced">
          <Choice legend="Difficulty" name="difficulty" options={DIFFICULTY_OPTIONS} value={settings.difficulty} onChange={(difficulty) => setSettings((s) => ({ ...s, difficulty }))} />
          <Choice legend="Match length" name="length" options={LENGTH_OPTIONS} value={settings.length} onChange={(length) => setSettings((s) => ({ ...s, length }))} />
          <Choice legend="Tournament size" name="size" options={SIZE_OPTIONS} value={settings.size} onChange={(size) => setSettings((s) => ({ ...s, size }))} />
        </div>
      )}
      <p className="setup-format-summary" aria-live="polite">{settings.size} teams · Groups, then knockouts · Up to {Math.log2(settings.size) + 2} matches</p>
      <div className="my-setup-actions">
        <Button className="cup-kickoff" disabled={!valid} onClick={() => onStart(trimmed, kitId, settings)}>
          Start My Tournament <ArrowRight />
        </Button>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Back to my current tournament
          </Button>
        )}
      </div>
    </section>
  );
}

export function MyTournament({ onTournaments }: { onTournaments: () => void }) {
  return <CompetitionSession storageKey={MY_CUP_STORAGE_KEY} onBack={onTournaments}><CustomCup onTournaments={onTournaments} /></CompetitionSession>;
}
function CustomCup({ onTournaments }: { onTournaments: () => void }) {
  const { track } = usePlaytest();
  const [cup, setCupState] = useState<MyCup | null>(() => parseSavedMyCup(storage.get(MY_CUP_STORAGE_KEY)));
  const [creating, setCreating] = useState(false);
  const [honours, setHonours] = useState<MyHonours>(() => parseMyHonours(storage.get(MY_HONOURS_STORAGE_KEY)));
  const [newBest, setNewBest] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [shootout, setShootout] = useState(false);
  const [report, setReport] = useState<{ before: MyCup; after: MyCup; round: number } | null>(null);
  const [fullOverview, setFullOverview] = useState(false);
  const [result, setResult] = useState<Score | null>(null);
  const resultRef = useRef<Score | null>(null);
  const penaltiesRef = useRef<[number, number] | null>(null);
  const [group, setGroup] = useState(0);
  const tracked = useRef(false);
  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      track({ type: 'activity_start', activity: 'my_tournament' });
    }
  }, [track]);
  const setCup = (next: MyCup) => {
    setCupState(next);
    storage.set(MY_CUP_STORAGE_KEY, serializeMyCup(next));
  };
  const home = useMemo(() => (cup ? makeCustomTeam(cup.team.name, cup.team.kitId) : null), [cup]);
  const game = cup ? currentMyGame(cup) : undefined;
  const opponent = cup && game ? myOpponent(cup, game) : '';
  // Generating a match walks every earlier round's plays; do it once per saved state.
  const fixture = useMemo(() => (cup && currentMyGame(cup) ? myCupFixture(cup, cup.round) : null), [cup]);
  const knockoutDraw = (score: Score) => Boolean(cup && cup.round >= 3 && score.home === score.away && !penaltiesRef.current);

  function projected(penalties?: [number, number], final = result) {
    return cup && game && final ? finishMyGame(cup, game.id, final.home, final.away, penalties) : null;
  }
  function saveCompletedCup(next: MyCup) {
    storage.set(MY_CUP_STORAGE_KEY, serializeMyCup(next));
    if (next.status !== 'playing') {
      const updated = recordMyCup(honours, next);
      setNewBest(updated.best > honours.best && honours.played > 0);
      setHonours(updated);
      storage.set(MY_HONOURS_STORAGE_KEY, JSON.stringify(updated));
      const stage = myStage(next);
      const played = next.games.filter((r) => r.some((g) => isOurs(next, g) && g.homeGoals !== undefined)).length;
      track({
        type: 'tournament_complete',
        competition: 'my',
        result: next.status === 'champion' ? 'champion' : 'eliminated',
        stage: (['group', 'round16', 'quarterfinal', 'semifinal', 'final', 'final'] as const)[stage],
        matchesPlayed: played,
      });
    }
  }
  function completeResult(penalties = penaltiesRef.current ?? undefined, destination: 'report' | 'next' | 'overview' = 'report') {
    const next = projected(penalties, resultRef.current);
    if (!next) return;
    resultRef.current = null;
    penaltiesRef.current = null;
    setResult(null);
    setCup(next);

    setPlaying(destination === 'next' && next.status === 'playing');
    setReport(cup && destination === 'report' ? { before: cup, after: next, round: cup.round } : null);
    setFullOverview(destination === 'overview');
    setShootout(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  useCupLeaveGuard({
    active: playing || shootout,
    canSaveResult: () => Boolean(resultRef.current && !knockoutDraw(resultRef.current)),
    saveResult: completeResult,
    message: 'Leave this match? Its decisions will reset. Completed results are saved.',
  });

  function start(name: string, kitId: string, settings: Settings) {
    setCup(createMyCup(newCupSeed(), { name, kitId, ...settings }));
    setCreating(false);
    setNewBest(false);
    setReport(null);
    setGroup(0);
    track({ type: 'activity_start', activity: 'my_tournament' });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  const nav = <CompetitionBack onBack={() => confirmLeave() && onTournaments()} />;

  if (!cup || creating || !home)
    return (
      <section className="tournament-wrap mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        {nav}
        <ClubSetup onStart={start} onBack={cup && creating ? () => setCreating(false) : undefined} />
      </section>
    );

  if (playing && game && fixture)
    return (
      <HomeTeamContext.Provider value={home}>
        <MatchDay
          key={game.id}
          fixture={fixture}
          ourSide={ourSideForRound(cup.round)}
          tournamentMode
          competitionRoute="#my-tournament"
          onExit={() => confirmLeave() && setPlaying(false)}
          onChooseMatch={() => confirmLeave() && setPlaying(false)}
          competitionSummary={(h, a) => {
            if (cup.round >= 3 && h === a) return null;
            const after = finishMyGame(cup, game.id, h, a);
            return <RoundReportScreen embedded
              report={buildRoundReport({ before: cup, after, round: cup.round, us: home.name, table: myGroupTable, roundNames: myRoundNames(after) })}
              club={home.name}
              onNext={() => completeResult(undefined, 'next')}
              onOverview={() => completeResult(undefined, 'overview')}
            />;
          }}
          fullTimeCopy={(h, a) => (cup.round >= 3 && h === a ? undefined : cupFullTime('my', cup.round, h, a, opponent, finishMyGame(cup, game.id, h, a).status, myRoundNames(cup)))}
          onComplete={(_id, h, a, accuracy, standout, stats) => {
            if (resultRef.current) return;
            storage.set(READS_KEY, JSON.stringify(recordCupReads(storage.get(READS_KEY), cup.seed, game.id, accuracy, standout, stats)));
            resultRef.current = { home: h, away: a };
            setResult({ home: h, away: a });
            if (cup.round >= 3 && h === a) {
              setPlaying(false);
              setShootout(true);
              window.scrollTo({ top: 0, behavior: 'instant' });
            } else {
              // Persist at the final whistle, not only after Continue. Keep the
              // current match on screen until the player opens the round report.
              const finished = finishMyGame(cup, game.id, h, a);
              saveCompletedCup(finished);
            }
          }}
        />
      </HomeTeamContext.Provider>
    );

  if (shootout && game && result)
    return (
      <HomeTeamContext.Provider value={home}>
        <section className="tournament-wrap mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <PenaltyShootout
            ourSide={ourSideForRound(cup.round)}
            key={game.id}
            gameId={game.id}
            seed={cup.seed}
            opponent={opponent}
            fullTime={`${result.home}–${result.away}`}
            canContinue={() => false}
            resultCopy={(won) => cupShootout('my', cup.round, won, myRoundNames(cup))}
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
      </HomeTeamContext.Provider>
    );

  if (report)
    return (
      <HomeTeamContext.Provider value={home}>
        <section className="tournament-wrap mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <RoundReportScreen
            report={buildRoundReport({ ...report, us: home.name, table: myGroupTable, roundNames: myRoundNames(report.after) })}
            club={home.name}
            onNext={() => {
              setReport(null);
              setPlaying(true);
            }}
            onOverview={() => { setReport(null); setFullOverview(true); window.scrollTo({ top: 0, behavior: 'instant' }); }}
          />
        </section>
      </HomeTeamContext.Provider>
    );
  const ours = cup.games.flat().filter((g) => isOurs(cup, g));
  const stakes = myGroupStakes(cup);
  return (
    <HomeTeamContext.Provider value={home}>
      <section className="tournament-wrap mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        {nav}
        <div className="cup-title my-title">
          <KitSwatch team={home} />
          <div>
            <p className="eyebrow">My Tournament · {DIFFICULTY_OPTIONS.find((d) => d.id === difficultyOf(cup))!.name} · {sizeOf(cup)} teams</p>
            <h1>{home.name}</h1>
            {honours.played > 0 && (
              <p className="cup-honours">
                Tournaments {honours.played} · Titles {honours.titles} · Best run: {MY_STAGE_NAMES[honours.best] ?? '—'}
              </p>
            )}
          </div>
        </div>
        {cup.status !== 'playing' && (
          <div className="cup-hero">
            <ResultFeeling
              won={cup.status === 'champion'}
              title={cup.status === 'champion' ? `${home.name} are champions!` : 'Our tournament ends here.'}
              detail={
                cup.status === 'champion'
                  ? `${myRoundNames(cup).length} matches, ${sizeOf(cup)} teams, one trophy. Your club, your title.`
                  : `${cup.champion} lift the trophy. ${myStage(cup) === 0 ? 'We went out in the group stage.' : `We reached the ${MY_STAGE_NAMES[myStage(cup)].toLowerCase()}.`}`
              }
            >
            <Button className="cup-kickoff" onClick={() => setCreating(true)}>
              Play a new tournament <ArrowRight />
            </Button>
            </ResultFeeling>
            {newBest && <p className="cup-new-best">New best run!</p>}
            <CupCelebration
              champion={cup.status === 'champion'}
              club={home.name}
              path={ours
                .filter((g) => g.homeGoals !== undefined)
                .map((g) => {
                  const atHome = g.home === home.name;
                  const round = cup.games.findIndex((r) => r.includes(g));
                  return {
                    round: myRoundNames(cup)[round],
                    opponent: atHome ? g.away : g.home,
                    us: atHome ? g.homeGoals! : g.awayGoals!,
                    them: atHome ? g.awayGoals! : g.homeGoals!,
                    penalties: g.penalties ? ((atHome ? g.penalties : [g.penalties[1], g.penalties[0]]) as [number, number]) : undefined,
                  };
                })}
              reads={cupReadsSummary(storage.get(READS_KEY), cup.seed)}
            />

          </div>
        )}
        {game && (
          <section className="cup-next" aria-labelledby="my-fixture-heading">
            <p className="eyebrow">{myRoundNames(cup)[cup.round]}</p>
            <h2 id="my-fixture-heading" className="fixture-matchup">
              <FixtureTeams opponent={getTeam(opponent)} ourSide={ourSideForRound(cup.round)} />
            </h2>
            {(stakes || cup.round >= 3) && <p className="cup-stakes">{stakes || 'Win to stay in the cup.'}</p>}
            <p className="cup-opponent">
              {teamForm(cup, opponent).length > 0 && (
                <span className="cup-form" aria-label={`${opponent} form`}>
                  {teamForm(cup, opponent).map((f, i) => (
                    <span key={i} className={`form-${f.result}`} title={f.score}>
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
        <KnockoutResults games={cup.games} club={home.name} roundNames={myRoundNames(cup)} />
        <details className="cup-fixtures competition-details" open={fullOverview}>
          <summary>Our fixtures &amp; results</summary>
          <ul className="cup-results">
            {ourFixtureHistory(cup.games, home.name).map(({ game: g }) => (
              <ResultLine key={g.id} cup={cup} game={g} />
            ))}
          </ul>
        </details>
        <details className="competition-details" open={fullOverview || cup.round < 3} key={cup.round < 3 ? 'groups' : 'knockouts'}>
        <summary>Group stage</summary>
        <section className="cup-groups">
          <h2>Groups</h2>
          <label htmlFor="my-group">Group</label>
          <select id="my-group" value={group} onChange={(e) => setGroup(Number(e.target.value))}>
            {cup.groups.map((_, i) => (
              <option key={i} value={i}>
                {String.fromCharCode(65 + i)}
                {i === 0 ? ` · ${home.shortName}` : ''}
              </option>
            ))}
          </select>
          <div className="cup-table-scroll">
            <table>
              <caption>Group {String.fromCharCode(65 + group)} · top two qualify</caption>
              <thead>
                <tr>
                  <th scope="col">Team</th>
                  <th scope="col"><abbr title="Played">P</abbr></th>
                  <th scope="col"><abbr title="Goal difference">GD</abbr></th>
                  <th scope="col"><abbr title="Points">Pts</abbr></th>
                </tr>
              </thead>
              <tbody>
                {myGroupTable(cup, group).map((row, i) => (
                  <tr key={row.team} className={row.team === home.name ? 'is-us' : ''}>
                    <th scope="row">
                      {i + 1}. <TeamName name={row.team} />
                      {i < 2 && row.played === 3 ? ' ✓' : ''}
                    </th>
                    <td>{row.played}</td>
                    <td>{row.gf - row.ga}</td>
                    <td><strong>{row.points}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        </details>
        <p className="cup-rules">
          Saved on this device after every match. Rivals and plays are drawn fresh for every tournament.
        </p>
        {cup.status === 'playing' && (
          <Button variant="outline" onClick={() => window.confirm('Start a new tournament? This one will be lost.') && setCreating(true)}>
            Start a new tournament
          </Button>
        )}
      </section>
    </HomeTeamContext.Provider>
  );
}
