import type {
  DecisionNode,
  MatchChoice,
  MatchMoment,
  MatchOutcome,
  MatchPhase,
  MatchScene,
  MatchTone,
} from './match-day.ts';
import type { CourseId, Point } from './scenarios';
import {
  authoredScene,
  labels,
  roleNames,
  type Placement,
} from './tactical-scene.ts';

export type Ending =
  | 'goal'
  | 'concede'
  | 'retain'
  | 'lost'
  | 'regain'
  | 'contained'
  | 'loose';
export type Action = {
  label: string;
  feedback: string;
  art: string;
  moves: Placement[];
  path: [number, number][];
  arrivals?: Record<string, number>;
  routes?: Record<string, [number, number][]>;
  result: Ending | 'next' | Turn;
  tone: MatchTone;
  headline?: string;
};
export type Turn = {
  actor: string;
  phase: MatchPhase;
  context: string;
  prompt: string;
  choices: Action[];
};
const courses: Record<string, CourseId> = {
  gk: 'goalkeeper',
  lb: 'full-back',
  lcb: 'centre-back',
  rcb: 'right-centre-back',
  rb: 'right-back',
  six: 'defensive-midfielder',
  l8: 'left-midfielder',
  r8: 'right-midfielder',
  lw: 'left-winger',
  rw: 'right-winger',
  st: 'striker',
};

// Several headlines per ending keep repeated results from reading like a template.
// The pick is stable per outcome id, so review and replay show the same words.
const headlines: Record<Ending, string[]> = {
  goal: [
    'GOAL — you made the opening!',
    'GOAL — read it, finished it!',
    'GOAL — the move pays off!',
  ],
  concede: [
    'Rival XI score.',
    'Rival XI punish it.',
    'Goal for Rival XI.',
    'Rival XI find the net.',
  ],
  retain: [
    'Ball retained. The opening closes.',
    'Still our ball — but the gap is gone.',
    'Safe, but the chance slips away.',
  ],
  lost: [
    'Rival XI take possession.',
    'Turnover — Rival XI have it.',
    'Rival XI win the ball.',
    'Ball lost in a bad place.',
  ],
  regain: ['Ball won. Danger over.', 'Regained — the danger has passed.'],
  contained: [
    'Attack contained. Rival XI reset.',
    'Rival XI have to start again.',
    'Danger delayed. Rival XI recycle.',
  ],
  loose: [
    'The ball is still contested.',
    'Loose ball — nobody has it.',
    'Fifty-fifty. The ball is up for grabs.',
  ],
};
const pick = (options: string[], id: string) =>
  options[
    Array.from(id).reduce(
      (hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0,
      7,
    ) % options.length
  ];

export function endingOutcome(
  id: string,
  result: Ending,
  feedback: string,
  tone: MatchTone,
  headline = pick(headlines[result], id),
): MatchOutcome {
  return {
    id,
    result,
    headline,
    recap: feedback,
    tone,
    homeGoals: Number(result === 'goal'),
    awayGoals: Number(result === 'concede'),
    possession:
      result === 'loose'
        ? 'neutral'
        : ['concede', 'retain', 'regain'].includes(result)
          ? 'home'
          : 'away',
  };
}

// All destinations inherit the preceding action's actual final frame, including turnovers.
// Branches own their scenes: there is no merge that can silently teleport a player.
export function advancedMoment(
  id: string,
  minute: number,
  name: string,
  introduction: string,
  owner: string | Point,
  placements: Placement[],
  turns: Turn[],
): MatchMoment {
  const nodes: DecisionNode[] = [];
  function visit(turn: Turn, scene: MatchScene, index: number): string {
    const nodeId = `${id}-${nodes.length + 1}`;
    const slot = turn.actor.slice(2);
    const node: DecisionNode = {
      id: nodeId,
      actor: roleNames[labels[slot]],
      actorLabel: labels[slot],
      trainingCourseId: courses[slot],
      phase: turn.phase,
      context: turn.context,
      prompt: turn.prompt,
      scene: {
        ball: scene.ball,
        players: scene.players.map((p) => ({
          ...p,
          active: p.id === turn.actor,
        })),
      },
      choices: [],
    };
    nodes.push(node);
    node.choices = turn.choices.map((a, choiceIndex): MatchChoice => {
      if (!a.path.length) throw new Error(`Missing ball path: ${nodeId}`);
      const [x, y] = a.path[a.path.length - 1];
      const nextScene: MatchScene = {
        ball: { x, y },
        players: node.scene.players.map((p) => {
          const move = a.moves.find(([player]) => player === p.id);
          return move
            ? { ...p, x: move[1], y: move[2], background: false }
            : { ...p };
        }),
      };
      const choice: MatchChoice = {
        id: `option-${choiceIndex + 1}`,
        label: a.label,
        feedback: a.feedback,
        artId: a.art,
        tone: a.tone,
        movement: a.moves.map(([playerId, mx, my]) => ({
          playerId,
          to: { x: mx, y: my },
          label: '',
          ...(a.routes?.[playerId]?.length
            ? { via: a.routes[playerId].map(([x, y]) => ({ x, y })) }
            : {}),
          ...(a.arrivals?.[playerId] !== undefined
            ? { arriveAtBallContact: a.arrivals[playerId] }
            : {}),
        })),
        ballTo: nextScene.ball,
        ballPath: a.path.map(([px, py]) => ({ x: px, y: py })),
      };
      if (a.result === 'next' || typeof a.result === 'object') {
        const next = a.result === 'next' ? turns[index + 1] : a.result;
        if (!next) throw new Error(`Missing continuation: ${nodeId}`);
        choice.nextNodeId = visit(
          next,
          nextScene,
          a.result === 'next' ? index + 1 : -1,
        );
      } else {
        choice.outcome = endingOutcome(
          `${nodeId}-${choice.id}`,
          a.result,
          a.feedback,
          a.tone,
          a.headline,
        );
      }
      return choice;
    });
    return nodeId;
  }
  if (!turns.length) throw new Error(`Empty moment: ${id}`);
  const rootNodeId = visit(
    turns[0],
    authoredScene(turns[0].actor, owner, placements),
    0,
  );
  return {
    id,
    minute,
    name,
    introduction,
    phase: turns[0].phase,
    rootNodeId,
    nodes,
  };
}

export const action = (
  label: string,
  feedback: string,
  art: string,
  moves: Placement[],
  path: [number, number][],
  result: Action['result'] = 'next',
  tone: MatchTone = 'positive',
  headline?: string,
): Action => ({ label, feedback, art, moves, path, result, tone, headline });
export const turn = (
  actor: string,
  phase: MatchPhase,
  context: string,
  prompt: string,
  ...choices: Action[]
): Turn => ({ actor, phase, context, prompt, choices });
