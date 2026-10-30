import type { Player, Point, Scenario } from './scenarios';

// A facing vector is not a running direction. Only explicit actor language or
// authored metadata may supply it; never use a future choice to hint at the answer.
export function playerFacing(
  player: Player,
  context: string,
  ball?: Point,
): Point | undefined {
  if (player.facing) return player.facing;
  if (!player.active) return undefined;
  const toward = player.team === 'home' ? 100 : 0;
  if (
    /\byou (?:have|receive with|receive the ball with|are receiving with) your back to (?:the |their )?goal\b/i.test(
      context,
    )
  )
    return { x: 100 - toward, y: player.y };
  if (
    /\byou (?:(?:face|are facing)|(?:receive|receive the ball) facing) (?:the |their )?(?:goal|forward)\b/i.test(
      context,
    )
  )
    return { x: toward, y: player.y };
  // Goalkeepers track the live ball; on the ball they face into the pitch.
  if (player.role === 'Goalkeeper' && ball)
    return Math.hypot(ball.x - player.x, ball.y - player.y) > 2
      ? ball
      : { x: toward, y: player.y };
  return undefined;
}

export function facingDescription(
  player: Player,
  context: string,
  ball: Point,
): string {
  const target = playerFacing(player, context, ball);
  if (!target) return '';
  const dx = (target.x - player.x) * 10,
    dy = (target.y - player.y) * 7;
  return `Your player is facing ${Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? 'the top touchline' : 'the bottom touchline') : dx < 0 ? 'toward our goal on the left' : 'toward the rival goal on the right'}.`;
}

// Older scenes use schematic goal endpoints across a wider band. Keep all
// football contacts intact, mapping ONLY a confirmed goal's last frame into the net.
export function goalPath(
  path: Point[] | undefined,
  homeGoals = 0,
  awayGoals = 0,
) {
  if (!path?.length || (!homeGoals && !awayGoals)) return path;
  return path.map((point, index) =>
    index === path.length - 1
      ? {
          x: homeGoals ? 98 : 2,
          y: Math.max(45.5, Math.min(54.5, 50 + (point.y - 50) * 0.45)),
        }
      : point,
  );
}

export function trainingPossession(scenario: Scenario, after: boolean) {
  if (!after) return scenario.mode === 'Attacking' ? 'home' : 'away';
  const ball =
    scenario.reveal.ballPath?.at(-1) ?? scenario.reveal.ballTo ?? scenario.ball;
  const nearby = scenario.players.flatMap((player) => {
    const at =
      scenario.reveal.movements.find((m) => m.playerId === player.id)?.to ??
      player;
    return Math.hypot(at.x - ball.x, (at.y - ball.y) * 0.7) <= 2.5
      ? [player.team]
      : [];
  });
  if (nearby.length && nearby.every((team) => team === nearby[0]))
    return nearby[0];
  return nearby.length ? 'neutral' : undefined;
}
