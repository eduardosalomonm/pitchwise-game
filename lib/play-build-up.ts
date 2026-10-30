import type {
  DecisionNode,
  MatchMoment,
  MatchRun,
  MatchScene,
} from './match-day';
import type { Player, Point, Movement } from './scenarios';
import { getAuthoredLeadIn, type MatchLeadIn } from './match-lead-ins.ts';
import { movementWindow } from './pitch-motion.ts';

// Deliberately excludes the prompt, possible answers, reveal and scoring rules.
export type PlaySnapshot = Pick<DecisionNode, 'id' | 'context' | 'scene'>;
type PlayedAction = {
  scene: MatchScene;
  movement: Movement[];
  ballPath?: Point[];
  ballTo?: Point;
};
const point = ({ x, y }: Point): Point => ({ x, y });
const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, (a.y - b.y) * 0.7);
const same = (a: Point, b: Point) => distance(a, b) < 0.01;
const inField = (p: Point) => p.x >= 4 && p.x <= 96 && p.y >= 6 && p.y <= 94;

export function ballCarrier(scene: MatchScene) {
  const close = scene.players
    .filter(
      (p) =>
        !scene.unavailablePlayerIds?.includes(p.id) &&
        distance(p, scene.ball) <= 2.5,
    )
    .sort((a, b) => distance(a, scene.ball) - distance(b, scene.ball));
  return close.length &&
    (!close[1] ||
      distance(close[1], scene.ball) - distance(close[0], scene.ball) > 0.2)
    ? close[0]
    : undefined;
}

// This is the real, already-chosen action, not one of the current node's options.
function historyClip(
  node: PlaySnapshot,
  past: PlayedAction,
): MatchLeadIn | undefined {
  const path = past.ballPath?.length
    ? past.ballPath
    : [past.ballTo ?? past.scene.ball];
  if (!same(path.at(-1)!, node.scene.ball)) return undefined;
  const players: MatchLeadIn['players'] = [];
  for (const end of node.scene.players) {
    const start = past.scene.players.find((p) => p.id === end.id);
    if (!start || node.scene.unavailablePlayerIds?.includes(end.id)) continue;
    const move = past.movement.find((m) => m.playerId === end.id);
    if (move && !same(move.to, end)) return undefined;
    if (!same(start, end) || move?.via?.length)
      players.push({
        id: end.id,
        from: point(start),
        end: point(end),
        via: move?.via,
        window: move
          ? movementWindow(start, move, past.scene.ball, path)
          : { start: 0, end: 1 },
      });
  }
  return {
    nodeId: node.id,
    source: 'history',
    description:
      'The action you just chose brings the ball and players into this position. Your next decision starts here.',
    ball: { from: point(past.scene.ball), end: point(node.scene.ball) },
    ballPath: path,
    players,
  };
}

/** Only the literal final touch/arrival is reconstructed for an isolated scene.
 * No speculative pass, tackle, shot or future run is generated. */
export function openingBuildUp(node: PlaySnapshot): MatchLeadIn {
  const authored = getAuthoredLeadIn(node.id, node.scene);
  if (authored) return { ...authored, source: 'authored' };
  const { scene } = node;
  const available = scene.players.filter(
    (p) => !scene.unavailablePlayerIds?.includes(p.id),
  );
  const text = node.context.toLowerCase();
  const nearest = ballCarrier(scene);
  // Proximity is not possession: a player running onto a rebound has not yet
  // controlled it. Preserve that contested ball instead of inventing a dribble.
  const owner =
    /ball (?:spins |is |has (?:fallen|dropped) )?loose|loose ball|unclaimed ball/.test(
      text,
    )
      ? undefined
      : nearest;
  const held =
    owner?.role === 'Goalkeeper' &&
    /catch|caught|held|holds|in (?:your|his|their) hands/.test(text);
  // A delivery that has already happened is not a pending restart.
  const restart =
    !/caught|cleared|clearance|rebound|second.phase|after the (?:corner|restart|throw|free.kick)|has taken/.test(
      text,
    ) &&
    (/(?:at a|take a|for the|have a|prepares? a|defend the) (?:corner|throw|free.kick|goal.kick)/.test(
      text,
    ) ||
      /stationary ball|corner taker|wait for a corner|thrower |their wall|the wall covers|taker (?:looks|faces)|leaving the wall/.test(
        text,
      ) ||
      (/(?:corner|free-kick|throw-in|goal-kick|long-throw)/.test(node.id) &&
        !/second-phase/.test(node.id)));
  const clip: MatchLeadIn = {
    nodeId: node.id,
    source: restart ? 'restart' : owner ? 'touch' : 'loose',
    description: '',
    ball: { from: point(scene.ball), end: point(scene.ball) },
    players: [],
  };

  const add = (p: Player, dx: number, dy: number) => {
    if (clip.players.some((m) => m.id === p.id)) return false;
    const from = { x: p.x + dx, y: p.y + dy };
    if (!inField(from)) return false;
    // Do not introduce a collision that is absent from the decision snapshot.
    if (
      available.some(
        (q) =>
          q.id !== p.id &&
          [0, 0.25, 0.5, 0.75].some(
            (t) =>
              distance(
                {
                  x: from.x + (p.x - from.x) * t,
                  y: from.y + (p.y - from.y) * t,
                },
                q,
              ) < Math.min(2.8, distance(p, q) * 0.8),
          ),
      )
    )
      return false;
    clip.players.push({ id: p.id, from, end: point(p) });
    return true;
  };

  if (owner && !restart && !held) {
    // One settling touch, never a pass from an invented teammate. A back-to-goal
    // receiver has checked toward the ball rather than already turned upfield.
    const direction = owner.team === 'home' ? 1 : -1;
    const back =
      /(?:you|your|striker|receiver).{0,30}back.{0,10}(?:to|toward).{0,8}goal/.test(
        text,
      );
    if (
      add(owner, (back ? 1 : -1) * direction * 2.4, 0) ||
      add(owner, 0, 1.8)
    ) {
      const start = clip.players[0].from;
      clip.ball.from = {
        x: scene.ball.x + start.x - owner.x,
        y: scene.ball.y + start.y - owner.y,
      };
      if (!inField(clip.ball.from)) {
        clip.players.pop();
        clip.ball.from = point(scene.ball);
      }
    }
  }

  // Animate only movements already stated as facts. Conditional instructions
  // ("could", "would", "ready to", "can") are not animation cues.
  const factual = text
    .split(/[.;]/)
    .filter(
      (s) =>
        !/\b(?:could|would|should|can|must|if|ready|prepares?|about to)\b/.test(
          s,
        ),
    )
    .join('.');
  const roles: [RegExp, (p: Player) => boolean][] = [
    [/left centre.back/, (p) => p.role === 'Left centre-back'],
    [/right centre.back/, (p) => p.role === 'Right centre-back'],
    [/left winger/, (p) => p.role === 'Left winger'],
    [/right winger/, (p) => p.role === 'Right winger'],
    [/left (?:eight|midfielder)/, (p) => p.role === 'Left central midfielder'],
    [
      /right (?:eight|midfielder)/,
      (p) => p.role === 'Right central midfielder',
    ],
    [/striker|forward|nine/, (p) => /Striker|Forward/.test(p.role)],
    [/left.back/, (p) => p.role === 'Left-back'],
    [/right.back/, (p) => p.role === 'Right-back'],
    [/full.back/, (p) => /^(Left|Right)-back$/.test(p.role)],
    [/centre.back/, (p) => /[Cc]entre-back/.test(p.role)],
    [/winger/, (p) => /[Ww]inger/.test(p.role)],
    [/six|pivot/, (p) => /Defensive midfielder/.test(p.role)],
    [/eight|midfielder/, (p) => /midfielder/i.test(p.role)],
  ];
  for (const sentence of factual.split('.')) {
    const match = sentence.match(
      /\b(our|their) ([a-z -]+?) (?:is |has |begins to |starts to )?(runs?|running|checks?|checking|drops?|dropping|overlaps?|overlapping|closes?|closing|presses|pressing|steps?|stepping|carries|carrying)\b/,
    );
    if (!match || clip.players.length >= 3) continue;
    const team = match[1] === 'our' ? 'home' : 'away';
    const role = roles.find(([re]) => re.test(match[2]));
    if (!role) continue;
    const player = available
      .filter(
        (p) => p.team === team && !p.active && p.id !== owner?.id && role[1](p),
      )
      .sort((a, b) => distance(a, scene.ball) - distance(b, scene.ball))[0];
    if (!player) continue;
    const direction = team === 'home' ? 1 : -1;
    if (/clos|press/.test(match[3])) {
      const d = distance(player, scene.ball) || 1;
      add(
        player,
        ((player.x - scene.ball.x) / d) * 2.8,
        ((player.y - scene.ball.y) / d) * 2.8,
      );
    } else
      add(
        player,
        /check|drop/.test(match[3]) ? direction * 3 : -direction * 3,
        0,
      );
  }

  if (!owner && !restart) {
    // A short final flight/roll, not an invented shot, kick or winning touch.
    const leftGoalThreat = scene.ball.x < 50;
    const from = {
      x: scene.ball.x + (leftGoalThreat ? 3 : -3),
      y: scene.ball.y,
    };
    if (inField(from)) clip.ball.from = from;
  }
  if (!clip.players.length) {
    // Waiting over a dead ball/held catch: show an off-ball player taking up the
    // position already on the board. Never move the active decision-maker.
    const candidates = available
      .filter(
        (p) =>
          !p.active &&
          p.id !== owner?.id &&
          p.role !== 'Goalkeeper' &&
          !p.background,
      )
      .sort((a, b) => distance(a, scene.ball) - distance(b, scene.ball));
    for (const p of candidates) if (add(p, 0, p.y < 50 ? -1.8 : 1.8)) break;
  }
  if (restart)
    clip.description =
      'Players take up their positions for the restart. The ball has not been played.';
  else if (held) {
    clip.source = 'shape';
    clip.description =
      'The keeper holds the ball while the players take up the positions shown.';
  } else if (owner)
    clip.description =
      `The ${owner.team === 'home' ? 'our' : 'opposing'} ${owner.role.toLowerCase()} settles on the ball. The sequence stops at the position shown.`.replace(
        'The our ',
        'Our ',
      );
  else
    clip.description =
      'The loose ball reaches the position shown. No player has taken the next touch yet.';
  return clip;
}

export function buildUpForPlay(node: PlaySnapshot, past?: PlayedAction) {
  return (past && historyClip(node, past)) || openingBuildUp(node);
}

/** Resolve only the recorded previous choice, never a proposed next choice. */
export function matchBuildUp(
  node: PlaySnapshot,
  moment: MatchMoment,
  run: MatchRun,
) {
  const last = run.decisions.at(run.pending ? -2 : -1);
  if (last?.momentId === moment.id) {
    const previous = moment.nodes.find((n) => n.id === last.nodeId);
    const choice = previous?.choices.find((c) => c.id === last.choiceId);
    if (previous && choice?.nextNodeId === node.id)
      return buildUpForPlay(node, {
        scene: previous.scene,
        movement: choice.movement,
        ballPath: choice.ballPath,
        ballTo: choice.ballTo,
      });
  }
  return openingBuildUp(node);
}
