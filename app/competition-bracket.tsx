/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The bracket is a keyboard-scrollable region. */
import { Trophy } from 'lucide-react';
import { TeamName } from '@/app/team-kit';
import { gameForDisplay } from '@/lib/fixture-order';
import {
  OUR_TEAM,
  groupTable,
  type TournamentGame,
  type TournamentRun,
} from '@/lib/tournament';

const seeds = [
  [0, 0, 1, 1],
  [2, 0, 3, 1],
  [4, 0, 5, 1],
  [6, 0, 7, 1],
  [1, 0, 0, 1],
  [3, 0, 2, 1],
  [5, 0, 4, 1],
  [7, 0, 6, 1],
];
function origin(run: TournamentRun, team: string) {
  const group = run.groups.findIndex((teams) => teams.includes(team));
  if (group < 0) return '';
  const table = groupTable(run, group);
  return `${String.fromCharCode(65 + group)}${table.findIndex((row) => row.team === team) + 1}`;
}
function Slot({
  run,
  round,
  index,
}: {
  run: TournamentRun;
  round: number;
  index: number;
}) {
  const original = run.games[round]?.[index];
  const game: TournamentGame | undefined = original ? gameForDisplay(original, OUR_TEAM, round) : undefined;
  const placeholders =
    round === 3
      ? [0, 1].map((side) => {
          const seed = seeds[index];
          return `${seed[side * 2 + 1] === 0 ? '1st' : '2nd'} Group ${String.fromCharCode(65 + seed[side * 2])}`;
        })
      : [
          `Winner ${round === 4 ? 'R16' : round === 5 ? 'QF' : 'SF'} ${index * 2 + 1}`,
          `Winner ${round === 4 ? 'R16' : round === 5 ? 'QF' : 'SF'} ${index * 2 + 2}`,
        ];
  return (
    <div
      className={`bracket-slot ${game && (game.home === OUR_TEAM || game.away === OUR_TEAM) ? 'bracket-us' : ''}`}
      data-game-id={game?.id}
    >
      {[0, 1].map((side) => {
        const team = game ? (side === 0 ? game.home : game.away) : undefined;
        const score = side === 0 ? game?.homeGoals : game?.awayGoals;
        return (
          <div
            key={side}
            className={team && game?.winner === team ? 'bracket-winner' : ''}
          >
            {team ? (
              <>
                <small title={`Group placing: ${origin(run, team)}`}>
                  {origin(run, team)}
                </small>
                <TeamName name={team} />
              </>
            ) : (
              <span className="bracket-placeholder">{placeholders[side]}</span>
            )}
            <strong>{score ?? '–'}</strong>
          </div>
        );
      })}
      {game?.penalties && (
        <small className="bracket-penalties">
          Pens {game.penalties.join('–')}
        </small>
      )}
    </div>
  );
}
export function CompetitionBracket({ run }: { run: TournamentRun }) {
  return (
    <section
      className="cup-bracket"
      id="cup-bracket"
      aria-labelledby="bracket-title"
    >
      <h2 id="bracket-title">The road to the trophy</h2>
      <p className="bracket-hint">
        Two sides. One final. <span>Scroll across to follow the draw.</span>
      </p>
      {/* Keyboard users must be able to pan the full competition bracket. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div
        className="bracket-scroll"
        tabIndex={0}
        aria-label="Knockout bracket, scroll horizontally"
      >
        <div className="competition-bracket">
          {[
            { round: 3, indices: [0, 1, 2, 3], title: 'Round of 16' },
            { round: 4, indices: [0, 1], title: 'Quarter-finals' },
            { round: 5, indices: [0], title: 'Semi-final' },
          ].map((col) => (
            <div
              className={`bracket-column round-${col.round} side-left`}
              key={col.round}
            >
              <h3>{col.title}</h3>
              <div className="bracket-games">
                {col.indices.map((index) => (
                  <Slot key={index} run={run} round={col.round} index={index} />
                ))}
              </div>
            </div>
          ))}
          <div className="bracket-column bracket-final">
            <h3>
              <Trophy aria-hidden="true" />
              Final
            </h3>
            <div className="bracket-games">
              <Slot run={run} round={6} index={0} />
              {run.champion && (
                <p className="bracket-champion">
                  {run.champion}
                  <small>Champions</small>
                </p>
              )}
            </div>
          </div>
          {[
            { round: 5, indices: [1], title: 'Semi-final' },
            { round: 4, indices: [2, 3], title: 'Quarter-finals' },
            { round: 3, indices: [4, 5, 6, 7], title: 'Round of 16' },
          ].map((col) => (
            <div
              className={`bracket-column round-${col.round} side-right`}
              key={col.round}
            >
              <h3>{col.title}</h3>
              <div className="bracket-games">
                {col.indices.map((index) => (
                  <Slot key={index} run={run} round={col.round} index={index} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
