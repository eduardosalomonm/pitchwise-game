import { LEAGUE_KEY, parseLeague } from './league.ts';
import { MY_CUP_STORAGE_KEY, parseSavedMyCup, myRoundNames } from './my-tournament.ts';
import { CUP_STORAGE_KEY, parseSavedCup } from './tournament-progress.ts';
import { ROUND_NAMES } from './tournament.ts';

/** Reuse the save validators: a present but damaged save is not a resumable game. */
export function competitionActions(read: (key: string) => string | null) {
  const league = parseLeague(read(LEAGUE_KEY));
  const readers = parseSavedCup(read(CUP_STORAGE_KEY));
  const custom = parseSavedMyCup(read(MY_CUP_STORAGE_KEY));
  return {
    league: league ? league.status === 'playing' ? `Continue · Matchweek ${league.round + 1}` : 'View season results' : 'Build a season',
    readers: readers ? readers.status === 'playing' ? `Continue · ${ROUND_NAMES[readers.round]}` : 'View cup results' : 'Enter the cup',
    custom: custom ? custom.status === 'playing' ? `Continue · ${myRoundNames(custom)[custom.round]}` : 'View tournament results' : 'Create a tournament',
  };
}
