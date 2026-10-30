import type { TournamentGame } from './tournament.ts';

/** Preserve round indices: they also determine venue and the saved game identity. */
export function newestKnockoutRounds(games: TournamentGame[][]) {
  return games.map((games, round) => ({ games, round })).slice(3).reverse();
}

export function ourFixtureHistory(games: TournamentGame[][], club: string) {
  return games.flatMap((roundGames, round) => roundGames
    .filter((game) => game.home === club || game.away === club)
    .map((game) => ({ game, round })))
    .sort((a, b) => {
      const aPlayed = a.game.homeGoals !== undefined;
      const bPlayed = b.game.homeGoals !== undefined;
      if (aPlayed !== bPlayed) return aPlayed ? -1 : 1;
      return aPlayed ? b.round - a.round : a.round - b.round;
    });
}
