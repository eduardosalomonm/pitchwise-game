import {
  action,
  advancedMoment,
  turn,
  type Action,
} from './advanced-match-builder.ts';
import type { MatchPhase, MatchTone } from './match-day.ts';
import type { Placement } from './tactical-scene.ts';

export type Touch = [player: string, x: number, y: number];
export type Read = {
  actor: string;
  phase: MatchPhase;
  context: string;
  choices: Action[];
};
export type LeaguePlaySpec = {
  id: string;
  tier: 0 | 1 | 2;
  name: string;
  intro: string;
  owner: string | { x: number; y: number };
  placements: Placement[];
  reads: Read[];
  /** Highlights are rare opportunities, not an increased probability of scoring. */
  rare?: boolean;
};

// Touch order is the source of truth for ball contacts and each player's route.
// This helper does not repair formations, choose answers or infer offside exceptions.
export function c(
  label: string,
  feedback: string,
  touches: Touch[],
  result: Action['result'],
  tone: MatchTone,
  support: Placement[] = [],
  goalY = 50,
  art?: string,
): Action {
  const byPlayer = new Map<string, [number, number][]>();
  for (const [id, x, y] of touches)
    byPlayer.set(id, [...(byPlayer.get(id) ?? []), [x, y]]);
  if (
    !touches.length ||
    support.some(([id]) => byPlayer.has(id)) ||
    new Set(support.map(([id]) => id)).size !== support.length
  )
    throw new Error('Invalid authored action: ' + label);
  const path: [number, number][] = touches.map(([, x, y]) => [x, y]);
  if (result === 'goal') path.push([100, goalY]);
  if (result === 'concede') path.push([0, goalY]);
  const moves: Placement[] = [
    ...[...byPlayer].map(([id, points]): Placement => [id, ...points.at(-1)!]),
    ...support,
  ];
  const routes = Object.fromEntries(
    [...byPlayer]
      .filter(([, points]) => points.length > 1)
      .map(([id, points]) => [id, points.slice(0, -1)]),
  );
  const image =
    art ??
    (result === 'goal'
      ? 'match-home-goal'
      : result === 'concede'
        ? 'match-rival-goal'
        : result === 'lost'
          ? 'match-interception'
          : result === 'regain'
            ? 'right-midfielder-5'
            : result === 'contained'
              ? 'match-duel'
              : 'right-midfielder-1');
  return {
    ...action(label, feedback, image, moves, path, result, tone),
    routes,
  };
}
export const n = (
  label: string,
  feedback: string,
  touches: Touch[],
  support: Placement[] = [],
  art?: string,
) => c(label, feedback, touches, 'next', 'positive', support, 50, art);
export const g = (
  label: string,
  feedback: string,
  touches: Touch[],
  support: Placement[] = [],
  goalY = 50,
) => c(label, feedback, touches, 'goal', 'positive', support, goalY);
export const k = (
  label: string,
  feedback: string,
  touches: Touch[],
  support: Placement[] = [],
) => c(label, feedback, touches, 'retain', 'neutral', support);
export const l = (
  label: string,
  feedback: string,
  touches: Touch[],
  support: Placement[] = [],
) => c(label, feedback, touches, 'lost', 'negative', support);
export const r = (
  label: string,
  feedback: string,
  touches: Touch[],
  support: Placement[] = [],
) => c(label, feedback, touches, 'regain', 'positive', support);
export const d = (
  label: string,
  feedback: string,
  touches: Touch[],
  support: Placement[] = [],
  tone: MatchTone = 'neutral',
) => c(label, feedback, touches, 'contained', tone, support);
export const x = (
  label: string,
  feedback: string,
  touches: Touch[],
  support: Placement[] = [],
  goalY = 50,
) => c(label, feedback, touches, 'concede', 'negative', support, goalY);
export const read = (
  actor: string,
  phase: MatchPhase,
  context: string,
  ...choices: Action[]
): Read => ({ actor, phase, context, choices });
const places = (base: Placement[], authored: Placement[]) => [
  ...new Map([...base, ...authored].map((p) => [p[0], p])).values(),
];
export const attacking = (p: Placement[]): Placement[] =>
  places(
    [
      ['a-gk', 95, 50],
      ['a-rcb', 88, 42],
      ['a-lcb', 88, 60],
      ['a-rb', 83, 18],
      ['a-lb', 83, 84],
      ['a-six', 73, 50],
      ['h-st', 80, 50],
      ['h-lw', 72, 16],
      ['h-rw', 72, 84],
    ],
    p,
  );
export const defending = (p: Placement[]): Placement[] =>
  places(
    [
      ['h-gk', 6, 50],
      ['h-lcb', 16, 40],
      ['h-rcb', 16, 60],
      ['h-lb', 20, 18],
      ['h-rb', 20, 84],
      ['h-six', 28, 50],
      ['h-lw', 32, 16],
      ['h-rw', 32, 84],
      ['a-st', 26, 50],
      ['a-rw', 34, 16],
      ['a-lw', 34, 84],
    ],
    p,
  );
export function play(spec: LeaguePlaySpec) {
  if (!spec.id.startsWith('lg2-') || spec.reads.length !== spec.tier + 2)
    throw new Error('Invalid league play depth: ' + spec.id);
  const turns = spec.reads.map(({ actor, phase, context, choices }) =>
    turn(actor, phase, context, 'What do you do?', ...choices),
  );
  return {
    tier: spec.tier,
    rare: spec.rare ?? false,
    moment: advancedMoment(
      spec.id,
      50,
      spec.name,
      spec.intro,
      spec.owner,
      spec.placements,
      turns,
    ),
  };
}
