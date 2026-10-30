import {
  attacking,
  defending,
  play,
  read,
  n,
  g,
  k,
  l,
  r,
  d,
  x,
  type LeaguePlaySpec,
} from './league-play-authoring.ts';

// Three connected reads: establish the opening, adjust to the response, resolve it.
// Ordinary passes remain subject to the last line, including second-phase deliveries.
const specs: LeaguePlaySpec[] = [
  {
    id: 'lg2-i-left-centre-entry',
    tier: 1,
    name: 'The centre-back steps through',
    intro:
      'Their first presser leaves the left centre-back a narrow route into midfield.',
    owner: 'h-lcb',
    placements: attacking([
      ['h-lcb', 52, 34],
      ['h-six', 62, 45],
      ['h-l8', 70, 30],
      ['h-st', 78, 47],
      ['h-lw', 76, 17],
      ['a-st', 56, 43],
      ['a-r8', 66, 38],
    ]),
    reads: [
      read(
        'h-lcb',
        'Attacking',
        'The striker curves towards your six. Our striker is checking between the lines, with the left eight outside him.',
        n(
          'Step forward and find the striker',
          'The carry draws the midfielder before the striker receives.',
          [
            ['h-lcb', 60, 33],
            ['h-st', 76, 45],
          ],
          [['a-r8', 67, 34]],
        ),
        l(
          'Play through the six',
          'The curved press closes that passing lane.',
          [['a-st', 62, 45]],
        ),
        k(
          'Move across to the other centre-back',
          'We retain possession while the midfield line resets.',
          [['h-rcb', 52, 63]],
        ),
        l(
          'Send it towards the left winger',
          'The full-back reads the early wide ball.',
          [['a-rb', 78, 18]],
        ),
      ),
      read(
        'h-st',
        'Attacking',
        'The centre-back follows your check. The left eight can receive beyond the midfielder without joining the last line.',
        n(
          'Set the ball to the left eight',
          'The lay-off removes the following centre-back from the next pass.',
          [['h-l8', 80, 31]],
          [['a-rcb', 84, 44]],
        ),
        l(
          'Turn towards the penalty spot',
          'The following centre-back reaches your turning touch.',
          [
            ['h-st', 80, 46],
            ['a-rcb', 80, 46],
          ],
        ),
        k(
          'Return it to the centre-back',
          'The ball is secure but the following defender recovers.',
          [['h-lcb', 62, 35]],
        ),
        l(
          'Roll it across to the right winger',
          'The holding midfielder is between you and that receiver.',
          [['a-six', 77, 56]],
        ),
      ),
      read(
        'h-l8',
        'Attacking',
        'The near centre-back has stepped out. The winger can run diagonally from below the last line; the keeper is covering the near side.',
        g(
          'Slide the winger through and follow',
          'The diagonal run reaches the gap before the line closes.',
          [
            ['h-lw', 87, 30],
            ['h-lw', 91, 39],
          ],
          [['a-gk', 96, 43]],
          57,
        ),
        l(
          'Drive between the two centre-backs',
          'The remaining centre-back meets your second touch.',
          [
            ['h-l8', 86, 39],
            ['a-lcb', 86, 39],
          ],
        ),
        k(
          'Square it to the six',
          'The centre-backs recover while we start another attack.',
          [['h-six', 74, 47]],
        ),
        l(
          'Lift it towards the striker',
          'The striker has a defender tight to the receiving space.',
          [['a-lcb', 87, 49]],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-right-underlap',
    tier: 1,
    name: 'Inside the wide pair',
    intro: 'The right-back approaches a winger who is holding the touchline.',
    owner: 'h-rb',
    placements: attacking([
      ['h-rb', 67, 85],
      ['h-rw', 78, 91],
      ['h-r8', 75, 66],
      ['h-st', 81, 49],
      ['a-lb', 82, 85],
      ['a-l8', 73, 76],
    ]),
    reads: [
      read(
        'h-rb',
        'Attacking',
        'Their wide midfielder faces you. The winger has space to receive outside, while the full-back stays beside him.',
        n(
          'Find the winger and run inside',
          'The wide reception fixes both defenders on the outside.',
          [['h-rw', 80, 92]],
          [
            ['h-rb', 76, 74],
            ['a-lb', 84, 90],
          ],
        ),
        l(
          'Carry along the touchline',
          'The midfielder and full-back close the same corridor.',
          [
            ['h-rb', 74, 89],
            ['a-l8', 74, 89],
          ],
        ),
        k(
          'Pass inside to the right eight',
          'The defence remains set in front of the next receiver.',
          [['h-r8', 74, 67]],
        ),
        l(
          'Deliver from this position',
          'The near centre-back steps ahead of the striker.',
          [['a-lcb', 87, 57]],
        ),
      ),
      read(
        'h-rw',
        'Attacking',
        'The full-back has turned towards the touchline. Our right-back is arriving inside the midfielder, not behind the centre-backs.',
        n(
          'Roll the ball into the underlap',
          'The return reaches the right-back on the inside shoulder.',
          [['h-rb', 85, 70]],
          [['a-l8', 79, 79]],
        ),
        l('Turn down the line', 'The full-back can match your outside turn.', [
          ['h-rw', 86, 92],
          ['a-lb', 86, 92],
        ]),
        k(
          'Set it back to the right eight',
          'We keep it, but the underlap loses its timing.',
          [['h-r8', 77, 67]],
        ),
        l(
          'Cross towards the far post',
          'The far centre-back is facing the delivery.',
          [['a-rcb', 90, 35]],
        ),
      ),
      read(
        'h-rb',
        'Attacking',
        'The centre-back protects the square pass to the striker. You can keep the ball outside him while the keeper watches the centre of the box.',
        g(
          'Carry outside the centre-back and finish',
          'The right-back uses the outside lane before finishing across the keeper.',
          [
            ['h-rb', 88, 72],
            ['h-rb', 92, 65],
          ],
          [['a-gk', 95, 54]],
          43,
        ),
        l(
          'Shoot towards the near post',
          'The sliding centre-back blocks the shooting line.',
          [['a-lcb', 88, 65]],
        ),
        k(
          'Turn back towards the winger',
          'The ball stays ours as the box fills again.',
          [['h-rw', 85, 88]],
        ),
        l(
          'Carry across the penalty area',
          'The second centre-back takes your crossing touch.',
          [
            ['h-rb', 89, 57],
            ['a-rcb', 89, 57],
          ],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-switch-inside',
    tier: 1,
    name: 'The switch comes back inside',
    intro:
      'Our six sees the far winger while their block travels towards the right.',
    owner: 'h-six',
    placements: attacking([
      ['h-six', 63, 53],
      ['h-r8', 72, 69],
      ['h-lw', 74, 11],
      ['h-l8', 71, 29],
      ['h-st', 81, 51],
      ['a-rb', 82, 24],
      ['a-six', 74, 58],
      ['a-r8', 72, 41],
    ]),
    reads: [
      read(
        'h-six',
        'Attacking',
        'Their midfielder blocks the short pass to our right eight. The left winger is visible outside the far full-back.',
        n(
          'Switch to the left winger',
          'The far-side reception makes the block turn back across.',
          [['h-lw', 79, 10]],
          [['a-rb', 83, 16]],
        ),
        l(
          'Feed the right eight',
          'The screening midfielder steps through that pass.',
          [['a-six', 71, 66]],
        ),
        k(
          'Return to the left centre-back',
          'The six can reposition but the far-side window closes.',
          [['h-lcb', 54, 35]],
        ),
        l(
          'Carry between the midfielders',
          'The second midfielder closes your next touch.',
          [
            ['h-six', 70, 49],
            ['a-r8', 70, 49],
          ],
        ),
      ),
      read(
        'h-lw',
        'Attacking',
        'The full-back approaches from inside. The left eight is behind his pressing shoulder with room to face the box.',
        n(
          'Set inside to the left eight',
          'The first-time set reaches the space the full-back left.',
          [['h-l8', 83, 29]],
          [['a-rb', 84, 13]],
        ),
        l(
          'Take the ball towards the corner',
          'The full-back can pin that touch against the line.',
          [
            ['h-lw', 86, 7],
            ['a-rb', 86, 7],
          ],
        ),
        k(
          'Pass back to the six',
          'The travelling midfielders recover before another switch.',
          [['h-six', 68, 44]],
        ),
        l(
          'Cross above the striker',
          'The centre-back gets between the striker and the delivery.',
          [['a-rcb', 89, 46]],
        ),
      ),
      read(
        'h-l8',
        'Attacking',
        'The centre-back is occupied by the striker. Your first touch can move diagonally into the open shooting lane.',
        g(
          'Take a diagonal touch and finish',
          'The diagonal touch separates the shot from the centre-back.',
          [
            ['h-l8', 86, 34],
            ['h-l8', 89, 39],
          ],
          [['a-gk', 95, 46]],
          58,
        ),
        l(
          'Pass into the striker at once',
          'The centre-back is already on the striker’s receiving side.',
          [['a-rcb', 86, 48]],
        ),
        k(
          'Move the ball back across midfield',
          'We retain it outside the box while the block settles.',
          [['h-r8', 77, 63]],
        ),
        l(
          'Shoot from the first touch',
          'The full-back can still block the shot from this angle.',
          [['a-rb', 85, 28]],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-striker-swivel',
    tier: 1,
    name: 'A swivel between the lines',
    intro:
      'The striker receives with one centre-back following and an eight arriving.',
    owner: 'h-st',
    placements: attacking([
      ['h-st', 76, 54],
      ['h-r8', 74, 68],
      ['h-six', 66, 47],
      ['a-lcb', 84, 59],
      ['a-six', 72, 50],
      ['a-l8', 76, 74],
    ]),
    reads: [
      read(
        'h-st',
        'Attacking',
        'The centre-back approaches your left shoulder. The right eight is outside the holding midfielder’s line of sight.',
        n(
          'Turn away from the centre-back',
          'The swivel puts your body between the centre-back and the ball.',
          [['h-st', 79, 60]],
          [['a-lcb', 84, 55]],
        ),
        l(
          'Turn towards the penalty spot',
          'The centre-back meets the ball on that side.',
          [
            ['h-st', 80, 51],
            ['a-lcb', 80, 51],
          ],
        ),
        k(
          'Lay it back to the six',
          'The ball is secure but the arrival is no longer a surprise.',
          [['h-six', 68, 49]],
        ),
        l(
          'Push the ball towards the winger',
          'The wide midfielder can intercept that pass.',
          [['a-l8', 79, 75]],
        ),
      ),
      read(
        'h-st',
        'Attacking',
        'The centre-back is recovering across you. The right eight can run through the gap from behind the last line.',
        n(
          'Slip the right eight through',
          'The pass leaves the recovering defender facing his own goal.',
          [['h-r8', 86, 64]],
          [['a-lcb', 86, 57]],
        ),
        l(
          'Carry across the centre-back',
          'The defender reaches the ball as you cross his path.',
          [
            ['h-st', 84, 57],
            ['a-lcb', 84, 57],
          ],
        ),
        k(
          'Hold up the ball and reset',
          'The supporting players receive after the gap closes.',
          [['h-six', 73, 50]],
        ),
        l(
          'Lift it to the left winger',
          'The far full-back reads the hanging diagonal.',
          [['a-rb', 85, 20]],
        ),
      ),
      read(
        'h-r8',
        'Attacking',
        'The keeper shuffles towards your side. You can take one touch towards the centre before the trailing midfielder catches up.',
        g(
          'Touch across the keeper and finish',
          'The central touch opens the far corner.',
          [
            ['h-r8', 89, 58],
            ['h-r8', 92, 55],
          ],
          [['a-gk', 95, 61]],
          42,
        ),
        l(
          'Shoot from the wide angle',
          'The keeper is set on that shooting line.',
          [['a-gk', 96, 63]],
        ),
        k(
          'Return the ball to the striker',
          'The return preserves possession behind the recovering defence.',
          [['h-st', 84, 59]],
        ),
        l(
          'Take another touch towards the byline',
          'The full-back reaches your next touch from the outside.',
          [
            ['h-r8', 92, 71],
            ['a-lb', 92, 71],
          ],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-left-eight-wall',
    tier: 1,
    name: 'The wall pass changes the angle',
    intro:
      'A left eight approaches a compact midfield pair with the striker available as a wall.',
    owner: 'h-l8',
    placements: attacking([
      ['h-l8', 69, 34],
      ['h-st', 79, 45],
      ['h-lw', 77, 17],
      ['h-six', 63, 51],
      ['a-r8', 72, 36],
      ['a-six', 76, 48],
      ['a-rb', 84, 23],
    ]),
    reads: [
      read(
        'h-l8',
        'Attacking',
        'The midfielder moves towards your carrying foot. The striker can receive on the other side of him.',
        n(
          'Use the striker as a wall',
          'The forward pass takes the midfielder out of the exchange.',
          [['h-st', 78, 43]],
          [
            ['h-l8', 77, 28],
            ['a-r8', 73, 34],
          ],
        ),
        l(
          'Carry through the midfield pair',
          'The second midfielder closes the touch beyond the first.',
          [
            ['h-l8', 75, 42],
            ['a-six', 75, 42],
          ],
        ),
        k(
          'Set the ball to the six',
          'The pair can recover while we hold the ball.',
          [['h-six', 65, 49]],
        ),
        l(
          'Play towards the winger’s feet',
          'The full-back steps into the visible wide lane.',
          [['a-rb', 80, 20]],
        ),
      ),
      read(
        'h-st',
        'Attacking',
        'The left eight has moved around the midfielder. The full-back has come inside to watch that runner, leaving the winger outside.',
        n(
          'Return through the eight to the winger',
          'The extra touch sends the full-back back across his own body.',
          [
            ['h-l8', 80, 28],
            ['h-lw', 85, 19],
          ],
          [['a-rb', 83, 29]],
        ),
        l(
          'Turn into the centre-back',
          'The centre-back is set behind your turning shoulder.',
          [
            ['h-st', 83, 47],
            ['a-rcb', 83, 47],
          ],
        ),
        k(
          'Return directly to the six',
          'We keep possession but release the defence from the combination.',
          [['h-six', 70, 47]],
        ),
        l(
          'Pass across to the right winger',
          'The holding midfielder cuts off the longer pass.',
          [['a-six', 80, 55]],
        ),
      ),
      read(
        'h-lw',
        'Attacking',
        'The full-back is chasing from inside. The keeper guards the near post, while one touch infield exposes the far side.',
        g(
          'Carry infield and strike across goal',
          'The infield touch moves the shot away from the keeper’s set position.',
          [
            ['h-lw', 89, 30],
            ['h-lw', 91, 36],
          ],
          [['a-gk', 96, 40]],
          57,
        ),
        l(
          'Shoot towards the near post',
          'The keeper covers the narrow angle.',
          [['a-gk', 97, 40]],
        ),
        k(
          'Roll it back to the left eight',
          'The full-back and centre-back recover while we retain it.',
          [['h-l8', 83, 30]],
        ),
        l(
          'Cut back through the full-back',
          'The trailing full-back intercepts the reverse ball.',
          [['a-rb', 87, 25]],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-keeper-midfield-exit',
    tier: 1,
    name: 'The keeper finds the spare side',
    intro:
      'Our goalkeeper has come out to receive while their first line tries to keep the ball on one side.',
    owner: 'h-gk',
    placements: attacking([
      ['h-gk', 31, 48],
      ['h-lcb', 45, 32],
      ['h-rcb', 51, 64],
      ['h-r8', 64, 63],
      ['h-rw', 77, 80],
      ['h-six', 51, 49],
      ['a-st', 43, 42],
      ['a-l8', 61, 55],
    ]),
    reads: [
      read(
        'h-gk',
        'Attacking',
        'The striker’s run blocks the left centre-back and the six. The right centre-back is outside that curve.',
        n(
          'Pass to the right centre-back',
          'The opposite-side pass takes the first press out of the move.',
          [['h-rcb', 55, 66]],
          [['a-st', 45, 45]],
        ),
        l(
          'Find the six through the centre',
          'The striker changes direction into that pass.',
          [['a-st', 50, 49]],
        ),
        k(
          'Carry left and wait for support',
          'The keeper keeps possession while the press reorganises.',
          [['h-gk', 34, 36]],
        ),
        l(
          'Drive directly towards the striker',
          'The centre-back reaches the long delivery first.',
          [['a-lcb', 85, 52]],
        ),
      ),
      read(
        'h-rcb',
        'Attacking',
        'The wide midfielder steps towards you. Our right eight has space beyond him, and the winger holds the full-back wide.',
        n(
          'Find the eight and release the winger',
          'The eight’s carrying touch commits the midfielder before the wide pass.',
          [
            ['h-r8', 70, 62],
            ['h-r8', 78, 66],
            ['h-rw', 85, 78],
          ],
          [['a-l8', 72, 57]],
        ),
        l(
          'Pass straight into the winger',
          'The wide midfielder has the direct passing lane covered.',
          [['a-l8', 71, 76]],
        ),
        k(
          'Return to the keeper',
          'The first press recovers before another forward pass.',
          [['h-gk', 35, 51]],
        ),
        l(
          'Carry towards the centre circle',
          'The striker and midfielder converge on the next touch.',
          [
            ['h-rcb', 64, 55],
            ['a-st', 64, 55],
          ],
        ),
      ),
      read(
        'h-rw',
        'Attacking',
        'The full-back is outside you. A diagonal touch can take you inside him before the centre-back moves across.',
        g(
          'Take the diagonal and shoot across goal',
          'The first touch goes inside the full-back and the shot beats the keeper across.',
          [
            ['h-rw', 88, 66],
            ['h-rw', 91, 58],
          ],
          [['a-gk', 95, 61]],
          43,
        ),
        l(
          'Run towards the corner flag',
          'The full-back can stay between you and the box.',
          [
            ['h-rw', 91, 88],
            ['a-lb', 91, 88],
          ],
        ),
        k(
          'Return it to the right eight',
          'We retain the ball while the defence comes across.',
          [['h-r8', 81, 68]],
        ),
        l(
          'Square it on the first touch',
          'The centre-back is facing the first-time passing lane.',
          [['a-lcb', 88, 65]],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-right-reverse',
    tier: 1,
    name: 'A reverse pass at the byline',
    intro:
      'The winger draws the full-back while our right-back arrives behind the ball.',
    owner: 'h-rw',
    placements: attacking([
      ['h-rw', 80, 86],
      ['h-rb', 73, 79],
      ['h-r8', 76, 65],
      ['h-st', 82, 47],
      ['a-lb', 84, 82],
      ['a-l8', 77, 72],
    ]),
    reads: [
      read(
        'h-rw',
        'Attacking',
        'The full-back braces for your infield touch. The right-back can arrive outside from behind the ball.',
        n(
          'Reverse the ball into the overlap',
          'The disguise turns the full-back away from the arriving runner.',
          [
            ['h-rw', 83, 80],
            ['h-rb', 86, 89],
          ],
          [['a-lb', 85, 77]],
        ),
        l(
          'Cut towards the right eight',
          'The wide midfielder closes the infield touch.',
          [
            ['h-rw', 82, 74],
            ['a-l8', 82, 74],
          ],
        ),
        k(
          'Set it back to the right eight',
          'The return holds possession but stops the overlap.',
          [['h-r8', 78, 66]],
        ),
        l(
          'Cross towards the far winger',
          'The far centre-back gets underneath the floating delivery.',
          [['a-rcb', 90, 34]],
        ),
      ),
      read(
        'h-rb',
        'Attacking',
        'The centre-back runs towards the near post. The striker has checked back into the gap behind that run.',
        n(
          'Cut back to the checking striker',
          'The backward pass passes behind the near-post defender.',
          [
            ['h-rb', 90, 85],
            ['h-st', 84, 51],
          ],
          [['a-lcb', 92, 67]],
        ),
        l(
          'Pass across the six-yard area',
          'The keeper intercepts the ball in front of the striker.',
          [['a-gk', 94, 62]],
        ),
        k(
          'Return along the touchline',
          'We keep it wide while the centre-back turns back.',
          [['h-rw', 85, 83]],
        ),
        l(
          'Carry past the byline defender',
          'The full-back recovers against your outside touch.',
          [
            ['h-rb', 93, 90],
            ['a-lb', 93, 90],
          ],
        ),
      ),
      read(
        'h-st',
        'Attacking',
        'You receive facing goal. The keeper and near centre-back are still travelling towards the winger’s side.',
        g(
          'Meet the cutback across their movement',
          'The finish goes into the side they have just left.',
          [['h-st', 88, 49]],
          [['a-gk', 96, 62]],
          42,
        ),
        l(
          'Turn towards the near post',
          'The recovering centre-back meets the turning touch.',
          [
            ['h-st', 89, 61],
            ['a-lcb', 89, 61],
          ],
        ),
        k(
          'Lay it off outside the box',
          'The ball stays ours but the keeper can reset.',
          [['h-r8', 82, 65]],
        ),
        l(
          'Lift the finish through the middle',
          'The keeper can gather the central ball.',
          [['a-gk', 97, 51]],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-toe-square',
    tier: 1,
    name: 'A short touch makes the square pass',
    intro:
      'The left winger has a full-back close enough to block the obvious inside pass.',
    owner: 'h-lw',
    placements: attacking([
      ['h-lw', 79, 15],
      ['h-six', 72, 43],
      ['h-r8', 76, 63],
      ['h-st', 83, 49],
      ['a-rb', 82, 20],
      ['a-r8', 78, 32],
      ['a-six', 76, 51],
    ]),
    reads: [
      read(
        'h-lw',
        'Attacking',
        'The full-back’s front foot is across the infield lane. A short outside touch can shift that foot before a square pass.',
        n(
          'Touch outside, then square to the six',
          'The outside touch moves the blocker before the ball comes back inside.',
          [
            ['h-lw', 81, 10],
            ['h-six', 75, 41],
          ],
          [['a-rb', 83, 13]],
        ),
        l(
          'Pass inside from this touch',
          'The full-back keeps his front foot in the lane.',
          [['a-rb', 81, 22]],
        ),
        k(
          'Return to the left-back',
          'The ball stays outside the block without changing its shape.',
          [['h-lb', 69, 13]],
        ),
        l(
          'Take a long touch down the line',
          'The full-back reaches the long touch before you.',
          [
            ['h-lw', 87, 8],
            ['a-rb', 87, 8],
          ],
        ),
      ),
      read(
        'h-six',
        'Attacking',
        'The holding midfielder follows the square ball. Our right eight is beyond his far shoulder with the last line still deeper.',
        n(
          'Play beyond him into the right eight',
          'The pass uses the midfielder’s travelling momentum.',
          [['h-r8', 84, 60]],
          [['a-six', 77, 44]],
        ),
        l(
          'Carry straight towards the striker',
          'The midfielder is still able to tackle on that line.',
          [
            ['h-six', 81, 49],
            ['a-six', 81, 49],
          ],
        ),
        k(
          'Return it to the left winger',
          'The return allows the holding midfielder to face play again.',
          [['h-lw', 82, 14]],
        ),
        l(
          'Lift it into the striker',
          'The centre-back reads the straight aerial delivery.',
          [['a-lcb', 89, 50]],
        ),
      ),
      read(
        'h-r8',
        'Attacking',
        'The centre-back is moving to your right. The keeper is behind him, so a touch left opens the opposite shooting lane.',
        g(
          'Touch left and finish low',
          'The touch sends the centre-back the wrong way before the finish.',
          [
            ['h-r8', 87, 53],
            ['h-r8', 90, 50],
          ],
          [['a-gk', 96, 56]],
          42,
        ),
        l(
          'Shoot through the centre-back',
          'The defender’s body is on the shooting line.',
          [['a-lcb', 88, 59]],
        ),
        k(
          'Set the striker at the edge',
          'The set keeps possession but loses the open shooting lane.',
          [['h-st', 84, 47]],
        ),
        l(
          'Carry towards the right winger',
          'The full-back closes the next wide touch.',
          [
            ['h-r8', 88, 73],
            ['a-lb', 88, 73],
          ],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-low-delivery-set',
    tier: 1,
    name: 'A low delivery becomes a set',
    intro:
      'The right-back is high enough to deliver, but the striker has a centre-back on his back.',
    owner: 'h-rb',
    placements: attacking([
      ['h-rb', 79, 83],
      ['h-rw', 82, 92],
      ['h-st', 82, 55],
      ['h-l8', 77, 36],
      ['a-lb', 84, 88],
      ['a-lcb', 87, 57],
      ['a-six', 76, 46],
    ]),
    reads: [
      read(
        'h-rb',
        'Attacking',
        'The full-back follows the winger outside. The striker can meet a low pass in front of his marker.',
        n(
          'Deliver low into the striker’s feet',
          'The low delivery reaches the striker before the marker can step around.',
          [['h-st', 85, 57]],
          [['a-lcb', 88, 58]],
        ),
        l(
          'Lift it over the centre-back',
          'The centre-back has time to read the high delivery.',
          [['a-lcb', 90, 55]],
        ),
        k(
          'Set the ball to the right winger',
          'The ball stays wide while the box becomes compact.',
          [['h-rw', 83, 91]],
        ),
        l(
          'Dribble between winger and full-back',
          'The full-back can step in across that carrying line.',
          [
            ['h-rb', 86, 86],
            ['a-lb', 86, 86],
          ],
        ),
      ),
      read(
        'h-st',
        'Attacking',
        'The marker presses into your back. The left eight is arriving facing goal, to the side of the holding midfielder.',
        n(
          'Set diagonally to the left eight',
          'The diagonal set gives the arriving eight a facing touch.',
          [['h-l8', 84, 38]],
          [['a-six', 80, 48]],
        ),
        l(
          'Turn on the receiving touch',
          'The centre-back takes the ball as you expose it.',
          [
            ['h-st', 88, 52],
            ['a-lcb', 88, 52],
          ],
        ),
        k(
          'Return the delivery to the right-back',
          'The return lets the defender release his close marking.',
          [['h-rb', 83, 81]],
        ),
        l(
          'Hook it towards the left winger',
          'The far full-back reaches the hooked ball.',
          [['a-rb', 87, 20]],
        ),
      ),
      read(
        'h-l8',
        'Attacking',
        'The holding midfielder is recovering from your right. One touch forwards keeps the ball out of his tackling foot.',
        g(
          'Take the forward touch and finish',
          'The touch stays ahead of the recovering midfielder and the shot finds the far side.',
          [
            ['h-l8', 87, 35],
            ['h-l8', 90, 39],
          ],
          [['a-gk', 95, 45]],
          59,
        ),
        l(
          'Move across the midfielder',
          'The recovering midfielder reaches your sideways touch.',
          [
            ['h-l8', 86, 47],
            ['a-six', 86, 47],
          ],
        ),
        k(
          'Return it to the striker',
          'The close marker can recover before another set.',
          [['h-st', 86, 54]],
        ),
        l(
          'Shoot while opening your body',
          'The midfielder blocks before your body finishes turning.',
          [['a-six', 86, 41]],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-left-overlap-return',
    tier: 1,
    name: 'The winger follows the overlap',
    intro:
      'The left-back arrives outside a winger whose defender is facing infield.',
    owner: 'h-lw',
    placements: attacking([
      ['h-lw', 75, 22],
      ['h-lb', 70, 10],
      ['h-l8', 72, 37],
      ['h-st', 83, 50],
      ['a-rb', 81, 25],
      ['a-r8', 73, 32],
    ]),
    reads: [
      read(
        'h-lw',
        'Attacking',
        'The full-back narrows to protect the inside. Our left-back can reach the outside lane from below him.',
        n(
          'Roll the ball into the overlap',
          'The outside pass pulls the full-back out of the inside lane.',
          [['h-lb', 82, 9]],
          [
            ['h-lw', 81, 25],
            ['a-rb', 84, 17],
          ],
        ),
        l(
          'Carry into the left eight’s lane',
          'The wide midfielder and full-back close the inside touch.',
          [
            ['h-lw', 80, 32],
            ['a-r8', 80, 32],
          ],
        ),
        k(
          'Set the left eight behind you',
          'We retain possession but the overlap must stop.',
          [['h-l8', 74, 35]],
        ),
        l(
          'Cross from the current position',
          'The centre-back can step ahead of the striker.',
          [['a-rcb', 87, 46]],
        ),
      ),
      read(
        'h-lb',
        'Attacking',
        'The full-back runs out towards you. The winger has stopped inside him rather than continuing towards the byline.',
        n(
          'Pass inside to the stopped winger',
          'The return passes behind the full-back’s outward run.',
          [
            ['h-lb', 85, 14],
            ['h-lw', 84, 28],
          ],
          [['a-rb', 87, 12]],
        ),
        l(
          'Take the ball towards the corner',
          'The full-back’s run meets that next touch.',
          [
            ['h-lb', 90, 7],
            ['a-rb', 90, 7],
          ],
        ),
        k(
          'Return it along the touchline',
          'The defence has time to turn back towards the box.',
          [['h-l8', 78, 20]],
        ),
        l(
          'Drive across the front of goal',
          'The keeper claims the ball before it crosses the box.',
          [['a-gk', 94, 39]],
        ),
      ),
      read(
        'h-lw',
        'Attacking',
        'The near centre-back stays with the striker. Your inside foot can take the ball towards a shooting lane outside him.',
        g(
          'Turn infield and finish across the keeper',
          'The turn stays outside the centre-back before the shot crosses goal.',
          [
            ['h-lw', 88, 34],
            ['h-lw', 91, 39],
          ],
          [['a-gk', 96, 42]],
          57,
        ),
        l(
          'Play into the marked striker',
          'The centre-back steps through the striker’s receiving touch.',
          [['a-rcb', 86, 48]],
        ),
        k(
          'Set back to the left eight',
          'Possession remains ours but the full-back recovers inside.',
          [['h-l8', 81, 33]],
        ),
        l('Shoot towards the near post', 'The keeper has that angle covered.', [
          ['a-gk', 97, 40],
        ]),
      ),
    ],
  },
  {
    id: 'lg2-i-back-post-check',
    tier: 1,
    name: 'The far-post runner checks back',
    intro:
      'The right eight has the ball and the striker is changing direction across the centre-backs.',
    owner: 'h-r8',
    placements: attacking([
      ['h-r8', 80, 69],
      ['h-rw', 82, 88],
      ['h-st', 84, 58],
      ['h-lw', 79, 29],
      ['a-lcb', 88, 65],
      ['a-rcb', 88, 41],
      ['a-six', 75, 56],
    ]),
    reads: [
      read(
        'h-r8',
        'Attacking',
        'The near centre-back watches the winger. The striker has stopped his far-post run to offer a shorter pass.',
        n(
          'Find the striker on the check',
          'The checked run creates a receiver in front of the last line.',
          [['h-st', 83, 57]],
          [['a-lcb', 90, 69]],
        ),
        l(
          'Clip towards the far post',
          'The far centre-back stays underneath that flight.',
          [['a-rcb', 91, 38]],
        ),
        k(
          'Move the ball to the right winger',
          'The defence can keep the move outside.',
          [['h-rw', 84, 87]],
        ),
        l(
          'Carry between the striker and centre-back',
          'The holding midfielder closes from behind.',
          [
            ['h-r8', 85, 61],
            ['a-six', 85, 61],
          ],
        ),
      ),
      read(
        'h-st',
        'Attacking',
        'The near centre-back turns back towards you. The left winger has stayed below the far defender and is entering the space between them.',
        n(
          'Turn and release the left winger',
          'The turn changes the delivery angle before the centre-back closes.',
          [
            ['h-st', 85, 52],
            ['h-lw', 86, 36],
          ],
          [['a-lcb', 88, 57]],
        ),
        l(
          'Spin towards the near post',
          'The returning centre-back catches the near-side touch.',
          [
            ['h-st', 88, 65],
            ['a-lcb', 88, 65],
          ],
        ),
        k(
          'Lay it back to the right eight',
          'The reset gives both centre-backs time to recover.',
          [['h-r8', 82, 67]],
        ),
        l(
          'Pass through the holding midfielder',
          'The midfielder reads the central lay-off.',
          [['a-six', 80, 51]],
        ),
      ),
      read(
        'h-lw',
        'Attacking',
        'You reach the ball between the defenders. The keeper stays central, and the far defender is arriving from your left.',
        g(
          'Finish before the defender arrives',
          'The early side-foot finish reaches the opposite corner.',
          [['h-lw', 90, 41]],
          [['a-gk', 96, 49]],
          57,
        ),
        l(
          'Take a touch towards the left flank',
          'The far defender meets that outside touch.',
          [
            ['h-lw', 91, 29],
            ['a-rcb', 91, 29],
          ],
        ),
        k(
          'Set it to the striker',
          'The set keeps the ball but lets the defenders gather.',
          [['h-st', 86, 52]],
        ),
        l(
          'Drive the finish through the centre',
          'The keeper gathers the central shot.',
          [['a-gk', 98, 49]],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-six-second-run',
    tier: 1,
    name: 'The six makes the second run',
    intro:
      'A midfielder presses our six while the striker offers a central wall pass.',
    owner: 'h-six',
    placements: attacking([
      ['h-six', 66, 56],
      ['h-st', 79, 49],
      ['h-r8', 73, 70],
      ['h-l8', 73, 32],
      ['a-six', 74, 52],
      ['a-r8', 68, 47],
    ]),
    reads: [
      read(
        'h-six',
        'Attacking',
        'The midfielder reaches towards your square passing lane. A forward carry can make him chase before the striker receives.',
        n(
          'Carry past the reach, then find the striker',
          'The carry moves the presser behind the forward pass.',
          [
            ['h-six', 73, 55],
            ['h-st', 81, 48],
          ],
          [['a-r8', 70, 50]],
        ),
        l(
          'Square it to the left eight',
          'The reaching midfielder intercepts the square ball.',
          [['a-r8', 72, 39]],
        ),
        k(
          'Return to the centre-back',
          'The press relaxes into its original shape.',
          [['h-rcb', 59, 61]],
        ),
        l(
          'Carry into the holding midfielder',
          'The second midfielder meets your forward touch.',
          [
            ['h-six', 77, 51],
            ['a-six', 77, 51],
          ],
        ),
      ),
      read(
        'h-st',
        'Attacking',
        'The holding midfielder follows the striker’s receiving touch. Our six continues behind him towards the left of the box.',
        n(
          'Set the six into the second run',
          'The lay-off reaches the space behind the midfielder’s approach.',
          [['h-six', 84, 44]],
          [['a-six', 80, 50]],
        ),
        l(
          'Turn through the holding midfielder',
          'The midfielder can tackle on your turning side.',
          [
            ['h-st', 84, 52],
            ['a-six', 84, 52],
          ],
        ),
        k(
          'Return it to the right eight',
          'The second run ends while the ball remains ours.',
          [['h-r8', 77, 66]],
        ),
        l(
          'Lift it behind the near centre-back',
          'The centre-back reads the lofted pass.',
          [['a-rcb', 91, 41]],
        ),
      ),
      read(
        'h-six',
        'Attacking',
        'The keeper is central and the nearest centre-back is moving out to you. A touch to your left opens a low shooting lane.',
        g(
          'Move left and finish across goal',
          'The touch avoids the approaching defender and opens the far corner.',
          [
            ['h-six', 87, 38],
            ['h-six', 90, 40],
          ],
          [['a-gk', 96, 46]],
          58,
        ),
        l(
          'Shoot through the approaching defender',
          'The centre-back blocks from his set position.',
          [['a-rcb', 88, 43]],
        ),
        k(
          'Lay the ball back to the striker',
          'The return keeps possession after the shooting lane closes.',
          [['h-st', 83, 49]],
        ),
        l(
          'Carry towards the penalty spot',
          'The other centre-back closes the central touch.',
          [
            ['h-six', 90, 49],
            ['a-lcb', 90, 49],
          ],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-eight-shield-release',
    tier: 1,
    name: 'The shield opens the outside lane',
    intro:
      'The left eight receives near the box with a midfielder leaning into his back.',
    owner: 'h-l8',
    placements: attacking([
      ['h-l8', 80, 32],
      ['h-lb', 76, 12],
      ['h-lw', 83, 19],
      ['h-st', 82, 51],
      ['a-r8', 77, 33],
      ['a-rb', 84, 23],
    ]),
    reads: [
      read(
        'h-l8',
        'Attacking',
        'The midfielder presses from behind. Our left-back is outside the full-back, who is watching the winger.',
        n(
          'Shield and release the left-back',
          'Your body protects the short touch before the outside pass.',
          [
            ['h-l8', 82, 29],
            ['h-lb', 84, 11],
          ],
          [['a-r8', 79, 32]],
        ),
        l(
          'Spin through the pressing midfielder',
          'The midfielder follows the exposed turning touch.',
          [
            ['h-l8', 81, 38],
            ['a-r8', 81, 38],
          ],
        ),
        k(
          'Set the ball back to the six',
          'The ball stays ours but the outside runner has to stop.',
          [['h-six', 73, 47]],
        ),
        l(
          'Lift it into the striker',
          'The centre-back gets in front of the aerial ball.',
          [['a-rcb', 88, 47]],
        ),
      ),
      read(
        'h-lb',
        'Attacking',
        'The full-back turns out towards you. The eight can step away from his marker into the space just inside that turn.',
        n(
          'Return inside to the eight',
          'The inside return uses the gap behind the full-back’s turn.',
          [['h-l8', 86, 32]],
          [['a-rb', 87, 16]],
        ),
        l(
          'Take the ball down the line',
          'The full-back reaches the line-side touch.',
          [
            ['h-lb', 90, 9],
            ['a-rb', 90, 9],
          ],
        ),
        k(
          'Pass back down the flank',
          'The defence has time to restore its distances.',
          [['h-lw', 82, 18]],
        ),
        l(
          'Cross beyond the striker',
          'The far centre-back controls the hanging cross.',
          [['a-lcb', 91, 60]],
        ),
      ),
      read(
        'h-l8',
        'Attacking',
        'The nearest defender is outside you. The striker occupies the central defender, leaving a diagonal route towards goal.',
        g(
          'Carry diagonally and finish',
          'The diagonal carry stays away from both occupied defenders.',
          [
            ['h-l8', 89, 37],
            ['h-l8', 92, 42],
          ],
          [['a-gk', 96, 45]],
          58,
        ),
        l(
          'Play across the striker’s marker',
          'The central defender intercepts the square pass.',
          [['a-rcb', 87, 49]],
        ),
        k(
          'Set the ball to the left winger',
          'The defence comes back inside while we retain it.',
          [['h-lw', 85, 20]],
        ),
        l(
          'Shoot from the narrow side',
          'The keeper covers the near-side angle.',
          [['a-gk', 97, 39]],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-centre-back-late-carry',
    tier: 1,
    name: 'The late carry changes the press',
    intro:
      'The right centre-back can carry while their forwards concentrate on midfield receivers.',
    owner: 'h-rcb',
    placements: attacking([
      ['h-rcb', 57, 63],
      ['h-r8', 69, 68],
      ['h-rw', 78, 85],
      ['h-st', 82, 57],
      ['a-st', 61, 50],
      ['a-l8', 71, 64],
      ['a-six', 74, 48],
    ]),
    reads: [
      read(
        'h-rcb',
        'Attacking',
        'The striker screens the six. Their wide midfielder is marking the eight rather than stepping towards you.',
        n(
          'Carry until the wide midfielder steps',
          'The carry obliges the marker to leave the eight.',
          [['h-rcb', 67, 65]],
          [['a-l8', 71, 67]],
        ),
        l(
          'Pass through the striker to the six',
          'The striker reaches the screened pass.',
          [['a-st', 63, 50]],
        ),
        k(
          'Move it across the back line',
          'The ball is secure but the midfield markers stay in place.',
          [['h-lcb', 57, 35]],
        ),
        l(
          'Send a diagonal towards the left winger',
          'The full-back has time to attack the aerial ball.',
          [['a-rb', 85, 19]],
        ),
      ),
      read(
        'h-rcb',
        'Attacking',
        'The wide midfielder now faces you. The eight can receive behind his shoulder and carry towards the striker.',
        n(
          'Find the eight for the striker’s check',
          'The eight carries beyond the presser before feeding the checking striker.',
          [
            ['h-r8', 75, 70],
            ['h-r8', 80, 67],
            ['h-st', 85, 57],
          ],
          [['a-l8', 72, 64]],
        ),
        l(
          'Continue through the midfielder',
          'The midfielder is now facing your next touch.',
          [
            ['h-rcb', 73, 66],
            ['a-l8', 73, 66],
          ],
        ),
        k(
          'Set the right-back behind you',
          'The return allows the midfielder to recover his mark.',
          [['h-rb', 66, 86]],
        ),
        l(
          'Pass directly into the striker',
          'The holding midfielder intercepts the direct lane.',
          [['a-six', 77, 54]],
        ),
      ),
      read(
        'h-st',
        'Attacking',
        'The near centre-back approaches from your right. The keeper watches that side, leaving a touch-and-shot route to your left.',
        g(
          'Turn left and finish across goal',
          'The first touch escapes the approach and the finish reaches the far corner.',
          [
            ['h-st', 88, 49],
            ['h-st', 91, 46],
          ],
          [['a-gk', 96, 56]],
          42,
        ),
        l(
          'Turn towards the arriving defender',
          'The defender wins the ball on that side.',
          [
            ['h-st', 88, 63],
            ['a-lcb', 88, 63],
          ],
        ),
        k(
          'Set the eight outside the box',
          'The set retains possession while the keeper resets.',
          [['h-r8', 82, 65]],
        ),
        l(
          'Shoot through the defender’s legs',
          'The defender closes the shooting gap.',
          [['a-lcb', 88, 58]],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-winger-central-run',
    tier: 1,
    name: 'A winger arrives through the centre',
    intro:
      'The striker can bounce the ball away from the last line while the right winger leaves the flank.',
    owner: 'h-st',
    placements: attacking([
      ['h-st', 78, 51],
      ['h-six', 72, 44],
      ['h-rw', 77, 77],
      ['h-r8', 74, 63],
      ['a-six', 75, 57],
      ['a-lb', 84, 86],
      ['a-rcb', 88, 38],
    ]),
    reads: [
      read(
        'h-st',
        'Attacking',
        'The centre-back steps out towards your back. Our six is facing play and the winger is beginning an inside run.',
        n(
          'Set the six and turn away',
          'The set gives the facing midfielder a view of the inside run.',
          [['h-six', 76, 43]],
          [
            ['h-rw', 81, 65],
            ['a-lcb', 85, 53],
          ],
        ),
        l(
          'Spin through the stepping centre-back',
          'The centre-back meets the ball during the spin.',
          [
            ['h-st', 82, 55],
            ['a-lcb', 82, 55],
          ],
        ),
        k(
          'Set the right eight behind the ball',
          'The sideways set lets the winger’s marker recover inside.',
          [['h-r8', 76, 64]],
        ),
        l(
          'Flick it straight towards the winger',
          'The holding midfielder stands in that passing lane.',
          [['a-six', 78, 62]],
        ),
      ),
      read(
        'h-six',
        'Attacking',
        'The stepping centre-back is outside the line. The winger is still below the deeper defender and can cross the gap from your right.',
        n(
          'Pass into the winger’s central run',
          'The central pass reaches the runner before the stepped defender recovers.',
          [['h-rw', 87, 49]],
          [['a-lcb', 85, 56]],
        ),
        l(
          'Return through the striker’s marker',
          'The centre-back reads the immediate return.',
          [['a-lcb', 81, 51]],
        ),
        k(
          'Switch towards the left winger',
          'The central opening closes while the ball travels wide.',
          [['h-lw', 81, 16]],
        ),
        l(
          'Carry into the penalty area',
          'The holding midfielder closes the carrying route.',
          [
            ['h-six', 82, 48],
            ['a-six', 82, 48],
          ],
        ),
      ),
      read(
        'h-rw',
        'Attacking',
        'You receive centrally with the keeper in front. The keeper sets slightly to your left as the ball comes across.',
        g(
          'Touch right and finish beside the keeper',
          'The touch shifts the ball outside the keeper’s set line.',
          [
            ['h-rw', 90, 55],
            ['h-rw', 93, 56],
          ],
          [['a-gk', 96, 47]],
          59,
        ),
        l(
          'Shoot back across your first touch',
          'The keeper’s set position covers the reversed shot.',
          [['a-gk', 97, 45]],
        ),
        k(
          'Lay it back to the striker',
          'The lay-off keeps the ball but the centre-backs return.',
          [['h-st', 83, 50]],
        ),
        l(
          'Carry towards the far centre-back',
          'The remaining centre-back reaches that touch.',
          [
            ['h-rw', 91, 38],
            ['a-rcb', 91, 38],
          ],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-left-side-foot-chain',
    tier: 1,
    name: 'Three side-foot contacts',
    intro:
      'The left winger can bring an eight and the striker into a compact passing triangle.',
    owner: 'h-lw',
    placements: attacking([
      ['h-lw', 81, 12],
      ['h-l8', 79, 33],
      ['h-st', 83, 46],
      ['a-rb', 85, 16],
      ['a-r8', 77, 37],
      ['a-rcb', 88, 44],
    ]),
    reads: [
      read(
        'h-lw',
        'Attacking',
        'The full-back expects a touch down the line. The eight is available just behind the wide midfielder.',
        n(
          'Touch inside and find the eight',
          'The infield touch changes the passing angle around the midfielder.',
          [
            ['h-lw', 83, 20],
            ['h-l8', 84, 34],
          ],
          [['a-rb', 86, 14]],
        ),
        l(
          'Push down the touchline',
          'The full-back meets that predictable line-side touch.',
          [
            ['h-lw', 88, 8],
            ['a-rb', 88, 8],
          ],
        ),
        k(
          'Return the ball to the left-back',
          'The triangle stays outside the compact block.',
          [['h-lb', 73, 13]],
        ),
        l(
          'Lift the ball across the box',
          'The far centre-back can read the high delivery.',
          [['a-lcb', 91, 61]],
        ),
      ),
      read(
        'h-l8',
        'Attacking',
        'The centre-back moves towards the ball. The striker is below the deeper centre-back and checks into the central space.',
        n(
          'Pass into the striker’s check',
          'The pass goes behind the centre-back’s outward step.',
          [['h-st', 86, 47]],
          [['a-rcb', 87, 36]],
        ),
        l(
          'Carry across the stepping centre-back',
          'The defender reaches your sideways touch.',
          [
            ['h-l8', 87, 39],
            ['a-rcb', 87, 39],
          ],
        ),
        k(
          'Return it to the winger',
          'The centre-back can turn back inside before the next pass.',
          [['h-lw', 85, 19]],
        ),
        l(
          'Shoot around the wide midfielder',
          'The midfielder blocks as your body opens.',
          [['a-r8', 86, 35]],
        ),
      ),
      read(
        'h-st',
        'Attacking',
        'The striker’s receiving touch puts the keeper slightly off-centre. The far centre-back is closing from your right.',
        g(
          'Take one touch left and side-foot',
          'The touch separates the finish from the closing defender.',
          [
            ['h-st', 90, 42],
            ['h-st', 93, 44],
          ],
          [['a-gk', 96, 52]],
          41,
        ),
        l(
          'Turn into the far centre-back',
          'The closing defender reaches the right-side touch.',
          [
            ['h-st', 90, 58],
            ['a-lcb', 90, 58],
          ],
        ),
        k(
          'Set the eight at the edge',
          'The set preserves the ball while the keeper resets.',
          [['h-l8', 84, 35]],
        ),
        l(
          'Shoot through the middle',
          'The keeper gathers the shot on his set line.',
          [['a-gk', 98, 50]],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-counter-second-wave',
    tier: 1,
    name: 'The second wave of the counter',
    intro:
      'Our striker holds a transition ball while the right winger and eight run at different depths.',
    owner: 'h-st',
    placements: attacking([
      ['h-st', 55, 49],
      ['h-rw', 66, 79],
      ['h-r8', 62, 65],
      ['h-six', 49, 52],
      ['a-six', 60, 47],
      ['a-l8', 63, 71],
      ['a-lb', 82, 87],
      ['a-lcb', 88, 64],
    ]),
    reads: [
      read(
        'h-st',
        'Attacking',
        'The holding midfielder approaches your left. The winger can receive beyond the wide midfielder without crossing the last line.',
        n(
          'Release the winger and follow centrally',
          'The wide pass makes the recovering midfielder turn towards his own goal.',
          [['h-rw', 74, 77]],
          [
            ['h-r8', 72, 64],
            ['a-l8', 67, 73],
          ],
        ),
        l(
          'Carry into the holding midfielder',
          'The midfielder meets your forward touch.',
          [
            ['h-st', 62, 48],
            ['a-six', 62, 48],
          ],
        ),
        k(
          'Return it to the six',
          'The reset lets the rival midfield recover.',
          [['h-six', 53, 51]],
        ),
        l(
          'Lift a central ball behind the line',
          'The centre-back drops under the long delivery.',
          [['a-lcb', 91, 56]],
        ),
      ),
      read(
        'h-rw',
        'Attacking',
        'The full-back holds the outside run. The right eight arrives inside the recovering midfielder, with space to receive facing goal.',
        n(
          'Carry, then set the arriving eight',
          'The carrying touch fixes the full-back before the inside set.',
          [
            ['h-rw', 81, 80],
            ['h-r8', 83, 63],
          ],
          [['a-lb', 85, 81]],
        ),
        l(
          'Run through the full-back’s outside',
          'The full-back reaches the ball before the byline.',
          [
            ['h-rw', 86, 90],
            ['a-lb', 86, 90],
          ],
        ),
        k(
          'Set it back to the striker',
          'The second wave has to stop while the defence gathers.',
          [['h-st', 73, 50]],
        ),
        l(
          'Cross before the eight arrives',
          'The near centre-back cuts out the early delivery.',
          [['a-lcb', 87, 59]],
        ),
      ),
      read(
        'h-r8',
        'Attacking',
        'The centre-back is coming across from the centre. A forward-left touch can reach the shooting lane before he turns.',
        g(
          'Touch across his path and finish',
          'The touch reaches the lane ahead of the moving centre-back.',
          [
            ['h-r8', 87, 54],
            ['h-r8', 90, 50],
          ],
          [['a-gk', 95, 60]],
          42,
        ),
        l(
          'Shoot towards the near side',
          'The centre-back blocks while covering that side.',
          [['a-lcb', 87, 63]],
        ),
        k(
          'Return to the winger',
          'The reset retains the ball against a recovered back line.',
          [['h-rw', 84, 79]],
        ),
        l(
          'Carry towards the right touchline',
          'The recovering full-back meets the wider touch.',
          [
            ['h-r8', 88, 77],
            ['a-lb', 88, 77],
          ],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-central-give-go',
    tier: 1,
    name: 'The midfielder follows his pass',
    intro:
      'The left eight and six can exchange in front of a midfielder who is watching the ball.',
    owner: 'h-l8',
    placements: attacking([
      ['h-l8', 72, 39],
      ['h-six', 70, 54],
      ['h-st', 83, 49],
      ['h-r8', 78, 69],
      ['a-r8', 75, 34],
      ['a-six', 76, 48],
    ]),
    reads: [
      read(
        'h-l8',
        'Attacking',
        'The holding midfielder faces your carrying foot. Our six offers a square pass on his other side.',
        n(
          'Set the six and run across the midfielder',
          'The square pass turns the midfielder while your run leaves his sight.',
          [['h-six', 75, 55]],
          [
            ['h-l8', 80, 40],
            ['a-six', 77, 53],
          ],
        ),
        l(
          'Carry directly towards the striker',
          'The holding midfielder can tackle facing forwards.',
          [
            ['h-l8', 78, 45],
            ['a-six', 78, 45],
          ],
        ),
        k(
          'Move the ball towards the left-back',
          'The midfield pair recover before a forward pass.',
          [['h-lb', 72, 15]],
        ),
        l(
          'Lift it into the striker',
          'The centre-back reaches the straight aerial delivery.',
          [['a-rcb', 89, 48]],
        ),
      ),
      read(
        'h-six',
        'Attacking',
        'The midfielder follows the square ball. The eight is now beyond him but still below the two centre-backs.',
        n(
          'Return to the eight beyond the midfielder',
          'The return reaches the runner before the midfielder can turn.',
          [['h-l8', 86, 39]],
          [['a-six', 79, 51]],
        ),
        l(
          'Carry past the turning midfielder',
          'The midfielder’s tackling foot reaches the carry.',
          [
            ['h-six', 81, 52],
            ['a-six', 81, 52],
          ],
        ),
        k(
          'Move it across to the right eight',
          'We retain possession after the central run slows.',
          [['h-r8', 80, 65]],
        ),
        l(
          'Pass into the striker’s marker',
          'The centre-back gets in front of the central pass.',
          [['a-rcb', 87, 47]],
        ),
      ),
      read(
        'h-l8',
        'Attacking',
        'The nearest centre-back steps towards your left side. Your right foot can take a touch towards the middle without entering his approach.',
        g(
          'Touch right and finish low',
          'The touch opens a shooting lane on the far side of the approaching defender.',
          [
            ['h-l8', 89, 45],
            ['h-l8', 92, 47],
          ],
          [['a-gk', 96, 41]],
          59,
        ),
        l(
          'Shoot towards the near defender',
          'The centre-back blocks the direct shooting line.',
          [['a-rcb', 89, 40]],
        ),
        k(
          'Set back to the six',
          'The ball remains ours but the runner loses the shooting window.',
          [['h-six', 80, 51]],
        ),
        l(
          'Carry towards the left flank',
          'The full-back reaches the outside touch.',
          [
            ['h-l8', 91, 26],
            ['a-rb', 91, 26],
          ],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-corner-second-phase',
    tier: 1,
    name: 'The corner’s second phase',
    intro:
      'A cleared corner reaches our left-back outside the box; every new pass is now ordinary open play.',
    owner: 'h-lb',
    placements: attacking([
      ['h-lb', 74, 14],
      ['h-l8', 80, 27],
      ['h-st', 83, 43],
      ['h-rcb', 83, 58],
      ['h-lw', 82, 7],
      ['a-rb', 84, 18],
      ['a-r8', 77, 30],
      ['a-rcb', 89, 41],
      ['a-lcb', 89, 62],
    ]),
    reads: [
      read(
        'h-lb',
        'Attacking',
        'The wide midfielder runs out towards you. The eight can receive behind that run, below the recovering last line.',
        n(
          'Find the eight behind the runner',
          'The pass uses the space behind the outward press.',
          [['h-l8', 85, 26]],
          [['a-r8', 79, 20]],
        ),
        l(
          'Cross back into the crowded centre',
          'The centre-back gets to the recycled aerial delivery.',
          [['a-rcb', 91, 45]],
        ),
        k(
          'Return it towards halfway',
          'The corner’s second-phase opening ends while we retain it.',
          [['h-lcb', 63, 33]],
        ),
        l(
          'Carry past the pressing midfielder',
          'The midfielder reaches the next line-side touch.',
          [
            ['h-lb', 80, 10],
            ['a-r8', 80, 10],
          ],
        ),
      ),
      read(
        'h-l8',
        'Attacking',
        'The full-back is moving towards you from inside. A touch towards the byline changes the cross angle, while our centre-back stays below the last line.',
        n(
          'Touch towards the byline before delivering',
          'The touch separates the cross angle from the closing full-back.',
          [['h-l8', 87, 20]],
          [
            ['a-rb', 88, 25],
            ['h-rcb', 85, 57],
          ],
        ),
        l(
          'Lift it towards the far post',
          'The far centre-back is set beneath that ball.',
          [['a-lcb', 92, 65]],
        ),
        k(
          'Return to the left-back',
          'The defenders can step out together while we reset.',
          [['h-lb', 79, 15]],
        ),
        l(
          'Carry into the near centre-back',
          'The centre-back meets the touch towards the box.',
          [
            ['h-l8', 88, 36],
            ['a-rcb', 88, 36],
          ],
        ),
      ),
      read(
        'h-l8',
        'Attacking',
        'The keeper guards the near post. Our centre-back is still below both defenders and can run into the central space behind the striker’s near-post movement.',
        g(
          'Cross for the centre-back’s delayed header',
          'The centre-back starts below the line and heads back across the keeper.',
          [['h-rcb', 90, 54]],
          [
            ['h-st', 88, 38],
            ['a-gk', 96, 42],
          ],
          58,
        ),
        l(
          'Drive the ball along the near-post lane',
          'The near defender clears that delivery in front of the striker.',
          [['a-rcb', 91, 36]],
        ),
        k(
          'Set the ball back to the left-back',
          'The reset keeps possession but ends the delayed aerial run.',
          [['h-lb', 81, 15]],
        ),
        l(
          'Lift the delivery towards the keeper',
          'The keeper claims the ball above the central crowd.',
          [['a-gk', 94, 48]],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-keeper-step-chip',
    tier: 1,
    rare: true,
    name: 'The keeper steps into the lane',
    intro:
      'A left winger and striker exchange while the keeper takes a visibly advanced position.',
    owner: 'h-lw',
    placements: attacking([
      ['h-lw', 81, 27],
      ['h-st', 82, 45],
      ['h-l8', 75, 36],
      ['a-rb', 84, 23],
      ['a-rcb', 88, 42],
      ['a-lcb', 88, 62],
      ['a-gk', 90, 48],
    ]),
    reads: [
      read(
        'h-lw',
        'Attacking',
        'The full-back approaches your outside shoulder. The striker can receive centrally, with a centre-back following his check.',
        n(
          'Carry inside and find the striker',
          'The inward touch draws the full-back before the short central pass.',
          [
            ['h-lw', 84, 33],
            ['h-st', 83, 45],
          ],
          [['a-rb', 85, 28]],
        ),
        l(
          'Push towards the outside shoulder',
          'The full-back reaches the wide touch.',
          [
            ['h-lw', 87, 20],
            ['a-rb', 87, 20],
          ],
        ),
        k(
          'Set back to the left eight',
          'The keeper can retreat as the attack pauses.',
          [['h-l8', 78, 37]],
        ),
        l(
          'Shoot from the present angle',
          'The centre-back blocks the line in front of the keeper.',
          [['a-rcb', 87, 38]],
        ),
      ),
      read(
        'h-st',
        'Attacking',
        'The centre-back has followed you. The winger can receive a return inside the full-back, and the keeper is advancing towards that lane.',
        n(
          'Return the winger through the inside gap',
          'The return frees the winger while the keeper steps forwards.',
          [['h-lw', 86, 36]],
          [
            ['a-rcb', 85, 45],
            ['a-gk', 89, 43],
          ],
        ),
        l(
          'Turn into the following centre-back',
          'The close marker takes the exposed turn.',
          [
            ['h-st', 87, 46],
            ['a-rcb', 87, 46],
          ],
        ),
        k(
          'Set the ball back to midfield',
          'The keeper returns towards his line while we keep it.',
          [['h-l8', 80, 35]],
        ),
        l(
          'Flick directly towards the far winger',
          'The holding midfielder reads the long flick.',
          [['a-six', 81, 58]],
        ),
      ),
      read(
        'h-lw',
        'Attacking',
        'The keeper is well off his line and moving towards your left. The ball is under your next touch with space above him.',
        g(
          'Lift the finish over the advancing keeper',
          'The measured chip clears the visible keeper and drops inside the goal.',
          [['h-lw', 88, 38]],
          [['a-gk', 90, 40]],
          55,
        ),
        l(
          'Finish low towards the near post',
          'The advancing keeper spreads across the low near-side shot.',
          [['a-gk', 91, 42]],
        ),
        k(
          'Turn back towards the left eight',
          'The chance closes as the keeper retreats.',
          [['h-l8', 83, 35]],
        ),
        l(
          'Take another touch around the keeper',
          'The keeper reaches the longer touch before you.',
          [
            ['h-lw', 93, 41],
            ['a-gk', 93, 41],
          ],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-thirty-five-yard-window',
    tier: 1,
    rare: true,
    name: 'A thirty-five-yard window',
    intro:
      'The keeper has left his line after a clearance and our midfield can change the shooting angle.',
    owner: 'h-six',
    placements: attacking([
      ['h-six', 61, 51],
      ['h-r8', 65, 60],
      ['h-st', 80, 45],
      ['h-rw', 76, 86],
      ['a-six', 70, 48],
      ['a-l8', 67, 68],
      ['a-gk', 86, 55],
      ['a-rcb', 87, 39],
      ['a-lcb', 87, 65],
    ]),
    reads: [
      read(
        'h-six',
        'Attacking',
        'The holding midfielder faces your shooting line. Our right eight can receive to the other side, while the keeper remains far off his line.',
        n(
          'Move the ball to the right eight',
          'The square pass changes the angle around the holding midfielder.',
          [['h-r8', 67, 58]],
          [['a-six', 70, 51]],
        ),
        l(
          'Shoot through the holding midfielder',
          'The midfielder blocks the current shooting lane.',
          [['a-six', 68, 50]],
        ),
        k(
          'Return the ball to the centre-back',
          'The keeper gets back towards goal while we reset.',
          [['h-rcb', 55, 63]],
        ),
        l(
          'Pass directly into the striker',
          'The holding midfielder intercepts the straight pass.',
          [['a-six', 72, 48]],
        ),
      ),
      read(
        'h-r8',
        'Attacking',
        'Both midfielders close towards your receiving side. A short inward carry changes the shooting lane; the keeper is still outside his usual position.',
        n(
          'Carry infield across the approaching foot',
          'The short carry creates a clear lane from about thirty-five yards.',
          [['h-r8', 69.5, 52]],
          [
            ['a-l8', 68, 62],
            ['a-six', 70, 60],
            ['a-gk', 87, 57],
          ],
        ),
        l(
          'Carry towards the wide midfielder',
          'The midfielder can tackle on that side.',
          [
            ['h-r8', 70, 65],
            ['a-l8', 70, 65],
          ],
        ),
        k(
          'Set it back to the six',
          'The keeper retreats while possession stays ours.',
          [['h-six', 65, 50]],
        ),
        l(
          'Lift it towards the striker',
          'The centre-back controls the hanging delivery.',
          [['a-rcb', 89, 43]],
        ),
      ),
      read(
        'h-r8',
        'Attacking',
        'At roughly thirty-five yards, the keeper is well off his line and right of centre. The inward carry has cleared the direct shooting lane.',
        g(
          'Drive the shot towards the uncovered side',
          'The long-range strike uses the visible keeper’s advanced, off-centre position.',
          [['h-r8', 69.5, 52]],
          [['a-gk', 89, 55]],
          42,
        ),
        l(
          'Shoot towards the keeper’s side',
          'The keeper can meet the ball on his current side.',
          [['a-gk', 90, 58]],
        ),
        k(
          'Find the right winger',
          'We keep it wide but the keeper can reach his line.',
          [['h-rw', 80, 84]],
        ),
        l(
          'Take another central carrying touch',
          'The recovering holding midfielder reaches the extra touch.',
          [
            ['h-r8', 74, 49],
            ['a-six', 74, 49],
          ],
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-shadow-to-flank',
    tier: 1,
    name: 'The six sends the attack sideways',
    intro:
      'Our six can remove the striker’s passing lane without chasing the ball carrier.',
    owner: 'a-l8',
    placements: defending([
      ['a-l8', 40, 38],
      ['a-st', 26, 47],
      ['a-rw', 31, 12],
      ['a-rb', 38, 9],
      ['h-six', 32, 46],
      ['h-lw', 34, 21],
      ['h-lb', 22, 15],
    ]),
    reads: [
      read(
        'h-six',
        'Defending',
        'The eight faces our striker’s side of the pitch. You can block that forward pass while the winger stays close enough to press a wide receiver.',
        n(
          'Curve between the eight and striker',
          'The screen makes the carrier move towards the flank.',
          [['a-l8', 34, 29]],
          [
            ['h-six', 30, 42],
            ['h-lw', 32, 18],
          ],
        ),
        x(
          'Press straight towards the ball',
          'The carrier finds the striker through the space behind your run.',
          [
            ['a-st', 21, 47],
            ['a-st', 13, 48],
          ],
          [],
          55,
        ),
        d(
          'Drop alongside the centre-backs',
          'The carrier keeps the ball outside our compact line.',
          [['a-l8', 37, 34]],
          [['h-six', 22, 47]],
        ),
        x(
          'Follow the striker into the box',
          'The carrier reaches the space you leave in front of goal.',
          [
            ['a-l8', 24, 40],
            ['a-l8', 15, 45],
          ],
          [],
          42,
        ),
      ),
      read(
        'h-lw',
        'Defending',
        'The eight has been pushed towards you. Their winger is the short outlet, with our left-back behind the press.',
        n(
          'Approach from the inside shoulder',
          'The inside approach sends the pass towards the touchline receiver.',
          [['a-rw', 28, 13]],
          [
            ['h-lw', 30, 18],
            ['h-lb', 22, 16],
          ],
        ),
        x(
          'Close from the touchline side',
          'The eight escapes inside and finds a central finish.',
          [
            ['a-l8', 26, 35],
            ['a-st', 20, 46],
            ['a-st', 13, 46],
          ],
          [],
          57,
        ),
        d(
          'Hold the wide midfielder’s position',
          'The rival eight recycles without entering the box.',
          [['a-rb', 38, 10]],
          [['h-lw', 33, 22]],
        ),
        x(
          'Track the striker’s next run',
          'The winger receives with room to bring the ball infield.',
          [
            ['a-rw', 25, 18],
            ['a-rw', 14, 37],
          ],
          [],
          43,
        ),
      ),
      read(
        'h-lw',
        'Defending',
        'The winger receives with his back to the touchline. His next touch comes infield, where you have support behind you.',
        r(
          'Meet the infield touch and protect it',
          'You reach the exposed touch with the left-back covering behind.',
          [
            ['a-rw', 27, 16],
            ['h-lw', 28, 17],
            ['h-six', 31, 39],
          ],
        ),
        x(
          'Run around his outside shoulder',
          'The winger turns inside your run and drives towards goal.',
          [
            ['a-rw', 23, 24],
            ['a-rw', 14, 40],
          ],
          [],
          55,
        ),
        d(
          'Stay between the winger and the box',
          'The winger turns back and resets the move.',
          [['a-rb', 35, 11]],
          [['h-lw', 27, 21]],
        ),
        x(
          'Step past him to block the return',
          'The winger keeps the ball and finds the striker inside.',
          [
            ['a-rw', 23, 22],
            ['a-st', 20, 46],
            ['a-st', 13, 47],
          ],
          [],
          43,
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-left-line-duel',
    tier: 1,
    name: 'A duel beside the left touchline',
    intro:
      'The left-back has cover inside and must choose the side of the winger’s next touch.',
    owner: 'a-rw',
    placements: defending([
      ['a-rw', 32, 11],
      ['a-r8', 34, 28],
      ['a-st', 25, 44],
      ['h-lb', 25, 16],
      ['h-lcb', 17, 38],
      ['h-lw', 37, 15],
      ['h-six', 28, 45],
    ]),
    reads: [
      read(
        'h-lb',
        'Defending',
        'The winger faces you with an inside midfielder available. The centre-back covers the inside lane but cannot reach the touchline.',
        n(
          'Close the inside and show the line',
          'The winger takes the route beside the touchline.',
          [['a-rw', 27, 7]],
          [['h-lb', 23, 12]],
        ),
        x(
          'Step towards the winger’s outside foot',
          'The winger cuts inside your approach and reaches the box.',
          [
            ['a-rw', 25, 24],
            ['a-rw', 15, 38],
          ],
          [],
          56,
        ),
        d(
          'Drop towards the near post',
          'The winger stops and recycles outside the box.',
          [['a-r8', 33, 28]],
          [['h-lb', 19, 22]],
        ),
        x(
          'Follow the midfielder’s run',
          'The winger keeps the ball and drives into the space you leave.',
          [
            ['a-rw', 23, 14],
            ['a-rw', 14, 36],
          ],
          [],
          43,
        ),
      ),
      read(
        'h-lb',
        'Defending',
        'The winger is beside the line. He slows to bring the ball inside, while your centre-back still protects the channel behind you.',
        n(
          'Match the pace without crossing your feet',
          'You remain balanced as the winger takes his first inside touch.',
          [['a-rw', 23, 10]],
          [['h-lb', 21, 14]],
        ),
        x(
          'Launch a tackle at the slowing touch',
          'The winger pulls it past the committed tackle.',
          [
            ['a-rw', 20, 17],
            ['a-rw', 12, 37],
          ],
          [],
          56,
        ),
        d(
          'Retreat to the centre-back’s line',
          'The winger has to turn away from the compact box.',
          [['a-r8', 30, 25]],
          [['h-lb', 17, 21]],
        ),
        x(
          'Turn to watch the striker',
          'The winger advances before you can face the ball again.',
          [
            ['a-rw', 18, 19],
            ['a-rw', 11, 39],
          ],
          [],
          42,
        ),
      ),
      read(
        'h-lb',
        'Defending',
        'The winger’s inside touch separates the ball from his foot. Your inside shoulder is level with it and the line blocks his other escape.',
        r(
          'Step across the separated touch',
          'You take the ball with your body between it and the winger.',
          [
            ['h-lb', 22, 11],
            ['h-lb', 25, 18],
          ],
        ),
        x(
          'Reach around the winger’s outside',
          'He shields that reach and carries towards the near post.',
          [
            ['a-rw', 18, 20],
            ['a-rw', 10, 38],
          ],
          [],
          56,
        ),
        d(
          'Keep the winger outside the box',
          'The winger rolls the ball backwards rather than reaching goal.',
          [['a-r8', 31, 28]],
          [['h-lb', 19, 19]],
        ),
        x(
          'Block the backward passing lane',
          'The winger turns forwards into the space behind the block.',
          [
            ['a-rw', 17, 21],
            ['a-rw', 10, 40],
          ],
          [],
          43,
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-right-overlap-handoff',
    tier: 1,
    name: 'Handing over the overlap',
    intro:
      'The right-back and winger must share two wide runners rather than follow the same one.',
    owner: 'a-lw',
    placements: defending([
      ['a-lw', 33, 86],
      ['a-lb', 38, 94],
      ['a-l8', 32, 66],
      ['h-rb', 23, 80],
      ['h-rw', 34, 82],
      ['h-rcb', 17, 60],
    ]),
    reads: [
      read(
        'h-rb',
        'Defending',
        'The winger carries towards you and the full-back begins an outside overlap. Our winger is close enough to take the overlapping runner.',
        n(
          'Hold the carrier and signal the overlap',
          'The carrier stays outside while our winger picks up the second runner.',
          [['a-lw', 28, 83]],
          [
            ['h-rb', 22, 79],
            ['h-rw', 32, 87],
            ['a-lb', 33, 95],
          ],
        ),
        x(
          'Follow the overlapping full-back',
          'The carrier comes inside the space you leave.',
          [
            ['a-lw', 23, 66],
            ['a-lw', 14, 56],
          ],
          [],
          43,
        ),
        d(
          'Drop beside the centre-back',
          'The carrier slows against our compact box and recycles.',
          [['a-l8', 34, 68]],
          [['h-rb', 18, 73]],
        ),
        x(
          'Press past the carrier',
          'The carrier rolls the ball inside and finds the striker.',
          [
            ['a-st', 22, 52],
            ['a-st', 13, 51],
          ],
          [],
          57,
        ),
      ),
      read(
        'h-rw',
        'Defending',
        'The full-back is outside you. Our right-back keeps the carrier in front, so the overlap’s pass can only arrive down the line.',
        n(
          'Stay inside the runner’s receiving lane',
          'You reach the line-side receiver from the inside as the pass arrives.',
          [['a-lb', 29, 93]],
          [
            ['h-rw', 30, 88],
            ['h-rb', 23, 83],
          ],
        ),
        x(
          'Join the right-back against the carrier',
          'The overlapping full-back receives untracked and squares into the box.',
          [
            ['a-lb', 24, 92],
            ['a-st', 21, 54],
            ['a-st', 13, 52],
          ],
          [],
          43,
        ),
        d(
          'Hold the edge of the box',
          'The rivals keep the ball wide and restart their move.',
          [['a-l8', 35, 70]],
          [['h-rw', 25, 75]],
        ),
        x(
          'Run outside the full-back',
          'The runner can receive inside you and drive towards goal.',
          [
            ['a-lb', 23, 84],
            ['a-lb', 14, 61],
          ],
          [],
          57,
        ),
      ),
      read(
        'h-rw',
        'Defending',
        'The full-back’s receiving touch points infield. You are on that side of him, with our right-back behind the duel.',
        r(
          'Meet the infield touch and set inside',
          'The touch runs into your covered side and the set ends the danger.',
          [
            ['a-lb', 28, 90],
            ['h-rw', 28, 89],
            ['h-r8', 34, 68],
          ],
        ),
        x(
          'Reach towards the touchline foot',
          'The full-back pulls the ball inside the reach and crosses.',
          [
            ['a-lb', 22, 81],
            ['a-st', 21, 51],
            ['a-st', 13, 50],
          ],
          [],
          42,
        ),
        d(
          'Keep both players outside',
          'The full-back returns the ball up the flank.',
          [['a-lw', 34, 84]],
          [['h-rw', 26, 85]],
        ),
        x(
          'Turn to follow the carrier’s next run',
          'The full-back keeps possession and enters the box.',
          [
            ['a-lb', 21, 82],
            ['a-lb', 12, 58],
          ],
          [],
          56,
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-false-nine-screen',
    tier: 1,
    name: 'The false nine leaves the last line',
    intro:
      'The left centre-back sees a striker checking into midfield with a runner beyond him.',
    owner: 'a-st',
    placements: defending([
      ['a-st', 29, 46],
      ['a-r8', 35, 32],
      ['a-rw', 32, 14],
      ['h-lcb', 18, 40],
      ['h-six', 28, 49],
      ['h-l8', 36, 37],
    ]),
    reads: [
      read(
        'h-lcb',
        'Defending',
        'The striker drops towards the six. A rival eight prepares a run through the channel you would leave by following.',
        n(
          'Hold the line and pass the striker to the six',
          'The striker receives short without opening the channel behind you.',
          [['a-st', 25, 43]],
          [
            ['h-lcb', 18, 41],
            ['h-six', 27, 46],
          ],
        ),
        x(
          'Follow the striker into midfield',
          'The eight runs through the vacated channel and finishes.',
          [
            ['a-r8', 22, 34],
            ['a-r8', 13, 41],
          ],
          [],
          57,
        ),
        d(
          'Drop towards the keeper',
          'The striker keeps possession outside a deeper defensive line.',
          [['a-st', 30, 46]],
          [['h-lcb', 13, 40]],
        ),
        x(
          'Step across to the wide runner',
          'The striker turns through the newly open central lane.',
          [
            ['a-st', 21, 46],
            ['a-st', 12, 47],
          ],
          [],
          42,
        ),
      ),
      read(
        'h-six',
        'Defending',
        'The striker receives with his back to goal. The rival eight offers a square pass, while our centre-back keeps the forward lane closed.',
        n(
          'Close the striker from his turning side',
          'The pressure makes the striker set the ball sideways.',
          [['a-r8', 30, 33]],
          [['h-six', 28, 39]],
        ),
        x(
          'Press around his other shoulder',
          'The striker turns into the space behind your approach.',
          [
            ['a-st', 20, 42],
            ['a-st', 12, 45],
          ],
          [],
          56,
        ),
        d(
          'Hold between the ball and goal',
          'The striker has to recycle into midfield.',
          [['a-six', 38, 49]],
          [['h-six', 24, 44]],
        ),
        x(
          'Track the eight’s run towards the line',
          'The striker keeps the ball and shoots through the centre.',
          [
            ['a-st', 20, 46],
            ['a-st', 12, 48],
          ],
          [],
          43,
        ),
      ),
      read(
        'h-six',
        'Defending',
        'The eight’s first touch comes towards the centre. You have stayed on that side of the receiving lane rather than following the striker.',
        r(
          'Step into the eight’s first touch',
          'You take the ball before the receiver can face goal.',
          [
            ['h-six', 29, 34],
            ['h-l8', 35, 37],
          ],
        ),
        x(
          'Turn back towards the striker',
          'The eight faces goal and finds the striker beyond you.',
          [
            ['a-r8', 24, 38],
            ['a-st', 20, 46],
            ['a-st', 12, 47],
          ],
          [],
          57,
        ),
        d(
          'Hold the lane without tackling',
          'The eight turns back and resets outside the box.',
          [['a-six', 38, 45]],
          [['h-six', 25, 37]],
        ),
        x(
          'Press towards the touchline shoulder',
          'The receiver turns centrally away from that approach.',
          [
            ['a-r8', 22, 42],
            ['a-r8', 13, 44],
          ],
          [],
          42,
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-bounce-run-cover',
    tier: 1,
    name: 'The winger follows his bounce pass',
    intro:
      'The right centre-back must read a winger’s pass and the next run as separate threats.',
    owner: 'a-lw',
    placements: defending([
      ['a-lw', 31, 79],
      ['a-st', 26, 58],
      ['a-l8', 35, 68],
      ['h-rcb', 18, 59],
      ['h-rb', 23, 77],
      ['h-six', 29, 48],
    ]),
    reads: [
      read(
        'h-rcb',
        'Defending',
        'The winger looks inside towards the striker. Our right-back is outside him and can follow a run after the pass.',
        n(
          'Cover the striker and leave the runner wide',
          'The striker receives short while the right-back follows the winger.',
          [['a-st', 25, 57]],
          [
            ['h-rcb', 19, 56],
            ['h-rb', 23, 76],
          ],
        ),
        x(
          'Move wide towards the winger',
          'The striker receives through the uncovered central lane.',
          [
            ['a-st', 20, 54],
            ['a-st', 12, 52],
          ],
          [],
          42,
        ),
        d(
          'Drop across the near-post lane',
          'The carrier stops and returns the ball outside.',
          [['a-l8', 36, 69]],
          [['h-rcb', 14, 63]],
        ),
        x(
          'Step beyond the striker’s receiving side',
          'The winger carries inside behind the early step.',
          [
            ['a-lw', 22, 68],
            ['a-lw', 13, 56],
          ],
          [],
          57,
        ),
      ),
      read(
        'h-rb',
        'Defending',
        'The striker receives facing away from goal. The winger continues towards the outside channel, with you on his inside shoulder.',
        n(
          'Track the return lane from inside',
          'You stay between the running winger and the box as the return arrives.',
          [['a-lw', 24, 73]],
          [
            ['h-rb', 22, 77],
            ['h-rcb', 19, 55],
          ],
        ),
        x(
          'Join the centre-back against the striker',
          'The winger receives the return untracked and finishes from inside.',
          [
            ['a-lw', 21, 71],
            ['a-lw', 12, 57],
          ],
          [],
          42,
        ),
        d(
          'Drop to the edge of the box',
          'The striker keeps the attack outside and recycles.',
          [['a-l8', 34, 66]],
          [['h-rb', 18, 73]],
        ),
        x(
          'Run beyond the winger towards the ball',
          'The return goes behind your run and the winger reaches goal.',
          [
            ['a-lw', 21, 72],
            ['a-lw', 12, 56],
          ],
          [],
          57,
        ),
      ),
      read(
        'h-rb',
        'Defending',
        'The winger’s return reception is inside the touchline. His first touch comes towards you, with the centre-back protecting the goal-side lane.',
        r(
          'Take the receiving touch and turn out',
          'You win the touch and carry away from the covered channel.',
          [
            ['h-rb', 23, 73],
            ['h-rb', 29, 81],
          ],
        ),
        x(
          'Reach across the winger from outside',
          'He shields the reach and turns towards the box.',
          [
            ['a-lw', 19, 68],
            ['a-lw', 11, 55],
          ],
          [],
          43,
        ),
        d(
          'Keep the winger facing the touchline',
          'The winger turns backwards and the attack resets.',
          [['a-l8', 34, 65]],
          [['h-rb', 20, 73]],
        ),
        x(
          'Follow the striker’s next movement',
          'The winger keeps possession and enters the uncovered channel.',
          [
            ['a-lw', 18, 69],
            ['a-lw', 11, 56],
          ],
          [],
          56,
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-keeper-cross-patience',
    tier: 1,
    name: 'The keeper waits for the delivery',
    intro:
      'A low wide carrier approaches our box while the goalkeeper watches the central runner.',
    owner: 'a-rw',
    placements: defending([
      ['a-rw', 28, 10],
      ['a-st', 25, 43],
      ['a-r8', 34, 28],
      ['h-gk', 7, 48],
      ['h-lb', 22, 20],
      ['h-lcb', 16, 39],
      ['h-rcb', 16, 60],
    ]),
    reads: [
      read(
        'h-gk',
        'Defending',
        'The carrier has not opened his body to cross. Our left-back can stay with him if you keep the near-post angle covered.',
        n(
          'Stay set and send the left-back out',
          'The full-back delays the carrier without exposing the near post.',
          [['a-rw', 24, 15]],
          [
            ['h-lb', 20, 21],
            ['h-gk', 8, 43],
          ],
        ),
        x(
          'Leave goal to meet the carrier',
          'The carrier passes into the striker behind your advance.',
          [
            ['a-st', 20, 42],
            ['a-st', 13, 45],
          ],
          [['h-gk', 17, 25]],
          57,
        ),
        d(
          'Remain on the goal line',
          'The defenders keep the carrier wide and force a reset.',
          [['a-r8', 34, 27]],
          [['h-gk', 4, 45]],
        ),
        x(
          'Move towards the far-post runner',
          'The carrier shoots through the near-post angle.',
          [
            ['a-rw', 19, 23],
            ['a-rw', 12, 32],
          ],
          [['h-gk', 6, 57]],
          42,
        ),
      ),
      read(
        'h-gk',
        'Defending',
        'The winger now opens his body. The striker is running from in front of our centre-backs, and the delivery is aimed towards the centre.',
        n(
          'Shift towards the delivery without rushing out',
          'You stay balanced as the central receiver meets the pass.',
          [['a-st', 20, 41]],
          [
            ['h-gk', 11, 45],
            ['h-lcb', 17, 37],
          ],
        ),
        x(
          'Dive towards the near-post line',
          'The striker redirects the delivery into the other side.',
          [
            ['a-st', 20, 43],
            ['a-st', 12, 48],
          ],
          [['h-gk', 8, 34]],
          58,
        ),
        d(
          'Stay deep and let the centre-back clear',
          'The centre-back blocks the central lane and the rivals recycle.',
          [['a-r8', 32, 29]],
          [
            ['h-gk', 6, 47],
            ['h-lcb', 19, 36],
          ],
        ),
        x(
          'Charge towards the winger’s feet',
          'The pass crosses behind your charge into the striker’s path.',
          [
            ['a-st', 19, 43],
            ['a-st', 12, 46],
          ],
          [['h-gk', 18, 26]],
          42,
        ),
      ),
      read(
        'h-gk',
        'Defending',
        'The striker’s receiving touch runs ahead of him towards the penalty spot. You are set between that touch and goal.',
        r(
          'Advance into the loose receiving touch',
          'You reach the separated ball before the striker’s next stride.',
          [
            ['a-st', 16, 44],
            ['h-gk', 14, 45],
          ],
          [['h-lcb', 17, 39]],
        ),
        x(
          'Retreat while the striker advances',
          'The striker has time to finish across the retreating keeper.',
          [
            ['a-st', 14, 45],
            ['a-st', 10, 48],
          ],
          [['h-gk', 4, 47]],
          58,
        ),
        d(
          'Hold the angle behind the centre-back',
          'The defender makes the striker turn out and recycle.',
          [['a-r8', 30, 30]],
          [
            ['h-gk', 9, 44],
            ['h-lcb', 18, 42],
          ],
        ),
        x(
          'Move towards the striker’s outside shoulder',
          'The striker keeps the ball on the other side and finishes.',
          [
            ['a-st', 15, 48],
            ['a-st', 10, 51],
          ],
          [['h-gk', 13, 36]],
          57,
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-eight-press-lock',
    tier: 1,
    name: 'The eight locks the wide exit',
    intro:
      'A midfield press can direct their centre-back towards an outlet our winger can reach.',
    owner: 'a-lcb',
    placements: defending([
      ['a-lcb', 66, 60],
      ['a-six', 57, 52],
      ['a-rb', 55, 18],
      ['a-r8', 50, 35],
      ['h-r8', 60, 65],
      ['h-six', 48, 49],
      ['h-lw', 50, 24],
      ['h-st', 63, 47],
    ]),
    reads: [
      read(
        'h-r8',
        'Defending',
        'The centre-back has the six inside and the far full-back outside. Our striker screens the return across the back line.',
        n(
          'Press with the return pass behind your curve',
          'The carrier has to use the six rather than the other centre-back.',
          [['a-six', 56, 52]],
          [
            ['h-r8', 60, 57],
            ['h-six', 49, 48],
          ],
        ),
        x(
          'Run directly between centre-back and six',
          'The carrier escapes outside and the next pass opens the centre.',
          [
            ['a-rb', 53, 19],
            ['a-r8', 38, 34],
            ['a-st', 22, 48],
            ['a-st', 13, 47],
          ],
          [],
          43,
        ),
        d(
          'Hold the midfield line',
          'The centre-back carries across the back line without breaking our block.',
          [['a-rcb', 65, 39]],
          [['h-r8', 53, 64]],
        ),
        x(
          'Track the wide midfielder backwards',
          'The six receives facing forwards and drives through midfield.',
          [
            ['a-six', 46, 49],
            ['a-st', 22, 50],
            ['a-st', 13, 49],
          ],
          [],
          57,
        ),
      ),
      read(
        'h-six',
        'Defending',
        'Their six receives on a closed body shape. The far full-back is the visible outlet, with our winger inside that lane.',
        n(
          'Screen the forward pass and approach',
          'The receiver sets the ball towards the far full-back.',
          [['a-rb', 52, 18]],
          [
            ['h-six', 51, 45],
            ['h-lw', 50, 21],
          ],
        ),
        x(
          'Press around the receiver’s far shoulder',
          'The receiver turns through the centre and releases the striker.',
          [
            ['a-six', 43, 49],
            ['a-st', 22, 47],
            ['a-st', 13, 46],
          ],
          [],
          42,
        ),
        d(
          'Stay behind the midfield line',
          'The six returns the ball to the centre-back.',
          [['a-lcb', 62, 59]],
          [['h-six', 45, 48]],
        ),
        x(
          'Move towards the wide outlet',
          'The six keeps possession and takes the forward lane.',
          [
            ['a-six', 42, 50],
            ['a-st', 21, 49],
            ['a-st', 12, 48],
          ],
          [],
          57,
        ),
      ),
      read(
        'h-lw',
        'Defending',
        'The full-back receives facing the touchline. His next touch is towards the pitch, where you are already arriving.',
        r(
          'Meet his inward touch and set the six',
          'The receiving shape lets you take the ball and release our midfield.',
          [
            ['a-rb', 51, 20],
            ['h-lw', 51, 21],
            ['h-six', 50, 44],
          ],
        ),
        x(
          'Close from outside the touchline lane',
          'The full-back turns inside you and starts a central break.',
          [
            ['a-rb', 44, 30],
            ['a-r8', 34, 36],
            ['a-st', 22, 49],
            ['a-st', 13, 47],
          ],
          [],
          43,
        ),
        d(
          'Hold the lane without stepping in',
          'The full-back returns the ball and the press resets.',
          [['a-lcb', 61, 56]],
          [['h-lw', 47, 24]],
        ),
        x(
          'Sprint past him towards the centre-back',
          'The full-back carries forward behind your run.',
          [
            ['a-rb', 43, 27],
            ['a-st', 22, 46],
            ['a-st', 13, 45],
          ],
          [],
          56,
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-blind-side-reception',
    tier: 1,
    name: 'The winger arrives from the blind side',
    intro:
      'Our left winger sees the full-back turn back towards a centre-back who is watching the ball.',
    owner: 'a-rb',
    placements: defending([
      ['a-rb', 56, 14],
      ['a-rcb', 66, 36],
      ['a-six', 54, 48],
      ['h-lw', 50, 18],
      ['h-st', 60, 46],
      ['h-l8', 48, 33],
    ]),
    reads: [
      read(
        'h-lw',
        'Defending',
        'The full-back’s first touch points back towards the centre-back. Our striker blocks a pass into their six.',
        n(
          'Curve to remove the line-side outlet',
          'The full-back turns backwards into the centre-back pass.',
          [['a-rcb', 64, 35]],
          [
            ['h-lw', 57, 23],
            ['h-st', 59, 46],
          ],
        ),
        x(
          'Run directly at the full-back',
          'The full-back plays inside the straight press and starts a break.',
          [
            ['a-six', 45, 46],
            ['a-st', 22, 50],
            ['a-st', 13, 48],
          ],
          [],
          57,
        ),
        d(
          'Hold the winger’s midfield position',
          'The rival full-back keeps possession outside our block.',
          [['a-r8', 49, 30]],
          [['h-lw', 46, 20]],
        ),
        x(
          'Drop towards our left-back',
          'The full-back has room to carry and release a central runner.',
          [
            ['a-rb', 43, 22],
            ['a-st', 21, 48],
            ['a-st', 12, 47],
          ],
          [],
          42,
        ),
      ),
      read(
        'h-lw',
        'Defending',
        'The centre-back receives looking infield. He turns his body away from you to carry towards the six, with our striker screening that receiver.',
        n(
          'Approach behind his turning shoulder',
          'You reach his blind side before the carrying touch moves beyond him.',
          [['a-rcb', 60, 40]],
          [
            ['h-lw', 59, 34],
            ['h-st', 57, 47],
          ],
        ),
        x(
          'Cross in front of the centre-back',
          'He sees the approach and passes behind it into midfield.',
          [
            ['a-six', 45, 47],
            ['a-st', 22, 49],
            ['a-st', 13, 48],
          ],
          [],
          56,
        ),
        d(
          'Hold the return lane to the full-back',
          'The centre-back moves the ball across his back line.',
          [['a-lcb', 65, 61]],
          [['h-lw', 55, 23]],
        ),
        x(
          'Follow the screened six',
          'The centre-back carries through the space you leave.',
          [
            ['a-rcb', 44, 42],
            ['a-st', 21, 48],
            ['a-st', 12, 47],
          ],
          [],
          43,
        ),
      ),
      read(
        'h-lw',
        'Defending',
        'The carrying touch is ahead of the centre-back’s planted foot. You have reached his side with the striker covering the infield escape.',
        r(
          'Take the separated touch and carry wide',
          'The ball is yours before he can turn back towards you.',
          [
            ['h-lw', 59, 40],
            ['h-lw', 63, 28],
          ],
        ),
        x(
          'Reach around his planted leg',
          'He shields the ball and turns through the press.',
          [
            ['a-rcb', 48, 44],
            ['a-st', 22, 49],
            ['a-st', 13, 48],
          ],
          [],
          57,
        ),
        d(
          'Stop beside him and screen the six',
          'The centre-back returns across the back line.',
          [['a-lcb', 64, 60]],
          [['h-lw', 57, 37]],
        ),
        x(
          'Sprint past his front shoulder',
          'He carries behind your run and releases the striker.',
          [
            ['a-rcb', 45, 43],
            ['a-st', 21, 47],
            ['a-st', 12, 46],
          ],
          [],
          42,
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-striker-back-set-trap',
    tier: 1,
    name: 'The striker’s backward set',
    intro:
      'The six can defend a striker’s receiving touch without dragging the centre-backs forward.',
    owner: 'a-st',
    placements: defending([
      ['a-st', 31, 51],
      ['a-six', 39, 55],
      ['a-l8', 35, 70],
      ['h-six', 27, 46],
      ['h-rcb', 18, 58],
      ['h-l8', 36, 35],
    ]),
    reads: [
      read(
        'h-six',
        'Defending',
        'The striker receives with his back to goal. Our right centre-back protects the turn, and their six waits behind the ball.',
        n(
          'Close his turning side without leaving the screen',
          'The striker shields the ball and looks for a backward set.',
          [['a-st', 29, 54]],
          [
            ['h-six', 28, 49],
            ['h-rcb', 18, 57],
          ],
        ),
        x(
          'Run around the striker’s back',
          'The striker turns into the lane left by the run.',
          [
            ['a-st', 21, 49],
            ['a-st', 12, 47],
          ],
          [],
          42,
        ),
        d(
          'Drop beside the centre-backs',
          'The striker can return possession outside the box.',
          [['a-six', 40, 55]],
          [['h-six', 21, 48]],
        ),
        x(
          'Leave the striker to mark their six',
          'The striker faces goal before the centre-back can step.',
          [
            ['a-st', 20, 50],
            ['a-st', 12, 49],
          ],
          [],
          57,
        ),
      ),
      read(
        'h-six',
        'Defending',
        'The striker cannot turn through the covered side. Their six moves towards him for a set, facing his own goal.',
        n(
          'Follow the set from the receiver’s inside',
          'The backward pass reaches a receiver with a closed body shape.',
          [['a-six', 36, 55]],
          [['h-six', 32, 51]],
        ),
        x(
          'Stay tight to the striker after the set',
          'The six receives facing forwards and returns through the central gap.',
          [
            ['a-six', 36, 53],
            ['a-st', 22, 48],
            ['a-st', 13, 47],
          ],
          [],
          43,
        ),
        d(
          'Hold the lane in front of the box',
          'The six moves the ball sideways and restarts the attack.',
          [['a-l8', 38, 70]],
          [['h-six', 27, 49]],
        ),
        x(
          'Jump towards the far side of the receiver',
          'The six turns inside the jump and releases the striker.',
          [
            ['a-six', 29, 49],
            ['a-st', 21, 46],
            ['a-st', 12, 45],
          ],
          [],
          56,
        ),
      ),
      read(
        'h-six',
        'Defending',
        'The receiver’s first touch comes towards his own goal. You are beside that touch, with the centre-back still behind you.',
        r(
          'Take the backward touch and turn away',
          'The receiver cannot shield the touch before you carry it away.',
          [
            ['h-six', 35, 54],
            ['h-six', 40, 48],
          ],
        ),
        x(
          'Reach through the receiver’s back',
          'He protects the ball and turns through your reaching foot.',
          [
            ['a-six', 28, 48],
            ['a-st', 21, 46],
            ['a-st', 12, 46],
          ],
          [],
          57,
        ),
        d(
          'Keep the receiver facing backwards',
          'Their six sets the ball across midfield.',
          [['a-l8', 38, 69]],
          [['h-six', 32, 50]],
        ),
        x(
          'Turn towards the striker before tackling',
          'The six carries through the opening behind your turn.',
          [
            ['a-six', 24, 48],
            ['a-six', 14, 47],
          ],
          [],
          42,
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-sweeper-release-cue',
    tier: 1,
    name: 'The sweeper keeper reads the release',
    intro:
      'Their centre-back prepares a ball into a central runner while our goalkeeper has a view of the release.',
    owner: 'a-rcb',
    placements: defending([
      ['a-rcb', 57, 37],
      ['a-st', 29, 51],
      ['a-rw', 37, 14],
      ['h-six', 42, 43],
      ['h-lcb', 17, 38],
      ['h-rcb', 17, 61],
      ['h-gk', 8, 51],
    ]),
    reads: [
      read(
        'h-six',
        'Defending',
        'The centre-back has space to look up. The striker is in front of our last line, while our keeper can see both the ball and the run.',
        n(
          'Screen the short pass and keep the line connected',
          'The carrier changes angle before preparing the longer ball.',
          [['a-rcb', 54, 42]],
          [
            ['h-six', 41, 47],
            ['h-gk', 10, 51],
          ],
        ),
        x(
          'Chase the centre-back beyond the screen',
          'The short pass reaches midfield and releases the striker through the gap.',
          [
            ['a-six', 39, 47],
            ['a-st', 22, 51],
            ['a-st', 13, 50],
          ],
          [],
          56,
        ),
        d(
          'Drop into the back line',
          'The centre-back keeps the ball and moves it across defence.',
          [['a-lcb', 59, 61]],
          [['h-six', 23, 48]],
        ),
        x(
          'Follow the wide runner',
          'The central receiver turns in the space you leave.',
          [
            ['a-six', 36, 47],
            ['a-st', 21, 48],
            ['a-st', 12, 47],
          ],
          [],
          43,
        ),
      ),
      read(
        'h-gk',
        'Defending',
        'The centre-back opens his body for the central pass. The striker starts in front of our defenders, so the ball can arrive legally in the channel.',
        n(
          'Advance as the central ball is released',
          'Your balanced advance narrows the distance to the striker’s reception.',
          [['a-st', 21, 51]],
          [
            ['h-gk', 13, 50],
            ['h-lcb', 18, 39],
            ['h-rcb', 18, 60],
          ],
        ),
        x(
          'Retreat towards the goal line',
          'The striker receives with time to bring the ball towards goal.',
          [
            ['a-st', 20, 50],
            ['a-st', 12, 49],
          ],
          [['h-gk', 4, 51]],
          42,
        ),
        d(
          'Stay behind the centre-backs',
          'The connected line makes the carrier choose a wide reset.',
          [['a-rw', 35, 15]],
          [['h-gk', 8, 50]],
        ),
        x(
          'Sprint out before the carrier opens his body',
          'The carrier changes the delivery towards the side of your early run.',
          [
            ['a-st', 22, 44],
            ['a-st', 13, 44],
          ],
          [['h-gk', 23, 57]],
          42,
        ),
      ),
      read(
        'h-gk',
        'Defending',
        'The striker’s receiving touch runs ahead towards goal. You are advancing centrally, with the defenders closing the runner’s sides.',
        r(
          'Gather the touch ahead of the striker',
          'The controlled advance lets you reach the ball before his next stride.',
          [
            ['a-st', 17, 50],
            ['h-gk', 15, 50],
          ],
          [
            ['h-lcb', 18, 42],
            ['h-rcb', 18, 58],
          ],
        ),
        x(
          'Move across the striker’s outside shoulder',
          'He keeps the ball on the other side and finishes.',
          [
            ['a-st', 16, 46],
            ['a-st', 10, 45],
          ],
          [['h-gk', 17, 59]],
          42,
        ),
        d(
          'Hold the angle and let the line recover',
          'The striker has to turn out and return the ball.',
          [['a-rw', 29, 17]],
          [['h-gk', 12, 49]],
        ),
        x(
          'Dive at the striker’s planted foot',
          'The striker takes the ball beyond the early dive.',
          [
            ['a-st', 15, 54],
            ['a-st', 9, 52],
          ],
          [['h-gk', 16, 46]],
          58,
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-counter-two-lanes',
    tier: 1,
    name: 'Two lanes on the counter',
    intro:
      'The right eight and six recover against a carrier who has both a striker and a wide runner.',
    owner: 'a-l8',
    placements: defending([
      ['a-l8', 44, 65],
      ['a-st', 29, 49],
      ['a-lw', 36, 87],
      ['h-r8', 36, 63],
      ['h-six', 31, 50],
      ['h-rb', 23, 80],
      ['h-rcb', 17, 59],
    ]),
    reads: [
      read(
        'h-r8',
        'Defending',
        'The carrier can pass inside to the striker or outside to the winger. Our six is nearer the central lane, while you can recover towards the carrier’s outside.',
        n(
          'Recover outside while the six holds inside',
          'The paired recovery keeps both forward lanes covered.',
          [['a-l8', 36, 60]],
          [
            ['h-r8', 29, 63],
            ['h-six', 29, 50],
          ],
        ),
        x(
          'Sprint straight at the ball carrier',
          'The carrier releases the winger outside the unprotected press.',
          [
            ['a-lw', 28, 83],
            ['a-lw', 16, 65],
          ],
          [],
          57,
        ),
        d(
          'Drop into the right-back’s lane',
          'The carrier slows and recycles against the deep block.',
          [['a-six', 43, 48]],
          [['h-r8', 23, 70]],
        ),
        x(
          'Follow the striker with the six',
          'The winger receives outside both recovering midfielders.',
          [
            ['a-lw', 27, 84],
            ['a-lw', 15, 65],
          ],
          [],
          42,
        ),
      ),
      read(
        'h-six',
        'Defending',
        'The right eight is recovering on the carrier’s outside. The carrier turns infield, but the striker is still behind your central screen.',
        n(
          'Keep the striker screened and shorten the gap',
          'The carrier has to take another touch into the covered centre.',
          [['a-l8', 29, 55]],
          [
            ['h-six', 26, 49],
            ['h-r8', 25, 61],
          ],
        ),
        x(
          'Move out towards the winger',
          'The striker receives through the screen you have left.',
          [
            ['a-st', 22, 48],
            ['a-st', 13, 47],
          ],
          [],
          43,
        ),
        d(
          'Retreat between the centre-backs',
          'The carrier stops short of the box and resets.',
          [['a-six', 39, 47]],
          [['h-six', 20, 50]],
        ),
        x(
          'Press across the carrier’s front foot',
          'He rolls the ball across the press and reaches the central lane.',
          [
            ['a-l8', 22, 49],
            ['a-l8', 13, 47],
          ],
          [],
          56,
        ),
      ),
      read(
        'h-six',
        'Defending',
        'The infield touch brings the ball between you and the recovering eight. The striker’s lane remains behind your body.',
        r(
          'Meet the touch with the eight covering',
          'The carrier runs into two connected midfielders and you take possession.',
          [
            ['h-six', 28, 55],
            ['h-r8', 31, 62],
          ],
        ),
        x(
          'Reach from the striker’s side',
          'The carrier escapes the reaching foot into the box.',
          [
            ['a-l8', 21, 49],
            ['a-l8', 12, 46],
          ],
          [],
          42,
        ),
        d(
          'Hold the screen without challenging',
          'The carrier returns the ball to midfield.',
          [['a-six', 38, 47]],
          [['h-six', 25, 50]],
        ),
        x(
          'Turn to follow the wide runner',
          'The carrier keeps the ball and shoots from the central lane.',
          [
            ['a-l8', 20, 51],
            ['a-l8', 12, 49],
          ],
          [],
          57,
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-midfield-return-duel',
    tier: 1,
    name: 'The return arrives in midfield',
    intro:
      'Our right eight follows a midfield combination rather than rushing towards its first pass.',
    owner: 'a-l8',
    placements: defending([
      ['a-l8', 43, 63],
      ['a-lb', 41, 90],
      ['a-six', 43, 47],
      ['h-r8', 37, 65],
      ['h-rw', 38, 82],
      ['h-six', 29, 49],
      ['h-rb', 22, 80],
    ]),
    reads: [
      read(
        'h-r8',
        'Defending',
        'The rival eight faces the touchline and the full-back offers a wide pass. Our winger can hold the full-back while you stay with the midfielder.',
        n(
          'Stay inside the eight as the ball goes wide',
          'The wide pass does not release the midfielder from your cover.',
          [['a-lb', 39, 89]],
          [
            ['h-r8', 35, 64],
            ['h-rw', 35, 82],
          ],
        ),
        x(
          'Chase the pass towards the full-back',
          'The return frees the eight through the space you leave.',
          [
            ['a-lb', 37, 86],
            ['a-l8', 29, 62],
            ['a-l8', 17, 51],
          ],
          [],
          43,
        ),
        d(
          'Drop alongside our six',
          'The rivals keep the ball outside the compact midfield pair.',
          [['a-six', 42, 46]],
          [['h-r8', 29, 61]],
        ),
        x(
          'Press across the eight’s forward foot',
          'The eight turns infield before passing through the centre.',
          [
            ['a-l8', 31, 53],
            ['a-st', 22, 48],
            ['a-st', 13, 47],
          ],
          [],
          57,
        ),
      ),
      read(
        'h-r8',
        'Defending',
        'The full-back receives facing the line. The eight checks towards him, with you on the receiver’s goal-side shoulder.',
        n(
          'Follow the check without crossing the receiver',
          'You stay goal-side when the return reaches midfield.',
          [['a-l8', 33, 64]],
          [
            ['h-r8', 30, 63],
            ['h-rw', 35, 85],
          ],
        ),
        x(
          'Run to the full-back with our winger',
          'The midfielder receives alone and drives inside.',
          [
            ['a-l8', 29, 58],
            ['a-l8', 17, 49],
          ],
          [],
          42,
        ),
        d(
          'Hold the central lane from deeper',
          'The full-back recycles across midfield rather than forcing the return.',
          [['a-six', 43, 46]],
          [['h-r8', 27, 60]],
        ),
        x(
          'Step beyond the receiver to cut the pass',
          'The return passes behind the early step.',
          [
            ['a-l8', 28, 59],
            ['a-l8', 16, 48],
          ],
          [],
          57,
        ),
      ),
      read(
        'h-r8',
        'Defending',
        'The return receiver opens towards the centre. His touch comes towards your covered side, with the six behind you.',
        r(
          'Step across the first touch and set the six',
          'The receiver cannot get his body between you and the ball.',
          [
            ['h-r8', 32, 63],
            ['h-six', 31, 49],
          ],
        ),
        x(
          'Reach towards the touchline shoulder',
          'The midfielder shields that reach and turns centrally.',
          [
            ['a-l8', 25, 55],
            ['a-l8', 15, 46],
          ],
          [],
          42,
        ),
        d(
          'Hold him outside the central lane',
          'The receiver returns the ball to the full-back.',
          [['a-lb', 37, 89]],
          [['h-r8', 28, 62]],
        ),
        x(
          'Turn to mark the full-back again',
          'The midfielder advances inside the abandoned duel.',
          [
            ['a-l8', 25, 54],
            ['a-l8', 15, 47],
          ],
          [],
          57,
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-headed-knockdown-cover',
    tier: 1,
    name: 'Cover behind the aerial receiver',
    intro:
      'The right centre-back and six prepare for a wide delivery towards a striker’s knockdown.',
    owner: 'a-l8',
    placements: defending([
      ['a-l8', 42, 71],
      ['a-lw', 34, 90],
      ['a-st', 25, 55],
      ['a-six', 36, 47],
      ['h-rcb', 18, 62],
      ['h-six', 28, 48],
      ['h-r8', 35, 68],
      ['h-rb', 23, 80],
    ]),
    reads: [
      read(
        'h-r8',
        'Defending',
        'The eight looks towards the wide winger and the striker prepares to meet a delivery. Our centre-back is goal-side, with the six below the potential knockdown.',
        n(
          'Close the inside lane and keep the six connected',
          'The carrier moves wide without releasing a central runner.',
          [['a-l8', 35, 72]],
          [
            ['h-r8', 31, 66],
            ['h-six', 26, 48],
          ],
        ),
        x(
          'Press past the carrier towards the line',
          'The carrier turns inside and finds the striker on the floor.',
          [
            ['a-st', 21, 51],
            ['a-st', 12, 49],
          ],
          [],
          43,
        ),
        d(
          'Drop beside the right-back',
          'The carrier recycles rather than crossing into the compact box.',
          [['a-six', 40, 47]],
          [['h-r8', 24, 72]],
        ),
        x(
          'Track the wide winger from outside',
          'The carrier advances through the uncovered inside lane.',
          [
            ['a-l8', 24, 58],
            ['a-l8', 14, 51],
          ],
          [],
          57,
        ),
      ),
      read(
        'h-rcb',
        'Defending',
        'The carrier passes outside to the winger. The striker waits in front of the line, trying to meet the next delivery above our six.',
        n(
          'Keep goal-side and bring the six beneath the duel',
          'You preserve the goal-side position as the winger prepares his cross.',
          [['a-lw', 30, 88]],
          [
            ['h-rcb', 19, 58],
            ['h-six', 24, 48],
            ['a-st', 23, 55],
          ],
        ),
        x(
          'Step in front before the delivery',
          'The striker runs behind the early step to meet the low cross.',
          [
            ['a-lw', 29, 86],
            ['a-st', 20, 58],
            ['a-st', 12, 53],
          ],
          [],
          42,
        ),
        d(
          'Drop and defend the penalty spot',
          'The winger returns the ball rather than attacking the deep line.',
          [['a-l8', 37, 70]],
          [['h-rcb', 14, 57]],
        ),
        x(
          'Follow the six out of the box',
          'The striker receives in the central space you leave.',
          [
            ['a-lw', 29, 85],
            ['a-st', 20, 54],
            ['a-st', 12, 50],
          ],
          [],
          57,
        ),
      ),
      read(
        'h-rcb',
        'Defending',
        'The winger opens his body for the high delivery. You are goal-side of the striker, and the six is beneath the expected knockdown.',
        r(
          'Meet the delivery and direct it to the six',
          'The goal-side jump redirects the cross to our covered midfielder.',
          [
            ['h-rcb', 21, 55],
            ['h-six', 27, 47],
          ],
          [['a-st', 23, 56]],
        ),
        x(
          'Run around the striker’s front shoulder',
          'The striker shields your approach and heads towards goal.',
          [['a-st', 20, 56]],
          [],
          43,
        ),
        d(
          'Hold the box and block the knockdown lane',
          'The delivery has no forward target and the rivals recycle outside.',
          [['a-six', 37, 48]],
          [
            ['h-rcb', 17, 55],
            ['h-six', 23, 47],
          ],
        ),
        x(
          'Leave the striker to reach the winger',
          'The striker meets the cross without a goal-side marker.',
          [['a-st', 20, 55]],
          [],
          57,
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-six-save-follow',
    tier: 1,
    name: 'The six follows the keeper’s save',
    intro:
      'A central carrier threatens a shot while our six can recover towards a possible rebound.',
    owner: 'a-st',
    placements: defending([
      ['a-st', 27, 50],
      ['a-r8', 33, 30],
      ['h-six', 31, 49],
      ['h-lcb', 17, 38],
      ['h-rcb', 17, 62],
      ['h-gk', 7, 50],
    ]),
    reads: [
      read(
        'h-six',
        'Defending',
        'The striker carries centrally. The centre-backs protect the sides of the lane, so your recovery can stay between the carrier and the trailing midfielder.',
        n(
          'Recover centrally without crossing the keeper’s view',
          'The striker carries into a visible shooting lane while you stay near the rebound route.',
          [['a-st', 21, 49]],
          [
            ['h-six', 23, 45],
            ['h-gk', 8, 49],
          ],
        ),
        x(
          'Run across the striker’s shooting foot',
          'The striker touches around the crossing run and finishes.',
          [
            ['a-st', 18, 54],
            ['a-st', 11, 52],
          ],
          [],
          57,
        ),
        d(
          'Drop between the centre-backs',
          'The striker turns away from the crowded central lane.',
          [['a-r8', 33, 31]],
          [['h-six', 18, 48]],
        ),
        x(
          'Follow the trailing midfielder',
          'The carrier has room to set a central shot.',
          [['a-st', 17, 48]],
          [],
          42,
        ),
      ),
      read(
        'h-six',
        'Defending',
        'The striker prepares a low shot. Our keeper is set and your recovery is beside the likely spill, not behind the shooter.',
        n(
          'Continue towards the rebound side',
          'The keeper saves the low shot while you arrive beside the spill.',
          [
            ['a-st', 16, 46],
            ['h-gk', 8, 48],
          ],
          [['h-six', 15, 43]],
        ),
        x(
          'Stop beside the striker',
          'The keeper’s save is followed by the same striker before you react.',
          [
            ['a-st', 16, 47],
            ['h-gk', 8, 48],
            ['a-st', 11, 49],
          ],
          [],
          57,
        ),
        d(
          'Stay outside the box to block the return',
          'The striker abandons the shot and recycles into midfield.',
          [['a-r8', 32, 31]],
          [['h-six', 23, 39]],
        ),
        x(
          'Run across the keeper’s sight line',
          'The striker finishes while the keeper’s view is blocked.',
          [['a-st', 15, 49]],
          [['h-six', 12, 49]],
          43,
        ),
      ),
      read(
        'h-six',
        'Attacking',
        'The save has left the ball beside the keeper. The striker who took the original shot follows it, while you have already recovered on the ball’s other side.',
        r(
          'Reach the spill and carry out of the box',
          'You get to the saved ball before the shooter’s follow-up.',
          [
            ['h-six', 10, 46],
            ['h-six', 18, 34],
          ],
        ),
        x(
          'Turn towards the trailing midfielder',
          'The original shooter reaches the save first and finishes.',
          [['a-st', 11, 47]],
          [],
          57,
        ),
        d(
          'Cover the shooter while the keeper resets',
          'The striker has to turn back and return the attack outside.',
          [['a-r8', 30, 30]],
          [['h-six', 12, 44]],
        ),
        x(
          'Leave the spill to follow the shooter',
          'The striker changes direction and reaches the ball ahead of you.',
          [['a-st', 10, 48]],
          [],
          42,
        ),
      ),
    ],
  },
  {
    id: 'lg2-i-keeper-short-exit-press',
    tier: 1,
    name: 'The keeper’s short exit',
    intro:
      'Their keeper controls a return pass while our striker and left winger prepare a connected press.',
    owner: 'a-gk',
    placements: defending([
      ['a-gk', 92, 51],
      ['a-rcb', 83, 35],
      ['a-lcb', 84, 64],
      ['a-rb', 70, 15],
      ['a-six', 72, 48],
      ['h-st', 79, 47],
      ['h-lw', 67, 22],
      ['h-l8', 63, 36],
    ]),
    reads: [
      read(
        'h-st',
        'Defending',
        'The keeper has centre-backs on both sides. Our left winger is closer to the far full-back, so the press can steer the first pass towards that flank.',
        n(
          'Curve across the keeper’s right-side outlet',
          'The keeper uses the other centre-back as the intended press begins.',
          [['a-rcb', 82, 34]],
          [
            ['h-st', 80, 43],
            ['h-lw', 69, 22],
          ],
        ),
        x(
          'Sprint directly at the keeper',
          'The keeper passes beside the straight run and their six starts a break.',
          [
            ['a-six', 65, 48],
            ['a-st', 25, 50],
            ['a-st', 14, 48],
          ],
          [],
          43,
        ),
        d(
          'Hold between the centre-backs',
          'The keeper retains control and the rivals reset their shape.',
          [['a-lcb', 83, 64]],
          [['h-st', 77, 48]],
        ),
        x(
          'Follow the six away from the keeper',
          'The centre-back carries beyond the disconnected first line.',
          [
            ['a-rcb', 70, 36],
            ['a-six', 53, 46],
            ['a-st', 24, 49],
            ['a-st', 13, 48],
          ],
          [],
          57,
        ),
      ),
      read(
        'h-st',
        'Defending',
        'The centre-back receives facing the flank. The six is behind your curve, and our winger has stayed inside the full-back’s receiving lane.',
        n(
          'Continue the curve behind the central lane',
          'The carrier uses the full-back rather than passing through our midfield.',
          [
            ['a-rcb', 76, 31],
            ['a-rb', 67, 15],
          ],
          [
            ['h-st', 77, 40],
            ['h-lw', 65, 20],
          ],
        ),
        x(
          'Stop after the first pass',
          'The centre-back finds the six through the reopened lane.',
          [
            ['a-six', 61, 46],
            ['a-st', 25, 49],
            ['a-st', 14, 48],
          ],
          [],
          42,
        ),
        d(
          'Screen the six without approaching',
          'The centre-back returns the ball across defence.',
          [['a-lcb', 82, 61]],
          [['h-st', 75, 43]],
        ),
        x(
          'Run outside towards the full-back',
          'The centre-back carries inside the outward run and releases midfield.',
          [
            ['a-rcb', 64, 40],
            ['a-six', 51, 45],
            ['a-st', 24, 48],
            ['a-st', 13, 47],
          ],
          [],
          57,
        ),
      ),
      read(
        'h-lw',
        'Defending',
        'The full-back receives beside the touchline with his body closed towards midfield. His inside touch comes towards you, with our eight behind the duel.',
        r(
          'Meet the inside touch and set the eight',
          'The closed reception lets you win the ball with a supporting pass available.',
          [
            ['a-rb', 66, 17],
            ['h-lw', 66, 18],
            ['h-l8', 64, 35],
          ],
        ),
        x(
          'Run around the line-side shoulder',
          'The full-back turns inside the outside run and escapes the press.',
          [
            ['a-rb', 57, 25],
            ['a-six', 44, 45],
            ['a-st', 24, 48],
            ['a-st', 13, 46],
          ],
          [],
          43,
        ),
        d(
          'Keep the full-back facing the line',
          'The ball returns to the centre-back and the rivals start again.',
          [['a-rcb', 77, 33]],
          [['h-lw', 63, 21]],
        ),
        x(
          'Leave him to mark the centre-back',
          'The full-back keeps the ball and carries behind your run.',
          [
            ['a-rb', 55, 23],
            ['a-st', 24, 47],
            ['a-st', 13, 46],
          ],
          [],
          56,
        ),
      ),
    ],
  },
];

export const intermediateLeaguePlays = specs.map(play);
