import type { DecisionNode } from './match-day';
import type { Point } from './scenarios';

export type ViewBox = { x: number; y: number; width: number; height: number };
export const FULL_PITCH: ViewBox = { x: 0, y: 0, width: 1000, height: 700 };

// Everything the decision can move: ball, decision-maker and every option's routes.
export function decisionPoints(node: DecisionNode): Point[] {
  const points: Point[] = [node.scene.ball];
  const actor = node.scene.players.find((player) => player.active);
  if (actor) points.push(actor);
  for (const choice of node.choices) {
    for (const move of choice.movement) {
      const player = node.scene.players.find((item) => item.id === move.playerId);
      if (player && !(player.background && !player.active)) points.push(player);
      points.push(move.to, ...(move.via ?? []));
    }
    points.push(...(choice.ballPath ?? []));
  }
  return points;
}

// A square window in pitch percentages (so the 10:7 diagram keeps its shape) around the play,
// used on narrow screens where the full pitch makes players too small to read.
export function focusViewBox(node: DecisionNode, margin = 10, minSize = 56): ViewBox {
  const points = decisionPoints(node);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const size = Math.max(minSize, Math.max(maxX - minX, maxY - minY) + margin * 2);
  if (size >= 90) return FULL_PITCH;
  const clamp = (value: number) => Math.min(100 - size, Math.max(0, value));
  const x = clamp((minX + maxX) / 2 - size / 2);
  const y = clamp((minY + maxY) / 2 - size / 2);
  return { x: x * 10, y: y * 7, width: size * 10, height: size * 7 };
}
