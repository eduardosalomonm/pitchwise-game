import { teams, validClubName, KIT_PRESETS } from './teams.ts';
import { goals, seedHash, type TableRow, type TournamentGame } from './tournament.ts';

// My Tournament: the player's own club against random rivals whose strength is drawn
// per tournament. 8, 16 or 32 teams in groups of four; the top two of each group go
// into a knockout bracket. Advanced settings choose difficulty, match length and size.
export const MY_DIFFICULTIES = ['easy', 'intermediate', 'hard'] as const;
export type MyDifficulty = (typeof MY_DIFFICULTIES)[number];
export const MY_SIZES = [8, 16, 32] as const;
export type MySize = (typeof MY_SIZES)[number];
export const MY_LENGTHS = ['short', 'standard', 'long'] as const;
export type MyLength = (typeof MY_LENGTHS)[number];
export type MyTeamChoice = { name: string; kitId: string; difficulty?: MyDifficulty; size?: MySize; length?: MyLength };
/** Older saves predate the difficulty choice and were the current hard mix. */
export const difficultyOf = (cup: Pick<MyCup, 'team'>): MyDifficulty => cup.team.difficulty ?? 'hard';
export const sizeOf = (cup: Pick<MyCup, 'team'>): MySize => cup.team.size ?? 16;
export const lengthOf = (cup: Pick<MyCup, 'team'>): MyLength => cup.team.length ?? 'standard';
const KNOCKOUT_NAMES = ['Round of 16', 'Quarter-final', 'Semi-final', 'Final'];
/** Round names for a tournament of this size: three group games, then the bracket. */
export function myRoundNames(cup: Pick<MyCup, 'team'>) {
  const knockouts = Math.log2(sizeOf(cup) / 4) + 1;
  return ['Group game 1', 'Group game 2', 'Group game 3', ...KNOCKOUT_NAMES.slice(4 - knockouts)];
}
export type MyCup = {
  seed: number;
  team: MyTeamChoice;
  /** Rival difficulty, 2 (weakest) to 5 (elite). Our club is level 3. */
  levels: Record<string, number>;
  groups: string[][];
  round: number;
  games: TournamentGame[][];
  status: 'playing' | 'champion' | 'eliminated';
  champion?: string;
  /** Earlier rounds retain the pre-update play allocation when restoring an older cup. */
  pacingFromRound?: number;
};
const LEVEL_RATING: Record<number, number> = { 2: 70, 3: 77, 4: 83, 5: 89 };
const OUR_LEVEL = 3;
const schedule = [
  [[0, 1], [2, 3]],
  [[0, 2], [3, 1]],
  [[0, 3], [1, 2]],
] as const;

const shuffle = <T,>(items: T[], seed: number, salt: string) =>
  items
    .map((item, i) => ({ item, key: seedHash(`${salt}/${i}`, seed) }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);

export function levelOf(cup: MyCup, team: string) {
  return team === cup.team.name ? OUR_LEVEL : (cup.levels[team] ?? 3);
}
export const isOurs = (cup: MyCup, game: TournamentGame) => game.home === cup.team.name || game.away === cup.team.name;

export function createMyCup(seed: number, team: MyTeamChoice): MyCup {
  if (!validClubName(team.name) || !KIT_PRESETS.some((k) => k.id === team.kitId)) throw new Error('Invalid team.');
  if (team.difficulty !== undefined && !MY_DIFFICULTIES.includes(team.difficulty)) throw new Error('Invalid difficulty.');
  if (team.size !== undefined && !MY_SIZES.includes(team.size)) throw new Error('Invalid size.');
  if (team.length !== undefined && !MY_LENGTHS.includes(team.length)) throw new Error('Invalid length.');
  const groupCount = (team.size ?? 16) / 4;
  const rivals = shuffle(teams.slice(1).map((t) => t.name), seed, 'clubs').slice(0, groupCount * 4 - 1);
  // One pot per strength level: elite, strong, solid, and underdogs (one fewer: our slot).
  const slots = [5, 4, 3, 2].flatMap((level, i) => Array(i === 3 ? groupCount - 1 : groupCount).fill(level));
  const levels = Object.fromEntries(shuffle(rivals, seed, 'levels').map((name, i) => [name, slots[i]]));
  const pot = (level: number) => shuffle(rivals.filter((n) => levels[n] === level), seed, `pot${level}`);
  const [elite, strong, solid, under] = [pot(5), pot(4), pot(3), pot(2)];
  // Our group meets a solid, a strong and an elite side, in that order.
  const groups = [
    [team.name, solid[0], strong[0], elite[0]],
    ...Array.from({ length: groupCount - 1 }, (_, i) => i + 1).map((g) => [elite[g], strong[g], solid[g], under[g - 1]]),
  ];
  return {
    seed,
    team,
    levels,
    groups,
    round: 0,
    status: 'playing',
    games: schedule.map((pairs, round) =>
      groups.flatMap((group, g) => pairs.map(([h, a], i) => ({ id: `m${g}-r${round}-${i}`, home: group[h], away: group[a] }))),
    ),
  };
}

export function myGroupTable(cup: MyCup, group: number): TableRow[] {
  const rows = cup.groups[group].map((team) => ({ team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }));
  for (const game of cup.games.slice(0, 3).flat()) {
    if (game.homeGoals === undefined || game.awayGoals === undefined) continue;
    const home = rows.find((r) => r.team === game.home), away = rows.find((r) => r.team === game.away);
    if (!home || !away) continue;
    home.played++; away.played++;
    home.gf += game.homeGoals; home.ga += game.awayGoals;
    away.gf += game.awayGoals; away.ga += game.homeGoals;
    if (game.homeGoals > game.awayGoals) { home.won++; away.lost++; home.points += 3; }
    else if (game.homeGoals < game.awayGoals) { away.won++; home.lost++; away.points += 3; }
    else { home.drawn++; away.drawn++; home.points++; away.points++; }
  }
  return rows.sort(
    (a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || seedHash(a.team, cup.seed) - seedHash(b.team, cup.seed),
  );
}

export function currentMyGame(cup: MyCup) {
  if (cup.status !== 'playing') return undefined;
  return cup.games[cup.round]?.find((g) => isOurs(cup, g));
}
export const myOpponent = (cup: MyCup, game: TournamentGame) => (game.home === cup.team.name ? game.away : game.home);

function simulate(cup: MyCup, game: TournamentGame, knockout: boolean): TournamentGame {
  const edge = (LEVEL_RATING[levelOf(cup, game.home)] - LEVEL_RATING[levelOf(cup, game.away)]) / 22;
  const homeGoals = goals(1.3 * Math.exp(edge / 2), `my/${game.id}/home`, cup.seed);
  const awayGoals = goals(1.3 * Math.exp(-edge / 2), `my/${game.id}/away`, cup.seed + 19);
  const homeWins = homeGoals > awayGoals || (homeGoals === awayGoals && seedHash(`my/${game.id}`, cup.seed) % 100 < 50 + Math.round(edge * 10));
  return {
    ...game,
    homeGoals,
    awayGoals,
    ...(knockout
      ? { winner: homeWins ? game.home : game.away, ...(homeGoals === awayGoals ? { penalties: (homeWins ? [5, 4] : [4, 5]) as [number, number] } : {}) }
      : {}),
  };
}

function advance(cup: MyCup) {
  if (cup.round < 2) {
    cup.round++;
    return;
  }
  if (cup.round === 2) {
    const t = cup.groups.map((_, g) => myGroupTable(cup, g));
    // Each group's qualifiers sit in opposite halves of the bracket (A1–B2 … then B1–A2 …).
    const half = Array.from({ length: t.length / 2 }, (_, i) => i);
    const pairs = [...half.map((i) => [t[2 * i][0], t[2 * i + 1][1]]), ...half.map((i) => [t[2 * i + 1][0], t[2 * i][1]])];
    cup.games.push(pairs.map(([h, a], i) => ({ id: `mk3-${i}`, home: h.team, away: a.team })));
  } else if (cup.games[cup.round].length > 1) {
    const winners = cup.games[cup.round].map((g) => g.winner!);
    cup.games.push(
      winners.filter((_, i) => i % 2 === 0).map((home, i) => ({ id: `mk${cup.round + 1}-${i}`, home, away: winners[i * 2 + 1] })),
    );
  } else {
    cup.champion = cup.games[cup.round][0].winner;
    cup.status = cup.champion === cup.team.name ? 'champion' : 'eliminated';
    return;
  }
  cup.round++;
}

// A completed fixture is immutable; stale or repeated submissions are rejected.
export function finishMyGame(cup: MyCup, gameId: string, us: number, them: number, shootout?: [number, number]): MyCup {
  const game = currentMyGame(cup);
  if (!game || game.id !== gameId || game.homeGoals !== undefined) throw new Error('This fixture is not active.');
  if (![us, them].every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 9)) throw new Error('Invalid match score.');
  const knockout = cup.round >= 3;
  const tied = us === them;
  if (knockout && tied && (!shootout || !shootout.every((n) => Number.isSafeInteger(n) && n >= 0) || shootout[0] === shootout[1]))
    throw new Error('A tied knockout needs a completed shootout.');
  const next = structuredClone(cup);
  const home = game.home === cup.team.name;
  next.games[next.round] = next.games[next.round].map((item) =>
    item.id === gameId
      ? {
          ...item,
          homeGoals: home ? us : them,
          awayGoals: home ? them : us,
          ...(knockout
            ? {
                winner: us > them || (tied && shootout![0] > shootout![1]) ? cup.team.name : myOpponent(cup, game),
                ...(tied ? { penalties: (home ? shootout : [shootout![1], shootout![0]]) as [number, number] } : {}),
              }
            : {}),
        }
      : simulate(next, item, knockout),
  );
  advance(next);
  if (next.status === 'playing' && !currentMyGame(next)) {
    while (!next.champion) {
      next.games[next.round] = next.games[next.round].map((item) => simulate(next, item, true));
      advance(next);
    }
    next.status = 'eliminated';
  }
  return next;
}

/** 0–2 group stage, 3 quarter-final, 4 semi-final, 5 final, 6 champions. */
/** How far we went, on a scale shared by every size: 0 group … 4 final, 5 champions. */
export const MY_STAGE_NAMES = ['Group stage', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final', 'Champions'];
export function myStage(cup: MyCup) {
  if (cup.status === 'champion') return 5;
  const played = cup.games.filter((round) => round.some((g) => isOurs(cup, g) && g.homeGoals !== undefined)).length;
  const name = myRoundNames(cup)[Math.max(0, played - 1)];
  return name.startsWith('Group') ? 0 : MY_STAGE_NAMES.indexOf(name);
}

// Saved as seed, club and our results; loading replays them through the rules above.
export const MY_CUP_STORAGE_KEY = 'pitchwise-my-cup-v1';
export function serializeMyCup(cup: MyCup) {
  const results = cup.games
    .flat()
    .filter((g) => isOurs(cup, g) && g.homeGoals !== undefined)
    .map((g) => {
      const home = g.home === cup.team.name;
      const us = home ? g.homeGoals! : g.awayGoals!;
      const them = home ? g.awayGoals! : g.homeGoals!;
      if (!g.penalties) return [g.id, us, them];
      const [h, a] = g.penalties;
      return [g.id, us, them, home ? h : a, home ? a : h];
    });
  return JSON.stringify({ v: 1, seed: cup.seed, team: cup.team, results, pacingFromRound: cup.pacingFromRound ?? 0 });
}
export function parseSavedMyCup(value: string | null): MyCup | null {
  if (!value) return null;
  try {
    const saved = JSON.parse(value) as { v?: unknown; seed?: unknown; team?: MyTeamChoice; results?: unknown; pacingFromRound?: unknown };
    if (saved.v !== 1 || !Number.isSafeInteger(saved.seed) || (saved.seed as number) < 0) return null;
    if (!saved.team || typeof saved.team !== 'object' || !Array.isArray(saved.results) || saved.results.length > 7) return null;
    const pacingFromRound = saved.pacingFromRound === undefined ? saved.results.length : saved.pacingFromRound;
    if (!Number.isSafeInteger(pacingFromRound) || (pacingFromRound as number) < 0 || (pacingFromRound as number) > saved.results.length) return null;
    const { name, kitId, difficulty, size, length } = saved.team;
    let cup = createMyCup(saved.seed as number, { name, kitId, ...(difficulty ? { difficulty } : {}), ...(size ? { size } : {}), ...(length ? { length } : {}) });
    if (pacingFromRound) cup.pacingFromRound = pacingFromRound as number;
    for (const entry of saved.results as unknown[]) {
      if (!Array.isArray(entry) || typeof entry[0] !== 'string') return null;
      const [id, us, them, su, st] = entry as [string, number, number, number?, number?];
      cup = finishMyGame(cup, id, us, them, su === undefined ? undefined : [su, st!]);
    }
    return cup;
  } catch {
    return null;
  }
}

// Last-group stakes use conservative points guarantees, not sample margins.
export function myGroupStakes(cup: MyCup): string | undefined {
  if (cup.status !== 'playing') return undefined;
  if (cup.round === 3) return myGroupTable(cup, 0)[0].team === cup.team.name ? 'Through as Group A winners.' : 'Through as Group A runners-up.';
  if (cup.round !== 2) return undefined;
  const game = cup.games[2].find((g) => isOurs(cup, g))!;
  const other = cup.games[2].find((g) => g.id.startsWith('m0-') && !isOurs(cup, g))!;
  return lastGroupStakes(myGroupTable(cup, 0), cup.team.name, game, other);
}

// v2: `best` uses the size-independent stage scale above.
export const MY_HONOURS_STORAGE_KEY = 'pitchwise-my-cup-honours-v2';
export type MyHonours = { played: number; titles: number; best: number; recorded: number[] };
export const emptyMyHonours = (): MyHonours => ({ played: 0, titles: 0, best: -1, recorded: [] });
export function recordMyCup(h: MyHonours, cup: MyCup): MyHonours {
  if (cup.status === 'playing' || h.recorded.includes(cup.seed)) return h;
  return {
    played: h.played + 1,
    titles: h.titles + Number(cup.status === 'champion'),
    best: Math.max(h.best, myStage(cup)),
    recorded: [...h.recorded, cup.seed].slice(-50),
  };
}
export function parseMyHonours(value: string | null): MyHonours {
  try {
    const h = JSON.parse(value ?? '') as Partial<MyHonours>;
    const n = (x: unknown) => Number.isSafeInteger(x) && (x as number) >= 0 && (x as number) < 100000;
    if (!n(h.played) || !n(h.titles) || (h.titles as number) > (h.played as number)) return emptyMyHonours();
    const best = Number.isInteger(h.best) && (h.best as number) >= -1 && (h.best as number) <= 5 ? (h.best as number) : -1;
    return { played: h.played as number, titles: h.titles as number, best, recorded: Array.isArray(h.recorded) ? h.recorded.filter(Number.isSafeInteger).slice(-50) : [] };
  } catch {
    return emptyMyHonours();
  }
}
import { lastGroupStakes } from './group-stakes.ts';
