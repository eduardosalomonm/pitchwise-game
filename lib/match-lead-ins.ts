import type { MatchScene } from './match-day';
import type { Point } from './scenarios';
import type { MovementWindow } from './pitch-motion';

export const LEAD_IN_DURATION = 1.7;
export const LEAD_IN_DELAY = 0.15;
export const LEAD_IN_END_MS = 1950;

type EarlierPlayer = {
  id: string;
  from: Point;
  end: Point;
  via?: Point[];
  window?: MovementWindow;
};
export type MatchLeadIn = {
  nodeId: string;
  description: string;
  ball: { from: Point; end: Point };
  ballPath?: Point[];
  source?: 'authored' | 'history' | 'touch' | 'restart' | 'loose' | 'shape';
  players: EarlierPlayer[];
};

// Authored history, not a reversed answer. These five clips end at the existing
// decision snapshot; this module has no access to choices, scores or outcomes.
export const matchLeadIns: MatchLeadIn[] = [
  {
    nodeId: 'm1-gk',
    description:
      'A back-pass reaches our keeper as their striker curves toward our left centre-back.',
    ball: { from: { x: 21, y: 34 }, end: { x: 8, y: 50 } },
    players: [
      { id: 'h-lcb', from: { x: 21, y: 34 }, end: { x: 24, y: 31 } },
      {
        id: 'a-st',
        from: { x: 28, y: 47 },
        via: [{ x: 23, y: 44 }],
        end: { x: 20, y: 38 },
      },
      { id: 'a-l8', from: { x: 47, y: 56 }, end: { x: 45, y: 53 } },
    ],
  },
  {
    nodeId: 'm2-winger',
    description:
      'Their winger carries infield while their full-back runs along the touchline.',
    ball: { from: { x: 43, y: 19 }, end: { x: 37, y: 29 } },
    players: [
      { id: 'a-rw', from: { x: 43, y: 19 }, end: { x: 37, y: 29 } },
      { id: 'a-rb', from: { x: 49, y: 10 }, end: { x: 41, y: 10 } },
      { id: 'h-lb', from: { x: 28, y: 26 }, end: { x: 31, y: 28 } },
    ],
  },
  {
    nodeId: 'm3-eight',
    description:
      'Our six passes into the left eight as their midfielder closes the distance.',
    ball: { from: { x: 51, y: 50 }, end: { x: 61, y: 32 } },
    players: [
      { id: 'h-l8', from: { x: 58, y: 34 }, end: { x: 61, y: 32 } },
      { id: 'a-r8', from: { x: 69, y: 42 }, end: { x: 66, y: 39 } },
    ],
  },
  {
    nodeId: 'm4-six',
    description:
      'Their six intercepts our left-back’s pass. Their wingers start forward on either side.',
    ball: { from: { x: 73, y: 13 }, end: { x: 59, y: 49 } },
    players: [
      { id: 'a-six', from: { x: 62, y: 46 }, end: { x: 59, y: 49 } },
      { id: 'a-lw', from: { x: 56, y: 78 }, end: { x: 51, y: 78 } },
      { id: 'a-rw', from: { x: 56, y: 23 }, end: { x: 51, y: 23 } },
    ],
  },
  {
    nodeId: 'm5-ten',
    description:
      'Our six finds the right eight. The striker checks short and a centre-back follows.',
    ball: { from: { x: 50.1, y: 50 }, end: { x: 63, y: 63 } },
    players: [
      { id: 'h-r8', from: { x: 60, y: 65 }, end: { x: 63, y: 63 } },
      { id: 'h-st', from: { x: 79, y: 50 }, end: { x: 76, y: 51 } },
      { id: 'a-lcb', from: { x: 83, y: 60 }, end: { x: 80, y: 59 } },
    ],
  },
];

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

export function getAuthoredLeadIn(
  nodeId: string,
  scene: MatchScene,
) {
  const clip = matchLeadIns.find((item) => item.nodeId === nodeId);
  // Fail closed if a later story edit changes the snapshot or removes a player.
  if (!clip || !same(clip.ball.end, scene.ball)) return undefined;
  if (
    !clip.players.every((move) => {
      const player = scene.players.find((p) => p.id === move.id);
      return (
        player &&
        same(player, move.end) &&
        !scene.unavailablePlayerIds?.includes(player.id)
      );
    })
  )
    return undefined;
  return clip;
}

export function leadInStart(scene: MatchScene, clip: MatchLeadIn): MatchScene {
  return {
    ball: clip.ball.from,
    unavailablePlayerIds: scene.unavailablePlayerIds,
    players: scene.players.map((player) => {
      const move = clip.players.find((item) => item.id === player.id);
      return move ? { ...player, ...move.from } : player;
    }),
  };
}
