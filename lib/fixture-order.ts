import type { TournamentGame } from './tournament.ts';

export type OurSide = 'home' | 'away';

/** Venue is stable for preview, play, replay and results. Tactical state stays us/rival. */
export const ourSideForRound = (round: number): OurSide => round % 2 === 0 ? 'home' : 'away';

export function inFixtureOrder<T>(us: T, rival: T, side: OurSide = 'home'): [T, T] {
  return side === 'home' ? [us, rival] : [rival, us];
}

/** Display only: never alter seeded simulations, saved score tuples or bracket transitions. */
export function gameForDisplay(game: TournamentGame, club: string, round: number): TournamentGame {
  if (game.home !== club && game.away !== club) return game;
  if ((game.home === club) === (ourSideForRound(round) === 'home')) return game;
  return {
    ...game,
    home: game.away,
    away: game.home,
    homeGoals: game.awayGoals,
    awayGoals: game.homeGoals,
    ...(game.penalties ? { penalties: [game.penalties[1], game.penalties[0]] as [number, number] } : {}),
  };
}
