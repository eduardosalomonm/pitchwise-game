import type { Scenario, Point } from './scenarios';
import type { MatchLeadIn } from './match-lead-ins';
import { openingBuildUp, ballCarrier } from './play-build-up.ts';

type TrainingSnapshot = Pick<
  Scenario,
  'id' | 'players' | 'ball' | 'context' | 'mode'
>;
type Arrival = [id: string, earlierDx: number, earlierDy: number];
type Setup = { moves: Arrival[]; passFrom?: string };
const setup = (moves: Arrival[], passFrom?: string): Setup => ({
  moves,
  passFrom,
});

// The story's already-happening actions, not the responsibility revealed after
// answering. The orange, off-ball player never performs their answer here.
export const trainingSetups: Record<string, Setup> = {
  'build-up-width': setup([
    ['press-1', 4, 2],
    ['press-2', 2, 1],
  ]),
  'overlap-decoy': setup([['opp-rb', 3, 1]], 'cm'),
  'recovery-inside': setup([
    ['lw', 3, 2],
    ['runner', 4, 0],
  ]),
  'far-side-tuck': setup([
    ['crosser', 4, 0],
    ['opp-9', 2, 0],
  ]),
  'cover-centre-back': setup([
    ['lcb', -4, 0],
    ['receiver', 3, 0],
  ]),
  'six-cover-shadow': setup([['press-nine', 2, 2]]),
  'six-half-turn': setup([['opp-ten', 4, 0]], 'lcb'),
  'six-rest-defence': setup([
    ['lw', -3, -1],
    ['lb', -3, 0],
  ]),
  'six-screen-ten': setup([['press-nine', -4, 0]]),
  'six-delay-counter': setup([
    ['carrier', 3, 0],
    ['lcb', 2, 0],
    ['rcb', 2, 0],
  ]),
  'cb-split': setup([['striker', 2, -1]]),
  'cb-carry': setup([['striker', 0, -2]]),
  'cb-cover': setup([
    ['rcb', -4, 0],
    ['receiver', 2, 0],
  ]),
  'cb-drop': setup([['runner', 4, 0]]),
  'cb-cross': setup([
    ['crosser', 3, 0],
    ['runner', 2, 1],
  ]),
  'goalkeeper-1': setup([
    ['a-st', 3, 3],
    ['h-lcb', -2, 3],
    ['h-rcb', -2, -3],
  ]),
  'goalkeeper-2': setup([['a-st', 3, 0]]),
  'goalkeeper-3': setup([['a-st', 4, -2]]),
  'goalkeeper-4': setup([['a-lw', 3, 0]]),
  'goalkeeper-5': setup([
    ['a-st', 3, 0],
    ['a-lw', 3, 0],
  ]),
  'right-back-1': setup([['a-st', 4, -2]]),
  'right-back-2': setup([['a-lb', 3, 0]], 'h-r8'),
  'right-back-3': setup([
    ['a-l8', 3, 0],
    ['a-lw', 3, 0],
  ]),
  'right-back-4': setup([['a-rw', 4, 0]]),
  'right-back-5': setup([['h-rcb', -4, 0]]),
  'right-centre-back-1': setup([['a-st', 2, 1]]),
  'right-centre-back-2': setup([['a-st', 0, 2]]),
  'right-centre-back-3': setup([['h-lcb', -4, 0]]),
  'right-centre-back-4': setup([['a-st', 4, 0]]),
  'right-centre-back-5': setup([
    ['a-rw', 3, 0],
    ['a-st', 2, -1],
  ]),
  'left-midfielder-1': setup([['a-rw', 3, 1]]),
  'left-midfielder-2': setup([['h-lw', -3, -3]]),
  'left-midfielder-3': setup([
    ['h-st', 4, 0],
    ['a-rcb', 4, 0],
  ]),
  'left-midfielder-4': setup([['a-rb', 2, -1]]),
  'left-midfielder-5': setup([
    ['h-lb', -3, 0],
    ['a-six', 3, 0],
  ]),
  'right-midfielder-1': setup([
    ['a-six', 0, -2],
    ['a-l8', 0, 2],
  ]),
  'right-midfielder-2': setup([
    ['a-six', -1, -3],
    ['a-l8', 0, -3],
  ]),
  'right-midfielder-3': setup([['a-lcb', 0, -2]]),
  'right-midfielder-4': setup([
    ['h-st', -4, 0],
    ['a-six', 2, -1],
  ]),
  'right-midfielder-5': setup([['a-l8', 1, 2]]),
  'left-winger-1': setup([['a-rb', 0, -4]]),
  'left-winger-2': setup([['a-rb', 1, 1]], 'h-six'),
  'left-winger-3': setup([
    ['h-lb', -4, 0],
    ['h-l8', -3, 0],
  ]),
  'left-winger-4': setup([['a-rb', 2, 0]], 'a-rcb'),
  'left-winger-5': setup([
    ['a-rw', 3, -3],
    ['a-rb', 4, 0],
  ]),
  'right-winger-1': setup([['a-lb', 0, 4]]),
  'right-winger-2': setup([['h-lw', -4, 0]]),
  'right-winger-3': setup([['h-rb', -4, 0]]),
  'right-winger-4': setup([['a-lb', 2, 0]], 'a-lcb'),
  'right-winger-5': setup([
    ['h-rb', -3, 0],
    ['a-lw', 4, 0],
  ]),
  'striker-1': setup([
    ['a-lcb', 2, 0],
    ['a-rcb', 2, 0],
  ]),
  'striker-2': setup([
    ['h-l8', -3, 0],
    ['h-rw', -3, 0],
  ]),
  'striker-3': setup([['h-lw', -3, 0]]),
  'striker-4': setup([['a-rcb', 2, 0]], 'a-gk'),
  'striker-5': setup([['h-l8', -2, 0]]),
};

export function trainingBuildUp(scenario: TrainingSnapshot): MatchLeadIn {
  const spec = trainingSetups[scenario.id];
  const scene = { players: scenario.players, ball: scenario.ball };
  if (!spec)
    return openingBuildUp({
      id: scenario.id,
      context: scenario.context,
      scene,
    });
  const owner = ballCarrier(scene);
  const players = spec.moves.flatMap(([id, dx, dy]) => {
    const p = scenario.players.find((p) => p.id === id);
    if (!p || p.active) return [];
    return [
      { id, from: { x: p.x + dx, y: p.y + dy }, end: { x: p.x, y: p.y } },
    ];
  });
  const passer = scenario.players.find((p) => p.id === spec.passFrom);
  const ownerMove = players.find((p) => p.id === owner?.id);
  let from: Point = { ...scenario.ball };
  if (passer) from = { x: passer.x, y: passer.y };
  else if (owner && ownerMove)
    from = {
      x: scenario.ball.x + ownerMove.from.x - owner.x,
      y: scenario.ball.y + ownerMove.from.y - owner.y,
    };
  else if (!owner) from = { x: scenario.ball.x + 3, y: scenario.ball.y };
  return {
    nodeId: scenario.id,
    source: 'authored',
    description: `Before your decision: ${scenario.context}`,
    ball: { from, end: { ...scenario.ball } },
    players,
  };
}
