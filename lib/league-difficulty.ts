import { seedHash } from './tournament.ts';

export type LeagueDifficulty = 'easy' | 'intermediate' | 'hard';
export const LEAGUE_DIFFICULTIES: {
  id: LeagueDifficulty;
  name: string;
}[] = [
  {
    id: 'easy',
    name: 'Easy',
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
  },
  {
    id: 'hard',
    name: 'Hard',
  },
];
const decks: Record<LeagueDifficulty, number[]> = {
  easy: [0, 0, 0, 0, 0, 0, 1, 1],
  intermediate: [0, 1, 1, 1, 1, 1, 1, 2],
  hard: [1, 1, 2, 2, 2, 2, 2, 2],
};
/** Separate phase decks prevent a level from exhausting its attacking or defending catalogue. */
export function leaguePlayTier(
  difficulty: LeagueDifficulty,
  seed: number,
  phase: 'attack' | 'defence',
  index: number,
): number {
  const deck = decks[difficulty]
    .map((tier, slot) => ({
      tier,
      hash: seedHash(
        `league-tier/${difficulty}/${phase}/${Math.floor(index / 8)}/${slot}`,
        seed,
      ),
    }))
    .sort((a, b) => a.hash - b.hash);
  // Let the first attack/defence establish the mode before introducing adjacent tiers.
  if (index < 8) {
    const primary = { easy: 0, intermediate: 1, hard: 2 }[difficulty];
    const first = deck.findIndex((item) => item.tier === primary);
    [deck[0], deck[first]] = [deck[first], deck[0]];
  }
  return deck[index % 8].tier;
}

// A maximum season has 22 player fixtures. Two complete ten-match length decks
// require 50 attacking + 40 defending slots; the last two add at most 6 + 5.
// The primary tier occupies 6/8 slots: max 42 attacks and 35 defences. Each bucket
// receives its own rounded-up 10% reserve; transition plays count as defence only
// when a reachable outcome prevents a goal. Scoring feasibility is checked separately.
export const LEAGUE_CONTENT_REQUIREMENTS = {
  maximumFixtures: 22,
  maximumAttacks: 56,
  maximumDefences: 45,
  requiredPrimaryAttacks: 42,
  requiredPrimaryDefences: 35,
  reserve: 0.1,
  targetAttacksPerTier: 47,
  targetDefencesPerTier: 39,
} as const;
