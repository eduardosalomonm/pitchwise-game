import type { Player, Point } from './scenarios';

// Intentionally accepts only the starting board, never choices, outcomes or
// reveal text. Describe proximity, not an invented pressing run or best action.
export type PlaySnapshot = {
  players: Player[];
  ball: Point;
  phase: 'Attacking' | 'Defending' | 'Transition';
};
const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, (a.y - b.y) * 0.7);
const name = (player: Player) =>
  `${player.team === 'home' ? 'our' : 'their'} ${player.role.toLowerCase()}`;

export function boardDirection(from: Point, to: Point) {
  const dx = to.x - from.x,
    dy = (to.y - from.y) * 0.7;
  if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return 'right beside';
  return Math.abs(dy) > Math.abs(dx)
    ? dy < 0
      ? 'above'
      : 'below'
    : dx < 0
      ? 'to the left of'
      : 'to the right of';
}

export function readThePlay({ players, ball, phase }: PlaySnapshot): {
  ball: string;
  pressure: string;
} {
  const actor = players.find((p) => p.active);
  const side = phase === 'Attacking' ? 'home' : 'away';
  const byBall = [...players].sort(
    (a, b) => distance(a, ball) - distance(b, ball),
  );
  const owner = byBall.find((p) => p.team === side && distance(p, ball) <= 2.5);
  const contested = byBall.some(
    (p) => p.team !== side && distance(p, ball) <= 2.5,
  );
  const ballText = owner
    ? contested
      ? `The ball is between ${name(owner)} and a nearby opponent.`
      : owner.active
        ? 'You have the ball.'
        : `The ball is with ${name(owner)}.`
    : `The ball is ${ball.x < 35 ? 'in our defensive third' : ball.x > 65 ? 'in the attacking third' : 'in midfield'}, between players.`;
  // In defence, describe the danger relative to the controlled player; in
  // attack, describe the opponent nearest the ball rather than a safe outlet.
  const reference = phase === 'Attacking' ? (owner ?? ball) : (actor ?? ball);
  const rival = [...players]
    .filter((p) => p.team === 'away')
    .sort((a, b) => distance(a, reference) - distance(b, reference))[0];
  const relativeTo =
    reference === actor
      ? 'your player'
      : owner && reference === owner
        ? 'the ball carrier'
        : 'the ball';
  const pressure = !rival
    ? 'No rival is shown nearby.'
    : distance(rival, reference) > 18
      ? `No rival is close to ${relativeTo} on this board.`
      : `Nearest rival: ${name(rival)}, ${boardDirection(reference, rival)} ${relativeTo}.`;
  return { ball: ballText, pressure };
}

export function readPenalty(keeping: boolean) {
  return keeping
    ? {
        ball: 'Their taker has the ball on the penalty spot. You control our keeper.',
        pressure: 'This is a one-on-one: there is no open-play press.',
      }
    : {
        ball: 'You take the penalty. Their keeper is between the posts.',
        pressure:
          'There is no open-play press; the keeper can disguise their intentions.',
      };
}
