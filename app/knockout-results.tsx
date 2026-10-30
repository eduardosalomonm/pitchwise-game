import { TeamName } from '@/app/team-kit';
import { gameForDisplay } from '@/lib/fixture-order';
import { newestKnockoutRounds } from '@/lib/competition-history';
import type { TournamentGame } from '@/lib/tournament';

export function KnockoutResults({ games, club, roundNames }: { games: TournamentGame[][]; club: string; roundNames: string[] }) {
  const rounds = newestKnockoutRounds(games);
  if (!rounds.length) return null;
  return (
    <section className="cup-groups cup-knockout-history" id="cup-knockouts">
      <h2>Knockouts</h2>
      {rounds.map(({ games, round }, index) => (
        <details key={round} data-round={round} open={index === 0}>
          <summary><h3>{roundNames[round]}</h3></summary>
          <ul className="cup-results">
            {games.map((original) => {
              const game = gameForDisplay(original, club, round);
              return (
                <li key={game.id} className={game.home === club || game.away === club ? 'our-fixture' : ''}>
                  <TeamName name={game.home} />
                  <strong>{game.homeGoals === undefined ? 'vs' : `${game.homeGoals}–${game.awayGoals}`}</strong>
                  <TeamName name={game.away} />
                  {game.penalties && <small>Penalties {game.penalties.join('–')}</small>}
                </li>
              );
            })}
          </ul>
        </details>
      ))}
    </section>
  );
}
