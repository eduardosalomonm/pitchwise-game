import {
  OUR_TEAM,
  createTournament,
  finishTournamentGame,
  groupTable,
  type TournamentGame,
  type TournamentRun,
} from './tournament.ts';
import { lastGroupStakes } from './group-stakes.ts';

// Saved cups keep only the seed and our own results. Loading replays them through the
// tournament rules, so a damaged or edited save can never produce an impossible cup.
export const CUP_STORAGE_KEY = 'pitchwise-cup-v1';
type SavedResult = [gameId: string, us: number, them: number, shootoutUs?: number, shootoutThem?: number];

const ours = (game: TournamentGame) => game.home === OUR_TEAM || game.away === OUR_TEAM;

export function serializeCup(run: TournamentRun): string {
  const results: SavedResult[] = run.games
    .flat()
    .filter((game) => ours(game) && game.homeGoals !== undefined)
    .map((game) => {
      const home = game.home === OUR_TEAM;
      const us = home ? game.homeGoals! : game.awayGoals!;
      const them = home ? game.awayGoals! : game.homeGoals!;
      if (!game.penalties) return [game.id, us, them];
      const [h, a] = game.penalties;
      return [game.id, us, them, home ? h : a, home ? a : h];
    });
  return JSON.stringify({ v: 1, seed: run.seed, results });
}

export function parseSavedCup(value: string | null): TournamentRun | null {
  if (!value) return null;
  try {
    const saved = JSON.parse(value) as { v?: unknown; seed?: unknown; results?: unknown };
    if (saved.v !== 1 || !Number.isSafeInteger(saved.seed) || (saved.seed as number) < 0) return null;
    if (!Array.isArray(saved.results) || saved.results.length > 7) return null;
    let run = createTournament(saved.seed as number);
    for (const entry of saved.results as unknown[]) {
      if (!Array.isArray(entry) || typeof entry[0] !== 'string') return null;
      const [gameId, us, them, shootUs, shootThem] = entry as SavedResult;
      const shootout = shootUs === undefined ? undefined : ([shootUs, shootThem] as [number, number]);
      run = finishTournamentGame(run, gameId, us, them, shootout);
    }
    return run;
  } catch {
    return null;
  }
}

export const newCupSeed = () => {
  const value = new Uint32Array(1);
  globalThis.crypto.getRandomValues(value);
  return value[0] % 2_000_000_000;
};

/** Results of a club so far in this cup, newest last, from that club's point of view. */
export function teamForm(run: Pick<TournamentRun, 'games'>, team: string) {
  return run.games
    .flat()
    .filter((game) => (game.home === team || game.away === team) && game.homeGoals !== undefined)
    .map((game) => {
      const home = game.home === team;
      const scored = home ? game.homeGoals! : game.awayGoals!;
      const conceded = home ? game.awayGoals! : game.homeGoals!;
      const result = game.winner ? (game.winner === team ? 'W' : 'L') : scored > conceded ? 'W' : scored < conceded ? 'L' : 'D';
      return { result, score: `${scored}–${conceded}`, penalties: Boolean(game.penalties) };
    });
}

// What the last group game means for us, without promising a goal-difference tie.
export function groupStakes(run: TournamentRun): string | undefined {
  if (run.status !== 'playing') return undefined;
  if (run.round === 3) {
    const position = groupTable(run, 0).findIndex((row) => row.team === OUR_TEAM);
    return position === 0 ? 'Through as Group A winners.' : 'Through as Group A runners-up.';
  }
  if (run.round !== 2) return undefined;
  const game = run.games[2].find(ours)!;
  const other = run.games[2].find((g) => g.id.startsWith('g0-') && !ours(g))!;
  return lastGroupStakes(groupTable(run, 0), OUR_TEAM, game, other);
}

// Device-only honours across cups. A cup counts once, identified by its seed.
export const HONOURS_STORAGE_KEY = 'pitchwise-cup-honours-v1';
export type CupHonours = { cups: number; titles: number; best: number; recorded: number[] };
export const STAGE_NAMES = ['Group stage', 'Group stage', 'Group stage', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final', 'Champions'];
export const emptyHonours = (): CupHonours => ({ cups: 0, titles: 0, best: -1, recorded: [] });

/** How far we went: 0–2 group stage, 3 round of 16 … 6 final, 7 champions. */
export function cupStage(run: TournamentRun) {
  if (run.status === 'champion') return 7;
  const played = run.games.filter((round) => round.some((g) => ours(g) && g.homeGoals !== undefined)).length;
  return Math.max(0, played - 1);
}

export function recordCup(honours: CupHonours, run: TournamentRun): CupHonours {
  if (run.status === 'playing' || honours.recorded.includes(run.seed)) return honours;
  return {
    cups: honours.cups + 1,
    titles: honours.titles + Number(run.status === 'champion'),
    best: Math.max(honours.best, cupStage(run)),
    recorded: [...honours.recorded, run.seed].slice(-50),
  };
}

export function parseHonours(value: string | null): CupHonours {
  try {
    const h = JSON.parse(value ?? '') as Partial<CupHonours>;
    const count = (n: unknown) => Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) < 100000;
    if (!count(h.cups) || !count(h.titles) || (h.titles as number) > (h.cups as number)) return emptyHonours();
    const best = Number.isInteger(h.best) && (h.best as number) >= -1 && (h.best as number) <= 7 ? (h.best as number) : -1;
    const recorded = Array.isArray(h.recorded) ? h.recorded.filter((n): n is number => Number.isSafeInteger(n)).slice(-50) : [];
    return { cups: h.cups as number, titles: h.titles as number, best, recorded };
  } catch {
    return emptyHonours();
  }
}
