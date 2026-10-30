export type Point = { x: number; y: number };

export type Player = Point & {
  id: string;
  label: string;
  team: 'home' | 'away';
  role: string;
  active?: boolean;
  background?: boolean;
  // Point the player's body faces in the starting frame, not a movement target.
  facing?: Point;
};

export type Choice = {
  id: string;
  label: string;
  rationale: string;
};

export type Movement = {
  playerId: string;
  to: Point;
  label: string;
  via?: Point[];
  // Finish this movement before the indexed ballPath contact (zero-based).
  // Used for check-backs and deliberately mistimed runs before a pass is released.
  arriveAtBallContact?: number;
};

export type Reveal = {
  ballTo?: Point;
  ballPath?: Point[];
  touchline: string;
  focus: Point & { radiusX: number; radiusY: number; label: string };
  passingLane?: { from: Point; to: Point };
  headline: string;
  cue: string;
  helped: string;
  space: string;
  risk: string;
  watchFor: string;
  movements: Movement[];
};

export type Scenario = {
  id: string;
  mode: 'Attacking' | 'Defending';
  phase: string;
  title: string;
  context: string;
  prompt: string;
  teachingPoint: string;
  players: Player[];
  ball: Point;
  choices: Choice[];
  correctChoiceId: string;
  reveal: Reveal;
  illustration?: {
    src: string;
    alt: string;
    caption: string;
    orientation: 'portrait' | 'landscape';
  };
};

export type CourseId = 'full-back' | 'defensive-midfielder' | 'centre-back' | 'goalkeeper' | 'right-back' | 'right-centre-back' | 'left-midfielder' | 'right-midfielder' | 'left-winger' | 'right-winger' | 'striker';

export type Course = {
  id: CourseId;
  lessonNumber: string;
  position: string;
  activeLabel: string;
  headline: string;
  deck: string;
  completionHeadline: string;
  shareText: string;
  recapQuestions: { question: string; explanation: string }[];
  scenarios: Scenario[];
};

export const scenarios: Scenario[] = [
  {
    id: 'build-up-width',
    mode: 'Attacking',
    phase: 'With the ball',
    title: 'The safe exit',
    context: 'The centre-back has the ball. The winger is high, while the central midfielder is marked.',
    prompt: 'Where should the left-back move?',
    teachingPoint: 'Create a passing angle before asking for the ball.',
    ball: { x: 25, y: 39 },
    players: [
      { id: 'gk', label: 'GK', role: 'Goalkeeper', team: 'home', x: 9, y: 50 },
      { id: 'lcb', label: 'CB', role: 'Centre-back', team: 'home', x: 25, y: 39 },
      { id: 'rcb', label: 'CB', role: 'Centre-back', team: 'home', x: 25, y: 66 },
      { id: 'lb', label: 'LB', role: 'Left-back', team: 'home', active: true, x: 28, y: 20 },
      { id: 'cm', label: '6', role: 'Midfielder', team: 'home', x: 43, y: 51 },
      { id: 'lw', label: 'LW', role: 'Winger', team: 'home', x: 64, y: 12 },
      { id: 'press-1', label: '9', role: 'Forward', team: 'away', x: 36, y: 41 },
      { id: 'press-2', label: '8', role: 'Midfielder', team: 'away', x: 49, y: 50 },
      { id: 'opp-rb', label: 'RB', role: 'Right-back', team: 'away', x: 72, y: 19 },
    ],
    choices: [
      { id: 'hold', label: 'Stay level with the centre-back', rationale: 'That keeps the passing lane narrow and lets one presser block both players.' },
      { id: 'wide', label: 'Move wider and a little higher', rationale: 'The movement stretches the press and creates a clean diagonal passing lane.' },
      { id: 'beyond', label: 'Sprint beyond the winger', rationale: 'It is too early; the team first needs a safe route out of the first line of pressure.' },
    ],
    correctChoiceId: 'wide',
    reveal: {
      headline: 'Width creates the exit.',
      touchline: 'Change the angle and the safe pass can appear.',
      focus: { x: 40, y: 12, radiusX: 11, radiusY: 7, label: 'The wide escape route' },
      passingLane: { from: { x: 25, y: 39 }, to: { x: 40, y: 8 } },
      cue: 'The midfielder is covered and the forward is curving the press toward the centre-back.',
      helped: 'The centre-back gains a simple pass that takes the first presser out of the move.',
      space: 'The left touchline becomes useful space instead of empty space.',
      risk: 'Standing still lets one opponent defend two passing options.',
      watchFor: 'When a centre-back receives, glance at how quickly the full-back changes the angle.',
      movements: [{ playerId: 'lb', to: { x: 40, y: 8 }, label: 'Open the passing angle' }],
    },
    illustration: {
      src: '/illustrations/build-up-width.webp',
      alt: 'An illustrated left-back moving wide to offer a passing angle to a centre-back under pressure.',
      caption: 'The full-back moves outside the press before the pass arrives.',
      orientation: 'portrait',
    },
  },
  {
    id: 'overlap-decoy',
    mode: 'Attacking',
    phase: 'Attacking third',
    title: 'The run that never gets the ball',
    context: 'The winger receives wide and faces a defender. The inside midfielder is available behind the play.',
    prompt: 'What is the full-back’s most useful next action?',
    teachingPoint: 'An overlap can create space even when the pass never comes.',
    ball: { x: 61, y: 18 },
    players: [
      { id: 'lcb', label: 'CB', role: 'Centre-back', team: 'home', x: 31, y: 39 },
      { id: 'lb', label: 'LB', role: 'Left-back', team: 'home', active: true, x: 49, y: 27 },
      { id: 'lw', label: 'LW', role: 'Winger', team: 'home', x: 61, y: 18 },
      { id: 'cm', label: '8', role: 'Midfielder', team: 'home', x: 54, y: 48 },
      { id: 'st', label: '9', role: 'Striker', team: 'home', x: 78, y: 51 },
      { id: 'opp-rb', label: 'RB', role: 'Right-back', team: 'away', x: 67, y: 22 },
      { id: 'opp-cb', label: 'CB', role: 'Centre-back', team: 'away', x: 75, y: 42 },
      { id: 'opp-mid', label: '6', role: 'Midfielder', team: 'away', x: 61, y: 49 },
    ],
    choices: [
      { id: 'behind', label: 'Stay behind as a safe pass', rationale: 'Safe, but it lets the defender focus entirely on stopping the winger.' },
      { id: 'overlap', label: 'Overlap outside the winger', rationale: 'The run forces the defender to track two threats and opens a lane inside.' },
      { id: 'box', label: 'Run directly into the penalty area', rationale: 'That crowds the striker’s space and is harder for the winger to see.' },
    ],
    correctChoiceId: 'overlap',
    reveal: {
      headline: 'The decoy is the job.',
      touchline: 'You didn’t get the pass. You still made the chance.',
      focus: { x: 69, y: 31, radiusX: 9, radiusY: 9, label: 'Space inside the winger' },
      cue: 'The defender is square to the winger and cannot see both the ball and the full-back.',
      helped: 'The winger gets an extra half-second to cut inside or combine with midfield.',
      space: 'The run stretches the outside channel and opens the half-space.',
      risk: 'If the ball is lost, the full-back is ahead of it—so timing matters.',
      watchFor: 'Count how often an overlap changes a defender’s body position without receiving a pass.',
      movements: [{ playerId: 'lb', to: { x: 75, y: 7 }, label: 'Overlap to pull the defender' }],
    },
    illustration: {
      src: '/illustrations/overlap-decoy.webp',
      alt: 'An illustrated left-back sprinting around the outside of a winger while a defender turns to follow.',
      caption: 'The overlap creates the lane—even if the winger keeps the ball.',
      orientation: 'portrait',
    },
  },
  {
    id: 'recovery-inside',
    mode: 'Defending',
    phase: 'Transition after losing the ball',
    title: 'The first three recovery steps',
    context: 'The attack breaks down near the left corner. A teammate is already pressing the ball, while an opponent starts through the inside channel.',
    prompt: 'Which recovery route should the full-back take?',
    teachingPoint: 'Recover toward danger, not simply toward the touchline.',
    ball: { x: 72, y: 17 },
    players: [
      { id: 'lb', label: 'LB', role: 'Left-back', team: 'home', active: true, x: 68, y: 9 },
      { id: 'lw', label: 'LW', role: 'Winger', team: 'home', x: 73, y: 18 },
      { id: 'cm', label: '8', role: 'Midfielder', team: 'home', x: 61, y: 34 },
      { id: 'lcb', label: 'CB', role: 'Centre-back', team: 'home', x: 35, y: 38 },
      { id: 'rcb', label: 'CB', role: 'Centre-back', team: 'home', x: 33, y: 64 },
      { id: 'winner', label: 'RB', role: 'Right-back', team: 'away', x: 72, y: 17 },
      { id: 'runner', label: '7', role: 'Runner', team: 'away', x: 59, y: 28 },
      { id: 'opp-9', label: '9', role: 'Forward', team: 'away', x: 48, y: 52 },
    ],
    choices: [
      { id: 'press', label: 'Join the press on the ball', rationale: 'A teammate is already pressing; a second player there leaves the inside runner free.' },
      { id: 'line', label: 'Sprint straight down the touchline', rationale: 'It recovers territory but leaves the most dangerous central route open.' },
      { id: 'inside', label: 'Recover diagonally inside', rationale: 'The diagonal run gets goal-side of the runner and protects the central channel first.' },
    ],
    correctChoiceId: 'inside',
    reveal: {
      headline: 'Protect the shortest route to goal.',
      touchline: 'Recover toward the route to goal, not just toward the ball.',
      focus: { x: 45, y: 32, radiusX: 11, radiusY: 10, label: 'The inside recovery channel' },
      cue: 'The ball is under pressure, but the inside runner is free and facing forward.',
      helped: 'The centre-back can hold position rather than being dragged into the channel.',
      space: 'The dangerous lane between full-back and centre-back closes first.',
      risk: 'Recovering too wide offers the counterattack a direct route through the middle.',
      watchFor: 'After a turnover, notice whether the full-back’s first steps point toward the ball or toward the danger.',
      movements: [{ playerId: 'lb', to: { x: 48, y: 31 }, label: 'Recover inside the runner' }],
    },
    illustration: {
      src: '/illustrations/recovery-inside.webp',
      alt: 'An illustrated left-back sprinting diagonally inward to get goal-side of an opponent after possession is lost.',
      caption: 'The first recovery steps protect the inside channel.',
      orientation: 'landscape',
    },
  },
  {
    id: 'far-side-tuck',
    mode: 'Defending',
    phase: 'Without the ball',
    title: 'Defending the far post',
    context: 'The opponent attacks down your team’s right side. The ball is far away, but a winger waits behind the back line.',
    prompt: 'Where should the left-back position themself?',
    teachingPoint: 'The far-side full-back becomes an extra central defender.',
    ball: { x: 43, y: 86 },
    players: [
      { id: 'lb', label: 'LB', role: 'Left-back', team: 'home', active: true, x: 31, y: 13 },
      { id: 'lcb', label: 'CB', role: 'Centre-back', team: 'home', x: 25, y: 38 },
      { id: 'rcb', label: 'CB', role: 'Centre-back', team: 'home', x: 24, y: 61 },
      { id: 'rb', label: 'RB', role: 'Right-back', team: 'home', x: 29, y: 82 },
      { id: 'cm', label: '6', role: 'Midfielder', team: 'home', x: 43, y: 54 },
      { id: 'crosser', label: 'LW', role: 'Winger', team: 'away', x: 43, y: 86 },
      { id: 'opp-9', label: '9', role: 'Forward', team: 'away', x: 31, y: 54 },
      { id: 'far-runner', label: 'RW', role: 'Far-side winger', team: 'away', x: 38, y: 22 },
    ],
    choices: [
      { id: 'touchline', label: 'Stay close to the left touchline', rationale: 'That guards empty space while leaving the back post and far-side runner exposed.' },
      { id: 'tuck', label: 'Tuck inside beside the centre-back', rationale: 'The full-back protects the back post while staying able to release if the ball switches.' },
      { id: 'runner', label: 'Follow the winger all the way into midfield', rationale: 'Following too early can pull the defensive line apart and open the back post.' },
    ],
    correctChoiceId: 'tuck',
    reveal: {
      headline: 'Far from the ball, close to the danger.',
      touchline: 'Far from the ball does not mean far from danger.',
      focus: { x: 26, y: 29, radiusX: 9, radiusY: 10, label: 'The far-post channel' },
      cue: 'The crosser has time to look up, and the far-side winger is behind the midfield line.',
      helped: 'The centre-backs can defend the first contact while the full-back protects the far post.',
      space: 'The gap between left-back and centre-back disappears before the cross arrives.',
      risk: 'Staying wide creates a blind-side channel for a runner at the back post.',
      watchFor: 'When the ball moves to one wing, check whether the opposite full-back becomes part of a narrow back three.',
      movements: [{ playerId: 'lb', to: { x: 27, y: 30 }, label: 'Tuck in to guard the far post' }],
    },
    illustration: {
      src: '/illustrations/far-side-tuck.webp',
      alt: 'An illustrated left-back tucked beside the centre-backs while scanning a runner at the far post.',
      caption: 'On the far side, the full-back becomes the third centre-back.',
      orientation: 'portrait',
    },
  },
  {
    id: 'cover-centre-back',
    mode: 'Defending',
    phase: 'Defensive decision',
    title: 'The space behind the press',
    context: 'The left centre-back steps forward to challenge an attacker between the lines. A forward is ready to run into the space behind.',
    prompt: 'What should the left-back do as the centre-back steps out?',
    teachingPoint: 'Cover a teammate’s movement before chasing your own opponent.',
    ball: { x: 46, y: 42 },
    players: [
      { id: 'lb', label: 'LB', role: 'Left-back', team: 'home', active: true, x: 25, y: 15 },
      { id: 'lcb', label: 'CB', role: 'Centre-back', team: 'home', x: 29, y: 38 },
      { id: 'rcb', label: 'CB', role: 'Centre-back', team: 'home', x: 24, y: 62 },
      { id: 'rb', label: 'RB', role: 'Right-back', team: 'home', x: 27, y: 84 },
      { id: 'six', label: '6', role: 'Midfielder', team: 'home', x: 40, y: 58 },
      { id: 'receiver', label: '10', role: 'Attacking midfielder', team: 'away', x: 46, y: 42 },
      { id: 'runner', label: '9', role: 'Forward', team: 'away', x: 39, y: 28 },
      { id: 'opp-rw', label: 'RW', role: 'Winger', team: 'away', x: 48, y: 12 },
    ],
    choices: [
      { id: 'winger', label: 'Stay wide with the winger', rationale: 'The winger is visible, but the central run behind the stepping defender is more immediate.' },
      { id: 'cover', label: 'Narrow and cover behind the centre-back', rationale: 'The full-back fills the space the centre-back has left and protects the direct route to goal.' },
      { id: 'ball', label: 'Step forward to press the ball too', rationale: 'Two defenders stepping together leaves no cover behind the challenge.' },
    ],
    correctChoiceId: 'cover',
    reveal: {
      headline: 'One steps. One covers.',
      touchline: 'When the centre-back steps out, cover the space left behind.',
      focus: { x: 29, y: 32, radiusX: 9, radiusY: 11, label: 'Cover behind the centre-back' },
      cue: 'The centre-back is moving toward the ball, so the space behind them is about to become the priority.',
      helped: 'The centre-back can challenge aggressively knowing a teammate has protected the gap.',
      space: 'The inside channel becomes occupied before the forward can attack it.',
      risk: 'Remaining wide turns one forward pass into a clear run at goal.',
      watchFor: 'When a centre-back jumps out of line, find the full-back and see whether they narrow immediately.',
      movements: [
        { playerId: 'lcb', to: { x: 41, y: 41 }, label: 'Centre-back steps to the ball' },
        { playerId: 'lb', to: { x: 29, y: 30 }, label: 'Full-back covers the gap' },
      ],
    },
    illustration: {
      src: '/illustrations/cover-centre-back.webp',
      alt: 'An illustrated left-back narrowing behind a centre-back who has stepped forward to press.',
      caption: 'As the centre-back steps, the full-back fills the gap.',
      orientation: 'landscape',
    },
  },
];

export const defensiveMidfielderScenarios: Scenario[] = [
  {
    id: 'six-cover-shadow',
    mode: 'Attacking',
    phase: 'Build-up',
    title: 'Step out of the shadow',
    context: 'The left centre-back has the ball. The opposing striker is blocking the direct pass into midfield.',
    prompt: 'Where should the defensive midfielder move?',
    teachingPoint: 'Move out of the forward’s cover shadow before asking for the ball.',
    ball: { x: 25, y: 39 },
    players: [
      { id: 'gk', label: 'GK', role: 'Goalkeeper', team: 'home', x: 9, y: 50 },
      { id: 'lcb', label: 'CB', role: 'Centre-back', team: 'home', x: 25, y: 39 },
      { id: 'rcb', label: 'CB', role: 'Centre-back', team: 'home', x: 25, y: 64 },
      { id: 'lb', label: 'LB', role: 'Left-back', team: 'home', x: 36, y: 12 },
      { id: 'rb', label: 'RB', role: 'Right-back', team: 'home', x: 36, y: 88 },
      { id: 'six', label: '6', role: 'Defensive midfielder', team: 'home', active: true, x: 41, y: 49 },
      { id: 'eight', label: '8', role: 'Midfielder', team: 'home', x: 55, y: 32 },
      { id: 'press-nine', label: '9', role: 'Forward', team: 'away', x: 34, y: 43 },
      { id: 'opp-ten', label: '10', role: 'Attacking midfielder', team: 'away', x: 50, y: 51 },
    ],
    choices: [
      { id: 'stay', label: 'Stay directly behind the striker', rationale: 'The striker can continue blocking the passing lane without moving.' },
      { id: 'side', label: 'Move sideways into a new passing lane', rationale: 'A few steps outside the cover shadow give the centre-back a clean route into midfield.' },
      { id: 'forward', label: 'Run beyond the attacking midfielder', rationale: 'That removes the short central option before the team has escaped the first press.' },
    ],
    correctChoiceId: 'side',
    reveal: {
      headline: 'Make yourself visible to the ball.',
      touchline: 'A few quiet steps can beat an entire line of pressure.',
      focus: { x: 43, y: 62, radiusX: 9, radiusY: 9, label: 'The lane beside the striker' },
      passingLane: { from: { x: 25, y: 39 }, to: { x: 43, y: 62 } },
      cue: 'The striker’s body is screening the direct pass into the number six.',
      helped: 'The centre-back gains a central pass that can break the first line of pressure.',
      space: 'The passing lane beside the striker opens.',
      risk: 'Standing still leaves the centre-back with only predictable wide or backward passes.',
      watchFor: 'When a centre-back has the ball, see whether the number six stays hidden or slides into view.',
      movements: [{ playerId: 'six', to: { x: 43, y: 62 }, label: 'Escape the cover shadow' }],
    },
    illustration: {
      src: '/illustrations/midfielder-cover-shadow.webp',
      alt: 'An editorial illustration of a defensive midfielder scanning over her shoulder while checking sideways into space.',
      caption: 'Scanning and checking sideways makes the next pass possible.',
      orientation: 'landscape',
    },
  },
  {
    id: 'six-half-turn',
    mode: 'Attacking',
    phase: 'Progressing the ball',
    title: 'The scan before the pass',
    context: 'The defensive midfielder is about to receive from a centre-back. Pressure is arriving from one shoulder, while the far-side midfielder is free.',
    prompt: 'How should the defensive midfielder receive?',
    teachingPoint: 'Scan early and receive side-on so the next pass is already visible.',
    ball: { x: 43, y: 48 },
    players: [
      { id: 'gk', label: 'GK', role: 'Goalkeeper', team: 'home', x: 9, y: 50 },
      { id: 'lcb', label: 'CB', role: 'Centre-back', team: 'home', x: 27, y: 38 },
      { id: 'rcb', label: 'CB', role: 'Centre-back', team: 'home', x: 27, y: 65 },
      { id: 'six', label: '6', role: 'Defensive midfielder', team: 'home', active: true, x: 43, y: 48 },
      { id: 'left-eight', label: '8', role: 'Midfielder', team: 'home', x: 58, y: 30 },
      { id: 'right-eight', label: '8', role: 'Midfielder', team: 'home', x: 58, y: 69 },
      { id: 'lw', label: 'LW', role: 'Winger', team: 'home', x: 72, y: 12 },
      { id: 'opp-ten', label: '10', role: 'Attacking midfielder', team: 'away', x: 50, y: 48 },
      { id: 'opp-six', label: '6', role: 'Midfielder', team: 'away', x: 62, y: 51 },
    ],
    choices: [
      { id: 'back', label: 'Receive facing the centre-back', rationale: 'That protects the ball but hides the free teammate and invites pressure from behind.' },
      { id: 'turn', label: 'Open the body toward the far side', rationale: 'A side-on position keeps the passer and the next option in view.' },
      { id: 'touch', label: 'Take a heavy first touch forward', rationale: 'Turning blindly toward pressure risks losing the ball in the most dangerous central area.' },
    ],
    correctChoiceId: 'turn',
    reveal: {
      headline: 'The next pass starts before this one arrives.',
      touchline: 'Your next pass begins with a look, not a touch.',
      focus: { x: 58, y: 69, radiusX: 10, radiusY: 10, label: 'The free far-side teammate' },
      passingLane: { from: { x: 48, y: 56 }, to: { x: 58, y: 69 } },
      cue: 'Pressure is coming from one side and the far-side midfielder has space.',
      helped: 'The free midfielder can receive quickly before the defence shifts across.',
      space: 'The far half of the pitch becomes available in one touch.',
      risk: 'Receiving square to the passer turns a progressive moment into a backward pass—or a turnover.',
      watchFor: 'Before the ball reaches the number six, look for the shoulder check and open hips.',
      movements: [{ playerId: 'six', to: { x: 48, y: 56 }, label: 'Open to the far side' }],
    },
    illustration: {
      src: '/illustrations/midfielder-half-turn.webp',
      alt: 'An editorial illustration of a defensive midfielder receiving side-on with her head lifted.',
      caption: 'The half-turn keeps the next action in view.',
      orientation: 'landscape',
    },
  },
  {
    id: 'six-rest-defence',
    mode: 'Attacking',
    phase: 'Sustained attack',
    title: 'The player who does not join',
    context: 'The winger has the ball near the box. Both full-backs and two midfielders are already ahead of the ball, while an opponent waits for a counterattack.',
    prompt: 'What is the defensive midfielder’s most useful position?',
    teachingPoint: 'Stay connected behind the attack to recycle possession and stop the first counter-pass.',
    ball: { x: 73, y: 17 },
    players: [
      { id: 'lcb', label: 'CB', role: 'Centre-back', team: 'home', x: 38, y: 39 },
      { id: 'rcb', label: 'CB', role: 'Centre-back', team: 'home', x: 38, y: 64 },
      { id: 'six', label: '6', role: 'Defensive midfielder', team: 'home', active: true, x: 58, y: 51 },
      { id: 'lb', label: 'LB', role: 'Left-back', team: 'home', x: 70, y: 8 },
      { id: 'lw', label: 'LW', role: 'Winger', team: 'home', x: 73, y: 17 },
      { id: 'eight', label: '8', role: 'Midfielder', team: 'home', x: 75, y: 37 },
      { id: 'nine', label: '9', role: 'Forward', team: 'home', x: 81, y: 52 },
      { id: 'counter-nine', label: '9', role: 'Forward', team: 'away', x: 53, y: 55 },
      { id: 'opp-six', label: '6', role: 'Midfielder', team: 'away', x: 66, y: 60 },
      { id: 'opp-cb', label: 'CB', role: 'Centre-back', team: 'away', x: 78, y: 43 },
    ],
    choices: [
      { id: 'box', label: 'Run into the penalty area', rationale: 'Another runner adds little while leaving the centre completely unprotected.' },
      { id: 'overlap', label: 'Overlap the full-back', rationale: 'The wide lane is already occupied and the counterattacking forward would be left free.' },
      { id: 'hold', label: 'Hold the central space behind the attack', rationale: 'This position supports a recycled pass and blocks the opponent’s quickest escape route.' },
    ],
    correctChoiceId: 'hold',
    reveal: {
      headline: 'Balance is an attacking contribution.',
      touchline: 'Everyone wants to join the attack. Someone has to remember what happens next.',
      focus: { x: 58, y: 51, radiusX: 10, radiusY: 13, label: 'Balance behind the attack' },
      cue: 'Enough teammates are ahead of the ball, and the opponent has left a forward ready to break.',
      helped: 'The attackers can take risks knowing the centre is protected behind them.',
      space: 'The area where a clearance or cut-back will land stays controlled.',
      risk: 'Joining the box turns one clearance into a direct counterattack through the middle.',
      watchFor: 'During a long attack, find the number six and see whether they guard the space everyone else has left.',
      movements: [{ playerId: 'six', to: { x: 61, y: 50 }, label: 'Guard the centre' }],
    },
    illustration: {
      src: '/illustrations/midfielder-hold-balance.webp',
      alt: 'An editorial illustration of a defensive midfielder holding a poised central position behind the attack.',
      caption: 'Sometimes the disciplined player is the one who does not run forward.',
      orientation: 'landscape',
    },
  },
  {
    id: 'six-screen-ten',
    mode: 'Defending',
    phase: 'Without the ball',
    title: 'Press without chasing',
    context: 'The opposition centre-back has the ball. Your forward is pressing, but their number ten is waiting between midfield and defence.',
    prompt: 'What should the defensive midfielder protect?',
    teachingPoint: 'Support the press by screening the dangerous receiver behind it.',
    ball: { x: 68, y: 51 },
    players: [
      { id: 'lcb', label: 'CB', role: 'Centre-back', team: 'home', x: 27, y: 39 },
      { id: 'rcb', label: 'CB', role: 'Centre-back', team: 'home', x: 27, y: 64 },
      { id: 'six', label: '6', role: 'Defensive midfielder', team: 'home', active: true, x: 43, y: 50 },
      { id: 'eight', label: '8', role: 'Midfielder', team: 'home', x: 48, y: 69 },
      { id: 'press-nine', label: '9', role: 'Forward', team: 'home', x: 59, y: 48 },
      { id: 'opp-cb', label: 'CB', role: 'Centre-back', team: 'away', x: 68, y: 51 },
      { id: 'opp-ten', label: '10', role: 'Attacking midfielder', team: 'away', x: 51, y: 50 },
      { id: 'opp-nine', label: '9', role: 'Forward', team: 'away', x: 38, y: 52 },
      { id: 'opp-winger', label: 'RW', role: 'Winger', team: 'away', x: 60, y: 84 },
    ],
    choices: [
      { id: 'chase', label: 'Sprint toward the centre-back', rationale: 'The forward is already pressing; chasing too leaves the number ten free behind both players.' },
      { id: 'screen', label: 'Stay between the ball and the number ten', rationale: 'The position removes the most dangerous forward pass while the striker applies pressure.' },
      { id: 'drop', label: 'Drop beside the centre-backs immediately', rationale: 'Dropping too early gives the number ten time to turn in front of the defence.' },
    ],
    correctChoiceId: 'screen',
    reveal: {
      headline: 'The best press can be a blocked pass.',
      touchline: 'You don’t have to chase the ball to ruin someone’s plan.',
      focus: { x: 49, y: 50, radiusX: 8, radiusY: 12, label: 'The number ten’s central pocket' },
      cue: 'A teammate already has pressure on the ball, but the receiver behind that pressure is free.',
      helped: 'The pressing forward can force play sideways without worrying about the pass through midfield.',
      space: 'The central pocket in front of the centre-backs is closed.',
      risk: 'Chasing the ball opens a straight pass into a player who can turn and attack the back line.',
      watchFor: 'When the striker presses, check whether the number six follows the ball or erases the pass behind it.',
      movements: [{ playerId: 'six', to: { x: 48, y: 50 }, label: 'Screen the number ten' }],
    },
    illustration: {
      src: '/illustrations/midfielder-screen-ten.webp',
      alt: 'An editorial illustration of a defensive midfielder in a compact side-on screening stance.',
      caption: 'A quiet screening position can remove the most dangerous pass.',
      orientation: 'landscape',
    },
  },
  {
    id: 'six-delay-counter',
    mode: 'Defending',
    phase: 'Transition after losing the ball',
    title: 'Make the counter go around you',
    context: 'Possession is lost in midfield. The opponent can drive forward centrally, with runners on both sides and the centre-backs retreating.',
    prompt: 'What should the defensive midfielder do first?',
    teachingPoint: 'Protect the central route and delay the attack before trying to win the ball.',
    ball: { x: 61, y: 47 },
    players: [
      { id: 'lcb', label: 'CB', role: 'Centre-back', team: 'home', x: 29, y: 39 },
      { id: 'rcb', label: 'CB', role: 'Centre-back', team: 'home', x: 29, y: 64 },
      { id: 'six', label: '6', role: 'Defensive midfielder', team: 'home', active: true, x: 55, y: 52 },
      { id: 'left-eight', label: '8', role: 'Midfielder', team: 'home', x: 65, y: 32 },
      { id: 'right-eight', label: '8', role: 'Midfielder', team: 'home', x: 67, y: 70 },
      { id: 'carrier', label: '10', role: 'Ball carrier', team: 'away', x: 61, y: 47 },
      { id: 'left-runner', label: 'LW', role: 'Runner', team: 'away', x: 58, y: 23 },
      { id: 'right-runner', label: 'RW', role: 'Runner', team: 'away', x: 57, y: 76 },
      { id: 'opp-nine', label: '9', role: 'Forward', team: 'away', x: 45, y: 51 },
    ],
    choices: [
      { id: 'tackle', label: 'Dive straight into a tackle', rationale: 'If the challenge is missed, the ball carrier has an open route to the retreating defence.' },
      { id: 'wide', label: 'Follow the nearest wide runner', rationale: 'That abandons the shortest and most dangerous path through the centre.' },
      { id: 'delay', label: 'Drop into the central lane and delay', rationale: 'Staying between the ball and goal slows the attack and gives teammates time to recover.' },
    ],
    correctChoiceId: 'delay',
    reveal: {
      headline: 'Delay first. Win it second.',
      touchline: 'Sometimes winning means making them wait.',
      focus: { x: 47, y: 51, radiusX: 10, radiusY: 13, label: 'The direct route to goal' },
      cue: 'The opponent is facing forward and has several options, while the defence needs time to recover.',
      helped: 'The centre-backs can retreat, organise, and pass runners on instead of defending open space immediately.',
      space: 'The direct route through the middle disappears, forcing the counter wider or backward.',
      risk: 'A reckless challenge removes the only player between the counterattack and the back line.',
      watchFor: 'After a turnover, see whether the number six attacks the ball or protects the road to goal.',
      movements: [{ playerId: 'six', to: { x: 47, y: 51 }, label: 'Block and delay' }],
    },
    illustration: {
      src: '/illustrations/midfielder-delay-counter.webp',
      alt: 'An editorial illustration of a defensive midfielder backpedaling in a calm controlled defensive stance.',
      caption: 'Control the counterattack before trying to win the ball.',
      orientation: 'landscape',
    },
  },
];

export const centreBackScenarios: Scenario[] = [
  {
    id: 'cb-split', mode: 'Attacking', phase: 'Build-up', title: 'Two angles, not one',
    context: 'The goalkeeper has the ball. Both centre-backs are narrow, so one striker can block their passing lanes. The left side is free.',
    prompt: 'Where should the highlighted centre-back move?',
    teachingPoint: 'Separate from your partner to give the goalkeeper a distinct passing angle.',
    ball: { x: 10, y: 50 },
    players: [
      { id: 'gk', label: 'GK', role: 'Goalkeeper', team: 'home', x: 10, y: 50 },
      { id: 'lcb', label: 'CB', role: 'Centre-back', team: 'home', active: true, x: 25, y: 44 },
      { id: 'rcb', label: 'CB', role: 'Partner centre-back', team: 'home', x: 25, y: 59 },
      { id: 'lb', label: 'LB', role: 'Left-back', team: 'home', x: 44, y: 12 },
      { id: 'rb', label: 'RB', role: 'Right-back', team: 'home', x: 43, y: 86 },
      { id: 'six', label: '6', role: 'Defensive midfielder', team: 'home', x: 43, y: 52 },
      { id: 'striker', label: '9', role: 'Pressing striker', team: 'away', x: 19, y: 51 },
      { id: 'ten', label: '10', role: 'Attacking midfielder', team: 'away', x: 39, y: 52 },
    ],
    choices: [
      { id: 'narrow', label: 'Stay close to the other centre-back', rationale: 'Staying narrow lets the striker threaten both passing options with a small movement.' },
      { id: 'split', label: 'Move wider to the left of the goalkeeper', rationale: 'Separating from your partner forces the striker to choose which passing lane to protect.' },
      { id: 'high', label: 'Run into midfield immediately', rationale: 'The goalkeeper needs a safe first pass before another player runs beyond the press.' },
    ],
    correctChoiceId: 'split',
    reveal: {
      headline: 'Give one presser two problems.',
      touchline: 'Sometimes the best first pass starts with someone walking away.',
      focus: { x: 24, y: 25, radiusX: 10, radiusY: 10, label: 'A separate angle beside the press' },
      passingLane: { from: { x: 10, y: 50 }, to: { x: 24, y: 25 } },
      cue: 'One striker is screening two narrow centre-backs, while the left channel is unoccupied.',
      helped: 'The goalkeeper gets a clear outlet and the other centre-back becomes harder to cover at the same time.',
      space: 'A diagonal lane opens outside the striker’s reach.',
      risk: 'Remaining narrow lets the goalkeeper’s simplest options disappear together.',
      watchFor: 'At a goal kick, look at how the centre-backs separate before either receives the ball.',
      movements: [{ playerId: 'lcb', to: { x: 24, y: 25 }, label: 'Create a second angle' }],
    },
    illustration: { src: '/illustrations/centre-back-split.webp', alt: 'An illustrated centre-back moving wide to offer a goalkeeper a separate passing angle.', caption: 'The first useful movement happens before the first pass.', orientation: 'landscape' },
  },
  {
    id: 'cb-carry', mode: 'Attacking', phase: 'Progressing the ball', title: 'The pass that needs a carry',
    context: 'The centre-back has the ball and clear grass ahead. The striker is blocking a pass into midfield rather than pressing. A teammate covers behind.',
    prompt: 'How can the centre-back make the next pass easier?',
    teachingPoint: 'Carry into free space to make an opponent leave a passing lane.',
    ball: { x: 28, y: 40 },
    players: [
      { id: 'gk', label: 'GK', role: 'Goalkeeper', team: 'home', x: 9, y: 50 },
      { id: 'lcb', label: 'CB', role: 'Centre-back', team: 'home', active: true, x: 26, y: 40 },
      { id: 'rcb', label: 'CB', role: 'Covering centre-back', team: 'home', x: 23, y: 63 },
      { id: 'lb', label: 'LB', role: 'Left-back', team: 'home', x: 47, y: 12 },
      { id: 'six', label: '6', role: 'Defensive midfielder', team: 'home', x: 54, y: 48 },
      { id: 'eight', label: '8', role: 'Midfielder', team: 'home', x: 60, y: 25 },
      { id: 'striker', label: '9', role: 'Screening striker', team: 'away', x: 45, y: 45 },
      { id: 'ten', label: '10', role: 'Midfielder', team: 'away', x: 54, y: 65 },
    ],
    choices: [
      { id: 'carry', label: 'Carry forward until an opponent commits', rationale: 'Using the free grass forces the striker to decide between pressing and continuing to screen midfield.' },
      { id: 'force', label: 'Force the pass through the striker', rationale: 'The lane is still blocked; a rushed pass risks a central turnover.' },
      { id: 'wait', label: 'Stand still and wait for the lane to open', rationale: 'Waiting leaves the striker in a comfortable position without creating a new problem.' },
    ],
    correctChoiceId: 'carry',
    reveal: {
      headline: 'Make someone come to you.',
      touchline: 'Carry into space and make an opponent choose who to leave.',
      focus: { x: 36, y: 37, radiusX: 9, radiusY: 11, label: 'The free space before the press' },
      ballTo: { x: 40, y: 40 },
      cue: 'The striker is protecting a receiver instead of challenging the ball, and cover exists behind the centre-back.',
      helped: 'The midfielder benefits when the striker eventually leaves the passing lane to engage.',
      space: 'The centre-back advances through unoccupied grass and brings the next defender into a decision.',
      risk: 'Carrying blindly beyond the pressure would expose the team; the purpose is to commit an opponent, then release.',
      watchFor: 'When nobody presses a centre-back, watch whether they use the space or pass away the advantage.',
      movements: [{ playerId: 'lcb', to: { x: 38, y: 40 }, label: 'Carry toward the pressure' }],
    },
    illustration: { src: '/illustrations/centre-back-carry.webp', alt: 'An illustrated centre-back carrying the ball into open grass while a striker screens a midfielder.', caption: 'A controlled carry can open the pass that was not there before.', orientation: 'landscape' },
  },
  {
    id: 'cb-cover', mode: 'Defending', phase: 'Covering a teammate', title: 'Your partner goes. You don’t.',
    context: 'The other centre-back steps forward to a receiver. A striker is ready to run behind that challenge. The full-backs are occupied by wide opponents.',
    prompt: 'What should the highlighted centre-back do?',
    teachingPoint: 'One centre-back engages while the other protects the space behind.',
    ball: { x: 46, y: 57 },
    players: [
      { id: 'gk', label: 'GK', role: 'Goalkeeper', team: 'home', x: 9, y: 50 },
      { id: 'lcb', label: 'CB', role: 'Centre-back', team: 'home', active: true, x: 31, y: 38 },
      { id: 'rcb', label: 'CB', role: 'Stepping centre-back', team: 'home', x: 32, y: 58 },
      { id: 'lb', label: 'LB', role: 'Left-back', team: 'home', x: 35, y: 14 },
      { id: 'rb', label: 'RB', role: 'Right-back', team: 'home', x: 35, y: 86 },
      { id: 'receiver', label: '10', role: 'Receiver', team: 'away', x: 46, y: 57 },
      { id: 'runner', label: '9', role: 'Striker', team: 'away', x: 38, y: 44 },
      { id: 'rw', label: 'RW', role: 'Winger', team: 'away', x: 40, y: 12 },
      { id: 'lw', label: 'LW', role: 'Winger', team: 'away', x: 41, y: 86 },
    ],
    choices: [
      { id: 'join', label: 'Join the challenge on the receiver', rationale: 'Two defenders attacking the same receiver would leave no central cover behind them.' },
      { id: 'wide', label: 'Move toward the nearest winger', rationale: 'The full-back already deals with that opponent; the immediate risk is the central runner.' },
      { id: 'cover', label: 'Drop diagonally to cover the gap', rationale: 'A slightly deeper, connected position protects the runner’s route while your partner challenges.' },
    ],
    correctChoiceId: 'cover',
    reveal: {
      headline: 'Two defenders. Two different jobs.',
      touchline: 'The brave challenge often has a quiet teammate behind it.',
      focus: { x: 27, y: 49, radiusX: 9, radiusY: 12, label: 'Cover behind the challenge' },
      cue: 'Your partner is leaving the line, and the striker is watching the space that opens behind.',
      helped: 'The stepping centre-back can challenge without leaving a completely open route to goal.',
      space: 'The central gap is protected from a deeper angle.',
      risk: 'Joining the same challenge lets one pass eliminate both centre-backs.',
      watchFor: 'Whenever one centre-back steps, find the other one before following the ball.',
      movements: [
        { playerId: 'rcb', to: { x: 41, y: 57 }, label: 'Partner engages' },
        { playerId: 'lcb', to: { x: 26, y: 47 }, label: 'Drop to cover' },
      ],
    },
    illustration: { src: '/illustrations/centre-back-cover.webp', alt: 'An illustrated centre-back covering a runner behind a defensive partner who steps toward the ball.', caption: 'The defender behind the challenge keeps the partnership intact.', orientation: 'landscape' },
  },
  {
    id: 'cb-drop', mode: 'Defending', phase: 'Protecting depth', title: 'Read the passer, not just the runner',
    context: 'The opposition midfielder has time to look up. A striker starts a run behind your high defensive line. There is no pressure to stop a forward pass.',
    prompt: 'What should the centre-back organise first?',
    teachingPoint: 'An unpressured passer is a cue to protect space behind the line.',
    ball: { x: 70, y: 49 },
    players: [
      { id: 'gk', label: 'GK', role: 'Goalkeeper', team: 'home', x: 15, y: 50 },
      { id: 'lcb', label: 'CB', role: 'Centre-back', team: 'home', active: true, x: 44, y: 39 },
      { id: 'rcb', label: 'CB', role: 'Partner centre-back', team: 'home', x: 44, y: 62 },
      { id: 'lb', label: 'LB', role: 'Left-back', team: 'home', x: 46, y: 15 },
      { id: 'rb', label: 'RB', role: 'Right-back', team: 'home', x: 46, y: 85 },
      { id: 'six', label: '6', role: 'Midfielder', team: 'home', x: 57, y: 67 },
      { id: 'passer', label: '8', role: 'Unpressured passer', team: 'away', x: 70, y: 49 },
      { id: 'runner', label: '9', role: 'Striker starting a run', team: 'away', x: 49, y: 30 },
      { id: 'ten', label: '10', role: 'Attacking midfielder', team: 'away', x: 58, y: 56 },
    ],
    choices: [
      { id: 'step', label: 'Step up alone for offside', rationale: 'Without pressure on the pass or coordination across the line, an individual step is a risky gamble.' },
      { id: 'drop', label: 'Turn and drop together with the line', rationale: 'Reading the passer early gives the defenders time to protect the space the striker wants.' },
      { id: 'press', label: 'Sprint all the way toward the midfielder', rationale: 'The passer is too far away to affect immediately, and leaving the line opens the central route.' },
    ],
    correctChoiceId: 'drop',
    reveal: {
      headline: 'No pressure on the ball? Protect the space behind.',
      touchline: 'Read the head coming up before you hear the crowd react.',
      focus: { x: 30, y: 39, radiusX: 12, radiusY: 16, label: 'Depth behind the high line' },
      cue: 'The passer can see forward and has time to deliver; the striker is already moving.',
      helped: 'The whole back line and goalkeeper have more time to deal with a ball behind.',
      space: 'The defenders reduce the unprotected space toward their own goal.',
      risk: 'Holding or stepping without pressure gives the striker a head start against a static defence.',
      watchFor: 'Compare the centre-back’s depth when the passer is pressed with their depth when the passer looks up freely.',
      movements: [
        { playerId: 'lcb', to: { x: 31, y: 39 }, label: 'Read it and drop' },
        { playerId: 'rcb', to: { x: 31, y: 62 }, label: 'Keep the line connected' },
        { playerId: 'lb', to: { x: 33, y: 15 }, label: '' },
        { playerId: 'rb', to: { x: 33, y: 85 }, label: '' },
        { playerId: 'runner', to: { x: 35, y: 30 }, label: '' },
      ],
    },
    illustration: { src: '/illustrations/centre-back-drop.webp', alt: 'An illustrated centre-back turning to retreat with a defensive partner as an opposing striker runs behind.', caption: 'An early adjustment buys time a late sprint cannot.', orientation: 'landscape' },
  },
  {
    id: 'cb-cross', mode: 'Defending', phase: 'Defending the box', title: 'The runner you can’t see',
    context: 'A winger is about to cross from the right side of your defence. The striker changes direction behind your shoulder. Your partner is covering the far side.',
    prompt: 'What should the centre-back do before the delivery?',
    teachingPoint: 'Check the runner and adjust so the ball and opponent stay in view.',
    ball: { x: 38, y: 85 },
    players: [
      { id: 'gk', label: 'GK', role: 'Goalkeeper', team: 'home', x: 8, y: 50 },
      { id: 'lcb', label: 'CB', role: 'Centre-back', team: 'home', active: true, x: 23, y: 53 },
      { id: 'rcb', label: 'CB', role: 'Partner covering the far side', team: 'home', x: 21, y: 32 },
      { id: 'lb', label: 'LB', role: 'Far-side full-back', team: 'home', x: 23, y: 18 },
      { id: 'rb', label: 'RB', role: 'Full-back closing the winger', team: 'home', x: 31, y: 82 },
      { id: 'six', label: '6', role: 'Midfielder guarding the cut-back', team: 'home', x: 34, y: 55 },
      { id: 'crosser', label: 'LW', role: 'Winger preparing a cross', team: 'away', x: 38, y: 85 },
      { id: 'runner', label: '9', role: 'Striker on the blind side', team: 'away', x: 28, y: 42 },
      { id: 'far', label: 'RW', role: 'Far-side forward', team: 'away', x: 28, y: 22 },
    ],
    choices: [
      { id: 'check', label: 'Check the striker and adjust goal-side', rationale: 'A shoulder check and small adjustment keep the runner in sight while preserving a position between them and goal.' },
      { id: 'watch', label: 'Watch only the winger’s foot', rationale: 'Seeing the delivery is useful, but staring at the ball lets the striker escape behind your shoulder.' },
      { id: 'wide', label: 'Leave the striker and charge toward the winger', rationale: 'The full-back is already closing the winger; leaving the centre abandons the most dangerous receiver.' },
    ],
    correctChoiceId: 'check',
    reveal: {
      headline: 'See the delivery. Keep the runner.',
      touchline: 'See the cross. Keep the striker in the picture.',
      focus: { x: 22, y: 43, radiusX: 9, radiusY: 11, label: 'The striker’s blind-side route' },
      cue: 'The winger is shaping to cross while the striker moves out of the defender’s immediate view.',
      helped: 'The goalkeeper and defensive partner can deal with their own zones instead of rescuing an untracked striker.',
      space: 'The defender stays goal-side of the runner’s path into the central scoring area.',
      risk: 'Ball-watching makes the next movement a late recovery instead of an organised challenge.',
      watchFor: 'Just before a cross, count the centre-back’s shoulder checks rather than following the ball alone.',
      movements: [
        { playerId: 'lcb', to: { x: 19, y: 43 }, label: 'Check and adjust goal-side' },
        { playerId: 'runner', to: { x: 24, y: 36 }, label: 'Blind-side movement' },
      ],
    },
    illustration: { src: '/illustrations/centre-back-cross.webp', alt: 'An illustrated centre-back checking a striker over his shoulder as a cross arrives from a wide area.', caption: 'The quiet shoulder check comes before the obvious defensive action.', orientation: 'landscape' },
  },
];

const originalCourses: Course[] = [
  {
    id: 'full-back',
    lessonNumber: '01',
    position: 'Left-back',
    activeLabel: 'Left-back',
    headline: 'What did the full-back see?',
    deck: 'Five situations that will change how you watch full-backs. Predict the movement, then reveal the job happening away from the ball.',
    completionHeadline: 'You can see the invisible run now.',
    shareText: 'Can you see the hidden job of a full-back?',
    recapQuestions: [
      { question: 'Where is the winger?', explanation: 'The winger’s height and position often determine whether the full-back overlaps, holds, or moves inside.' },
      { question: 'Where is the nearest midfielder?', explanation: 'A marked or missing midfielder changes the full-back’s passing angle and defensive cover.' },
      { question: 'Who covers if the full-back moves?', explanation: 'Every attacking run creates a defensive question somewhere behind it.' },
    ],
    scenarios,
  },
  {
    id: 'defensive-midfielder',
    lessonNumber: '02',
    position: 'Defensive midfielder',
    activeLabel: 'Number six',
    headline: 'What did the defensive midfielder see?',
    deck: 'Five situations that reveal how a number six connects the team, protects the centre, and solves problems before they become obvious.',
    completionHeadline: 'You can see the space behind the ball now.',
    shareText: 'Can you see the hidden job of a defensive midfielder?',
    recapQuestions: [
      { question: 'Who is blocking the next pass?', explanation: 'The number six must keep moving out of cover shadows to stay available during build-up.' },
      { question: 'What is behind the pressure?', explanation: 'Scanning reveals the free teammate, dangerous receiver, or runner that the ball does not show you.' },
      { question: 'Who protects the centre?', explanation: 'When others attack or press, the defensive midfielder often gives the team its balance.' },
    ],
    scenarios: defensiveMidfielderScenarios,
  },
  {
    id: 'centre-back', lessonNumber: '03', position: 'Centre-back', activeLabel: 'Centre-back',
    headline: 'What did the centre-back see?',
    deck: 'Five situations that reveal how a centre-back creates the first pass, covers a partner, and reads danger before the tackle.',
    completionHeadline: 'You can see the danger before the tackle now.',
    shareText: 'Can you see the hidden job of a centre-back?',
    recapQuestions: [
      { question: 'Is the passer under pressure?', explanation: 'Time on the ball changes whether the back line can squeeze up or needs to protect depth.' },
      { question: 'Who covers the challenge?', explanation: 'When one centre-back steps forward, look for the teammate protecting the space behind.' },
      { question: 'Where did the striker go?', explanation: 'Before a cross or forward pass, watch the defender’s shoulder check and the runner on the blind side.' },
    ],
    scenarios: centreBackScenarios,
  },
];

import { additionalCourses } from './additional-courses.ts';
import { reviewOriginalTraining } from './original-training-review.ts';
for (const course of originalCourses) {
  for (const scenario of course.scenarios) Object.assign(scenario, reviewOriginalTraining(scenario));
}
export const courses: Course[] = [...originalCourses, ...additionalCourses];

export function validateScenarios(items: Scenario[]) {
  const ids = new Set<string>();
  for (const scenario of items) {
    if (ids.has(scenario.id)) throw new Error(`Duplicate scenario id: ${scenario.id}`);
    ids.add(scenario.id);
    if (scenario.choices.filter((choice) => choice.id === scenario.correctChoiceId).length !== 1) {
      throw new Error(`Scenario ${scenario.id} must have exactly one matching correct choice.`);
    }
    const { focus, passingLane } = scenario.reveal;
    const points = [scenario.ball, ...scenario.players, ...scenario.reveal.movements.map((movement) => movement.to), focus, ...(scenario.reveal.ballTo ? [scenario.reveal.ballTo] : []), ...(passingLane ? [passingLane.from, passingLane.to] : [])];
    if (points.some((point) => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100)) {
      throw new Error(`Scenario ${scenario.id} contains a coordinate outside 0–100.`);
    }
    if (!focus.label?.trim() || !Number.isFinite(focus.radiusX) || !Number.isFinite(focus.radiusY) || focus.radiusX <= 0 || focus.radiusY <= 0 || focus.x - focus.radiusX < 0 || focus.x + focus.radiusX > 100 || focus.y - focus.radiusY < 0 || focus.y + focus.radiusY > 100) {
      throw new Error(`Scenario ${scenario.id} has an invalid space spotlight.`);
    }
    if (!scenario.reveal.touchline?.trim()) throw new Error(`Scenario ${scenario.id} needs original touchline commentary.`);
    if (!scenario.reveal.headline || !scenario.reveal.watchFor || !scenario.reveal.risk) {
      throw new Error(`Scenario ${scenario.id} has incomplete reveal copy.`);
    }
  }
  return true;
}

validateScenarios(scenarios);
validateScenarios(defensiveMidfielderScenarios);
validateScenarios(centreBackScenarios);
validateScenarios(additionalCourses.flatMap((course) => course.scenarios));
