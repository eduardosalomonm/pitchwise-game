import type { CourseId, Point } from './scenarios';
import type { MatchChoice, MatchOutcome } from './match-day';
import type { Placement } from './tactical-scene';

type Recovery = {
  interceptedBy?: string;
  actor: string;
  course: CourseId;
  cause: string;
  context: string;
  prompt: string;
  ball: Point;
  moves: Placement[];
  choices: MatchChoice[];
};
const end = (
  id: string,
  label: string,
  feedback: string,
  artId: string,
  moves: Placement[],
  ball: Point,
  possession: MatchOutcome['possession'],
  tone: MatchOutcome['tone'],
  headline: string,
  awayGoals = 0,
): MatchChoice => ({
  id,
  label,
  feedback,
  artId,
  tone,
  movement: moves.map(([playerId, x, y]) => ({
    playerId,
    to: { x, y },
    label: '',
  })),
  ballTo: ball,
  ballPath: awayGoals ? [...moves.filter(([playerId]) => playerId.startsWith('a-')).map(([, x, y]) => ({ x, y })), ball] : [ball],
  outcome: {
    id,
    headline,
    recap: feedback,
    possession,
    tone,
    homeGoals: 0,
    awayGoals,
  },
});

// Each turnover stays in its own part of the pitch and asks a different role to respond.
export const matchRecoveries: Record<string, Recovery> = {
  'block-switch': {
    actor: 'h-six',
    course: 'defensive-midfielder',
    cause:
      'The central screen steals the dribble. Their eight looks up for a forward pass.',
    context:
      'Their eight has won the ball in midfield. Our six is between the carrier and their striker; our left-back is recovering outside.',
    prompt: 'Where should the six position the recovery run?',
    ball: { x: 57, y: 55 },
    moves: [
      ['a-r8', 57, 55],
      ['h-six', 49, 50],
      ['a-st', 41, 44],
      ['h-lb', 43, 21],
    ],
    choices: [
      end(
        'delay',
        'Screen the striker and show the carrier outside',
        'The six takes away the direct pass. Rival XI go wide and our midfield recovers.',
        'right-midfielder-4',
        [
          ['h-six', 48, 47],
          ['a-r8', 53, 68],
        ],
        { x: 53, y: 68 },
        'away',
        'positive',
        'The counter loses its speed.',
      ),
      end(
        'charge',
        'Chase the carrier toward the touchline',
        'The striker receives through the space the six vacated. Rival XI advance, but have not scored.',
        'match-failed-tackle',
        [
          ['h-six', 56, 65],
          ['a-st', 39, 44],
        ],
        { x: 39, y: 44 },
        'away',
        'negative',
        'Their striker is free.',
      ),
    ],
  },
  'block-rebound': {
    actor: 'h-lcb',
    course: 'centre-back',
    cause:
      'The eight runs beyond the loose ball. Rival XI collect it and chip toward their striker.',
    context:
      'A looping delivery drops between our centre-back and their striker, just inside the box.',
    prompt: 'How does the centre-back defend the landing spot?',
    ball: { x: 23, y: 42 },
    moves: [
      ['a-st', 21, 46],
      ['h-lcb', 17, 42],
      ['a-l8', 29, 61],
    ],
    choices: [
      end(
        'delay',
        'Get between the striker and goal, then head clear',
        'The defender wins the landing spot before jumping and clears the second delivery.',
        'right-centre-back-5',
        [['h-lcb', 21, 43]],
        { x: 43, y: 18 },
        'away',
        'positive',
        'First contact won.',
      ),
      end(
        'charge',
        'Step forward and jump toward the ball',
        'The striker steps behind the defender and heads the dropping cross into goal.',
        'match-rival-header',
        [
          ['h-lcb', 24, 37],
          ['a-st', 13, 48],
        ],
        { x: 0, y: 48 },
        'home',
        'negative',
        'The runner escapes.',
        1,
      ),
    ],
  },
  'block-underlap': {
    interceptedBy: 'a-rcb',
    actor: 'h-rb',
    course: 'right-back',
    cause:
      'Their centre-back intercepts the forced pass and sends the left winger down our right flank.',
    context:
      'Our eight is still high. Their winger carries down the touchline while a midfielder runs inside our right-back.',
    prompt: 'How should the right-back defend both routes?',
    ball: { x: 47, y: 85 },
    moves: [
      ['a-lw', 47, 85],
      ['h-rb', 39, 80],
      ['a-l8', 44, 67],
      ['h-rcb', 31, 62],
    ],
    choices: [
      end(
        'delay',
        'Recover inside the winger and block the diagonal pass',
        'The full-back protects the inside runner. The winger can only carry toward the sideline.',
        'right-back-3',
        [
          ['h-rb', 34, 76],
          ['a-lw', 38, 88],
        ],
        { x: 38, y: 88 },
        'away',
        'positive',
        'The dangerous lane is closed.',
      ),
      end(
        'charge',
        'Sprint straight at the winger',
        'The winger slips the midfielder inside. Rival XI reach the final third with our full-back behind the play.',
        'match-failed-tackle',
        [
          ['h-rb', 46, 86],
          ['a-l8', 29, 66],
        ],
        { x: 29, y: 66 },
        'away',
        'negative',
        'The inside runner gets away.',
      ),
    ],
  },
  'block-cross': {
    actor: 'h-gk',
    course: 'goalkeeper',
    cause:
      'The right-back abandons the far-post runner. A deep cross sails beyond the centre-backs.',
    context:
      'The cross is dropping at the far post. The goalkeeper can travel across the goalmouth before the winger heads it.',
    prompt: 'Where should the keeper set for the header?',
    ball: { x: 13, y: 70 },
    moves: [
      ['a-lw', 13, 70],
      ['h-rb', 28, 28],
      ['h-gk', 8, 47],
    ],
    choices: [
      end(
        'delay',
        'Move across and set low beneath the ball',
        'The keeper follows the flight, closes the angle and gathers the downward header.',
        'goalkeeper-3',
        [['h-gk', 7, 61]],
        { x: 7, y: 61 },
        'home',
        'positive',
        'The keeper rescues the cross.',
      ),
      end(
        'charge',
        'Keep guarding the near post',
        'The unmarked winger heads into the far side of the goal.',
        'match-rival-header',
        [
          ['h-gk', 7, 36],
          ['a-lw', 11, 67],
        ],
        { x: 0, y: 58 },
        'home',
        'negative',
        'The far side is exposed.',
        1,
      ),
    ],
  },
  'block-rebound-goal': {
    actor: 'h-l8',
    course: 'left-midfielder',
    cause:
      'The defender tackles the eight at the edge of the box. The ball rolls toward their pivot.',
    context:
      'Our eight is closest to the turnover. Their pivot faces their own goal and has not controlled the ball yet.',
    prompt: 'Can the eight stop the escape at source?',
    ball: { x: 69, y: 38 },
    moves: [
      ['h-l8', 71, 35],
      ['a-six', 67, 40],
      ['a-lcb', 79, 40],
    ],
    choices: [
      end(
        'delay',
        'Press the pivot’s first touch from the inside',
        'The eight closes the forward exit and pokes the loose touch back to a teammate.',
        'left-midfielder-4',
        [
          ['h-l8', 68, 38],
          ['h-six', 60, 48],
        ],
        { x: 60, y: 48 },
        'home',
        'positive',
        'Possession won back.',
      ),
      end(
        'charge',
        'Stay in the box waiting for another shot',
        'The pivot controls unchallenged and passes out. The late attack is over.',
        'match-interception',
        [
          ['h-l8', 80, 36],
          ['a-six', 63, 43],
        ],
        { x: 52, y: 60 },
        'away',
        'negative',
        'The second chance disappears.',
      ),
      end(
        'contain',
        'Drop beside the six instead of pressing',
        'Rival XI keep the ball, but our midfield restores its shape.',
        'right-midfielder-5',
        [['h-l8', 54, 38]],
        { x: 58, y: 55 },
        'away',
        'neutral',
        'Shape restored; ball not recovered.',
      ),
    ],
  },
  'direct-duel': {
    actor: 'h-rcb',
    course: 'right-centre-back',
    cause:
      'The striker brings down the long ball and turns. Their winger sprints through the other centre-back’s channel.',
    context:
      'The striker faces our goal. Our left centre-back is behind them, leaving the right centre-back to cover the diagonal runner.',
    prompt: 'How should the covering centre-back respond?',
    ball: { x: 29, y: 44 },
    moves: [
      ['a-st', 29, 44],
      ['h-lcb', 34, 43],
      ['h-rcb', 21, 61],
      ['a-lw', 26, 66],
    ],
    choices: [
      end(
        'delay',
        'Drop with the runner and hold the passing lane',
        'The cover denies the diagonal pass. The striker turns sideways rather than finding a clean break.',
        'right-centre-back-3',
        [
          ['h-rcb', 16, 58],
          ['a-lw', 20, 66],
        ],
        { x: 28, y: 38 },
        'away',
        'positive',
        'Cover buys time.',
      ),
      end(
        'charge',
        'Step across toward the striker',
        'The striker releases the winger behind the centre-back for a clear finish.',
        'match-rival-goal',
        [
          ['h-rcb', 28, 46],
          ['a-lw', 13, 60],
        ],
        { x: 0, y: 53 },
        'home',
        'negative',
        'One pass beats the last line.',
        1,
      ),
    ],
  },
  'direct-outlet': {
    interceptedBy: 'a-r8',
    actor: 'h-gk',
    course: 'goalkeeper',
    cause:
      'Their midfielder intercepts the central throw and takes a heavy first touch toward the penalty area.',
    context:
      'The intercepted throw is loose inside our box. The goalkeeper can reach it before the attacker’s next touch.',
    prompt: 'How can the keeper recover the mistake?',
    ball: { x: 17, y: 47 },
    moves: [
      ['a-r8', 22, 46],
      ['h-gk', 10, 50],
    ],
    choices: [
      end(
        'delay',
        'Come forward and smother the loose touch',
        'The keeper reaches the ball first and holds it securely.',
        'match-save',
        [['h-gk', 17, 47]],
        { x: 17, y: 47 },
        'home',
        'positive',
        'The mistake is repaired.',
      ),
      end(
        'charge',
        'Retreat to the goal line and wait',
        'The attacker controls the loose ball and picks a corner.',
        'match-rival-goal',
        [
          ['h-gk', 6, 50],
          ['a-r8', 14, 47],
        ],
        { x: 0, y: 44 },
        'home',
        'negative',
        'The attacker gets time to finish.',
        1,
      ),
    ],
  },
  'direct-press': {
    actor: 'h-st',
    course: 'striker',
    cause:
      'The right-back escapes inside and finds their pivot. Our winger’s press has been bypassed.',
    context:
      'Their pivot receives facing forward. Our striker can block the pass across to the other centre-back.',
    prompt: 'How can the striker keep the press connected?',
    ball: { x: 61, y: 42 },
    moves: [
      ['a-six', 61, 42],
      ['h-st', 65, 52],
      ['a-lcb', 75, 62],
      ['h-lw', 74, 8],
    ],
    choices: [
      end(
        'delay',
        'Curve the run to block the square pass',
        'The striker closes the switch. Rival XI are forced to kick long, and the pressing trap ends without a clear chance.',
        'striker-4',
        [['h-st', 64, 49]],
        { x: 37, y: 74 },
        'neutral',
        'positive',
        'The escape is forced long.',
      ),
      end(
        'charge',
        'Run straight behind the ball carrier',
        'The pivot passes around the striker. Rival XI switch to the open flank and escape the press.',
        'right-midfielder-4',
        [['h-st', 60, 39]],
        { x: 75, y: 62 },
        'away',
        'negative',
        'The press is played around.',
      ),
    ],
  },
  'direct-cover': {
    actor: 'h-rw',
    course: 'right-winger',
    cause:
      'Both defenders step up. Their left winger races behind them, with our winger the nearest recovering player.',
    context:
      'Their winger is running into our right channel. Our right winger can match the run while the goalkeeper guards the box.',
    prompt: 'What should the recovering winger protect?',
    ball: { x: 24, y: 80 },
    moves: [
      ['a-lw', 24, 80],
      ['h-rw', 28, 86],
      ['h-rb', 37, 81],
      ['h-rcb', 38, 57],
    ],
    choices: [
      end(
        'delay',
        'Sprint goal-side along the inside channel',
        'Our winger recovers inside and deflects the attempted cross behind. Rival XI get a corner instead of a clear shot.',
        'right-winger-5',
        [
          ['h-rw', 16, 76],
          ['a-lw', 12, 87],
        ],
        { x: 0, y: 88 },
        'away',
        'positive',
        'A corner, not a clear chance.',
      ),
      end(
        'charge',
        'Stop at halfway and wait for a clearance',
        'No one tracks the carrier, who reaches the box and scores across the keeper.',
        'match-rival-goal',
        [
          ['h-rw', 50, 86],
          ['a-lw', 12, 65],
        ],
        { x: 0, y: 47 },
        'home',
        'negative',
        'The recovery run never comes.',
        1,
      ),
    ],
  },
  'direct-layoff': {
    interceptedBy: 'a-lcb',
    actor: 'h-lb',
    course: 'full-back',
    cause:
      'The striker loses the duel. Their centre-back switches quickly to a right winger waiting on our left.',
    context:
      'Our left-back has a winger coming toward them near halfway. Our left midfielder is recovering into the inside lane.',
    prompt: 'How should the left-back control this one-against-one?',
    ball: { x: 48, y: 13 },
    moves: [
      ['a-rw', 48, 13],
      ['h-lb', 39, 16],
      ['h-l8', 44, 32],
    ],
    choices: [
      end(
        'delay',
        'Stay side-on and guide the winger toward the line',
        'The full-back refuses the inside route and waits for support. Rival XI recycle backwards.',
        'match-duel',
        [
          ['h-lb', 36, 18],
          ['h-l8', 38, 31],
        ],
        { x: 54, y: 18 },
        'away',
        'positive',
        'The winger turns back.',
      ),
      end(
        'charge',
        'Step in as the winger shifts the ball',
        'The winger knocks the ball past the tackle and carries into the open channel.',
        'match-failed-tackle',
        [
          ['h-lb', 46, 10],
          ['a-rw', 31, 17],
        ],
        { x: 31, y: 17 },
        'away',
        'negative',
        'The winger wins the duel.',
      ),
    ],
  },
};
