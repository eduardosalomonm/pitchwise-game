import { action, advancedMoment, turn } from './advanced-match-builder.ts';
import { balanceChoiceOrder } from './match-choice-order.ts';
import { matchFixtures, type MatchFixture } from './match-fixtures.ts';
import { matchChoiceTone } from './match-feedback.ts';
import { tournamentFixture } from './tournament-fixture.ts';
import type { MatchMoment, MatchMomentResult } from './match-day';
import type { Placement } from './tactical-scene.ts';

// Referee incidents are explicit authored outcomes, not a promise that every foul
// receives the same sanction. Rule reference: IFAB Laws 12 and 13 (2026/27).
export function tacticalFoul(id: string): MatchMoment {
  const freeKick = turn(
    'h-lcb',
    'Defending',
    'The referee has stopped the counter and booked our six. Rival XI have a free kick outside shooting range; their striker prepares a diagonal run.',
    'How do you defend the restart?',
    action(
      'Drop with the diagonal runner',
      'You track the run from the goal side and head the delivery to our left-back. The free kick is defended, but our six keeps the yellow card.',
      'right-centre-back-3',
      [
        ['h-lcb', 20, 35],
        ['h-lb', 29, 12],
      ],
      [
        [20, 35],
        [29, 12],
      ],
      'regain',
    ),
    action(
      'Step toward the free-kick taker',
      'The delivery travels over your step. Their striker meets it and scores.',
      'match-rival-goal',
      [
        ['h-lcb', 44, 39],
        ['a-st', 12, 42],
      ],
      [
        [12, 42],
        [0, 50],
      ],
      'concede',
      'negative',
    ),
    action(
      'Follow their winger out wide',
      'The striker runs through the channel you leave and finishes the delivery.',
      'match-rival-goal',
      [
        ['h-lcb', 25, 14],
        ['a-st', 12, 42],
      ],
      [
        [12, 42],
        [0, 50],
      ],
      'concede',
      'negative',
    ),
    action(
      'Hold a line inside our box',
      'You defend the first delivery but clear it back to their midfield. They retain possession.',
      'match-duel',
      [
        ['h-lcb', 19, 35],
        ['a-six', 42, 49],
      ],
      [
        [19, 35],
        [42, 49],
      ],
      'contained',
      'neutral',
    ),
  );
  const recovery = turn(
    'h-rb',
    'Defending',
    'Our six has screened the inside pass. Their winger receives outside and you have recovered between the winger and goal.',
    'When do you contest the ball?',
    action(
      'Meet the winger’s next touch',
      'You reach the stretched touch with inside cover and pass to our eight. The counter ends without a foul.',
      'right-back-3',
      [
        ['h-rb', 29, 83],
        ['h-r8', 37, 65],
      ],
      [
        [29, 83],
        [37, 65],
      ],
      'regain',
    ),
    action(
      'Step past the winger upfield',
      'The winger turns behind you and squares for the striker to score.',
      'match-rival-goal',
      [
        ['h-rb', 38, 86],
        ['a-lw', 19, 84],
        ['a-st', 12, 49],
      ],
      [
        [19, 84],
        [12, 49],
        [0, 50],
      ],
      'concede',
      'negative',
    ),
    action(
      'Move inside toward their striker',
      'You leave the carrier to reach the byline. The square pass produces a goal.',
      'match-rival-goal',
      [
        ['h-rb', 23, 50],
        ['a-lw', 19, 84],
        ['a-st', 12, 49],
      ],
      [
        [19, 84],
        [12, 49],
        [0, 50],
      ],
      'concede',
      'negative',
    ),
    action(
      'Back away toward our goalmouth',
      'You slow the carrier but do not win it. Rival XI recycle outside.',
      'match-duel',
      [
        ['h-rb', 17, 60],
        ['a-l8', 38, 68],
      ],
      [[38, 68]],
      'contained',
      'neutral',
    ),
  );
  const m = advancedMoment(
    id,
    67,
    'The price of stopping a counter',
    'A turnover near halfway gives their runners a head start. Stopping the attack and avoiding a card are not the same decision.',
    'a-r8',
    [
      ['a-r8', 48, 40],
      ['a-st', 35, 48],
      ['a-lw', 40, 84],
      ['h-six', 46, 46],
      ['h-lcb', 28, 35],
      ['h-rcb', 28, 60],
      ['h-rb', 40, 88],
    ],
    [
      turn(
        'h-six',
        'Defending',
        'Their eight accelerates near halfway. Our centre-backs are goal-side and our right-back is recovering; you can still screen the pass inside.',
        'How do you handle the counter?',
        action(
          'Recover across the inside lane',
          'You screen the striker rather than chasing the ball. The pass goes outside, giving our right-back time to arrive.',
          'match-duel',
          [
            ['h-six', 39, 47],
            ['a-lw', 33, 84],
            ['h-rb', 29, 81],
          ],
          [[33, 84]],
          recovery,
        ),
        action(
          'Pull the carrier back at halfway',
          'The referee stops the promising attack and books our six. Rival XI keep the ball for a free kick; now you must defend the restart.',
          'match-duel',
          [
            ['h-six', 47, 41],
            ['a-r8', 47, 40],
          ],
          [[47, 40]],
          freeKick,
          'neutral',
        ),
        action(
          'Tackle across the carrier’s next step',
          'You miss the ball. Their eight releases the striker through the middle and the counter becomes a goal.',
          'match-rival-goal',
          [
            ['h-six', 50, 39],
            ['a-st', 12, 48],
          ],
          [
            [12, 48],
            [0, 50],
          ],
          'concede',
          'negative',
        ),
        action(
          'Drop back alongside our centre-backs',
          'The carrier advances before our midfield recovers. Rival XI retain possession outside our box.',
          'match-duel',
          [
            ['h-six', 27, 46],
            ['a-r8', 30, 40],
          ],
          [[30, 40]],
          'contained',
          'neutral',
        ),
      ),
    ],
  );
  m.nodes[0].choices[1].booking = 'Yellow card · our defensive midfielder';
  return m;
}

export function quickRestart(id: string): MatchMoment {
  const finish = turn(
    'h-lw',
    'Attacking',
    'The quick free kick reaches you before the full-back turns. The striker is behind the ball and the keeper comes toward your side.',
    'Where does the next ball go?',
    action(
      'Pass square across the moving goalkeeper',
      'The striker meets the square pass from behind the ball and finishes before the defence resets.',
      'match-home-goal',
      [['h-st', 92, 49]],
      [
        [92, 49],
        [100, 50],
      ],
      'goal',
    ),
    action(
      'Shoot toward the keeper’s near post',
      'The keeper has that angle covered and gathers your shot.',
      'match-save',
      [['a-gk', 94, 30]],
      [[94, 30]],
      'lost',
      'negative',
    ),
    action(
      'Carry toward the closing centre-back',
      'The defender reaches your extra touch and clears to their six.',
      'match-interception',
      [
        ['a-rcb', 89, 24],
        ['a-six', 74, 49],
      ],
      [
        [89, 24],
        [74, 49],
      ],
      'lost',
      'negative',
    ),
    action(
      'Set back toward the supporting eight',
      'The pass is completed, but the defenders turn and recover.',
      'left-midfielder-2',
      [['h-l8', 78, 30]],
      [[78, 30]],
      'retain',
      'neutral',
    ),
  );
  const m = advancedMoment(
    id,
    43,
    'Before they set the wall',
    'We win a free kick outside the box. The referee has not asked us to wait for a whistle.',
    'h-l8',
    [
      ['h-l8', 74, 28],
      ['h-lw', 82, 10],
      ['h-st', 82, 49],
      ['a-rb', 84, 23],
      ['a-rcb', 88, 37],
      ['a-lcb', 88, 60],
    ],
    [
      turn(
        'h-l8',
        'Attacking',
        'We have a free kick; the referee has not asked us to wait for a whistle. Their full-back looks toward the referee and our winger starts onside.',
        'How do you take the restart?',
        action(
          'Release the winger with a short restart',
          'The quick restart reaches the winger while the full-back looks away. Play continues: the referee had not made this a whistle-only restart.',
          'left-midfielder-2',
          [['h-lw', 89, 12], ['a-gk', 94, 30]],
          [[89, 12]],
          finish,
        ),
        action(
          'Wait and cross toward the centre-back',
          'Their defence sets before the delivery. The centre-back heads it to their six.',
          'match-duel',
          [
            ['a-rcb', 89, 40],
            ['a-six', 68, 49],
          ],
          [
            [89, 40],
            [68, 49],
          ],
          'lost',
          'negative',
        ),
        action(
          'Adjust the ball before taking the kick',
          'You keep delaying after the referee tells you to restart. A yellow card follows; the defence is set by the time we pass backward.',
          'match-duel',
          [['h-six', 60, 49]],
          [[60, 49]],
          'retain',
          'negative',
        ),
        action(
          'Set the ball back to our holding player',
          'We keep possession rather than using the brief restart opportunity.',
          'right-midfielder-1',
          [['h-six', 60, 49]],
          [[60, 49]],
          'retain',
          'neutral',
        ),
      ),
    ],
  );
  m.nodes[0].choices[2].booking =
    'Yellow card · our left eight · delaying the restart';
  return m;
}

export function touchlineThrow(id: string): MatchMoment {
  return advancedMoment(
    id,
    67,
    'The throw-in trap',
    'Rival XI have a throw-in on our right. Their winger checks short while an eight offers the next pass inside.',
    'a-lb',
    [
      ['a-lb', 34, 100],
      ['a-lw', 33, 88],
      ['a-l8', 39, 67],
      ['h-rb', 29, 84],
      ['h-r8', 37, 72],
      ['h-rcb', 23, 62],
      ['h-rw', 49, 91],
      ['h-six', 35, 49],
    ],
    [
      turn(
        'h-rb',
        'Defending',
        'Their winger will receive with their back to our goal. You are on the inside shoulder; our eight is close to the lay-off lane.',
        'Where do you stand as the throw arrives?',
        action(
          'Hold the receiver’s inside shoulder',
          'The winger receives with no route inside. Their hurried lay-off misses the eight and our right eight collects it.',
          'right-back-3',
          [
            ['h-rb', 29, 85],
            ['a-lw', 32, 88],
            ['h-r8', 35, 73],
          ],
          [
            [32, 88],
            [35, 73],
          ],
        ),
        action(
          'Move outside toward the thrower',
          'The winger sets the ball inside and turns beyond you. Their eight releases the return, then the winger squares for the striker to score.',
          'match-rival-goal',
          [
            ['h-rb', 34, 96],
            ['a-l8', 36, 67],
            ['a-lw', 20, 83],
            ['a-st', 12, 48],
          ],
          [
            [33, 88],
            [36, 67],
            [20, 83],
            [12, 48],
            [0, 50],
          ],
          'concede',
          'negative',
        ),
        action(
          'Drop toward our six-yard box',
          'The winger receives and turns with time. Our centre-back blocks the cross, but Rival XI keep the next ball outside.',
          'match-duel',
          [
            ['h-rb', 14, 67],
            ['a-lw', 24, 85],
            ['a-l8', 34, 68],
          ],
          [
            [24, 85],
            [23, 62],
            [34, 68],
          ],
          'contained',
          'neutral',
        ),
        action(
          'Follow their eight away from the line',
          'The winger turns into the space you leave. Their cross reaches the striker at the near post.',
          'match-rival-header',
          [
            ['h-rb', 35, 68],
            ['a-lw', 19, 86],
            ['a-st', 12, 57],
          ],
          [
            [33, 88],
            [19, 86],
            [12, 57],
            [0, 52],
          ],
          'concede',
          'negative',
        ),
      ),
      turn(
        'h-r8',
        'Attacking',
        'You collect the loose lay-off facing upfield. Their winger is behind the ball; our right winger waits up the touchline.',
        'How do you use the regain?',
        action(
          'Pass outside to our winger up the line',
          'Our winger receives beyond the throw-in crowd. We keep the ball with room to leave our half.',
          'right-midfielder-3',
          [['h-rw', 51, 90]],
          [[51, 90]],
          'retain',
          'positive',
        ),
        action(
          'Return the ball toward our full-back',
          'Our right-back receives, but their winger recovers to close. We retain possession near the line.',
          'right-back-1',
          [],
          [[29, 85]],
          'retain',
          'neutral',
        ),
        action(
          'Carry back toward the thrower',
          'Their full-back meets your touch and wins it back. Rival XI restart the attack by the touchline.',
          'match-interception',
          [
            ['h-r8', 37, 91],
            ['a-lb', 38, 92],
          ],
          [[38, 92]],
          'lost',
          'negative',
        ),
        action(
          'Send it long toward our striker',
          'The clearance takes play out of our half, but both centre-backs contest the dropping ball with our striker.',
          'striker-1',
          [
            ['h-st', 64, 48],
            ['a-rcb', 65, 43],
          ],
          [[64, 47]],
          'loose',
          'neutral',
        ),
      ),
    ],
  );
}

export function playAdvantage(id: string): MatchMoment {
  return advancedMoment(
    id,
    43,
    'The whistle never came',
    'Our eight stays on their feet after a late clip. The referee signals advantage and the attack continues.',
    'h-r8',
    [
      ['h-r8', 66, 66],
      ['h-rw', 77, 88],
      ['h-st', 80, 49],
      ['h-six', 52, 49],
      ['a-l8', 62, 64],
      ['a-lb', 73, 78],
      ['a-lcb', 82, 59],
      ['a-rcb', 85, 39],
      ['a-gk', 95, 50],
    ],
    [
      turn(
        'h-r8',
        'Attacking',
        'The referee signals advantage after the clip. You face goal as their near centre-back steps toward you; our winger is outside the full-back, still onside.',
        'What is your next action?',
        action(
          'Release our winger outside the full-back',
          'The pass travels outside the stepping defender. Our winger receives in stride before their full-back recovers.',
          'right-midfielder-3',
          [
            ['h-rw', 89, 84],
            ['a-lcb', 76, 62],
            ['a-lb', 81, 81],
            ['h-st', 86, 49],
          ],
          [[89, 84]],
        ),
        action(
          'Carry toward the centre-back',
          'The centre-back reaches your next touch. The attacking advantage ends in a turnover and play continues.',
          'match-interception',
          [
            ['h-r8', 75, 64],
            ['a-lcb', 76, 64],
          ],
          [[76, 64]],
          'lost',
          'negative',
        ),
        action(
          'Pass through the centre to our striker',
          'The deeper centre-back reaches the pass before our striker. Rival XI have the ball in their defensive line.',
          'match-interception',
          [['a-rcb', 83, 45]],
          [[83, 45]],
          'lost',
          'negative',
        ),
        action(
          'Set the ball back to our six',
          'The pass is completed. We keep possession while their defenders recover behind the ball.',
          'right-midfielder-1',
          [],
          [[52, 49]],
          'retain',
          'neutral',
        ),
      ),
      turn(
        'h-rw',
        'Attacking',
        'You receive facing the right side of goal. The keeper is still near the centre; the full-back chases from your outside shoulder.',
        'How do you finish before the cover arrives?',
        action(
          'Cut inside and shoot across the keeper',
          'Your inside touch changes the angle while the keeper moves toward you. The low shot crosses their movement and finds the far corner.',
          'match-home-goal',
          [
            ['h-rw', 92, 74],
            ['a-gk', 95, 62],
          ],
          [
            [92, 74],
            [100, 43],
          ],
          'goal',
          'positive',
          'GOAL — advantage taken!',
        ),
        action(
          'Square the ball toward our striker',
          'Their recovering centre-back cuts across the square pass and clears to midfield.',
          'match-interception',
          [
            ['a-rcb', 88, 53],
            ['a-six', 71, 49],
          ],
          [
            [88, 53],
            [71, 49],
          ],
          'lost',
          'negative',
        ),
        action(
          'Take the ball farther down the line',
          'You retain it near the byline, but the full-back and goalkeeper recover their angles.',
          'right-winger-2',
          [['h-rw', 94, 92]],
          [[94, 92]],
          'retain',
          'neutral',
        ),
        action(
          'Shoot first time at the near post',
          'The keeper reaches the narrow-angle shot and holds it. Rival XI take possession.',
          'match-save',
          [['a-gk', 96, 62]],
          [[96, 62]],
          'lost',
          'negative',
        ),
      ),
    ],
  );
}

export function closingMoment(
  id: string,
  home: number,
  away: number,
): MatchMoment {
  const round = /^cup-(\d+)-clock$/.exec(id);
  const variation = round
    ? clockPlan(Number(round[1]), home > away)
    : undefined;
  if (variation) return variedClosingMoment(id, home, away, variation);
  const leading = home > away;
  const m = advancedMoment(
    id,
    90,
    leading ? 'The corner or the cross?' : 'One delivery left',
    `Stoppage time. Our XI ${home}–${away} Rival XI. ${leading ? 'Keep possession or risk one more attack.' : 'There is time for one final attacking decision.'}`,
    'h-rw',
    [
      ['h-rw', 91, 92],
      ['h-rb', 82, 91],
      ['h-r8', leading ? 73 : 80, 65],
      ['h-st', 88, 49],
      ['a-lb', 91, 86],
      ['a-lcb', 93, 60],
      ['a-gk', 96, 64],
      ['a-st', 58, 48],
    ],
    [
      turn(
        'h-rw',
        'Attacking',
        leading
          ? 'Their full-back presses toward the corner. Our eight stays behind the ball and their centre-back covers our striker.'
          : 'Their defence drops toward the striker. Our right eight arrives late at the edge while the keeper covers the near post.',
        'How do you use the final possession?',
        action(
          'Shield the ball near the corner',
          leading
            ? 'You keep the ball within playing distance and between you and the defender. With no turnover, the final whistle protects your lead.'
            : 'You keep the ball, but the remaining time runs out without a shot. The current score becomes the final score.',
          'right-winger-4',
          [
            ['h-rw', 96, 96],
            ['a-lb', 94, 94],
          ],
          [[96, 96]],
          'retain',
          leading ? 'positive' : 'negative',
        ),
        leading
          ? action(
              'Deliver toward the central striker',
              'The centre-back intercepts the cross and releases their striker into our stretched shape. The last counter produces a late chance, and they finish it.',
              'match-rival-goal',
              [
                ['a-lcb', 93, 58],
                ['a-st', 13, 48],
              ],
              [
                [93, 58],
                [13, 48],
                [0, 50],
              ],
              'concede',
              'negative',
            )
          : action(
              'Cut the ball back toward our eight',
              'The late run reaches the cut-back behind the dropping defenders. Our eight strikes first time and scores with the last attack.',
              'match-home-goal',
              [['h-r8', 85, 60]],
              [
                [85, 60],
                [100, 50],
              ],
              'goal',
            ),
        action(
          'Carry inside toward their full-back',
          'The full-back takes your next touch. Their clearance removes the final attacking opportunity.',
          'match-interception',
          [['a-lb', 91, 89]],
          [[91, 89]],
          'lost',
          'negative',
        ),
        action(
          'Return down the line to our right-back',
          leading
            ? 'We keep possession with the supporting full-back and the whistle follows. The lead survives, although the extra pass offered a moment to intercept.'
            : 'The return pass is completed, but there is no time for another delivery. The final whistle ends the attack.',
          'right-back-1',
          [['h-rb', 82, 91]],
          [[82, 91]],
          'retain',
          'neutral',
        ),
      ),
    ],
  );
  return balanceChoiceOrder([m])[0];
}

type ClockAction = {
  label: string;
  feedback: string;
  art: string;
  moves: Placement[];
  path: [number, number][];
  arrivals?: Record<string, number>;
};
type ClockPlan = {
  name: string;
  actor: string;
  owner: string;
  positions: Placement[];
  context: string;
  keep: ClockAction;
  attack: ClockAction;
  counter: Omit<ClockAction, 'label'>;
  error: ClockAction;
  reset: ClockAction;
};

function clockPlan(round: number, leading: boolean): ClockPlan | undefined {
  switch (round) {
    case 1:
      return {
        name: 'One throw left',
        actor: 'h-rb',
        owner: 'h-rb',
        positions: [
          ['h-rb', 85, 100],
          ['h-rw', 83, 92],
          ['h-r8', 84, 66],
          ['h-st', 88, 48],
          ['h-rcb', 76, 63],
          ['a-lb', leading ? 92 : 84, leading ? 90 : 87],
          ['a-lcb', 92, 60],
          ['a-rcb', 92, 39],
          ['a-l8', 81, 68],
          ['a-st', 53, 48],
        ],
        context: leading
          ? 'We have a throw-in high on the right. Our winger offers a short return; their full-back has dropped into the longer throw’s lane.'
          : 'We have a throw-in high on the right. Their full-back follows our winger’s short movement; our eight waits behind a run down the line.',
        keep: {
          label: 'Throw short and take the return',
          feedback: 'The winger sets the throw back to you by the line.',
          art: 'right-back-1',
          moves: [
            ['h-rw', 82, 96],
            ['h-rb', 84, 98],
          ],
          path: [
            [82, 96],
            [84, 98],
          ],
        },
        attack: {
          label: 'Throw down the line into the winger’s run',
          feedback:
            'The winger reaches the throw behind the full-back and cuts back. Our eight arrives from behind the ball and scores first time.',
          art: 'match-home-goal',
          moves: [
            ['h-rw', 95, 91],
            ['h-r8', 89, 65],
          ],
          path: [
            [95, 91],
            [89, 65],
            [100, 45],
          ],
        },
        counter: {
          feedback:
            'Their full-back reaches the longer throw and releases their striker. Our high support cannot recover before the counter finishes.',
          art: 'match-rival-goal',
          moves: [
            ['a-lb', 93, 91],
            ['a-st', 12, 48],
          ],
          path: [
            [93, 91],
            [53, 48],
            [12, 48],
            [0, 50],
          ],
        },
        error: {
          label: 'Throw inside toward our eight',
          feedback:
            'Their eight steps in front of the receiver and takes the throw. Rival XI keep the final possession.',
          art: 'match-interception',
          moves: [['a-l8', 86, 68]],
          path: [[86, 68]],
        },
        reset: {
          label: 'Throw back toward our centre-back',
          feedback:
            'Our centre-back controls it, but the final whistle arrives before another forward pass.',
          art: 'right-centre-back-1',
          moves: [],
          path: [[76, 63]],
        },
      };
    case 2:
      return {
        name: 'The keeper’s last release',
        actor: 'h-gk',
        owner: 'h-gk',
        positions: [
          ['h-gk', 10, 50],
          ['h-rcb', 24, 66],
          ['h-lb', 23, 14],
          ['h-six', 26, 49],
          ['h-lw', 57, 12],
          ['h-st', 66, 48],
          ['a-r8', 28, 43],
          ['a-rb', leading ? 77 : 45, 18],
          ['a-rcb', 76, 40],
          ['a-lcb', 78, 60],
          ['a-rw', 40, 24],
          ['a-st', 35, 47],
        ],
        context: leading
          ? 'You have caught a cross. Our centre-back offers a short release; their full-back has recovered to cover the longer kick toward our winger.'
          : 'You have caught a cross. Their full-back is still high, below our left winger; our striker starts onside between the retreating centre-backs.',
        keep: {
          label: 'Roll to the centre-back for a return',
          feedback:
            'Our centre-back returns the ball at your feet, keeping us in control.',
          art: 'goalkeeper-1',
          moves: [['h-gk', 11, 50]],
          path: [
            [24, 66],
            [11, 50],
          ],
        },
        attack: {
          label: 'Kick into our left winger’s run',
          feedback:
            'The early kick reaches our winger beyond their full-back. The winger passes across the box and our striker finishes the last counter.',
          art: 'match-home-goal',
          moves: [
            ['h-lw', 88, 13],
            ['h-st', 87, 48],
          ],
          path: [
            [88, 13],
            [87, 48],
            [100, 54],
          ],
        },
        counter: {
          feedback:
            'Their full-back reads the long release and heads into midfield. Their winger sends the striker through our spread defence for a late goal.',
          art: 'match-rival-goal',
          moves: [
            ['a-rb', 76, 17],
            ['a-rw', 36, 20],
            ['a-st', 12, 45],
          ],
          path: [
            [76, 17],
            [36, 20],
            [12, 45],
            [0, 47],
          ],
        },
        error: {
          label: 'Throw into our six’s feet',
          feedback:
            'Their eight cuts across our six and intercepts. The whistle follows with Rival XI in possession.',
          art: 'match-interception',
          moves: [['a-r8', 26, 48]],
          path: [[26, 48]],
        },
        reset: {
          label: 'Roll wide toward our left-back',
          feedback:
            'Our left-back receives near our box. We keep the ball, but there is no time to carry the attack upfield.',
          art: 'goalkeeper-3',
          moves: [],
          path: [[23, 14]],
        },
      };
    case 3:
      return {
        name: 'Hold or accelerate?',
        actor: 'h-six',
        owner: 'h-six',
        positions: [
          ['h-six', 58, 50],
          ['h-l8', 63, 31],
          ['h-r8', 67, 67],
          ['h-lcb', 42, 35],
          ['h-st', 78, 48],
          ['a-six', leading ? 68 : 61, leading ? 49 : 57],
          ['a-lcb', 82, 55],
          ['a-rcb', 85, 39],
          ['a-rw', 49, 22],
          ['a-st', 40, 49],
        ],
        context: leading
          ? 'You face upfield in midfield. Their six has moved into the striker’s passing lane; our left eight offers a return outside that screen.'
          : 'You face upfield in midfield. Their six shifts right; our striker can receive back to goal and set the right eight’s run beyond.',
        keep: {
          label: 'Recycle through the left eight',
          feedback:
            'Our left eight takes the pass and returns it as their midfield shifts.',
          art: 'right-midfielder-2',
          moves: [],
          path: [
            [63, 31],
            [58, 50],
          ],
        },
        attack: {
          label: 'Pass into the striker for the lay-off',
          feedback:
            'The striker sets the ball into our eight’s late run. The eight carries through the gap and scores before the covering defender reaches them.',
          art: 'match-home-goal',
          moves: [['h-r8', 86, 64]],
          path: [
            [78, 48],
            [86, 64],
            [100, 44],
          ],
        },
        counter: {
          feedback:
            'Their six steps into the pass and releases the far winger. The diagonal return sends their striker through before our midfield can recover.',
          art: 'match-rival-goal',
          moves: [
            ['a-six', 71, 48],
            ['a-rw', 35, 22],
            ['a-st', 13, 48],
          ],
          path: [
            [71, 48],
            [35, 22],
            [13, 48],
            [0, 50],
          ],
        },
        error: {
          label: 'Carry toward their holding midfielder',
          feedback:
            'Their six reaches your forward touch and wins it. Rival XI end the match with the ball.',
          art: 'match-interception',
          moves: [
            ['h-six', 66, 51],
            ['a-six', 67, 52],
          ],
          path: [
            [66, 51],
            [67, 52],
          ],
        },
        reset: {
          label: 'Pass back to our centre-back',
          feedback:
            'Our centre-back receives without pressure. The whistle arrives while we retain possession behind midfield.',
          art: 'right-centre-back-1',
          moves: [],
          path: [[42, 35]],
        },
      };
    case 4:
      return {
        name: 'The short corner',
        actor: 'h-lw',
        owner: 'h-lw',
        positions: [
          ['h-lw', 100, 0],
          ['h-lb', 90, 9],
          ['h-l8', 88, 29],
          ['h-r8', 87, 64],
          ['h-st', 93, 48],
          ['h-six', 76, 49],
          ['a-rb', 94, 18],
          ['a-r8', 87, 32],
          ['a-rcb', 95, leading ? 40 : 47],
          ['a-lcb', 95, 61],
          ['a-gk', leading ? 94 : 98, 50],
          ['a-lw', 63, 85],
          ['a-st', 52, 50],
        ],
        context: leading
          ? 'We have a corner on the left. Our full-back offers a short return; their keeper comes off the line while two attackers stay ready to break.'
          : 'We have a corner on the left. The keeper stays on the line; our striker moves across the near defender and our right eight waits deeper.',
        keep: {
          label: 'Take it short and collect the return',
          feedback:
            'You check back level with our full-back before the short corner is returned. You shield it by the touchline within playing distance.',
          art: 'left-winger-2',
          moves: [['h-lw', 90, 1]],
          arrivals: { 'h-lw': 0 },
          path: [
            [90, 9],
            [90, 1],
          ],
        },
        attack: {
          label: 'Deliver toward the near-post striker',
          feedback:
            'The striker flicks the corner behind the near-post duel. Our eight meets the dropping ball first time and scores across the keeper.',
          art: 'match-home-goal',
          moves: [
            ['h-st', 94, 40],
            ['h-r8', 88, 58],
          ],
          path: [
            [94, 40],
            [88, 58],
            [100, 57],
          ],
        },
        counter: {
          feedback:
            'The keeper claims the delivery and releases their winger. With our support committed to the corner, the winger finds the striker for a late counterattack goal.',
          art: 'match-rival-goal',
          moves: [
            ['a-gk', 94, 48],
            ['a-lw', 63, 85],
            ['a-st', 13, 50],
          ],
          path: [
            [94, 48],
            [63, 85],
            [13, 50],
            [0, 53],
          ],
        },
        error: {
          label: 'Play the corner toward our left eight',
          feedback:
            'Their midfielder steps across the shorter delivery and wins it. Rival XI take the last possession.',
          art: 'match-interception',
          moves: [['a-r8', 89, 29]],
          path: [[89, 29]],
        },
        reset: {
          label: 'Send the corner back toward our six',
          feedback:
            'Our six controls outside the box. We retain possession, but the final whistle ends the chance to deliver.',
          art: 'right-midfielder-1',
          moves: [],
          path: [[76, 49]],
        },
      };
    case 5:
      return {
        name: 'The rebound at the whistle',
        actor: 'h-st',
        owner: 'h-st',
        positions: [
          ['h-st', 89, 56],
          ['h-r8', 78, 65],
          ['h-rw', 94, 87],
          ['h-l8', 77, 34],
          ['a-gk', 94, leading ? 56 : 50],
          ['a-rcb', 92, 44],
          ['a-lcb', 94, 66],
          ['a-lb', 94, 80],
          ['a-rw', 64, 20],
          ['a-st', 53, 48],
        ],
        context: leading
          ? 'The rebound reaches your feet. The keeper has regained their stance, a defender recovers from your right and their far winger waits to break.'
          : 'The rebound reaches your feet. The keeper is still on the ground after the parry; the nearest defender recovers from your right.',
        keep: {
          label: 'Take the ball away toward the right edge',
          feedback:
            'You take possession away from the recovering keeper and shield the ball at the side of the box.',
          art: 'striker-1',
          moves: [['h-st', 91, 73]],
          path: [[91, 73]],
        },
        attack: {
          label: 'Meet the rebound with a first-time shot',
          feedback:
            'You reach the spill before the defender. The first-time finish goes across the recovering keeper and into the far corner.',
          art: 'match-home-goal',
          moves: [['h-st', 93, 55]],
          path: [
            [93, 55],
            [100, 43],
          ],
        },
        counter: {
          feedback:
            'The keeper blocks the rebound effort and releases their winger. The winger passes into the striker’s run behind our high defenders and the last counter ends in a goal.',
          art: 'match-rival-goal',
          moves: [
            ['h-st', 93, 55],
            ['a-gk', 94, 52],
            ['a-rw', 64, 20],
            ['a-st', 12, 48],
          ],
          path: [
            [93, 55],
            [94, 52],
            [64, 20],
            [12, 48],
            [0, 50],
          ],
        },
        error: {
          label: 'Control the ball toward the goalkeeper',
          feedback:
            'Your extra touch goes toward the keeper, who smothers it. Rival XI control the final ball.',
          art: 'match-save',
          moves: [
            ['h-st', 93, 56],
            ['a-gk', 94, 56],
          ],
          path: [
            [93, 56],
            [94, 56],
          ],
        },
        reset: {
          label: 'Set the ball back toward our eight',
          feedback:
            'Our eight receives behind the box. Possession stays ours, but the whistle comes before another shot.',
          art: 'striker-2',
          moves: [],
          path: [[78, 65]],
        },
      };
    case 6:
      return {
        name: 'The final switch',
        actor: 'h-rcb',
        owner: 'h-rcb',
        positions: [
          ['h-rcb', 50, 64],
          ['h-lcb', 44, 36],
          ['h-six', 42, 50],
          ['h-rb', 52, 88],
          ['h-lw', 78, 10],
          ['h-st', 85, 48],
          ['a-l8', 61, 65],
          ['a-rb', leading ? 87 : 75, leading ? 15 : 24],
          ['a-rcb', 88, 40],
          ['a-lcb', 88, 60],
          ['a-rw', 50, 21],
          ['a-st', 46, 49],
        ],
        context: leading
          ? 'You face upfield. Their full-back has dropped into the long diagonal’s lane; our left centre-back and six offer a short route around the press.'
          : 'You face upfield with their midfield drawn right. Their far full-back has narrowed inside our onside left winger; the striker waits between the centre-backs.',
        keep: {
          label: 'Recycle across the centre-back and six',
          feedback:
            'Our left centre-back connects with the six. We retain the ball behind their pressing line.',
          art: 'right-centre-back-1',
          moves: [],
          path: [
            [44, 36],
            [42, 50],
          ],
        },
        attack: {
          label: 'Switch diagonally toward the left winger',
          feedback:
            'The diagonal reaches the winger outside the full-back. Their first-time cross finds our striker behind the ball for a header into the far corner.',
          art: 'match-home-goal',
          moves: [
            ['h-lw', 93, 13],
            ['h-st', 92, 48],
          ],
          path: [
            [93, 13],
            [92, 48],
            [100, 54],
          ],
        },
        counter: {
          feedback:
            'Their full-back reaches the diagonal and releases the winger inside. The return sends their striker through our separated defenders for a late goal.',
          art: 'match-rival-goal',
          moves: [
            ['a-rb', 87, 15],
            ['a-rw', 40, 22],
            ['a-st', 12, 48],
          ],
          path: [
            [87, 15],
            [40, 22],
            [12, 48],
            [0, 50],
          ],
        },
        error: {
          label: 'Carry into the central midfield lane',
          feedback:
            'Their eight meets your central carry and takes the ball. Rival XI retain the final possession.',
          art: 'match-interception',
          moves: [
            ['h-rcb', 59, 63],
            ['a-l8', 60, 64],
          ],
          path: [
            [59, 63],
            [60, 64],
          ],
        },
        reset: {
          label: 'Pass outside toward our right-back',
          feedback:
            'Our right-back controls by the line. The whistle follows before the ball reaches the box.',
          art: 'right-back-1',
          moves: [],
          path: [[52, 88]],
        },
      };
  }
}

function variedClosingMoment(
  id: string,
  home: number,
  away: number,
  plan: ClockPlan,
): MatchMoment {
  const leading = home > away;
  const choice = (
    a: ClockAction,
    result: 'retain' | 'lost' | 'goal' | 'concede',
    tone: 'positive' | 'negative' | 'neutral',
    feedback = a.feedback,
  ) => ({ ...action(a.label, feedback, a.art, a.moves, a.path, result, tone), arrivals: a.arrivals });
  const attack = leading
    ? { ...plan.counter, label: plan.attack.label }
    : plan.attack;
  const moment = advancedMoment(
    id,
    90,
    plan.name,
    `Stoppage time. Our XI ${home}–${away} Rival XI. ${leading ? 'The lead is ours to protect.' : 'There is time for one final move.'}`,
    plan.owner,
    plan.positions,
    [
      turn(
        plan.actor,
        'Attacking',
        plan.context,
        'How do you use the final possession?',
        choice(
          plan.keep,
          'retain',
          leading ? 'positive' : 'negative',
          `${plan.keep.feedback} ${leading ? 'The whistle follows and the lead survives.' : 'The remaining time runs out without another shot.'}`,
        ),
        choice(
          attack,
          leading ? 'concede' : 'goal',
          leading ? 'negative' : 'positive',
        ),
        choice(plan.error, 'lost', 'negative'),
        choice(plan.reset, 'retain', 'neutral'),
      ),
    ],
  );
  return balanceChoiceOrder([moment])[0];
}

const recipes: [string, number][][] = [
  [
    ['harbour-outlets', 0],
    ['arrow-middle', 0],
    ['harbour-outlets', 3],
    ['narrow-width', 3],
  ],
  [
    ['runners-tracking', 1],
    ['towers-rebounds', 1],
    ['banks-block', 1],
    ['original', 1],
  ],
  [
    ['second-ball', 1],
    ['second-ball', 0],
    ['banks-block', 0],
    ['weavers-press', 3],
  ],
  [
    ['narrow-width', 4],
    ['runners-tracking', 2],
    ['changing-picture', 1],
    ['banks-block', 2],
  ],
  [
    ['breakers-transition', 1],
    ['low-block', 3],
    ['towers-rebounds', 3],
    ['changing-picture', 2],
  ],
  [
    ['bait-traps', 0],
    ['compass-rhythm', 2],
    ['bait-traps', 4],
    ['compass-rhythm', 1],
  ],
  [
    ['changing-picture', 4],
    ['compass-rhythm', 4],
    ['high-pressure', 2],
    ['high-pressure', 3],
  ],
];
// The Readers' Cup is one designed tournament, so plays borrowed from the training
// fixtures get cup-specific titles and introductions: match context and stakes, never
// the answer. {opponent} is replaced by the actual drawn opponent.
const CUP_STORY: Record<string, [name: string, introduction: string]> = {
  'harbour-outlets-1': ['Calm under the first press', 'Eight minutes into the cup. {opponent} chase our goalkeeper from the first whistle, hoping for an early mistake.'],
  'arrow-middle-1': ['Their first real attack', '{opponent} find their striker for the first time, back to goal at the edge of our box. Our left centre-back has a split second.'],
  'harbour-outlets-4': ['A cross is coming', 'Our winger shapes to lift a cross toward the near post. Half-time is close and the first goal of the cup is there to be taken.'],
  'runners-tracking-2': ['Two runs, one pass', 'Early in the second group game. Our left side starts moving and a {opponent} defender has to make a choice.'],
  'towers-rebounds-2': ['Shots from the edge', 'Our left eight lets fly from the edge of the box and the {opponent} defence turns toward the shot.'],
  'banks-block-1': ['One against one on the wing', 'The group is on the line. Our left winger isolates the {opponent} full-back near the box.'],
  'weavers-press-4': ['Late danger', 'Twenty minutes to go and {opponent} play into their striker dropping short. Our back line has to decide who goes and who stays.'],
  'narrow-width-5': ['The first knockout chance', 'Knockout football: one mistake can end the cup. Our left winger receives facing goal with the {opponent} full-back set in front.'],
  'runners-tracking-3': ['Lanes crossing', '{opponent} attack our right side. Their winger and striker swap lanes to pull our back line apart.'],
  'banks-block-3': ['A corner late on', 'We win a corner late in the round of 16. Their striker lingers near halfway, waiting for anything loose.'],
  'breakers-transition-2': ['Steal and go', 'Eight minutes into the quarter-final. We cut out an {opponent} pass and their midfield is caught upfield.'],
  'towers-rebounds-4': ['Back to goal', '{opponent} squeeze every space. Our keeper fires a pass into our striker, with a defender tight behind.'],
  'bait-traps-1': ['Nerves in the semi-final', 'Semi-final. {opponent} press our goalkeeper from the first minute, and every passing lane looks inviting.'],
  'compass-rhythm-3': ['Isolated on the right', 'Our right winger runs at the {opponent} full-back. Help is coming for them — and for us.'],
  'compass-rhythm-2': ['The switch is coming', 'Twenty minutes from the final. {opponent} hold the ball on our right while their far side waits.'],
  'compass-rhythm-5': ['Unlock the final', '{opponent} sit compact through the middle. The final needs patience — and one clever pass.'],
};

export function cupFixture(round: number, opponent: string): MatchFixture {
  const moments = recipes[round].map(([id, index], i) => ({
    ...tournamentFixture(
      matchFixtures.find((f) => f.id === id)!,
      opponent,
    ).moments[index],
    minute: [8, 27, 43, 67][i],
  })).map((moment) => {
    const story = CUP_STORY[moment.id];
    return story ? { ...moment, name: story[0], introduction: story[1].replaceAll('{opponent}', opponent) } : moment;
  });
  // Older training matches store their verdict through the shared feedback
  // helper. Carry that explicit verdict into the curated cup copy as well.
  for (const moment of moments) {
    moment.nodes = moment.nodes.map((node) => ({
      ...node,
      choices: node.choices.map((choice) => ({
        ...choice,
        tone: matchChoiceTone(node, choice),
      })),
    }));
  }
  // Incidents punctuate particular rounds rather than becoming the same routine
  // every match. Other rounds concentrate on aerial play, rotations or rebounds.
  if (round === 0) moments[3] = touchlineThrow(`cup-${round}-throw`);
  if (round === 1) moments[2] = quickRestart(`cup-${round}-restart`);
  if (round === 5) moments[2] = playAdvantage(`cup-${round}-advantage`);
  if (round === 6) moments[3] = tacticalFoul(`cup-${round}-foul`);
  moments.push(closingMoment(`cup-${round}-clock`, 0, 0));
  return tournamentFixture(
    {
      id: `cup-${round}`,
      name: `The Readers’ Cup · ${['Group game 1', 'Group game 2', 'Group game 3', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'][round]}`,
      opponent,
      difficulty: round === 0 ? 'Easy' : round < 4 ? 'Intermediate' : 'Hard',
      description: [
        'Find the spare defender, attack a header and handle the touchline trap.',
        'Use a decoy, react to a rebound and recognise a quick restart.',
        'Counter from a catch, win an aerial duel and find the inside runner.',
        'Turn under pressure, pass crossing runners on and defend the cut-back.',
        'Turn their counter around, protect the far post and keep a second attack alive.',
        'Escape a pressing trap, play through advantage and read the far-side threat.',
        'Connect both ends of the pitch, disguise a switch, defend the far-side runner and decide the price of a tactical foul.',
      ][round],
      cover: '/illustrations/actions/match-celebration.webp',
      moments: balanceChoiceOrder(moments),
    },
    opponent,
  );
}
export function closingScore(results: MatchMomentResult[]) {
  return results
    .filter((r) => !r.momentId.endsWith('-clock'))
    .reduce(
      (score, r) => ({
        home: score.home + r.outcome.homeGoals,
        away: score.away + r.outcome.awayGoals,
      }),
      { home: 0, away: 0 },
    );
}
