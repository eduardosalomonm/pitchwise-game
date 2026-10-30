import type { MatchRun } from './match-day';

export type MatchRating = {
  reads: number;
  decisions: number;
  accuracy: number;
  stars: 0 | 1 | 2 | 3;
  grade: string;
  standout?: { actor: string; reads: number };
};

const grades = ['Rusty reading', 'Getting there', 'Sharp eyes', 'Game reader'] as const;

// A full-time verdict on the decisions, separate from the score: a lucky 1–0 and a
// well-read 1–0 are different matches.
export function rateMatch(run: Pick<MatchRun, 'decisions'>): MatchRating {
  const decisions = run.decisions.length;
  const good = run.decisions.filter((decision) => decision.tone === 'positive');
  const accuracy = decisions ? Math.round((good.length / decisions) * 100) : 0;
  const stars = accuracy >= 85 ? 3 : accuracy >= 65 ? 2 : accuracy >= 40 ? 1 : 0;
  const byActor = new Map<string, number>();
  for (const decision of good) byActor.set(decision.actor, (byActor.get(decision.actor) ?? 0) + 1);
  let standout: MatchRating['standout'];
  // Ties go to the later decision-maker: the read closest to the final whistle.
  for (const decision of good) {
    const reads = byActor.get(decision.actor)!;
    if (!standout || reads >= standout.reads) standout = { actor: decision.actor, reads };
  }
  // One good read is not a performance; the award needs at least two.
  if (standout && standout.reads < 2) standout = undefined;
  return { reads: good.length, decisions, accuracy, stars, grade: grades[stars], standout };
}
