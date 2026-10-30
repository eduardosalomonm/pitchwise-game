import type { MatchMoment, MatchRun } from './match-day.ts';

export type MatchStats = {
  attacking: { correct: number; total: number };
  defending: { correct: number; total: number };
  decisions: { positive: number; neutral: number; negative: number };
  plays: { positive: number; neutral: number; negative: number };
  bookings: number;
};
export const emptyMatchStats = (): MatchStats => ({
  attacking: { correct: 0, total: 0 }, defending: { correct: 0, total: 0 },
  decisions: { positive: 0, neutral: 0, negative: 0 },
  plays: { positive: 0, neutral: 0, negative: 0 }, bookings: 0,
});

export function collectMatchStats(run: Pick<MatchRun, 'decisions' | 'results'>, moments: MatchMoment[]): MatchStats {
  const stats = emptyMatchStats();
  for (const decision of run.decisions) {
    const node = moments.find((m) => m.id === decision.momentId)?.nodes.find((n) => n.id === decision.nodeId);
    if (!node) continue;
    // Transition nodes are defensive recoveries after the ball is lost.
    const phase = node.phase === 'Attacking' ? stats.attacking : stats.defending;
    phase.total++;
    if (decision.tone === 'positive') phase.correct++;
    stats.decisions[decision.tone]++;
    if (decision.booking) stats.bookings++;
  }
  for (const result of run.results) stats.plays[result.outcome.tone]++;
  return stats;
}

export function addMatchStats(a: MatchStats, b: MatchStats): MatchStats {
  return {
    attacking: { correct: a.attacking.correct + b.attacking.correct, total: a.attacking.total + b.attacking.total },
    defending: { correct: a.defending.correct + b.defending.correct, total: a.defending.total + b.defending.total },
    decisions: { positive: a.decisions.positive + b.decisions.positive, neutral: a.decisions.neutral + b.decisions.neutral, negative: a.decisions.negative + b.decisions.negative },
    plays: { positive: a.plays.positive + b.plays.positive, neutral: a.plays.neutral + b.plays.neutral, negative: a.plays.negative + b.plays.negative },
    bookings: a.bookings + b.bookings,
  };
}

/** Counts are optional in old saves; absence is not a zero performance. */
export function parseMatchStats(value: unknown): MatchStats | undefined {
  if (!value || typeof value !== 'object') return;
  const s = value as MatchStats;
  const fields = [s.attacking?.correct, s.attacking?.total, s.defending?.correct, s.defending?.total, s.decisions?.positive, s.decisions?.neutral, s.decisions?.negative, s.plays?.positive, s.plays?.neutral, s.plays?.negative, s.bookings];
  if (!fields.every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 1000)) return;
  if (s.attacking.correct > s.attacking.total || s.defending.correct > s.defending.total) return;
  const count = s.attacking.total + s.defending.total;
  if (count !== s.decisions.positive + s.decisions.neutral + s.decisions.negative || s.attacking.correct + s.defending.correct !== s.decisions.positive || s.bookings > count) return;
  if (s.plays.positive + s.plays.neutral + s.plays.negative > count) return;
  return addMatchStats(emptyMatchStats(), s);
}
