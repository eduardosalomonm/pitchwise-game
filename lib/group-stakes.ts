import type { TableRow, TournamentGame } from './tournament.ts';

// Only promise qualification when points alone guarantee it, even if every
// points tie goes against us. Representative scorelines cannot prove that.
export function lastGroupStakes(rows: TableRow[], us: string, game: TournamentGame, other: TournamentGame): string {
  const rival = game.home === us ? game.away : game.home;
  const standings = (ourPoints: number, rivalPoints: number) =>
    [[3, 0], [1, 1], [0, 3]].map(([homePoints, awayPoints]) => {
      const totals = new Map(rows.map((r) => [r.team, r.points]));
      for (const [team, added] of [[us, ourPoints], [rival, rivalPoints], [other.home, homePoints], [other.away, awayPoints]] as const)
        totals.set(team, totals.get(team)! + added);
      const ours = totals.get(us)!;
      const rivals = [...totals].filter(([team]) => team !== us).map(([, points]) => points);
      return { guaranteed: rivals.filter((p) => p >= ours).length < 2, possible: rivals.filter((p) => p > ours).length < 2 };
    });
  if (standings(0, 3).every((r) => r.guaranteed)) return 'Already through. Play for the best group finish.';
  if (standings(1, 1).every((r) => r.guaranteed)) return 'A draw takes us through. A win could improve our group finish.';
  if (standings(3, 0).every((r) => r.guaranteed)) return 'Win and we are through.';
  if (standings(3, 0).some((r) => r.possible)) return 'We need a win. Goal difference and the other game may decide qualification.';
  return 'We cannot reach the top two. Play for pride.';
}
