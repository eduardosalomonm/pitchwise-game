import { addMatchStats, emptyMatchStats, parseMatchStats, type MatchStats } from './match-stats.ts';

// Story copy for the two cups: what each round means before kick-off and how the final
// whistle feels. Narrative only — never a hint about the tactical answer.
export type CupKind = 'readers' | 'my';
export type CupOutcome = 'playing' | 'champion' | 'eliminated';

const READERS_ROUNDS = ['Group game 1', 'Group game 2', 'Group game 3', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];
const MY_ROUNDS = ['Group game 1', 'Group game 2', 'Group game 3', 'Quarter-final', 'Semi-final', 'Final'];
export const cupRoundNames = (kind: CupKind) => (kind === 'readers' ? READERS_ROUNDS : MY_ROUNDS);

const nextStage: Record<string, string> = {
  'Round of 16': 'Into the quarter-finals!',
  'Quarter-final': 'Into the semi-finals!',
  'Semi-final': 'WE’RE IN THE FINAL!',
  Final: 'CHAMPIONS!',
};

/**
 * Full-time copy in a cup. `outcome` is the cup state after this result and `qualified`
 * says whether we are through after the last group game.
 */
export function cupFullTime(kind: CupKind, round: number, us: number, them: number, opponent: string, outcome: CupOutcome, names = cupRoundNames(kind)) {
  const name = names[round];
  const won = us > them;
  const drew = us === them;
  const score = `${us}–${them}`;
  if (round < 3) {
    if (round === 2) {
      if (outcome === 'eliminated') return { title: 'Out in the group stage.', detail: `${opponent} end our group ${score}. We go again next time.` };
      return won
        ? { title: 'Through to the knockouts!', detail: `${score} against ${opponent}. The real cup starts now.` }
        : { title: 'Through — just!', detail: `${drew ? 'A draw' : 'Even in defeat'} against ${opponent} is enough. The knockouts await.` };
    }
    if (won) return round === 0 ? { title: 'A winning start!', detail: `Three points against ${opponent}. The group is ours to lose.` } : { title: 'Three more points!', detail: `${score} against ${opponent}. The knockouts are getting closer.` };
    if (drew) return { title: 'A point on the board.', detail: `${opponent} made it hard. Everything is still to play for.` };
    return round === 0 ? { title: 'A bump in the road.', detail: `${opponent} take the points. Two games to put it right.` } : { title: 'The pressure is on.', detail: `${opponent} win ${them}–${us}. The last group game decides everything.` };
  }
  if (won) {
    if (name === 'Final') return { title: 'CHAMPIONS!', detail: `${score} against ${opponent} in the final. The trophy is ours.` };
    return { title: nextStage[name], detail: `${opponent} beaten ${score}. ${name === 'Semi-final' ? 'One more match for the trophy.' : 'The cup run goes on.'}` };
  }
  if (name === 'Final') return { title: 'So close.', detail: `${opponent} win the final ${them}–${us}. Runners-up — and what a run it was.` };
  return { title: `Out in the ${name.toLowerCase()}.`, detail: `${opponent} end our run ${them}–${us}. We go again.` };
}

/** Penalty shootout result copy for knockout rounds. */
export function cupShootout(kind: CupKind, round: number, won: boolean, names = cupRoundNames(kind)) {
  const name = names[round];
  if (won) return name === 'Final' ? { title: 'CHAMPIONS ON PENALTIES!', detail: 'Ice in the veins. The trophy is ours.' } : { title: 'Nerves of steel.', detail: `Through on penalties. ${nextStage[name] ?? ''}`.trim() };
  return name === 'Final' ? { title: 'Heartbreak.', detail: 'Beaten on penalties in the final. Runners-up, heads high.' } : { title: 'A tough exit.', detail: `Out on penalties in the ${name.toLowerCase()}.` };
}

// Reading performance across a cup, stored per cup seed on the device.
export type CupReads = { seed: number; reads: Record<string, number>; standouts: Record<string, number>; details?: Record<string, MatchStats> };
export type CupReadingSummary = { accuracy: number; player?: string; awards: number; details?: { matches: number; totalMatches: number; stats: MatchStats } };

function readCupReads(value: string | null, seed: number): CupReads {
  const current: CupReads = { seed, reads: {}, standouts: {} };
  try {
    const parsed = JSON.parse(value ?? '') as CupReads;
    if (parsed?.seed === seed && parsed.reads && typeof parsed.reads === 'object' && !Array.isArray(parsed.reads) && parsed.standouts && typeof parsed.standouts === 'object' && !Array.isArray(parsed.standouts)) {
      current.reads = Object.fromEntries(Object.entries(parsed.reads).filter(([, n]) => Number.isInteger(n) && n >= 0 && n <= 100));
      current.standouts = Object.fromEntries(Object.entries(parsed.standouts).filter(([, n]) => Number.isSafeInteger(n) && n >= 0 && n <= 1000));
      if (parsed.details && typeof parsed.details === 'object' && !Array.isArray(parsed.details)) {
        const details = Object.fromEntries(Object.entries(parsed.details).flatMap(([id, value]) => {
          const stats = parseMatchStats(value);
          return stats && Object.hasOwn(current.reads, id) ? [[id, stats]] : [];
        }));
        if (Object.keys(details).length) current.details = details;
      }
    }
  } catch {
    /* Start fresh. */
  }
  return current;
}

export function recordCupReads(value: string | null, seed: number, gameId: string, accuracy: number, standout?: string, detail?: MatchStats): CupReads {
  const current = readCupReads(value, seed);
  const stats = parseMatchStats(detail);
  if (Object.hasOwn(current.reads, gameId))
    return stats && !current.details?.[gameId] ? { ...current, details: { ...current.details, [gameId]: stats } } : current;
  return {
    seed,
    reads: { ...current.reads, [gameId]: Math.max(0, Math.min(100, Math.round(accuracy))) },
    standouts: standout ? { ...current.standouts, [standout]: (current.standouts[standout] ?? 0) + 1 } : current.standouts,
    ...(current.details || stats ? { details: { ...current.details, ...(stats ? { [gameId]: stats } : {}) } } : {}),
  };
}
export function cupReadsSummary(value: string | null, seed: number): CupReadingSummary | null {
  try {
    const parsed = readCupReads(value, seed);
    const values = Object.values(parsed.reads);
    if (!values.length) return null;
    const [player, awards] = Object.entries(parsed.standouts).sort((a, b) => b[1] - a[1])[0] ?? [];
    const details = Object.values(parsed.details ?? {});
    return {
      accuracy: Math.round(values.reduce((a, b) => a + b, 0) / values.length), player, awards: awards ?? 0,
      ...(details.length ? { details: { matches: details.length, totalMatches: values.length, stats: details.reduce(addMatchStats, emptyMatchStats()) } } : {}),
    };
  } catch {
    return null;
  }
}
