import { HOME_TEAM, getTeam } from './teams.ts';
export const OUR_TEAM = HOME_TEAM.name;
// Club strength drives simulated results and the seeded draw: one club from each pot per group.
// Ratings are fictional and only matter relative to each other.
export const TEAM_RATINGS: Record<string, number> = {
  compass: 90, breakers: 88, bait: 87, aurora: 86, summit: 85, quartz: 84, ember: 83, comet: 82,
  weavers: 80, towers: 79, banks: 79, runners: 78, vale: 77, atlas: 77, cedar: 76, orion: 75,
  harbour: 73, narrow: 72, arrow: 72, tide: 71, copper: 70, slate: 70, reed: 69, flint: 69,
  dune: 66, birch: 65, brook: 65, grove: 64, cove: 64, pine: 63, meadow: 62, pitchwise: 74,
};
export const teamRating = (name: string) => TEAM_RATINGS[getTeam(name).id] ?? 70;
const POTS = [
  ['compass', 'breakers', 'bait', 'aurora', 'summit', 'quartz', 'ember', 'comet'],
  ['weavers', 'towers', 'banks', 'runners', 'vale', 'atlas', 'cedar', 'orion'],
  ['harbour', 'narrow', 'arrow', 'tide', 'copper', 'slate', 'reed', 'flint'],
  ['dune', 'birch', 'brook', 'grove', 'cove', 'pine', 'meadow'],
];
function seededShuffle<T>(items: T[], seed: number, salt: string): T[] {
  return items
    .map((item, index) => ({ item, key: hash(`${salt}/${index}`, seed) }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);
}
// Group A always holds our club. Our group games run from the third pot to the top seed,
// so the group stage gets harder each round.
export function drawGroups(seed: number): string[][] {
  const pots = POTS.map((pot, i) => seededShuffle(pot, seed, `pot${i}`));
  return Array.from({ length: 8 }, (_, group) => {
    if (group === 0) return [HOME_TEAM.id, pots[2][0], pots[1][0], pots[0][0]];
    return [pots[0][group], pots[1][group], pots[2][group], pots[3][group - 1]];
  }).map((ids) => ids.map((id) => getTeam(id).name));
}
// One designed tournament: every cup uses the same draw and the same seven matches, so
// each fixture can be authored for its opponent. The seed only varies the other games.
export const CUP_DRAW_SEED = 2026;
export const GROUPS = drawGroups(CUP_DRAW_SEED);
export type TournamentGame = {
  id: string;
  home: string;
  away: string;
  homeGoals?: number;
  awayGoals?: number;
  winner?: string;
  penalties?: [number, number];
};
export type TableRow = {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
};
export type TournamentRun = {
  seed: number;
  groups: string[][];
  round: number;
  games: TournamentGame[][];
  status: 'playing' | 'champion' | 'eliminated';
  champion?: string;
};
export const ROUND_NAMES = [
  'Group game 1',
  'Group game 2',
  'Group game 3',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Final',
];
const schedule = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [3, 1],
  ],
  [
    [0, 3],
    [1, 2],
  ],
] as const;
export function seedHash(value: string, seed: number) {
  return hash(value, seed);
}
function hash(value: string, seed: number) {
  let result = seed >>> 0;
  for (const char of value)
    result = Math.imul(result ^ char.charCodeAt(0), 16777619) >>> 0;
  result = Math.imul(result ^ (result >>> 16), 0x85ebca6b) >>> 0;
  return (result ^ (result >>> 13)) >>> 0;
}
export function createTournament(seed = 2026): TournamentRun {
  const groups = GROUPS.map((group) => [...group]);
  return {
    seed,
    groups,
    round: 0,
    status: 'playing',
    games: schedule.map((pairs, round) =>
      groups.flatMap((teams, group) =>
        pairs.map(([h, a], index) => ({
          id: `g${group}-r${round}-${index}`,
          home: teams[h],
          away: teams[a],
        })),
      ),
    ),
  };
}
export function groupTable(run: TournamentRun, group: number): TableRow[] {
  const rows = run.groups[group].map(
    (team) =>
      ({
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        points: 0,
      }) as TableRow,
  );
  for (const game of run.games.slice(0, 3).flat()) {
    if (game.homeGoals === undefined || game.awayGoals === undefined) continue;
    const home = rows.find((row) => row.team === game.home),
      away = rows.find((row) => row.team === game.away);
    if (!home || !away) continue;
    home.played++;
    away.played++;
    home.gf += game.homeGoals;
    home.ga += game.awayGoals;
    away.gf += game.awayGoals;
    away.ga += game.homeGoals;
    if (game.homeGoals > game.awayGoals) {
      home.won++;
      away.lost++;
      home.points += 3;
    } else if (game.homeGoals < game.awayGoals) {
      away.won++;
      home.lost++;
      away.points += 3;
    } else {
      home.drawn++;
      away.drawn++;
      home.points++;
      away.points++;
    }
  }
  return rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.gf - b.ga - (a.gf - a.ga) ||
      b.gf - a.gf ||
      hash(a.team, run.seed) - hash(b.team, run.seed) ||
      a.team.localeCompare(b.team),
  );
}
export function currentTournamentGame(
  run: TournamentRun,
): TournamentGame | undefined {
  if (run.status !== 'playing') return;
  return run.games[run.round]?.find(
    (game) => game.home === OUR_TEAM || game.away === OUR_TEAM,
  );
}
// Seeded Poisson goals: the stronger club usually wins, but upsets stay possible.
export function goals(expected: number, key: string, seed: number) {
  const roll = hash(key, seed) / 2 ** 32;
  let total = 0, probability = Math.exp(-expected), cumulative = probability;
  while (roll > cumulative && total < 5) {
    total++;
    probability *= expected / total;
    cumulative += probability;
  }
  return total;
}
function simulate(
  game: TournamentGame,
  seed: number,
  knockout: boolean,
): TournamentGame {
  const edge = (teamRating(game.home) - teamRating(game.away)) / 22;
  const homeGoals = goals(1.3 * Math.exp(edge / 2), `${game.id}/home`, seed),
    awayGoals = goals(1.3 * Math.exp(-edge / 2), `${game.id}/away`, seed + 19);
  const homeShootout = hash(game.id, seed) % 100 < 50 + Math.round(edge * 10);
  const homeWins =
    homeGoals > awayGoals || (homeGoals === awayGoals && homeShootout);
  return {
    ...game,
    homeGoals,
    awayGoals,
    ...(knockout
      ? {
          winner: homeWins ? game.home : game.away,
          ...(homeGoals === awayGoals
            ? {
                penalties: homeWins
                  ? ([5, 4] as [number, number])
                  : ([4, 5] as [number, number]),
              }
            : {}),
        }
      : {}),
  };
}
function nextRound(run: TournamentRun) {
  if (run.round < 2) {
    run.round++;
    return;
  }
  if (run.round === 2) {
    const tables = run.groups.map((_, i) => groupTable(run, i));
    const pairs: string[][] = [];
    // Each group's qualifiers occupy opposite halves of the bracket.
    for (let i = 0; i < 8; i += 2)
      pairs.push([tables[i][0].team, tables[i + 1][1].team]);
    for (let i = 0; i < 8; i += 2)
      pairs.push([tables[i + 1][0].team, tables[i][1].team]);
    run.games.push(
      pairs.map(([home, away], i) => ({ id: `k3-${i}`, home, away })),
    );
  } else if (run.round < 6) {
    const winners = run.games[run.round].map((game) => game.winner!);
    run.games.push(
      winners
        .filter((_, i) => i % 2 === 0)
        .map((home, i) => ({
          id: `k${run.round + 1}-${i}`,
          home,
          away: winners[i * 2 + 1],
        })),
    );
  } else {
    run.champion = run.games[6][0].winner;
    run.status = run.champion === OUR_TEAM ? 'champion' : 'eliminated';
    return;
  }
  run.round++;
}
// A completed fixture is immutable. Duplicate/stale submissions never advance the cup.
export function finishTournamentGame(
  run: TournamentRun,
  gameId: string,
  ourGoals: number,
  rivalGoals: number,
  shootout?: [number, number],
): TournamentRun {
  const game = currentTournamentGame(run);
  if (!game || game.id !== gameId || game.homeGoals !== undefined)
    throw new Error('This tournament fixture is not active.');
  if (
    ![ourGoals, rivalGoals].every(
      (n) => Number.isSafeInteger(n) && n >= 0 && n <= 5,
    )
  )
    throw new Error('Invalid match score.');
  const knockout = run.round >= 3,
    tied = ourGoals === rivalGoals;
  if (
    knockout &&
    tied &&
    (!shootout ||
      !shootout.every((n) => Number.isSafeInteger(n) && n >= 0) ||
      shootout[0] === shootout[1])
  )
    throw new Error('A tied knockout needs a completed shootout.');
  const next = structuredClone(run);
  const home = game.home === OUR_TEAM;
  next.games[next.round] = next.games[next.round].map((item) =>
    item.id === gameId
      ? {
          ...item,
          homeGoals: home ? ourGoals : rivalGoals,
          awayGoals: home ? rivalGoals : ourGoals,
          ...(knockout
            ? {
                winner:
                  ourGoals > rivalGoals || (tied && shootout![0] > shootout![1])
                    ? OUR_TEAM
                    : home
                      ? game.away
                      : game.home,
                ...(tied
                  ? {
                      penalties: home
                        ? shootout
                        : ([shootout![1], shootout![0]] as [number, number]),
                    }
                  : {}),
              }
            : {}),
        }
      : simulate(item, next.seed, knockout),
  );
  nextRound(next);
  if (next.status === 'playing' && !currentTournamentGame(next)) {
    // Once eliminated, finish the other teams' bracket so the cup still has a winner.
    while (next.round <= 6 && !next.champion) {
      next.games[next.round] = next.games[next.round].map((item) =>
        simulate(item, next.seed, true),
      );
      nextRound(next);
    }
    next.status = 'eliminated';
  }
  return next;
}

export type Shootout = {
  kicks: number;
  us: number;
  them: number;
  last?: string;
  finished: boolean;
  history?: PenaltyPair[];
};
export type PenaltyPair = {
  scored: boolean;
  rivalScored: boolean;
  direction: number;
  keeperSide: number;
  rivalDirection: number;
  rivalKeeperSide: number;
  /** Where our keeper dived when the player chose; absent when the reply was simulated. */
  dive?: number;
};
export const createShootout = (): Shootout => ({
  kicks: 0,
  us: 0,
  them: 0,
  finished: false,
  history: [],
});
// Zone order is the visible goal grid: high left/middle/right, then low.
export const PENALTY_ZONES = [
  { label: 'high left', x: 75, y: 48 },
  { label: 'high middle', x: 150, y: 48 },
  { label: 'high right', x: 225, y: 48 },
  { label: 'low left', x: 75, y: 86 },
  { label: 'low middle', x: 150, y: 86 },
  { label: 'low right', x: 225, y: 86 },
] as const;
const validPenaltyZone = (zone: number) => Number.isInteger(zone) && zone >= 0 && zone < PENALTY_ZONES.length;
const penaltyTarget = (kind: 'keeper' | 'kicker', gameId: string, kick: number, seed: number) =>
  hash(`${gameId}/${kind}/target/${kick}`, seed) % 6;

// Body language is a hint, not an oracle: most cues are neutral; occasional
// horizontal tells can be feints and never reveal height or the hidden target.
function bodyLanguage(kind: 'keeper' | 'kicker', gameId: string, kick: number, seed: number): { side: number | null; text: string } {
  const salt = `${gameId}/${kind}/cue/${kick}`;
  const neutral = kind === 'keeper'
    ? ['The keeper stays balanced and watches your run-up.', 'No clear early move from the keeper.', 'The keeper makes a small feint, then resets.']
    : ['A short run-up. The kicker gives no clear side away.', 'Their eyes stay on the ball through the run-up.', 'A pause in the run-up, then a straight approach.'];
  if (hash(`${salt}/type`, seed) % 10 < 7)
    return { side: null, text: neutral[hash(`${salt}/words`, seed) % neutral.length] };
  const actualSide = penaltyTarget(kind, gameId, kick, seed) % 3;
  const honest = hash(`${salt}/honest`, seed) % 3 !== 0;
  const side = honest ? actualSide : (actualSide + 1 + hash(`${salt}/feint`, seed) % 2) % 3;
  const toward = ['your left', 'the middle', 'your right'][side];
  const words = kind === 'keeper'
    ? [`The keeper shifts a step toward ${toward}.`, `The keeper glances toward ${toward}, then settles.`]
    : [`The kicker opens their hips toward ${toward}.`, `The kicker looks toward ${toward} as the run-up begins.`];
  return { side, text: words[hash(`${salt}/words`, seed) % 2] };
}
export const penaltyCue = (gameId: string, kick: number, seed: number) => bodyLanguage('keeper', gameId, kick, seed);
export const rivalPenaltyCue = (gameId: string, kick: number, seed: number) => bodyLanguage('kicker', gameId, kick, seed);

/** Reveal only after the shot is locked; preview and committed history share this resolver. */
export function penaltyAttempt(state: Shootout, choice: number, gameId: string, seed: number) {
  const keeperSide = penaltyTarget('keeper', gameId, state.kicks, seed);
  return { direction: choice, keeperSide, scored: validPenaltyZone(choice) && choice !== keeperSide };
}
export const penaltyScores = (state: Shootout, choice: number, gameId: string, seed: number) => penaltyAttempt(state, choice, gameId, seed).scored;
export function takePenalty(
  state: Shootout,
  choice: number,
  gameId: string,
  seed: number,
  dive?: number,
): Shootout {
  if (state.finished || !validPenaltyZone(choice)) return state;
  if (dive !== undefined && !validPenaltyZone(dive)) return state;
  const attempt = penaltyAttempt(state, choice, gameId, seed);
  const scored = attempt.scored;
  const rivalDirection = penaltyTarget('kicker', gameId, state.kicks, seed);
  const rivalKeeperSide = dive ?? hash(`${gameId}/our-keeper/${state.kicks}`, seed) % 6;
  const rivalScored = rivalKeeperSide !== rivalDirection;
  const kicks = state.kicks + 1,
    us = state.us + Number(scored),
    them = state.them + Number(rivalScored);
  const finished = kicks < 5 ? Math.abs(us - them) > 5 - kicks : us !== them;
  return {
    kicks,
    us,
    them,
    finished,
    history: [
      ...(state.history ?? []),
      {
        scored,
        rivalScored,
        direction: choice,
        keeperSide: attempt.keeperSide,
        rivalDirection,
        rivalKeeperSide,
        ...(dive === undefined ? {} : { dive }),
      },
    ],
    last: `${scored ? 'You score.' : 'The keeper saves.'} ${rivalScored ? 'Your opponent scores their kick.' : dive === undefined ? 'Your opponent misses their kick.' : 'Our keeper saves their kick.'}`,
  };
}
