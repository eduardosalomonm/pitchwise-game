import { playPool, bestGoalDifference } from './my-tournament-matches.ts';
import { matchFixtures, type MatchFixture } from './match-fixtures.ts';
import { leaguePlays } from './league-plays.ts';
import { easyLeaguePlays } from './league-easy-plays.ts';
import { intermediateLeaguePlays } from './league-intermediate-plays.ts';
import { hardLeaguePlays } from './league-hard-plays.ts';
import { leaguePlayTier, LEAGUE_DIFFICULTIES } from './league-difficulty.ts';
import { redCardPlays } from './red-card-plays.ts';
import { balanceChoiceOrder } from './match-choice-order.ts';
import { matchChoiceTone } from './match-feedback.ts';
import { tournamentFixture } from './tournament-fixture.ts';
import { makeCustomTeam } from './teams.ts';
import { seedHash } from './tournament.ts';
import {
  leagueIsOurs,
  leagueOpponent,
  leagueStrength,
  type League,
} from './league.ts';
import type { MatchMoment } from './match-day.ts';

const sourceFor = (p: ReturnType<typeof playPool>[number]): MatchMoment =>
  p.extra ?? matchFixtures.find((f) => f.id === p.fixtureId)!.moments[p.index];
export const expandedLeaguePlays = [
  ...easyLeaguePlays,
  ...intermediateLeaguePlays,
  ...hardLeaguePlays,
];
export function leaguePool(expanded = true) {
  return [
    ...playPool().map((p) => ({
      key: p.key,
      tier: p.tier,
      rare: false,
      moment: sourceFor(p),
    })),
    ...leaguePlays.map((p) => ({
      key: `league:${p.moment.id}`,
      rare: false,
      ...p,
    })),
    ...(expanded
      ? expandedLeaguePlays.map((p) => ({ key: `league:${p.moment.id}`, ...p }))
      : []),
  ];
}
/** Stable shuffled decks: 10% compact, 40% four, 40% five, 10% six. */
export function leagueMatchLength(seed: number, index: number) {
  const deck = [3, 4, 4, 4, 4, 5, 5, 5, 5, 6]
    .map((n, i) => ({
      n,
      key: seedHash(`league-length/${Math.floor(index / 10)}/${i}`, seed),
    }))
    .sort((a, b) => a.key - b.key);
  return deck[index % 10].n;
}
/** One possible dismissal per five player fixtures; a match never has both sides reduced. */
export function leagueRedCard(seed: number, index: number, length: number) {
  const block = Math.floor(index / 5);
  if (seedHash(`league-red-slot/${block}`, seed) % 5 !== index % 5)
    return undefined;
  const team =
    seedHash(`league-red-team/${block}`, seed) % 2
      ? ('home' as const)
      : ('away' as const);
  return {
    team,
    player: team === 'home' ? 'h-l8' : 'a-l8',
    fromMoment: Math.max(1, length - 3),
  };
}

const schedules = new Map<string, ReturnType<typeof leaguePool>[]>();
export function leaguePlaySchedule(league: League) {
  const cacheKey = JSON.stringify([league.seed, league.config]);
  const cached = schedules.get(cacheKey);
  if (cached) return cached;
  // Absence is intentional: never reroll a v35 season or its saved choice journal.
  const pool = leaguePool(Boolean(league.config.difficulty)),
    used = new Set<string>();
  let attacks = 0,
    defences = 0;
  const schedule = league.rounds.map((games, round) => {
    const game = games.find((g) => leagueIsOurs(league, g));
    if (!game) return [];
    const index = league.rounds
      .slice(0, round)
      .filter((gs) => gs.some((g) => leagueIsOurs(league, g))).length;
    const n = leagueMatchLength(league.seed, index),
      targetTier = Math.min(
        2,
        leagueStrength(league, leagueOpponent(league, game)) - 2,
      );
    const chosen: typeof pool = [];
    const rarityWindow =
      index % 5 ===
      seedHash(`league-highlight/${Math.floor(index / 5)}`, league.seed) % 5;
    // Preserve fresh content ahead of tier preferences. No repeats are necessary at this size.
    const picks = pool
      .filter((p) => !used.has(p.key))
      .map((p) => ({
        ...p,
        score: seedHash(`league-play/${round}/${p.key}`, league.seed),
      }))
      .sort((a, b) => a.score - b.score);
    const add = (
      test: (p: (typeof pool)[number]) => boolean,
      phase: 'attack' | 'defence',
    ) => {
      const options = picks.filter(
        (p) => !chosen.some((c) => c.key === p.key) && test(p),
      );
      const difficulty = league.config.difficulty;
      const tier = difficulty
        ? leaguePlayTier(
            difficulty,
            league.seed,
            phase,
            phase === 'attack' ? attacks++ : defences++,
          )
        : targetTier;
      const eligible = options.filter((p) => p.tier === tier);
      // At most one new spectacular opportunity in a five-match window. A good
      // read still earns the shot; neither this flag nor difficulty awards goals.
      const rareAllowed = rarityWindow && !chosen.some((p) => p.rare);
      const p = difficulty
        ? ((rareAllowed ? eligible.find((p) => p.rare) : undefined) ??
          eligible.find((p) => !p.rare))
        : (options.find((p) => p.tier === targetTier) ??
          options.find((p) => Math.abs(p.tier - targetTier) <= 1) ??
          options[0]);
      if (!p)
        throw new Error('The league play catalogue cannot fill this schedule.');
      chosen.push(p);
    };
    for (let i = 0; i < Math.ceil(n / 2); i++)
      add(
        (p) =>
          p.moment.phase === 'Attacking' && bestGoalDifference(p.moment) > 0,
        'attack',
      );
    while (chosen.length < n)
      add(
        (p) =>
          p.moment.phase !== 'Attacking' && bestGoalDifference(p.moment) >= 0,
        'defence',
      );
    chosen.forEach((p) => used.add(p.key));
    return chosen.sort(
      (a, b) =>
        seedHash(`league-order/${round}/${a.key}`, league.seed) -
        seedHash(`league-order/${round}/${b.key}`, league.seed),
    );
  });
  if (schedules.size >= 8) schedules.delete(schedules.keys().next().value!);
  schedules.set(cacheKey, schedule);
  return schedule;
}
export function leagueFixture(
  league: League,
  round = league.round,
): MatchFixture | undefined {
  const game = league.rounds[round]?.find((g) => leagueIsOurs(league, g));
  if (!game) return undefined;
  const home = makeCustomTeam(league.config.name, league.config.kitId),
    opponent = leagueOpponent(league, game);
  const selected = [...leaguePlaySchedule(league)[round]];
  let redCard: MatchFixture['redCard'];
  const specialUsage = new Map<string, number>();
  // Reconstruct special allocation too, so reloading cannot change the dismissal or plays.
  let index = 0;
  for (let r = 0; r <= round; r++) {
    if (!league.rounds[r].some((g) => leagueIsOurs(league, g))) continue;
    const length = leagueMatchLength(league.seed, index);
    const card = leagueRedCard(league.seed, index++, length);
    if (!card) continue;
    const remaining = length - card.fromMoment;
    const picks = redCardPlays
      .filter((p) => p.team === card.team)
      .sort(
        (a, b) =>
          (specialUsage.get(a.moment.id) ?? 0) -
            (specialUsage.get(b.moment.id) ?? 0) ||
          seedHash(`league-red-pick/${r}/${a.moment.id}`, league.seed) -
            seedHash(`league-red-pick/${r}/${b.moment.id}`, league.seed),
      );
    const usedHere = new Set<string>();
    const chosen: typeof picks = [];
    for (let slot = 0; slot < remaining; slot++) {
      const attack =
        card.team === 'away' ? slot < Math.min(2, remaining) : slot === 0;
      const p = picks.find(
        (p) =>
          !usedHere.has(p.moment.id) &&
          (p.moment.phase === 'Attacking') === attack,
      )!;
      if (!p) throw new Error('Missing dismissal scenario.');
      usedHere.add(p.moment.id);
      chosen.push(p);
      specialUsage.set(p.moment.id, (specialUsage.get(p.moment.id) ?? 0) + 1);
    }
    if (r === round) {
      redCard = card;
      // Sort attacks/defence within the remaining card phase, not always attack first.
      const mixed = chosen.sort(
        (a, b) =>
          seedHash(`league-red-order/${r}/${a.moment.id}`, league.seed) -
          seedHash(`league-red-order/${r}/${b.moment.id}`, league.seed),
      );
      selected.splice(
        card.fromMoment,
        remaining,
        ...mixed.map((p) => ({
          key: `red:${p.moment.id}`,
          tier: p.tier,
          rare: false,
          moment: p.moment,
        })),
      );
    }
  }
  const moments = selected.map((p, i) => {
    const source: MatchFixture = {
      ...matchFixtures[0],
      opponent: undefined,
      moments: [p.moment],
    };
    const renamed = tournamentFixture(source, opponent, home).moments[0];
    const introduction = renamed.introduction.startsWith(`${opponent}: `)
      ? renamed.nodes[0].context
      : renamed.introduction;
    return {
      ...renamed,
      minute: Math.round(8 + (i * 80) / (selected.length - 1)),
      introduction,
      nodes: renamed.nodes.map((node) => ({
        ...node,
        choices: node.choices.map((c) => ({
          ...c,
          tone: matchChoiceTone(node, c),
        })),
      })),
    };
  });
  return {
    id: `league-${league.seed}-${game.id}`,
    name: `League · Matchweek ${round + 1}`,
    home,
    opponent,
    difficulty:
      (LEAGUE_DIFFICULTIES.find((d) => d.id === league.config.difficulty)
        ?.name as MatchFixture['difficulty']) ?? 'Intermediate',
    description: '',
    cover: '/illustrations/actions/match-celebration.webp',
    redCard,
    moments: balanceChoiceOrder(moments, `${league.seed}/${game.id}`),
  };
}
