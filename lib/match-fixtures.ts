import type { TeamIdentity } from './teams.ts';
import { matchRecoveries } from './match-recoveries.ts';
import { expansionFixtures } from './match-expansion.ts';
import { highPressure } from './match-high-pressure.ts';
import { changingPicture } from './match-changing-picture.ts';
import {
  withAlternatives,
  originalAlternatives,
  lowBlockAlternatives,
  secondBallAlternatives,
} from './match-alternatives.ts';
import { balanceChoiceOrder } from './match-choice-order.ts';
import { fixtureTeam } from './teams.ts';
import { tournamentFixture } from './tournament-fixture.ts';
import { polishOriginalMoments } from './original-match-polish.ts';
import {
  matchMoments,
  type MatchMoment,
  type MatchScene,
  type DecisionNode,
  type MatchChoice,
  type MatchOutcome,
} from './match-day.ts';
import {
  authoredScene,
  labels,
  roleNames,
  type Placement,
} from './tactical-scene.ts';
import type { CourseId, Point } from './scenarios';

export type MatchFixture = {
  id: string;
  name: string;
  description: string;
  difficulty:
    | 'Standard'
    | 'Advanced'
    | 'Expert'
    | 'Easy'
    | 'Intermediate'
    | 'Hard';
  opponent?: string;
  cover: string;
  moments: MatchMoment[];
  /** The player's club when it is not Pitchwise FC (My Tournament). */
  home?: TeamIdentity;
  redCard?: { fromMoment: number; team: 'home' | 'away'; player: string };
};
type Action = {
  ballPath?: Point[];
  arrivals?: Record<string, number>;
  label: string;
  feedback: string;
  art: string;
  moves: Placement[];
  ball: Point;
};
type Brief = {
  startPhase?: 'Attacking' | 'Defending';
  nextPhase?: 'Attacking' | 'Defending';
  id: string;
  minute: number;
  name: string;
  defending?: boolean;
  introduction: string;
  actor: string;
  course: CourseId;
  owner: string;
  placements: Placement[];
  context: string;
  prompt: string;
  setup: Action;
  risk: Action;
  safe: Action;
  nextActor: string;
  nextCourse: CourseId;
  nextContext: string;
  nextPrompt: string;
  success: Action;
  failure: Action;
  goalHeadline?: string;
};

// The following frame is derived from the chosen movement, so a cut never teleports players.
function advance(
  scene: MatchScene,
  action: Action,
  active: string,
): MatchScene {
  return {
    ball: action.ball,
    players: scene.players.map((player) => {
      const move = action.moves.find(([id]) => id === player.id);
      return {
        ...player,
        active: player.id === active,
        ...(move ? { x: move[1], y: move[2], background: false } : {}),
      };
    }),
  };
}
function terminal(
  id: string,
  action: Action,
  kind: 'goal' | 'concede' | 'safe' | 'lost' | 'win',
): MatchOutcome {
  return {
    id,
    headline:
      kind === 'goal'
        ? 'GOAL — the opening is yours!'
        : kind === 'concede'
          ? 'Rival XI score.'
          : kind === 'win'
            ? 'Danger stopped.'
            : kind === 'safe'
              ? 'Play resets.'
              : 'Possession lost.',
    recap: action.feedback,
    tone:
      kind === 'goal' || kind === 'win'
        ? 'positive'
        : kind === 'safe'
          ? 'neutral'
          : 'negative',
    homeGoals: Number(kind === 'goal'),
    awayGoals: Number(kind === 'concede'),
    possession: kind === 'goal' || kind === 'lost' ? 'away' : 'home',
  };
}
function option(
  id: string,
  action: Action,
  destination: string | MatchOutcome,
  tone: MatchChoice['tone'],
): MatchChoice {
  const scorer =
    typeof destination !== 'string' &&
    (destination.homeGoals || destination.awayGoals)
      ? (action.moves.find(
          ([player]) => player === (destination.homeGoals ? 'h-st' : 'a-st'),
        ) ??
        action.moves.find(
          ([player]) => player === (destination.homeGoals ? 'h-rw' : 'a-lw'),
        ))
      : undefined;
  const ballPath = scorer
    ? [{ x: scorer[1], y: scorer[2] }, action.ball]
    : [action.ball];
  return {
    id,
    label: action.label,
    feedback: action.feedback,
    artId: action.art,
    tone,
    movement: action.moves.map(([playerId, x, y]) => ({
      playerId,
      to: { x, y },
      label: '',
      ...(action.arrivals?.[playerId] !== undefined
        ? { arriveAtBallContact: action.arrivals[playerId] }
        : {}),
    })),
    ballTo: action.ball,
    ballPath: action.ballPath ?? ballPath,
    ...(typeof destination === 'string'
      ? { nextNodeId: destination }
      : { outcome: destination }),
  };
}
function makeMoment(b: Brief): MatchMoment {
  const phase = b.startPhase ?? (b.defending ? 'Defending' : 'Attacking');
  const root = authoredScene(
    b.actor,
    b.owner,
    b.placements,
    b.defending ? 30 : 70,
  );
  const actor = (id: string) => {
    const label = labels[id.slice(2)];
    return { actorLabel: label, actor: roleNames[label] };
  };
  const setup = advance(root, b.setup, b.nextActor);
  const recovery = matchRecoveries[b.id];
  if (!recovery) throw new Error(`Missing recovery story: ${b.id}`);
  const turnover = {
    ...b.risk,
    feedback: recovery.cause,
    moves: recovery.moves,
    ball: recovery.ball,
    ballPath: recovery.interceptedBy
      ? [
          ...root.players
            .filter((player) => player.id === recovery.interceptedBy)
            .map((player) => ({ x: player.x, y: player.y })),
          recovery.ball,
        ]
      : [recovery.ball],
  };
  const risk = advance(root, turnover, recovery.actor);
  const nodes: DecisionNode[] = [
    {
      id: `${b.id}-start`,
      ...actor(b.actor),
      phase,
      trainingCourseId: b.course,
      scene: root,
      context: b.context,
      prompt: b.prompt,
      choices: [
        option('build', b.setup, `${b.id}-finish`, 'positive'),
        option('force', turnover, `${b.id}-recover`, 'negative'),
        option(
          'reset',
          b.safe,
          {
            ...terminal(`${b.id}-reset`, b.safe, 'safe'),
            possession: phase === 'Defending' ? 'away' : 'home',
          },
          'neutral',
        ),
      ],
    },
    {
      id: `${b.id}-finish`,
      ...actor(b.nextActor),
      phase: b.nextPhase ?? phase,
      trainingCourseId: b.nextCourse,
      scene: setup,
      context: b.nextContext,
      prompt: b.nextPrompt,
      choices: [
        option(
          'read',
          b.success,
          b.goalHeadline && !b.defending
            ? {
                ...terminal(`${b.id}-success`, b.success, 'goal'),
                headline: b.goalHeadline,
              }
            : terminal(
                `${b.id}-success`,
                b.success,
                b.defending ? 'win' : 'goal',
              ),
          'positive',
        ),
        option(
          'rush',
          b.failure,
          terminal(
            `${b.id}-failure`,
            b.failure,
            b.defending ? 'concede' : 'lost',
          ),
          'negative',
        ),
      ],
    },
    {
      id: `${b.id}-recover`,
      ...actor(recovery.actor),
      phase: 'Defending',
      trainingCourseId: recovery.course,
      scene: risk,
      context: recovery.context,
      prompt: recovery.prompt,
      choices: recovery.choices,
    },
  ];
  // Rotate presentation; the best choice is not always button A.
  if (b.minute % 2) nodes[0].choices.reverse();
  if (b.minute % 3) nodes[1].choices.reverse();
  return {
    id: b.id,
    minute: b.minute,
    name: b.name,
    phase,
    introduction: b.introduction,
    rootNodeId: nodes[0].id,
    nodes,
  };
}
const a = (
  label: string,
  feedback: string,
  art: string,
  moves: Placement[],
  x: number,
  y: number,
  via: [number, number][] = [],
  arrivals?: Record<string, number>,
): Action => ({
  label,
  feedback,
  art,
  moves,
  ball: { x, y },
  ...(via.length
    ? { ballPath: [...via.map(([x, y]) => ({ x, y })), { x, y }] }
    : {}),
  ...(arrivals ? { arrivals } : {}),
});
const counter = (label: string, feedback: string) =>
  a(
    label,
    feedback,
    'match-interception',
    [
      ['a-st', 32, 45],
      ['h-lcb', 21, 51],
      ['a-lw', 25, 65],
    ],
    32,
    45,
  );

const lowBlock: Brief[] = [
  {
    id: 'block-switch',
    goalHeadline: 'GOAL — the switch breaks the block!',
    minute: 9,
    name: 'Move the Block',
    introduction:
      'Rival XI defend deep and narrow. Make them travel before attacking.',
    actor: 'h-rcb',
    course: 'right-centre-back',
    owner: 'h-rcb',
    placements: [
      ['h-rcb', 46, 64],
      ['h-lcb', 35, 37],
      ['h-lw', 72, 12],
      ['a-rb', 78, 30],
      ['a-lb', 72, 78],
    ],
    context:
      'Their midfield has shifted toward our right. Our left winger holds the opposite touchline.',
    prompt: 'Where should the centre-back take the attack?',
    setup: a(
      'Switch across to the left winger',
      'The diagonal pass reaches the winger before the block can slide.',
      'right-midfielder-2',
      [],
      72,
      12,
    ),
    risk: counter(
      'Carry the ball through central midfield',
      'The central screen steals the dribble and immediately releases their striker.',
    ),
    safe: a(
      'Recycle across to the left centre-back',
      'We keep the ball, but the block resets.',
      'right-centre-back-1',
      [],
      35,
      37,
    ),
    nextActor: 'h-lw',
    nextCourse: 'left-winger',
    nextContext:
      'The full-back is recovering from inside. Our striker waits between the centre-backs.',
    nextPrompt: 'How should the winger approach the full-back?',
    success: a(
      'Drive outside and cut back behind the defenders',
      'The defender cannot turn in time. The cut-back finds our striker for a first-time goal.',
      'match-home-goal',
      [
        ['h-lw', 87, 18],
        ['h-st', 86, 48],
        ['a-rb', 83, 27],
      ],
      100,
      50,
      [
        [87, 18],
        [86, 48],
      ],
    ),
    failure: a(
      'Stop and wait for support',
      'The delay lets the full-back close down the winger and win the ball.',
      'match-interception',
      [['a-rb', 73, 14]],
      73,
      14,
    ),
  },
  {
    id: 'block-rebound',
    minute: 26,
    name: 'Defend the Second Wave',
    defending: true,
    introduction:
      'A cleared cross drops outside our box. The next contact matters more than the first.',
    actor: 'h-r8',
    course: 'right-midfielder',
    owner: 'a-l8',
    placements: [
      ['a-l8', 31, 62],
      ['h-r8', 24, 65],
      ['h-rcb', 18, 59],
      ['a-st', 22, 50],
    ],
    context:
      'Their midfielder is collecting the clearance. Our eight is goal-side, with a runner behind.',
    prompt: 'How should the eight approach the dropping ball?',
    setup: a(
      'Stay goal-side and contain the first touch',
      'The eight blocks the forward lane and forces a lofted cross instead.',
      'right-midfielder-5',
      [['h-r8', 27, 61]],
      22,
      50,
    ),
    risk: counter(
      'Run past the ball to start a counter',
      'The loose ball belongs to Rival XI. The early departure leaves the centre exposed.',
    ),
    safe: a(
      'Clear the loose ball into touch',
      'Our clearance goes out. Rival XI have a throw-in; our defence has time to reorganise.',
      'right-centre-back-5',
      [],
      29,
      100,
    ),
    nextActor: 'h-rcb',
    nextCourse: 'right-centre-back',
    nextContext:
      'The forced cross drops toward the striker. Our centre-back can step across the run.',
    nextPrompt: 'Who wins the next contact?',
    success: a(
      'Get goal-side and meet the cross',
      'Our centre-back heads the delivery out to the right. Our right-back collects beyond the first line of pressure.',
      'right-centre-back-5',
      [
        ['h-rcb', 20, 50],
        ['h-rb', 45, 72],
      ],
      45,
      72,
      [[20, 50]],
    ),
    failure: a(
      'Hold position and follow the flight',
      'The striker reaches the cross unchallenged and heads into the corner.',
      'match-rival-header',
      [['a-st', 15, 49]],
      0,
      49,
    ),
  },
  {
    id: 'block-underlap',
    goalHeadline: 'GOAL — the underlap cuts them open!',
    minute: 42,
    name: 'The Inside Runner',
    introduction:
      'Width has stretched the defence. Now attack the gap between full-back and centre-back.',
    actor: 'h-lw',
    course: 'left-winger',
    owner: 'h-lw',
    placements: [
      ['h-lw', 73, 12],
      ['h-lb', 65, 25],
      ['h-l8', 53, 32],
      ['a-rb', 77, 18],
      ['a-rcb', 82, 42],
    ],
    context:
      'The full-back faces our winger outside. The left-back has space to run inside them.',
    prompt: 'How should the winger develop the attack?',
    setup: a(
      'Hold wide and slip the left-back inside',
      'Our left winger holds the opposing right-back outside, then passes into our left-back’s run through the inside channel.',
      'left-winger-3',
      [['h-lb', 83, 30]],
      83,
      30,
    ),
    risk: counter(
      'Pass between the centre-backs for the striker',
      'The blocked pass starts a counter while our midfield is ahead of the ball.',
    ),
    safe: a(
      'Pass back to the left midfielder',
      'Possession is safe, but the gap closes.',
      'left-midfielder-1',
      [],
      53,
      32,
    ),
    nextActor: 'h-lb',
    nextCourse: 'full-back',
    nextContext:
      'The left-back is inside the box. The goalkeeper guards the near post and our striker arrives centrally.',
    nextPrompt: 'What should the left-back do inside the box?',
    success: a(
      'Cut back to the striker behind the first defender',
      'Our left-back pulls the ball back behind the first defender. The striker meets it centrally and scores first time.',
      'match-home-goal',
      [['h-st', 87, 50]],
      100,
      48,
    ),
    failure: a(
      'Shoot from the tight angle',
      'The goalkeeper blocks the narrow-angle effort and holds possession.',
      'match-blocked-shot',
      [['a-gk', 94, 39]],
      94,
      39,
    ),
  },
  {
    id: 'block-cross',
    minute: 66,
    name: 'Own the Back Post',
    defending: true,
    introduction:
      'Rival XI switch to their right. Our far-side defender must see more than the ball.',
    actor: 'h-rb',
    course: 'right-back',
    owner: 'a-rw',
    placements: [
      ['a-rw', 23, 13],
      ['h-rb', 19, 82],
      ['a-lw', 22, 72],
      ['h-gk', 8, 50],
    ],
    context:
      'A winger winds up to cross. The far winger begins a blind-side run behind our right-back.',
    prompt: 'What does the right-back check first?',
    setup: a(
      'Tuck in and track the far-post runner',
      'The right-back takes away the free header and channels the cross toward the goalkeeper.',
      'right-back-4',
      [
        ['h-rb', 13, 65],
        ['a-lw', 16, 68],
      ],
      11,
      54,
    ),
    risk: counter(
      'Move out toward the crosser',
      'The cross bypasses the distant press and reaches an unmarked central attacker.',
    ),
    safe: a(
      'Head the delivery out for a corner',
      'Our right-back heads the cross behind for a Rival XI corner. The defence has time to organise.',
      'right-centre-back-5',
      [['h-rb', 14, 69]],
      0,
      80,
      [[14, 69]],
    ),
    nextActor: 'h-gk',
    nextCourse: 'goalkeeper',
    nextContext:
      'The cross hangs inside the six-yard area. The right-back has kept the runner away from the landing spot.',
    nextPrompt: 'How does the goalkeeper end the danger?',
    success: a(
      'Call early and claim with both hands',
      'The keeper claims cleanly; our team can build again.',
      'goalkeeper-4',
      [['h-gk', 11, 54]],
      11,
      54,
    ),
    failure: a(
      'Advance a few steps and set',
      'Their striker reaches the dropping cross before our goalkeeper and heads into the exposed goal.',
      'match-rival-header',
      [
        ['h-gk', 10, 51],
        ['a-lw', 11, 55],
      ],
      0,
      54,
    ),
  },
  {
    id: 'block-rebound-goal',
    goalHeadline: 'GOAL — first to the rebound!',
    minute: 88,
    name: 'Follow the Shot',
    introduction:
      'The box is crowded, but the goalkeeper is spilling low shots. Stay alive after the first effort.',
    actor: 'h-l8',
    course: 'left-midfielder',
    owner: 'h-l8',
    placements: [
      ['h-l8', 75, 35],
      ['h-st', 82, 50],
      ['a-gk', 94, 50],
      ['a-lcb', 85, 57],
    ],
    context:
      'The eight has a clear shooting lane. The striker can separate from the defender for a rebound.',
    prompt: 'What should the eight do outside the box?',
    setup: a(
      'Strike a low shot toward the corner',
      'The goalkeeper parries the skidding ball into the striker’s path.',
      'striker-5',
      [['h-st', 89, 48]],
      90,
      48,
      [[94, 50]],
    ),
    risk: counter(
      'Carry into the last defender',
      'The tackle releases Rival XI into the space vacated by midfield.',
    ),
    safe: a(
      'Keep the ball moving outside the box',
      'The team retains control without creating a final chance.',
      'right-midfielder-2',
      [['h-r8', 68, 80]],
      68,
      80,
    ),
    nextActor: 'h-st',
    nextCourse: 'striker',
    nextContext:
      'The ball spills six yards from goal. The goalkeeper is still on the ground.',
    nextPrompt: 'What does the striker do with the rebound?',
    success: a(
      'Side-foot the rebound first time',
      'The striker follows the shot and turns the rebound into a late goal.',
      'match-home-goal',
      [['h-st', 92, 48]],
      100,
      45,
    ),
    failure: a(
      'Control the rebound before shooting',
      'The extra touch lets the goalkeeper smother the ball.',
      'match-blocked-shot',
      [['a-gk', 91, 48]],
      91,
      48,
    ),
  },
];
const secondBall: Brief[] = [
  {
    id: 'direct-duel',
    nextPhase: 'Attacking',
    minute: 7,
    name: 'Win the Knockdown',
    defending: true,
    introduction:
      'Rival XI play long toward their striker. Defend the duel and the space underneath it.',
    actor: 'h-lcb',
    course: 'centre-back',
    owner: 'a-gk',
    placements: [
      ['a-gk', 92, 50],
      ['a-st', 30, 43],
      ['h-lcb', 27, 43],
      ['h-six', 34, 53],
    ],
    context:
      'Their striker waits for a high ball. Our six can collect a controlled knockdown.',
    prompt: 'How should the centre-back contest it?',
    setup: a(
      'Meet the ball and head toward the six',
      'The centre-back wins the first contact toward a teammate, not back into the crowd.',
      'right-centre-back-5',
      [
        ['h-lcb', 30, 43],
        ['a-st', 32, 47],
      ],
      34,
      53,
      [[30, 43]],
    ),
    risk: counter(
      'Hold position behind the striker',
      'The striker turns into space and attacks our last line.',
    ),
    safe: a(
      'Head the ball straight into touch',
      'Our centre-back heads the long pass out. Rival XI have a throw-in, but the striker cannot turn toward goal.',
      'right-centre-back-5',
      [],
      28,
      0,
      [[27, 43]],
    ),
    nextActor: 'h-six',
    nextCourse: 'defensive-midfielder',
    nextContext:
      'The knockdown arrives at the six. An opponent is closing from behind; the right-back is free.',
    nextPrompt: 'How does the six secure the second ball?',
    success: a(
      'Set it first-time to the right-back',
      'A simple pass escapes the pressure and secures possession.',
      'right-back-1',
      [['h-rb', 36, 87]],
      36,
      87,
    ),
    failure: a(
      'Control the ball and turn upfield',
      'The tackle sends the striker through to finish before our defence can reset.',
      'match-rival-goal',
      [['a-st', 15, 50]],
      0,
      50,
    ),
  },
  {
    id: 'direct-outlet',
    goalHeadline: 'GOAL — keeper to net in seconds!',
    minute: 24,
    name: 'Release the Outlet',
    introduction:
      'The goalkeeper has caught a cross. Their full-backs are still high up the pitch.',
    actor: 'h-gk',
    course: 'goalkeeper',
    owner: 'h-gk',
    placements: [
      ['h-gk', 10, 50],
      ['h-rw', 54, 88],
      ['a-lb', 38, 80],
      ['h-st', 65, 51],
      ['h-six', 26, 50],
      ['a-r8', 22, 46],
    ],
    context:
      'Our right winger is beyond their full-back with room to run. Their centre-backs are retreating.',
    prompt: 'Where should the goalkeeper launch the break?',
    setup: a(
      'Kick early into the right winger’s path',
      'Our keeper drops the ball and kicks into the right channel. The winger receives beyond the recovering full-back.',
      'goalkeeper-1',
      [
        ['h-rw', 73, 86],
        ['h-st', 80, 50],
      ],
      73,
      86,
    ),
    risk: counter(
      'Throw into the central midfielder',
      'The opponent steps across the receiver and attacks our exposed goalkeeper.',
    ),
    safe: a(
      'Wait and roll to the centre-back',
      'Our team keeps possession, but Rival XI recover their shape.',
      'right-centre-back-1',
      [['h-rcb', 27, 63]],
      27,
      63,
    ),
    nextActor: 'h-rw',
    nextCourse: 'right-winger',
    nextContext:
      'The winger approaches the box while the striker runs between the retreating centre-backs.',
    nextPrompt: 'What should the winger do approaching the box?',
    success: a(
      'Pass across the retreating defender for the striker',
      'Our right winger passes across the retreating defender. The striker arrives first and finishes before the cover reaches them.',
      'match-home-goal',
      [
        ['h-rw', 86, 73],
        ['h-st', 89, 50],
      ],
      100,
      50,
    ),
    failure: a(
      'Take on the recovering full-back',
      'The recovered defender tackles and ends the break.',
      'match-interception',
      [['a-lb', 75, 83]],
      75,
      83,
    ),
  },
  {
    id: 'direct-press',
    goalHeadline: 'GOAL — the trap springs shut!',
    startPhase: 'Defending',
    nextPhase: 'Attacking',
    minute: 41,
    name: 'Spring the Wide Trap',
    introduction:
      'Their centre-back plays a slow pass toward the touchline. A coordinated press can turn it into a chance.',
    actor: 'h-lw',
    course: 'left-winger',
    owner: 'a-rb',
    placements: [
      ['a-rb', 72, 12],
      ['h-lw', 64, 20],
      ['h-l8', 62, 34],
      ['a-six', 66, 44],
    ],
    context:
      'Their right-back receives facing the sideline. Our eight can close the inside outlet.',
    prompt: 'How should the winger approach the right-back?',
    setup: a(
      'Curve the press from inside toward the line',
      'The curved run blocks the return inside; a rushed pass falls to our eight.',
      'left-winger-4',
      [
        ['h-lw', 71, 16],
        ['h-l8', 71, 30],
      ],
      71,
      30,
    ),
    risk: counter(
      'Press from the touchline toward the centre',
      'The right-back escapes into midfield and the press is broken.',
    ),
    safe: a(
      'Drop back into our midfield line',
      'We recover our shape without winning the ball high up.',
      'left-winger-5',
      [['h-lw', 48, 20]],
      64,
      30,
    ),
    nextActor: 'h-l8',
    nextCourse: 'left-midfielder',
    nextContext:
      'The eight wins the loose pass facing goal. The striker peels away from a centre-back.',
    nextPrompt: 'How should the eight use the high regain?',
    success: a(
      'Pass forward into the striker’s run',
      'A quick pass uses the moment of disorder and the striker finishes.',
      'match-home-goal',
      [['h-st', 86, 45]],
      100,
      47,
    ),
    failure: a(
      'Carry across the box toward support',
      'The delay allows their midfielder to recover and steal the ball.',
      'match-interception',
      [['a-six', 72, 34]],
      72,
      34,
    ),
  },
  {
    id: 'direct-cover',
    minute: 65,
    name: 'Cover the First Duel',
    defending: true,
    introduction:
      'A centre-back steps to challenge a striker. Their winger is already running beyond.',
    actor: 'h-rb',
    course: 'right-back',
    owner: 'a-l8',
    placements: [
      ['a-l8', 48, 66],
      ['h-rcb', 32, 58],
      ['h-rb', 29, 83],
      ['a-lw', 35, 73],
      ['h-gk', 8, 50],
    ],
    context:
      'The right centre-back steps up. A diagonal ball could send their winger through the gap.',
    prompt: 'Where is the right-back needed?',
    setup: a(
      'Recover diagonally behind the centre-back',
      'The full-back covers the runner and forces a heavier through ball.',
      'right-back-5',
      [
        ['h-rb', 18, 67],
        ['a-lw', 21, 72],
        ['h-gk', 12, 61],
      ],
      15,
      65,
    ),
    risk: counter(
      'Step up beside the centre-back',
      'Both defenders attack the same line and leave a clear route to goal.',
    ),
    safe: a(
      'Intercept and clear down the touchline',
      'The immediate danger ends, although Rival XI collect the clearance.',
      'right-back-3',
      [['h-rb', 22, 74]],
      48,
      98,
    ),
    nextActor: 'h-gk',
    nextCourse: 'goalkeeper',
    nextContext:
      'The through ball is loose inside the box. The goalkeeper is closer than the covered runner.',
    nextPrompt: 'How can the keeper complete the cover?',
    success: a(
      'Sweep out and gather before the runner',
      'The goalkeeper reaches the loose ball first.',
      'goalkeeper-2',
      [['h-gk', 15, 65]],
      15,
      65,
    ),
    failure: a(
      'Set on the goal line for the shot',
      'The forward gathers the ball and finishes across the goalkeeper.',
      'match-rival-goal',
      [['a-lw', 15, 65]],
      0,
      46,
    ),
  },
  {
    id: 'direct-layoff',
    goalHeadline: 'GOAL — one touch, one finish!',
    minute: 87,
    name: 'One Touch Beyond',
    introduction:
      'A direct pass reaches our striker late in the match. A teammate starts a run beyond the defensive line.',
    actor: 'h-st',
    course: 'striker',
    owner: 'h-st',
    placements: [
      ['h-st', 73, 50],
      ['a-lcb', 76, 51],
      ['h-r8', 64, 66],
      ['h-rw', 77, 86],
    ],
    context:
      'The striker receives with a defender tight behind. The eight approaches facing forward.',
    prompt: 'How should the striker connect the attack?',
    setup: a(
      'Lay the ball off and pin the defender',
      'The first-time set gives the eight a forward-facing touch while the defender stays occupied.',
      'striker-2',
      [['h-r8', 72, 65]],
      72,
      65,
    ),
    risk: counter(
      'Control and turn toward goal',
      'The defender wins the ball and releases the counter.',
    ),
    safe: a(
      'Shield the ball and pass back into midfield',
      'Possession is retained, but the forward runners must reset.',
      'striker-1',
      [],
      55,
      50,
    ),
    nextActor: 'h-r8',
    nextCourse: 'right-midfielder',
    nextContext:
      'The eight faces goal. The right winger starts onside and is ready to go.',
    nextPrompt: 'How should the eight continue the attack?',
    success: a(
      'Slip the winger in with a first-time pass',
      'The timed pass releases an onside winger to finish across goal.',
      'match-home-goal',
      [['h-rw', 89, 70]],
      100,
      46,
    ),
    failure: a(
      'Carry forward before making the pass',
      'The extra carrying touch lets our winger run beyond the defensive line before the pass. The delayed delivery is offside; Rival XI restart.',
      'right-winger-1',
      [
        ['h-r8', 80, 65],
        ['h-rw', 89, 70],
      ],
      89,
      70,
      [[80, 65]],
      { 'h-r8': 0, 'h-rw': 0 },
    ),
  },
];

const fixtures: MatchFixture[] = [
  {
    id: 'original',
    name: 'Beat the Press',
    difficulty: 'Standard',
    cover: '/illustrations/match-days/beat-the-press.webp',
    description:
      'Build through pressure and connect the hidden jobs. The opening goal takes five precise decisions.',
    moments: withAlternatives(matchMoments, originalAlternatives),
  },
  {
    id: 'low-block',
    name: 'Break the Low Block',
    difficulty: 'Standard',
    cover: '/illustrations/match-days/low-block.webp',
    description:
      'Move a deep defence, find the inside runner, and stay alive for the rebound.',
    moments: withAlternatives(lowBlock.map(makeMoment), lowBlockAlternatives),
  },
  {
    id: 'second-ball',
    name: 'Win the Second Ball',
    difficulty: 'Standard',
    cover: '/illustrations/match-days/second-ball.webp',
    description:
      'Own aerial duels, spring a pressing trap, and turn direct play into quick attacks.',
    moments: withAlternatives(
      secondBall.map(makeMoment),
      secondBallAlternatives,
    ),
  },
  highPressure,
  changingPicture,
  ...expansionFixtures,
];

export const matchFixtures: MatchFixture[] = fixtures.map((fixture) => {
  const polished = {
    ...fixture,
    moments: polishOriginalMoments(fixture.id, fixture.moments),
  };
  const named = tournamentFixture(polished, fixtureTeam(fixture.id).name);
  return { ...named, moments: balanceChoiceOrder(named.moments) };
});
