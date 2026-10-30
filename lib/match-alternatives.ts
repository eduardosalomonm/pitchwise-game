import type { MatchChoice, MatchMoment, MatchTone } from './match-day.ts';
import { endingOutcome, type Ending } from './advanced-match-builder.ts';
import type { Placement } from './tactical-scene.ts';

// Extra plausible actions for the Standard fixtures, so most decisions offer four options.
// They always end the possession, so they never alter a following scene.
type Alternative = [
  label: string,
  feedback: string,
  art: string,
  moves: Placement[],
  path: [number, number][],
  result: Ending,
  tone: MatchTone,
  headline?: string,
];

export function withAlternatives(
  moments: MatchMoment[],
  alternatives: Record<string, Alternative[]>,
): MatchMoment[] {
  const unused = new Set(Object.keys(alternatives));
  const result = moments.map((moment) => ({
    ...moment,
    nodes: moment.nodes.map((node) => {
      const extra = alternatives[node.id];
      if (!extra) return node;
      unused.delete(node.id);
      const choices = extra.map(
        (
          [label, feedback, art, moves, path, ending, tone, headline],
          index,
        ): MatchChoice => {
          const id = `alt-${index + 1}`;
          const [x, y] = path[path.length - 1];
          return {
            id,
            label,
            feedback,
            artId: art,
            tone,
            movement: moves.map(([playerId, mx, my]) => ({
              playerId,
              to: { x: mx, y: my },
              label: '',
            })),
            ballTo: { x, y },
            ballPath: path.map(([px, py]) => ({ x: px, y: py })),
            outcome: endingOutcome(
              `${node.id}-${id}`,
              ending,
              feedback,
              tone,
              headline,
            ),
          };
        },
      );
      return { ...node, choices: [...node.choices, ...choices] };
    }),
  }));
  if (unused.size)
    throw new Error(`Unknown alternative nodes: ${[...unused].join(', ')}`);
  return result;
}

export const originalAlternatives: Record<string, Alternative[]> = {
  'm1-gk': [
    [
      'Roll it short to the left centre-back',
      'Their striker’s curved run meets the ball as it arrives. Rival XI win it on the edge of our box.',
      'match-interception',
      [['a-st', 24, 33]],
      [[24, 32]],
      'lost',
      'negative',
    ],
  ],
  'm1-cb': [
    [
      'Clip a pass over the press to the striker',
      'The ball clears the press, but their centre-back contests it with our striker. Nobody controls the drop.',
      'striker-1',
      [['a-rcb', 71, 45]],
      [[70, 47]],
      'loose',
      'neutral',
    ],
  ],
  'm1-six': [
    [
      'Lay it off first time to the left centre-back',
      'The pass is safe, but their winger closes the centre-back at once. We keep the ball; the press resets.',
      'right-centre-back-1',
      [['a-rw', 28, 29]],
      [[24, 31]],
      'retain',
      'neutral',
    ],
  ],
  'm1-combine': [
    [
      'Cross early toward the striker',
      'Both centre-backs face the ball and the first one heads it away. Rival XI collect the clearance.',
      'match-interception',
      [['a-rcb', 74, 47]],
      [[74, 47]],
      'lost',
      'negative',
    ],
  ],
  'm1-striker': [
    [
      'Check back toward the edge of the box for the cut-back',
      'You receive the cut-back facing away from goal. We keep the ball, but the defence recovers.',
      'striker-1',
      [['h-st', 74, 56]],
      [[74, 56]],
      'retain',
      'neutral',
    ],
  ],
  'm1-defend-six': [
    [
      'Commit a tactical foul on the carrier',
      'The referee stops play and shows a yellow card. The counter ends, but Rival XI have a free kick.',
      'match-failed-tackle',
      [['h-six', 38, 53]],
      [[39, 52]],
      'contained',
      'neutral',
    ],
  ],
  'm1-defend-cb': [
    [
      'Follow the outside runner',
      'The carrier keeps the ball and shoots through the space you left.',
      'match-rival-goal',
      [
        ['h-rcb', 24, 64],
        ['a-l8', 22, 52],
      ],
      [
        [22, 52],
        [2, 48],
      ],
      'concede',
      'negative',
    ],
    [
      'Hold your ground on the edge of the box',
      'The carrier shoots early. The deflection off your leg loops toward the penalty spot.',
      'match-duel',
      [['h-rcb', 22, 54]],
      [[20, 50]],
      'loose',
      'neutral',
    ],
  ],
  'm1-defend-gk': [
    [
      'Come halfway and stop at the penalty spot',
      'The runner lifts the ball over you from close range.',
      'match-rival-goal',
      [
        ['h-gk', 14, 52],
        ['a-st', 18, 57],
      ],
      [
        [18, 57],
        [2, 52],
      ],
      'concede',
      'negative',
    ],
    [
      'Narrow the near post and let the runner go wide',
      'The runner takes it toward the byline. The angle closes and the ball rolls out of their control.',
      'goalkeeper-3',
      [
        ['h-gk', 10, 54],
        ['a-st', 16, 66],
      ],
      [[16, 66]],
      'loose',
      'neutral',
    ],
  ],
  'm1-late-recovery': [
    [
      'Sprint back to join the centre-backs',
      'You reach the back line in time. Rival XI slow down and keep the ball in front of us.',
      'right-centre-back-4',
      [['h-six', 30, 50]],
      [[44, 55]],
      'contained',
      'neutral',
    ],
    [
      'Point the striker out and hold your position',
      'The through ball splits our centre-backs and the striker finishes.',
      'match-rival-goal',
      [['a-st', 20, 47]],
      [
        [20, 47],
        [2, 48],
      ],
      'concede',
      'negative',
    ],
  ],
  'm2-winger': [
    [
      'Drop to the edge of our box',
      'You protect the box, but the right-back overlaps and wins a corner. Rival XI keep the ball.',
      'match-duel',
      [['h-lw', 30, 35]],
      [
        [22, 10],
        [1, 1],
      ],
      'contained',
      'neutral',
    ],
  ],
  'm2-lb': [
    [
      'Press the carrier from the outside',
      'The carrier slips the pass inside to the striker, who finishes low.',
      'match-rival-goal',
      [
        ['h-lb', 34, 24],
        ['a-st', 15, 44],
      ],
      [
        [15, 44],
        [2, 46],
      ],
      'concede',
      'negative',
    ],
    [
      'Hold your position and call the winger across',
      'The inside pass is deflected by our centre-back and bounces around the D.',
      'match-duel',
      [['h-lb', 28, 32]],
      [[25, 40]],
      'loose',
      'neutral',
    ],
  ],
  'm2-cross': [
    [
      'Step in front of the striker early',
      'You arrive early. The cross clips both of you and stays inside the box.',
      'match-duel',
      [
        ['h-lcb', 22, 36],
        ['a-st', 21, 38],
      ],
      [[21, 37]],
      'loose',
      'neutral',
    ],
    [
      'Leave it for the goalkeeper to claim',
      'The keeper cannot reach the near post and the striker heads it in.',
      'match-rival-header',
      [
        ['a-st', 15, 38],
        ['h-gk', 6, 46],
      ],
      [
        [15, 38],
        [2, 44],
      ],
      'concede',
      'negative',
    ],
  ],
  'm3-eight': [
    [
      'Play back to our left-back',
      'The left-back receives with time, but Rival XI hold their narrow shape. We keep the ball.',
      'right-back-1',
      [['h-l8', 58, 30]],
      [[53, 12]],
      'retain',
      'neutral',
    ],
  ],
  'm3-winger': [
    [
      'Shoot early from outside the box',
      'Their midfielder blocks the shot and Rival XI clear it upfield.',
      'match-blocked-shot',
      [['a-r8', 75, 24]],
      [[75, 24]],
      'lost',
      'negative',
    ],
    [
      'Pass back to our left-back to recycle',
      'We keep the ball, but the full-back gets back into position.',
      'right-back-1',
      [['h-lw', 72, 18]],
      [[53, 12]],
      'retain',
      'neutral',
    ],
  ],
  'm3-finish': [
    [
      'Sprint to the near post for a first-time touch',
      'The cut-back arrives behind your run and their six clears it.',
      'match-interception',
      [
        ['h-r8', 84, 45],
        ['a-six', 82, 40],
      ],
      [[82, 40]],
      'lost',
      'negative',
    ],
    [
      'Stay back to protect against the counter',
      'Our winger keeps the ball at the byline, but nobody attacks the cut-back space.',
      'left-winger-1',
      [['h-r8', 66, 58]],
      [[84, 32]],
      'retain',
      'neutral',
    ],
  ],
  'm4-six': [
    [
      'Foul the carrier before the halfway line',
      'The foul costs a yellow card but stops the counter. Rival XI take a free kick.',
      'match-failed-tackle',
      [['h-six', 57, 49]],
      [[58, 49]],
      'contained',
      'neutral',
    ],
  ],
  'm4-cb': [
    [
      'Tuck inside toward the striker',
      'The pass goes to the outside runner behind you, who finishes across the keeper.',
      'match-rival-goal',
      [
        ['h-rcb', 33, 56],
        ['a-lw', 22, 66],
      ],
      [
        [22, 66],
        [2, 54],
      ],
      'concede',
      'negative',
    ],
    [
      'Hold the line to catch the runner offside',
      'The flag stays down. The runner and our goalkeeper both chase the ball.',
      'match-duel',
      [['a-lw', 30, 70]],
      [[30, 70]],
      'loose',
      'neutral',
    ],
  ],
  'm4-gk': [
    [
      'Come to the edge of the six-yard box',
      'The forward rounds you and rolls the ball in.',
      'match-rival-goal',
      [
        ['h-gk', 12, 55],
        ['a-lw', 16, 58],
      ],
      [
        [16, 58],
        [2, 52],
      ],
      'concede',
      'negative',
    ],
    [
      'Stay big and block from the penalty spot',
      'You block the shot, but the rebound stays inside the box.',
      'match-save',
      [['h-gk', 18, 58]],
      [
        [20, 62],
        [24, 58],
      ],
      'loose',
      'neutral',
    ],
  ],
  'm5-ten': [
    [
      'Carry forward into the space ahead of you, then pick a pass',
      'Their six steps across and takes the ball from your carry.',
      'match-interception',
      [
        ['h-r8', 66, 58],
        ['a-six', 66, 57],
      ],
      [[66, 57]],
      'lost',
      'negative',
    ],
  ],
  'm5-striker': [
    [
      'Hold it up until our left eight arrives',
      'You keep the ball, but the centre-back and six close around you.',
      'striker-1',
      [['a-six', 66, 52]],
      [[70, 51]],
      'retain',
      'neutral',
    ],
    [
      'Pass wide to the right winger',
      'The winger receives against the full-back. We keep the ball; the run beyond is wasted.',
      'right-winger-1',
      [['a-lb', 79, 84]],
      [[78, 87]],
      'retain',
      'neutral',
    ],
  ],
  'm5-finish': [
    [
      'Cut it back toward the striker at the edge',
      'Their six reads the pull-back and clears.',
      'match-interception',
      [['a-six', 70, 54]],
      [[70, 54]],
      'lost',
      'negative',
    ],
    [
      'Keep the ball at the byline for support',
      'You keep it, but the goalkeeper and centre-backs reset.',
      'right-midfielder-1',
      [['h-r8', 90, 74]],
      [[90, 74]],
      'retain',
      'neutral',
    ],
  ],
};

export const lowBlockAlternatives: Record<string, Alternative[]> = {
  'block-switch-start': [
    [
      'Play forward into the striker’s feet',
      'Their centre-back steps in and intercepts. Rival XI break from their box.',
      'match-interception',
      [['a-lcb', 74, 48]],
      [[74, 48]],
      'lost',
      'negative',
    ],
  ],
  'block-switch-finish': [
    [
      'Cross early from wide toward the striker between the centre-backs',
      'The centre-backs head it away before our striker arrives.',
      'match-interception',
      [['a-rcb', 85, 45]],
      [[85, 45]],
      'lost',
      'negative',
    ],
    [
      'Pass back to the left centre-back',
      'We keep the ball, but the full-back gets back into position.',
      'right-centre-back-1',
      [['h-lw', 70, 13]],
      [[35, 37]],
      'retain',
      'neutral',
    ],
  ],
  'block-switch-recover': [
    [
      'Step in to tackle the carrier',
      'The carrier slips it to the striker, who finishes.',
      'match-rival-goal',
      [
        ['h-six', 55, 54],
        ['a-st', 14, 46],
      ],
      [
        [14, 46],
        [2, 48],
      ],
      'concede',
      'negative',
    ],
    [
      'Retreat to the edge of our box and let the defence settle',
      'The counter slows, but Rival XI keep the ball in front of us.',
      'right-centre-back-4',
      [['h-six', 32, 50]],
      [[50, 52]],
      'contained',
      'neutral',
    ],
  ],
  'block-rebound-start': [
    [
      'Leave the dropping ball for our centre-back',
      'Their midfielder controls it with time and Rival XI keep the attack going.',
      'match-duel',
      [['h-r8', 22, 62]],
      [[31, 62]],
      'contained',
      'negative',
      'Rival XI keep the attack going.',
    ],
  ],
  'block-rebound-finish': [
    [
      'Step in front of the striker early',
      'You arrive early. The ball glances off your head and stays in the box.',
      'match-duel',
      [['h-rcb', 21, 52]],
      [[18, 48]],
      'loose',
      'neutral',
    ],
    [
      'Leave it for the goalkeeper',
      'The keeper stays on the line and the striker heads it in.',
      'match-rival-header',
      [['a-st', 15, 50]],
      [
        [15, 50],
        [2, 50],
      ],
      'concede',
      'negative',
    ],
  ],
  'block-rebound-recover': [
    [
      'Wait for the ball to bounce',
      'The striker reaches it first and finishes on the half-volley.',
      'match-rival-goal',
      [['a-st', 19, 44]],
      [
        [19, 44],
        [2, 46],
      ],
      'concede',
      'negative',
    ],
    [
      'Get a touch on the ball from behind the striker’s back',
      'The ball flicks off you for a corner. Danger delayed, but Rival XI keep the attack.',
      'match-duel',
      [['h-lcb', 20, 44]],
      [[0, 8]],
      'contained',
      'neutral',
    ],
  ],
  'block-underlap-start': [
    [
      'Take on the full-back yourself',
      'The full-back stays in front and wins the ball. Rival XI break down our left.',
      'match-interception',
      [
        ['h-lw', 78, 14],
        ['a-rb', 78, 15],
      ],
      [[78, 15]],
      'lost',
      'negative',
    ],
  ],
  'block-underlap-finish': [
    [
      'Pass back to our left midfielder',
      'We keep the ball, but the defenders drop back into the box.',
      'left-midfielder-2',
      [['h-l8', 68, 34]],
      [[68, 34]],
      'retain',
      'neutral',
    ],
    [
      'Chip a cross over the goalkeeper toward the far post',
      'The goalkeeper steps out and catches the chip.',
      'goalkeeper-4',
      [['a-gk', 92, 52]],
      [[92, 52]],
      'lost',
      'negative',
    ],
  ],
  'block-underlap-recover': [
    [
      'Hold the line and step up',
      'The inside runner gets away behind you and finishes.',
      'match-rival-goal',
      [['a-l8', 16, 56]],
      [
        [16, 56],
        [2, 52],
      ],
      'concede',
      'negative',
    ],
    [
      'Show the winger inside toward our centre-back',
      'The winger cuts inside into our centre-back. The ball runs loose.',
      'match-duel',
      [
        ['h-rb', 40, 78],
        ['a-lw', 40, 76],
      ],
      [[39, 74]],
      'loose',
      'neutral',
    ],
  ],
  'block-cross-start': [
    [
      'Attack the near-post space',
      'The far winger is alone behind you and heads the cross in.',
      'match-rival-header',
      [
        ['h-rb', 12, 58],
        ['a-lw', 8, 62],
      ],
      [
        [8, 62],
        [2, 55],
      ],
      'concede',
      'negative',
    ],
  ],
  'block-cross-finish': [
    [
      'Punch the ball toward the edge of the box',
      'The punch clears the six-yard area, but the ball drops among players.',
      'match-save',
      [['h-gk', 11, 54]],
      [[28, 52]],
      'loose',
      'neutral',
    ],
    [
      'Stay on the line and react',
      'The winger arrives first and heads it in from close range.',
      'match-rival-header',
      [['a-lw', 11, 56]],
      [
        [11, 56],
        [2, 52],
      ],
      'concede',
      'negative',
    ],
  ],
  'block-cross-recover': [
    [
      'Come off the line to punch at the far post',
      'The winger heads it over you into the open goal.',
      'match-rival-header',
      [
        ['h-gk', 12, 60],
        ['a-lw', 13, 68],
      ],
      [
        [13, 68],
        [2, 56],
      ],
      'concede',
      'negative',
    ],
    [
      'Shuffle halfway across and stay tall',
      'You get a hand to the header. It drops in the six-yard box.',
      'match-save',
      [['h-gk', 7, 54]],
      [
        [5, 56],
        [9, 58],
      ],
      'loose',
      'neutral',
    ],
  ],
  'block-rebound-goal-start': [
    [
      'Slip the striker in behind the centre-back',
      'The centre-back reads the pass and steps across to intercept.',
      'match-interception',
      [['a-lcb', 84, 52]],
      [[84, 52]],
      'lost',
      'negative',
    ],
  ],
  'block-rebound-goal-finish': [
    [
      'Lay it back to the eight at the penalty spot',
      'Their centre-back reaches the lay-off first and clears.',
      'match-interception',
      [['a-lcb', 84, 44]],
      [[84, 44]],
      'lost',
      'negative',
    ],
    [
      'Shield the ball from the centre-back',
      'Our striker and their centre-back both jab at it. The keeper is back on their feet.',
      'match-duel',
      [['a-lcb', 88, 50]],
      [[89, 49]],
      'loose',
      'neutral',
    ],
  ],
  'block-rebound-goal-recover': [
    [
      'Press the pivot from behind',
      'The pivot rolls you and finds their full-back. Rival XI escape our press.',
      'match-failed-tackle',
      [
        ['h-l8', 68, 39],
        ['a-six', 64, 44],
      ],
      [[82, 22]],
      'contained',
      'negative',
      'The press is broken.',
    ],
  ],
};

export const secondBallAlternatives: Record<string, Alternative[]> = {
  'direct-duel-start': [
    [
      'Jump early in front of the striker to win the header',
      'You mistime the jump. The ball skids off your head and lands between the lines.',
      'match-duel',
      [['h-lcb', 32, 43]],
      [[40, 48]],
      'loose',
      'neutral',
    ],
  ],
  'direct-duel-finish': [
    [
      'Head it back to our centre-back behind you',
      'The centre-back collects it. We keep the ball, but the chance to break is gone.',
      'right-centre-back-1',
      [['h-six', 33, 52]],
      [[30, 43]],
      'retain',
      'neutral',
    ],
    [
      'Clear it first time upfield',
      'The clearance is safe but contested near halfway.',
      'match-duel',
      [['h-six', 35, 54]],
      [[60, 50]],
      'loose',
      'neutral',
    ],
  ],
  'direct-duel-recover': [
    [
      'Hold your position between both attackers and read the pass',
      'The striker’s pass hits your leg and runs loose at the edge of the box.',
      'match-duel',
      [['h-rcb', 24, 55]],
      [[22, 56]],
      'loose',
      'neutral',
    ],
    [
      'Drop to the six-yard line',
      'The striker has time to shoot from the edge of the box and scores.',
      'match-rival-goal',
      [
        ['h-rcb', 8, 54],
        ['a-st', 24, 46],
      ],
      [
        [24, 46],
        [2, 47],
      ],
      'concede',
      'negative',
    ],
  ],
  'direct-outlet-start': [
    [
      'Kick long toward the striker between their centre-backs',
      'Their centre-back and our striker contest the header near halfway.',
      'striker-1',
      [['h-st', 63, 50]],
      [[62, 50]],
      'loose',
      'neutral',
    ],
  ],
  'direct-outlet-finish': [
    [
      'Cut inside and shoot',
      'Their centre-back blocks the shot and clears.',
      'match-blocked-shot',
      [['a-lcb', 80, 70]],
      [[80, 70]],
      'lost',
      'negative',
    ],
    [
      'Slow down near the box until our midfield support arrives',
      'We keep the ball, but the full-back and centre-backs recover.',
      'right-winger-1',
      [
        ['h-rw', 72, 85],
        ['a-lb', 60, 84],
      ],
      [[72, 85]],
      'retain',
      'neutral',
    ],
  ],
  'direct-outlet-recover': [
    [
      'Stay on your feet and wait to block the shot',
      'The shot hits you and the rebound drops inside the box.',
      'match-save',
      [['h-gk', 14, 49]],
      [
        [16, 48],
        [20, 52],
      ],
      'loose',
      'neutral',
    ],
    [
      'Dive at the ball from the goal line',
      'The attacker lifts it over you before you arrive.',
      'match-rival-goal',
      [
        ['h-gk', 11, 52],
        ['a-r8', 18, 45],
      ],
      [
        [18, 45],
        [2, 46],
      ],
      'concede',
      'negative',
    ],
  ],
  'direct-press-start': [
    [
      'Sprint straight at the right-back to close them down',
      'Straight pressure causes a hurried clearance. The ball is contested near halfway.',
      'match-duel',
      [['h-lw', 70, 13]],
      [[55, 30]],
      'loose',
      'neutral',
    ],
  ],
  'direct-press-finish': [
    [
      'Shoot from long range',
      'Their six blocks the shot and Rival XI clear.',
      'match-blocked-shot',
      [['a-six', 74, 36]],
      [[74, 36]],
      'lost',
      'negative',
    ],
    [
      'Pass back to the left winger',
      'We keep the ball, but their defence has time to drop.',
      'left-winger-1',
      [['h-l8', 70, 31]],
      [[71, 16]],
      'retain',
      'neutral',
    ],
  ],
  'direct-press-recover': [
    [
      'Drop back into midfield',
      'Rival XI play around at their own pace. We regroup behind the ball.',
      'right-centre-back-4',
      [['h-st', 58, 50]],
      [[75, 62]],
      'contained',
      'neutral',
    ],
    [
      'Press the other centre-back instead',
      'The pivot passes to the right-back behind you. Our press is played around.',
      'striker-1',
      [['h-st', 74, 60]],
      [[72, 12]],
      'contained',
      'negative',
      'The press is played around.',
    ],
  ],
  'direct-cover-start': [
    [
      'Stay wide with the winger',
      'The diagonal is deflected by our centre-back and runs loose.',
      'match-duel',
      [['h-rb', 33, 76]],
      [[35, 62]],
      'loose',
      'neutral',
    ],
  ],
  'direct-cover-finish': [
    [
      'Rush out and slide at the runner',
      'The runner touches it past you and scores.',
      'match-rival-goal',
      [
        ['h-gk', 18, 70],
        ['a-lw', 16, 66],
      ],
      [
        [16, 66],
        [2, 55],
      ],
      'concede',
      'negative',
    ],
    [
      'Advance halfway toward the ball and stay big',
      'The shot hits you and loops away inside the box.',
      'match-save',
      [['h-gk', 12, 58]],
      [
        [15, 65],
        [20, 70],
      ],
      'loose',
      'neutral',
    ],
  ],
  'direct-cover-recover': [
    [
      'Close the winger from the outside',
      'You reach the winger, but the ball bounces off you both.',
      'right-winger-5',
      [['h-rw', 26, 84]],
      [[22, 78]],
      'loose',
      'neutral',
    ],
    [
      'Track back to the edge of our box',
      'The winger cuts inside you and scores low.',
      'match-rival-goal',
      [
        ['h-rw', 20, 60],
        ['a-lw', 16, 62],
      ],
      [
        [16, 62],
        [2, 53],
      ],
      'concede',
      'negative',
    ],
  ],
  'direct-layoff-start': [
    [
      'Spin away and ask for it in behind',
      'The centre-back stays goal-side and intercepts the ball in behind.',
      'match-interception',
      [
        ['h-st', 80, 48],
        ['a-lcb', 80, 48],
      ],
      [[80, 48]],
      'lost',
      'negative',
    ],
  ],
  'direct-layoff-finish': [
    [
      'Shoot from the edge of the box',
      'Their centre-back blocks it and Rival XI clear.',
      'match-blocked-shot',
      [['a-lcb', 76, 58]],
      [[76, 58]],
      'lost',
      'negative',
    ],
    [
      'Play it back to the striker',
      'We keep the ball, but the opening for the winger has closed.',
      'striker-2',
      [['h-r8', 71, 64]],
      [[73, 50]],
      'retain',
      'neutral',
    ],
  ],
  'direct-layoff-recover': [
    [
      'Drop off toward our box and give the winger room to run',
      'The winger crosses from deep. Our centre-back heads it into a crowd.',
      'match-duel',
      [['h-lb', 33, 16]],
      [[30, 40]],
      'loose',
      'neutral',
    ],
    [
      'Show the winger inside',
      'The winger cuts inside and finds the striker. Rival XI keep attacking.',
      'match-duel',
      [
        ['h-lb', 42, 18],
        ['a-rw', 44, 26],
      ],
      [[44, 26]],
      'contained',
      'negative',
      'The winger cuts inside.',
    ],
  ],
};
