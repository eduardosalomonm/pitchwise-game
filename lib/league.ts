import { teams, KIT_PRESETS, validClubName } from './teams.ts';
import {
  LEAGUE_DIFFICULTIES,
  type LeagueDifficulty,
} from './league-difficulty.ts';
import {
  goals,
  seedHash,
  type TournamentGame,
  type TableRow,
} from './tournament.ts';

export const LEAGUE_KEY = 'pitchwise-league-v1';
export const LEAGUE_MATCH_KEY = 'pitchwise-league-match-v1';
export type LeagueConfig = {
  name: string;
  kitId: string;
  size: number;
  legs: 1 | 2;
  /** Missing only on pre-selector saves: keep their original opponent-driven catalogue. */
  difficulty?: LeagueDifficulty;
};
export type League = {
  seed: number;
  config: LeagueConfig;
  clubs: string[];
  rounds: TournamentGame[][];
  round: number;
  status: 'playing' | 'finished';
};
export type LeagueRow = TableRow & {
  form: { result: 'W' | 'D' | 'L'; score: string }[];
};
export const LEAGUE_NAMES = [
  'Real Barrio',
  'Atlético Callejón',
  'Sporting Domingo',
  'Union Halftime',
  'Deportivo Esquina',
  'Rovers del Parque',
];
const ordered = <T>(items: T[], seed: number, salt: string) =>
  items
    .map((item, i) => ({ item, n: seedHash(`${salt}/${i}`, seed) }))
    .sort((a, b) => a.n - b.n)
    .map((p) => p.item);

export const DEFAULT_LEAGUE_NAME = 'Pitchwise FC';
export function validLeagueName(value: unknown): value is string {
  return validClubName(value);
}

export function createLeague(seed: number, config: LeagueConfig): League {
  if (
    !Number.isSafeInteger(seed) ||
    seed < 0 ||
    !config ||
    !validLeagueName(config.name) ||
    !KIT_PRESETS.some((k) => k.id === config.kitId) ||
    !Number.isInteger(config.size) ||
    config.size < 4 ||
    config.size > 12 ||
    ![1, 2].includes(config.legs) ||
    (config.difficulty !== undefined &&
      !LEAGUE_DIFFICULTIES.some((d) => d.id === config.difficulty))
  )
    throw new Error('Invalid league settings.');
  const clubs = [
    config.name,
    ...ordered(
      teams.slice(1).map((t) => t.name),
      seed,
      'league-clubs',
    ).slice(0, config.size - 1),
  ];
  // Circle scheduling also supports odd-sized leagues with one genuine bye.
  const wheel: (string | null)[] = ordered(clubs, seed, 'league-wheel');
  const venueOrder = new Map(wheel.map((club, i) => [club, i]));
  const venueCircle = config.size % 2 ? config.size : config.size + 1;
  if (wheel.length % 2) wheel.push(null);
  const first: TournamentGame[][] = [];
  for (let r = 0; r < wheel.length - 1; r++) {
    const games: TournamentGame[] = [];
    for (let i = 0; i < wheel.length / 2; i++) {
      const a = wheel[i],
        b = wheel[wheel.length - 1 - i];
      if (a && b) {
        const clockwise =
          (venueOrder.get(b)! - venueOrder.get(a)! + venueCircle) % venueCircle;
        const home = clockwise <= Math.floor(venueCircle / 2) ? a : b,
          away = home === a ? b : a;
        games.push({ id: `league-r${r}-${i}`, home, away });
      }
    }
    first.push(games);
    wheel.splice(1, 0, wheel.pop()!);
  }
  const rounds =
    config.legs === 1
      ? first
      : [
          ...first,
          ...first.map((games, r) =>
            games.map((g, i) => ({
              id: `league-r${r + first.length}-${i}`,
              home: g.away,
              away: g.home,
            })),
          ),
        ];
  return {
    seed,
    config: { ...config },
    clubs,
    rounds,
    round: 0,
    status: 'playing',
  };
}
export const leagueIsOurs = (league: League, game: TournamentGame) =>
  game.home === league.config.name || game.away === league.config.name;
export const activeLeagueGame = (league: League) =>
  league.status === 'playing'
    ? league.rounds[league.round]?.find((g) => leagueIsOurs(league, g))
    : undefined;
export const leagueOpponent = (league: League, game: TournamentGame) =>
  game.home === league.config.name ? game.away : game.home;
export const leagueStrength = (league: League, club: string) =>
  club === league.config.name
    ? 3
    : 2 + (seedHash(`league-strength/${club}`, league.seed) % 4);

function simulated(league: League, game: TournamentGame): TournamentGame {
  const edge =
    (leagueStrength(league, game.home) - leagueStrength(league, game.away)) *
      0.16 +
    0.08;
  return {
    ...game,
    homeGoals: Math.min(
      6,
      goals(1.25 * Math.exp(edge), `league/${game.id}/h`, league.seed),
    ),
    awayGoals: Math.min(
      6,
      goals(1.25 * Math.exp(-edge), `league/${game.id}/a`, league.seed + 17),
    ),
  };
}
function completedRound(
  league: League,
  ours?: { id: string; us: number; them: number },
): League {
  const next = structuredClone(league);
  next.rounds[next.round] = next.rounds[next.round].map((g) => {
    if (g.homeGoals !== undefined)
      throw new Error('This round is already complete.');
    if (ours && g.id === ours.id) {
      const home = g.home === next.config.name;
      return {
        ...g,
        homeGoals: home ? ours.us : ours.them,
        awayGoals: home ? ours.them : ours.us,
      };
    }
    return simulated(next, g);
  });
  next.round++;
  if (next.round === next.rounds.length) next.status = 'finished';
  return next;
}
export function finishLeagueGame(
  league: League,
  id: string,
  us: number,
  them: number,
): League {
  const game = activeLeagueGame(league);
  if (!game || game.id !== id || game.homeGoals !== undefined)
    throw new Error('This league fixture is not active.');
  if (![us, them].every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 9))
    throw new Error('Invalid league score.');
  return completedRound(league, { id, us, them });
}
export function advanceLeagueBye(league: League): League {
  if (league.status !== 'playing' || activeLeagueGame(league))
    throw new Error('This is not a rest round.');
  return completedRound(league);
}

export function leagueTable(league: League): LeagueRow[] {
  const rows: LeagueRow[] = league.clubs.map((team) => ({
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    points: 0,
    form: [],
  }));
  for (const game of league.rounds.flat()) {
    if (game.homeGoals === undefined || game.awayGoals === undefined) continue;
    const h = rows.find((r) => r.team === game.home)!,
      a = rows.find((r) => r.team === game.away)!;
    h.played++;
    a.played++;
    h.gf += game.homeGoals;
    h.ga += game.awayGoals;
    a.gf += game.awayGoals;
    a.ga += game.homeGoals;
    const result =
      game.homeGoals > game.awayGoals
        ? 'W'
        : game.homeGoals < game.awayGoals
          ? 'L'
          : 'D';
    for (const [row, mark, gf, ga] of [
      [h, result, game.homeGoals, game.awayGoals],
      [
        a,
        result === 'W' ? 'L' : result === 'L' ? 'W' : 'D',
        game.awayGoals,
        game.homeGoals,
      ],
    ] as const) {
      if (mark === 'W') {
        row.won++;
        row.points += 3;
      } else if (mark === 'D') {
        row.drawn++;
        row.points++;
      } else row.lost++;
      row.form.push({ result: mark, score: `${gf}–${ga}` });
    }
  }
  // An explicit seeded draw is the final published tie-break, never an extra penalty game.
  return rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.gf - b.ga - (a.gf - a.ga) ||
      b.gf - a.gf ||
      seedHash(`league-tie/${a.team}`, league.seed) -
        seedHash(`league-tie/${b.team}`, league.seed),
  );
}

export function serializeLeague(league: League): string {
  const results = league.rounds.slice(0, league.round).map((games) => {
    const game = games.find((g) => leagueIsOurs(league, g));
    if (!game) return null;
    const home = game.home === league.config.name;
    return [
      game.id,
      home ? game.homeGoals : game.awayGoals,
      home ? game.awayGoals : game.homeGoals,
    ];
  });
  return JSON.stringify({
    v: 1,
    seed: league.seed,
    config: league.config,
    results,
  });
}
export function parseLeague(value: string | null): League | null {
  if (!value) return null;
  try {
    const saved = JSON.parse(value);
    if (saved?.v !== 1 || !Array.isArray(saved.results)) return null;
    let league = createLeague(saved.seed, saved.config);
    if (saved.results.length > league.rounds.length) return null;
    for (const result of saved.results) {
      if (result === null) league = advanceLeagueBye(league);
      else if (Array.isArray(result) && result.length === 3)
        league = finishLeagueGame(league, result[0], result[1], result[2]);
      else return null;
    }
    return league;
  } catch {
    return null;
  }
}

export function leagueHeadline(league: League): string {
  const table = leagueTable(league),
    rank = table.findIndex((r) => r.team === league.config.name),
    us = table[rank];
  if (!us.played) return 'A new season. Every point counts.';
  if (league.status === 'finished')
    return rank === 0
      ? 'League champions. You earned the top spot.'
      : `Season complete. ${rank + 1}${rank === 1 ? 'nd' : rank === 2 ? 'rd' : 'th'} place — ${us.points} points.`;
  if (
    rank === 0 &&
    table
      .slice(1)
      .every(
        (r) =>
          us.points >
          r.points +
            ((league.config.size - 1) * league.config.legs - r.played) * 3,
      )
  )
    return 'The title is secured. Finish the season in style.';
  if (rank === 0)
    return table[1].points === us.points
      ? 'Top on the tie-break. The chase is close.'
      : `${us.points - table[1].points} points clear. Keep setting the pace.`;
  return `${table[0].points - us.points} points off the top. There is a chase on.`;
}
