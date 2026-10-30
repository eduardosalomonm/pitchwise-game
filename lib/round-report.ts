import type { TableRow, TournamentGame } from './tournament.ts';
import { ourSideForRound } from './fixture-order.ts';

// Between matches: only facts that affect our group position or route to the trophy.
export type CupState = {
  games: TournamentGame[][];
  groups: string[][];
  status: 'playing' | 'champion' | 'eliminated';
  round: number;
  champion?: string;
};
type Options<T extends CupState> = {
  round: number;
  us: string;
  before: T;
  after: T;
  table: (cup: T, group: number) => TableRow[];
  roundNames: string[];
};

const ours = (us: string) => (g: TournamentGame) => g.home === us || g.away === us;
const played = (g: TournamentGame) => g.homeGoals !== undefined && g.awayGoals !== undefined;
const winnerOf = (g: TournamentGame) => g.winner ?? (g.homeGoals! > g.awayGoals! ? g.home : g.awayGoals! > g.homeGoals! ? g.away : undefined);
const places = ['first', 'second', 'third', 'fourth'];

function lastResult(game: TournamentGame, team: string) {
  const home = game.home === team;
  const us = home ? game.homeGoals! : game.awayGoals!;
  const them = home ? game.awayGoals! : game.homeGoals!;
  const rival = home ? game.away : game.home;
  if (game.penalties) {
    const [h, a] = game.penalties;
    return `came through on penalties, ${home ? h : a}–${home ? a : h} against ${rival}, after ${us}–${them}`;
  }
  return us > them ? `beat ${rival} ${us}–${them}` : us < them ? `lost ${us}–${them} to ${rival}` : `drew ${us}–${them} with ${rival}`;
}

export function buildRoundReport<T extends CupState>({ round, us, before, after, table, roundNames }: Options<T>) {
  const games = after.games[round] ?? [];
  const mine = games.find(ours(us))!;
  const home = mine.home === us;
  const ourGoals = home ? mine.homeGoals! : mine.awayGoals!;
  const theirGoals = home ? mine.awayGoals! : mine.homeGoals!;
  const penalties = mine.penalties ? ((home ? mine.penalties : [mine.penalties[1], mine.penalties[0]]) as [number, number]) : undefined;
  const outcome: 'win' | 'draw' | 'loss' = penalties
    ? (penalties[0] > penalties[1] ? 'win' : 'loss')
    : ourGoals > theirGoals ? 'win' : ourGoals < theirGoals ? 'loss' : 'draw';
  const result = {
    opponent: home ? mine.away : mine.home,
    us: ourGoals,
    them: theirGoals,
    penalties,
    outcome,
    ourSide: ourSideForRound(round),
  };
  const group = after.groups.findIndex((g) => g.includes(us));
  let groupView: { rows: (TableRow & { move: number })[]; other?: TournamentGame; qualified?: boolean } | undefined;
  if (round <= 2) {
    const was = round === 0 ? after.groups[group] : table(before, group).map((r) => r.team);
    const rows = table(after, group).map((row, i) => ({ ...row, move: round === 0 ? 0 : was.indexOf(row.team) - i }));
    const other = games.find((g) => !ours(us)(g) && after.groups[group].includes(g.home));
    groupView = { rows, other, ...(round === 2 ? { qualified: after.status === 'playing' } : {}) };
  }
  const headlines: string[] = [];
  const nextGame = after.status === 'playing' ? after.games[after.round]?.find(ours(us)) : undefined;
  const nextOpponent = nextGame ? (nextGame.home === us ? nextGame.away : nextGame.home) : undefined;
  if (groupView) {
    const position = groupView.rows.findIndex((row) => row.team === us);
    const row = groupView.rows[position];
    const groupName = `Group ${String.fromCharCode(65 + group)}`;
    if (round === 2) {
      headlines.push(groupView.qualified
        ? `${groupName} ${position === 0 ? 'winners' : 'runners-up'}. The knockout route is open.`
        : `${places[position][0].toUpperCase()}${places[position].slice(1)} in ${groupName}. ${groupView.rows[0].team} and ${groupView.rows[1].team} take the knockout places.`);
    } else {
      const boundary = groupView.rows[position < 2 ? 2 : 1];
      const gap = Math.abs(row.points - boundary.points);
      const movement = row.move > 0 ? 'Up to' : row.move < 0 ? 'Down to' : round === 0 ? 'We start in' : 'Still in';
      const edge = gap === 0
        ? `Level on points with ${boundary.team}; tiebreakers put us ${position < 2 ? 'inside' : 'outside'} the top two.`
        : `${gap === 1 ? 'One point' : `${gap} points`} ${position < 2 ? `clear of third-placed ${boundary.team}` : `behind second-placed ${boundary.team}`}.`;
      headlines.push(`${movement} ${places[position]}. ${edge}`);
    }
  } else if (after.status === 'playing') {
    const remaining = roundNames.length - after.round;
    headlines.push(`Into the ${roundNames[after.round].toLowerCase()}. ${remaining === 1 ? 'One win' : `${remaining} wins`} from the trophy.`);
  } else if (after.status === 'champion') {
    const ties = after.games.slice(3, round + 1).flat().filter((g) => ours(us)(g) && winnerOf(g) === us);
    const shootouts = ties.filter((g) => g.penalties).length;
    headlines.push(`Champions. ${ties.length} knockout wins${shootouts ? `, including ${shootouts === 1 ? 'one shootout' : `${shootouts} shootouts`}` : ''}. The trophy is ours.`);
  } else {
    headlines.push(roundNames[round] === 'Final'
      ? `${result.opponent} take the trophy${result.penalties ? ' on penalties' : ''}. We finish as runners-up.`
      : `Our run ends in the ${roundNames[round].toLowerCase()}. ${result.opponent} advance${result.penalties ? ' on penalties' : ''}.`);
  }
  if (nextOpponent) {
    if (round === 2) {
      const rivalGroup = after.groups.findIndex((g) => g.includes(nextOpponent));
      const place = table(after, rivalGroup).findIndex((r) => r.team === nextOpponent);
      headlines.push(`Our next opponent: ${nextOpponent}, Group ${String.fromCharCode(65 + rivalGroup)} ${place === 0 ? 'winners' : 'runners-up'}.`);
    }
    const last = games.find((g) => ours(nextOpponent)(g) && played(g));
    if (last) headlines.push(`${nextOpponent} ${lastResult(last, nextOpponent)}${round >= 3 ? ` to reach the ${roundNames[after.round].toLowerCase()}` : ''}.`);
    if (round >= 3) {
      const nextGames = after.games[after.round];
      const sibling = nextGames[nextGames.indexOf(nextGame!) ^ 1];
      if (sibling) headlines.push(`Beat ${nextOpponent} and we meet ${sibling.home} or ${sibling.away}.`);
    }
  }
  return {
    title: `${roundNames[round]} report`,
    result,
    group: groupView,
    headlines: headlines.slice(0, 3),
    next: nextGame ? { round: roundNames[after.round], opponent: nextGame.home === us ? nextGame.away : nextGame.home } : undefined,
    // Elimination auto-simulates future rounds. Do not present those as news from today.
    finished: after.status !== 'playing' ? { status: after.status } : undefined,
  };
}
export type RoundReport = ReturnType<typeof buildRoundReport>;
