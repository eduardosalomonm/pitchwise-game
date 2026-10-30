import { balanceChoiceOrder } from './match-choice-order.ts';
import { matchChoiceTone } from './match-feedback.ts';
import { matchFixtures, type MatchFixture } from './match-fixtures.ts';
import { closingMoment } from './tournament-stories.ts';
import type { MatchMoment } from './match-day.ts';
import { tournamentFixture } from './tournament-fixture.ts';
import { makeCustomTeam } from './teams.ts';
import { seedHash } from './tournament.ts';
import { PLAY_TITLES } from './play-titles.ts';
import { tournamentPlays } from './my-tournament-plays.ts';
import {
  difficultyOf,
  isOurs,
  lengthOf,
  levelOf,
  myOpponent,
  myRoundNames,
  type MyCup,
  type MyDifficulty,
} from './my-tournament.ts';

// Every My Tournament match is assembled from the authored plays: the opponent's level
// and the round decide how hard the plays are; length sets their number. Plays never repeat
// within one tournament, and each match carries enough scoring chances that reading
// every situation correctly wins it.
const ATTACK_LINES = [
  '{minute} minutes in and the ball is ours. {opponent} are trying to close every gap.',
  'We win it back from {opponent}. Look up before you play.',
  'A chance to hurt {opponent}. Their shape is shifting — read it.',
  'Our move. {opponent} wait for a mistake.',
];
const DEFEND_LINES = [
  '{opponent} are coming at us. Read the danger before it arrives.',
  '{minute} minutes gone and {opponent} have the ball in our half.',
  'Pressure from {opponent}. One wrong step and they are through.',
  '{opponent} push forward. Stay calm and see the whole picture.',
];
type PoolMoment = {
  key: string;
  fixtureId: string;
  index: number;
  tier: number;
  attacking: boolean;
  goal: boolean;
  extra?: MatchMoment;
};

const TIER: Record<string, number> = {
  Easy: 0,
  Standard: 1,
  Intermediate: 1,
  Advanced: 2,
  Hard: 2,
  Expert: 2,
};
let pool: PoolMoment[] | undefined;
export function playPool(): PoolMoment[] {
  const describe = (moment: MatchMoment) => ({
    attacking: moment.phase === 'Attacking',
    goal: bestGoalDifference(moment) > 0,
  });
  pool ??= [
    ...matchFixtures.flatMap((fixture) =>
      fixture.moments.map((moment, index) => ({
        key: `${fixture.id}:${index}`,
        fixtureId: fixture.id,
        index,
        tier: TIER[fixture.difficulty] ?? 1,
        ...describe(moment),
      })),
    ),
    // Plays written only for My Tournament.
    ...tournamentPlays.map(({ tier, moment }) => ({
      key: `my:${moment.id}`,
      fixtureId: 'my-cup',
      index: 0,
      tier,
      ...describe(moment),
      extra: moment,
    })),
  ];
  return pool;
}

// How many easy / intermediate / hard plays each stage uses, per chosen difficulty.
// Stages: group games 1–3, an early knockout (round of 16 / quarter-final), the
// semi-final and the final. Every mode contains all three tiers and builds to the final.
export const TIER_MIX: Record<MyDifficulty, [number, number, number][]> = {
  easy: [
    [3, 0, 0],
    [3, 1, 0],
    [2, 2, 0],
    [2, 1, 1],
    [2, 1, 1],
    [2, 2, 1],
  ],
  intermediate: [
    [2, 1, 0],
    [1, 3, 0],
    [1, 2, 1],
    [0, 3, 1],
    [0, 2, 2],
    [1, 2, 2],
  ],
  hard: [
    [1, 1, 1],
    [0, 2, 2],
    [0, 1, 3],
    [0, 1, 3],
    [0, 1, 3],
    [0, 1, 4],
  ],
};
const STAGE_BY_NAME: Record<string, number> = {
  'Round of 16': 3,
  'Quarter-final': 3,
  'Semi-final': 4,
  Final: 5,
};
export function stageOf(cup: Pick<MyCup, 'team'>, round: number) {
  return round < 3 ? round : STAGE_BY_NAME[myRoundNames(cup)[round]];
}
/** Four / five / six regular plays; the final gets one more. Knockouts also add the clock decision. */
export function playsFor(cup: Pick<MyCup, 'team' | 'pacingFromRound'>, round: number) {
  const stage = stageOf(cup, round);
  // Reconstruct pre-update history so resumed cups do not repeat already-seen plays.
  const legacy = round < (cup.pacingFromRound ?? 0);
  const base = legacy ? (stage < 3 ? [3, 4, 4][stage] : stage === 5 ? 5 : 4) : stage === 5 ? 6 : 5;
  const length = lengthOf(cup);
  return Math.max(
    2,
    base + (length === 'short' ? -1 : length === 'long' ? 1 : 0),
  );
}
/** The tier of each play in a match. Knockout rivals nudge one play harder (elite) or easier. */
export function tierPlan(
  difficulty: MyDifficulty,
  stage: number,
  level: number,
  plays = TIER_MIX[difficulty][stage].reduce((a, b) => a + b, 0),
): number[] {
  const mix = [...TIER_MIX[difficulty][stage]];
  if (stage >= 3 && level >= 5 && mix[1] > 0) {
    mix[1]--;
    mix[2]++;
  } else if (stage >= 3 && level <= 3 && mix[1] > 0 && mix[2] > 1) {
    mix[2]--;
    mix[1]++;
  }
  // Hamilton apportionment changes length without turning Short into another mode.
  const total = mix.reduce((a, b) => a + b, 0);
  const quotas = mix.map((count) => (count * plays) / total);
  const counts = quotas.map(Math.floor);
  const main = { easy: 0, intermediate: 1, hard: 2 }[difficulty];
  const remainders = [0, 1, 2].sort(
    (a, b) =>
      quotas[b] - counts[b] - (quotas[a] - counts[a]) ||
      Number(b === main) - Number(a === main) ||
      a - b,
  );
  const remaining = plays - counts.reduce((a, b) => a + b, 0);
  for (let i = 0; i < remaining; i++) counts[remainders[i]]++;
  return counts.flatMap((count, tier) => Array(count).fill(tier));
}

/** Scoring feasibility follows reachable choices, not verdict labels or orphan nodes. */
export function bestGoalDifference(moment: MatchMoment): number {
  const visiting = new Set<string>();
  const memo = new Map<string, number>();
  function best(id: string): number {
    if (visiting.has(id))
      throw new Error(`Cyclic match graph: ${moment.id}/${id}`);
    if (memo.has(id)) return memo.get(id)!;
    const node = moment.nodes.find((n) => n.id === id);
    if (!node) throw new Error(`Missing match node: ${moment.id}/${id}`);
    visiting.add(id);
    const value = Math.max(
      ...node.choices.map((c) =>
        c.outcome
          ? c.outcome.homeGoals - c.outcome.awayGoals
          : best(c.nextNodeId!),
      ),
    );
    visiting.delete(id);
    memo.set(id, value);
    return value;
  }
  return best(moment.rootNodeId);
}

const shuffle = <T>(items: T[], seed: number, salt: string) =>
  items
    .map((item, i) => ({ item, key: seedHash(`${salt}/${i}`, seed) }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);

function pickPlays(
  seed: number,
  round: number,
  plan: number[],
  used: Set<string>,
) {
  const n = plan.length;
  const fresh = (m: PoolMoment) => !used.has(m.key);
  const ordered = shuffle(playPool(), seed, `plays/${round}`);
  const slots = shuffle(plan, seed, `slots/${round}`);
  // Lead with a tier from the plan that still has an unused scoring chance.
  const lead = slots.findIndex((tier) =>
    playPool().some((m) => m.tier === tier && m.goal && !used.has(m.key)),
  );
  if (lead > 0) [slots[0], slots[lead]] = [slots[lead], slots[0]];
  const chosen: PoolMoment[] = [];
  const find = (test: (m: PoolMoment) => boolean) =>
    ordered.find((m) => !chosen.includes(m) && test(m));
  // Reserve a reachable scoring chance somewhere in the match, not necessarily at kickoff.
  const goalsWanted = Math.ceil(n / 2);
  slots.forEach((tier, i) => {
    const want =
      i < goalsWanted
        ? (m: PoolMoment) => m.goal
        : i === goalsWanted
          ? (m: PoolMoment) => !m.attacking && !m.goal
          : () => true;
    const sameTier = (m: PoolMoment) => m.tier === tier && fresh(m);
    chosen.push(
      i === 0
        ? (find((m) => sameTier(m) && want(m)) ??
            find((m) => fresh(m) && want(m)) ??
            find(want) ??
            find(() => true)!)
        : (find((m) => sameTier(m) && want(m)) ??
            find(sameTier) ??
            find((m) => fresh(m) && want(m)) ??
            find(fresh) ??
            find(() => true)!),
    );
  });
  return shuffle(chosen, seed, `order/${round}`);
}

/** The plays for every round up to `round`, so earlier matches never repeat later. */
export function myCupPlays(cup: MyCup, round: number) {
  const used = new Set<string>();
  let plays: PoolMoment[] = [];
  for (let r = 0; r <= round; r++) {
    const game = cup.games[r]?.find((g) => isOurs(cup, g));
    if (!game) break;
    plays = pickPlays(
      cup.seed,
      r,
      tierPlan(
        difficultyOf(cup),
        stageOf(cup, r),
        levelOf(cup, myOpponent(cup, game)),
        playsFor(cup, r),
      ),
      used,
    );
    for (const p of plays) used.add(p.key);
  }
  return plays;
}

export function myCupFixture(cup: MyCup, round: number): MatchFixture {
  const game = cup.games[round].find((g) => isOurs(cup, g))!;
  const opponent = myOpponent(cup, game);
  const home = makeCustomTeam(cup.team.name, cup.team.kitId);
  const plays = myCupPlays(cup, round);
  const minute = (i: number) =>
    plays.length === 1 ? 45 : Math.round(6 + (i * 78) / (plays.length - 1));
  const moments: MatchMoment[] = plays.map((play, i): MatchMoment => {
    const source = play.extra
      ? { ...matchFixtures[0], opponent: undefined, moments: [play.extra] }
      : matchFixtures.find((f) => f.id === play.fixtureId)!;
    const moment = tournamentFixture(source, opponent, home).moments[
      play.extra ? 0 : play.index
    ];
    // Borrowed training plays open with "Club: title."; give them match context instead.
    const templated = moment.introduction.startsWith(`${opponent}: `);
    const lines = moment.phase === 'Attacking' ? ATTACK_LINES : DEFEND_LINES;
    return {
      ...moment,
      name: PLAY_TITLES[moment.id] ?? moment.name,
      introduction: templated
        ? lines[seedHash(`${moment.id}/${round}`, cup.seed) % lines.length]
            .replaceAll('{opponent}', opponent)
            .replace('{minute}', String(minute(i)))
        : moment.introduction,
      minute: minute(i),
      // Older fixtures keep their verdict in a shared helper; make it explicit here.
      nodes: moment.nodes.map((node) => ({
        ...node,
        choices: node.choices.map((c) => ({
          ...c,
          tone: matchChoiceTone(node, c),
        })),
      })),
    };
  });
  // Knockouts end with a score-aware stoppage-time decision, recomputed live by the match.
  // The clock plan follows the knockout stage (round of 16 … final), not the round number.
  const clock = {
    'Round of 16': 3,
    'Quarter-final': 4,
    'Semi-final': 5,
    Final: 6,
  }[myRoundNames(cup)[round]];
  if (round >= 3 && clock)
    moments.push(closingMoment(`cup-${clock}-clock`, 0, 0));
  return {
    id: 'my-cup',
    name: `My Tournament · ${myRoundNames(cup)[round]}`,
    opponent,
    home,
    difficulty: (
      { easy: 'Easy', intermediate: 'Intermediate', hard: 'Hard' } as const
    )[difficultyOf(cup)],
    description: '',
    cover: '/illustrations/actions/match-celebration.webp',
    moments: balanceChoiceOrder(moments, `my-${cup.seed}-${round}`),
  };
}
