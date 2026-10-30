import {
  attacking,
  defending,
  d,
  g,
  k,
  l,
  n,
  play,
  r,
  read,
  x,
  type Read,
} from './league-play-authoring.ts';
import type { Placement } from './tactical-scene.ts';

// Only the graph plumbing is shared. Each pair of reads owns its tactical cues,
// contacts, alternatives and supporting runs; a later scene inherits those runs.
const easy = (
  id: string,
  name: string,
  intro: string,
  owner: string | { x: number; y: number },
  placements: Placement[],
  first: Read,
  second: Read,
  rare = false,
) =>
  play({
    id: `lg2-e-${id}`,
    tier: 0,
    name,
    intro,
    owner,
    placements,
    reads: [first, second],
    rare,
  });

export const easyLeaguePlays = [
  easy(
    'six-side-door',
    'The side door',
    'A central press leaves a shooting lane beside it.',
    'h-six',
    attacking([
      ['h-six', 65, 49],
      ['h-r8', 73, 64],
      ['a-six', 70, 48],
      ['a-lcb', 85, 61],
      ['a-gk', 95, 52],
    ]),
    read(
      'h-six',
      'Attacking',
      'Their six is closing straight toward you. Our right midfielder is beside the press, with the centre-back still deeper.',
      n(
        'Pass beside the press',
        'The sideways pass lets our right midfielder face the gap while their six continues toward your old position.',
        [
          ['h-six', 65, 49],
          ['h-r8', 76, 62],
        ],
        [
          ['a-six', 67, 48],
          ['a-lcb', 83, 69],
        ],
      ),
      k(
        'Return to the centre-back',
        'The ball stays ours, but the midfield line can recover before we advance.',
        [
          ['h-six', 65, 49],
          ['h-rcb', 52, 63],
        ],
      ),
      l(
        'Carry through the centre',
        'The approaching six reaches the next touch before you get past.',
        [
          ['h-six', 69, 49],
          ['a-six', 70, 49],
        ],
      ),
    ),
    read(
      'h-r8',
      'Attacking',
      'Your first touch is at the edge of the area. Their centre-back has moved toward the right channel; the gap is inside that movement.',
      g(
        'Touch inside and shoot',
        'One touch away from the centre-back opens a low finish across the keeper.',
        [['h-r8', 82, 57]],
        [
          ['a-lcb', 84, 67],
          ['a-gk', 96, 53],
        ],
        44,
      ),
      k(
        'Find the right winger',
        'The wide pass retains possession, but their back line resets between the ball and goal.',
        [
          ['h-r8', 76, 62],
          ['h-rw', 80, 84],
        ],
      ),
      l(
        'Shoot from this touch',
        'The centre-back can block the line from your wider first touch.',
        [
          ['h-r8', 76, 62],
          ['a-lcb', 82, 61],
        ],
      ),
    ),
  ),

  easy(
    'left-back-diagonal',
    'Across the full-back',
    'A diagonal delivery changes the angle of the attack.',
    'h-lb',
    attacking([
      ['h-lb', 64, 12],
      ['h-lw', 78, 19],
      ['a-rb', 76, 28],
      ['a-rcb', 88, 40],
      ['a-gk', 95, 44],
    ]),
    read(
      'h-lb',
      'Attacking',
      'Their right-back is narrow and watching our striker. Our left winger is outside the defender, still behind the centre-back line.',
      n(
        'Play diagonally to the winger',
        'The winger receives outside the full-back, who has to turn toward the touchline.',
        [
          ['h-lb', 64, 12],
          ['h-lw', 81, 20],
        ],
        [['a-rb', 80, 15]],
      ),
      k(
        'Pass into midfield',
        'Midfield can keep the ball, but the full-back has time to widen again.',
        [
          ['h-lb', 64, 12],
          ['h-l8', 65, 34],
        ],
      ),
      l(
        'Pass straight to the striker',
        'The narrow full-back can step into the delivery before it reaches our striker.',
        [
          ['h-lb', 64, 12],
          ['a-rb', 78, 38],
        ],
      ),
    ),
    read(
      'h-lw',
      'Attacking',
      'The right-back has arrived outside your left shoulder. Your first touch is controlled; the route toward the left corner of the box is inside.',
      g(
        'Cut inside and finish across goal',
        'You move away from the outside challenge and finish toward the opposite corner.',
        [['h-lw', 86, 31]],
        [
          ['a-rb', 83, 18],
          ['a-gk', 96, 45],
        ],
        57,
      ),
      k(
        'Set the ball back to the left-back',
        'The return keeps possession but gives the full-back a chance to turn back inside.',
        [
          ['h-lw', 81, 20],
          ['h-lb', 73, 13],
        ],
      ),
      l(
        'Continue along the touchline',
        'The full-back is already on that side and meets the carrying touch.',
        [
          ['h-lw', 84, 14],
          ['a-rb', 85, 14],
        ],
      ),
    ),
  ),

  easy(
    'centre-back-step-in',
    'Step into midfield',
    'An advancing centre-back draws the first line before releasing the winger.',
    'h-lcb',
    attacking([
      ['h-lcb', 59, 35],
      ['h-six', 70, 49],
      ['h-lw', 79, 20],
      ['a-st', 64, 42],
      ['a-six', 73, 53],
      ['a-rb', 79, 17],
      ['a-rcb', 88, 40],
    ]),
    read(
      'h-lcb',
      'Attacking',
      'Their striker is screening our six rather than coming directly at you. There is room to carry forward until the striker has to choose.',
      n(
        'Carry forward toward the striker',
        'Your advance draws the striker away from the screening position and makes the diagonal pass visible.',
        [['h-lcb', 67, 38]],
        [
          ['a-st', 65, 44],
          ['a-six', 75, 55],
          ['a-rb', 80, 13],
        ],
      ),
      k(
        'Pass across to the other centre-back',
        'We retain the ball, but their striker can keep screening midfield.',
        [
          ['h-lcb', 59, 35],
          ['h-rcb', 60, 64],
        ],
      ),
      l(
        'Pass immediately into the six',
        'The striker is still in that passing lane and collects the ball.',
        [
          ['h-lcb', 59, 35],
          ['a-st', 64, 43],
        ],
      ),
    ),
    read(
      'h-lcb',
      'Attacking',
      'You have carried into midfield. Their right-back is outside our winger, while the centre-backs are deeper; the diagonal can reach the winger on the inside shoulder.',
      g(
        'Pass diagonally inside the right-back',
        'The winger starts behind the line, receives inside the full-back and finishes before the centre-back arrives.',
        [
          ['h-lcb', 67, 38],
          ['h-lw', 87, 30],
        ],
        [
          ['a-rb', 84, 17],
          ['a-rcb', 89, 43],
        ],
        46,
      ),
      k(
        'Stop and return to the goalkeeper',
        'The goalkeeper retains possession, but the first line can regroup.',
        [
          ['h-lcb', 67, 38],
          ['h-gk', 35, 50],
        ],
      ),
      l(
        'Pass into the striker’s feet',
        'Their six has stayed in front of that central pass and intercepts.',
        [
          ['h-lcb', 67, 38],
          ['a-six', 75, 51],
        ],
      ),
    ),
  ),

  easy(
    'winger-check-full-back',
    'Short, then outside',
    'A winger checks toward the ball to make space for the full-back.',
    'h-rw',
    attacking([
      ['h-rw', 78, 83],
      ['h-rb', 70, 88],
      ['a-lb', 80, 77],
      ['a-lcb', 88, 61],
      ['a-gk', 95, 47],
    ]),
    read(
      'h-rw',
      'Attacking',
      'The full-back is close to your inside shoulder. Our right-back is behind you outside; checking short can bring the defender with you.',
      n(
        'Check short and pass outside',
        'The defender follows your short movement. The right-back receives in the space you vacated.',
        [
          ['h-rw', 73, 77],
          ['h-rb', 79, 87],
        ],
        [['a-lb', 75, 73]],
      ),
      k(
        'Pass back into central midfield',
        'The midfield pass retains possession without moving the full-back out of the wide lane.',
        [
          ['h-rw', 78, 83],
          ['h-r8', 67, 66],
        ],
      ),
      l(
        'Turn toward goal immediately',
        'The defender is close enough on your inside shoulder to take the turn.',
        [
          ['h-rw', 80, 78],
          ['a-lb', 80, 77],
        ],
      ),
    ),
    read(
      'h-rb',
      'Attacking',
      'You have controlled the outside pass. Our winger is now behind the full-back and can run inside from an onside starting position.',
      g(
        'Pass inside for the winger’s run',
        'The winger runs from behind the defensive line, takes the inside return and finishes.',
        [
          ['h-rb', 79, 87],
          ['h-rw', 89, 73],
        ],
        [
          ['a-lb', 80, 80],
          ['a-gk', 96, 51],
        ],
        56,
      ),
      k(
        'Keep the ball on the touchline',
        'Your extra touch lets the full-back recover toward the winger.',
        [['h-rb', 81, 88]],
        [['a-lb', 81, 79]],
      ),
      l(
        'Cross toward the penalty spot',
        'The centre-back has not left the central delivery lane and heads it away.',
        [
          ['h-rb', 79, 87],
          ['a-lcb', 88, 55],
        ],
      ),
    ),
  ),

  easy(
    'striker-protect-turn',
    'Protect, then turn',
    'A striker creates a shooting angle with the defender on one shoulder.',
    'h-st',
    attacking([
      ['h-st', 79, 46],
      ['a-rcb', 80, 40],
      ['a-lcb', 88, 62],
      ['a-six', 71, 57],
      ['h-l8', 70, 33],
      ['a-gk', 95, 52],
    ]),
    read(
      'h-st',
      'Attacking',
      'You have your back to goal. The nearest centre-back presses from the left-touchline side; protecting the ball on the inside foot keeps it away from that pressure.',
      n(
        'Protect the ball on the inside foot',
        'Keeping your body between the defender and the ball leaves room to turn toward the centre.',
        [['h-st', 80, 49]],
        [['a-rcb', 81, 43]],
      ),
      k(
        'Lay the ball back to midfield',
        'The lay-off retains possession, but you release the chance to turn in the box.',
        [
          ['h-st', 79, 46],
          ['h-l8', 71, 33],
        ],
      ),
      l(
        'Turn toward the left touchline',
        'The centre-back is already on the touchline side and reaches the exposed touch.',
        [
          ['h-st', 80, 42],
          ['a-rcb', 81, 42],
        ],
      ),
    ),
    read(
      'h-st',
      'Attacking',
      'The ball is protected on the inside foot. The close defender remains on the left-touchline side; the second centre-back is farther toward the right channel.',
      g(
        'Roll toward the centre and finish',
        'You turn away from the close defender and strike before the second centre-back crosses.',
        [['h-st', 85, 53]],
        [
          ['a-rcb', 82, 45],
          ['a-lcb', 89, 61],
        ],
        45,
      ),
      k(
        'Set the ball to the right midfielder',
        'The set keeps the ball but allows both centre-backs to face the next attack.',
        [
          ['h-st', 80, 49],
          ['h-r8', 72, 67],
        ],
      ),
      l(
        'Shoot while facing away',
        'The defender blocks a shot struck before your body turns toward goal.',
        [
          ['h-st', 80, 49],
          ['a-rcb', 82, 47],
        ],
      ),
    ),
  ),

  easy(
    'left-eight-wall',
    'Run beyond the lay-off',
    'A midfielder uses the striker as a wall and follows the pass.',
    'h-l8',
    attacking([
      ['h-l8', 67, 30],
      ['h-st', 77, 43],
      ['a-six', 69, 39],
      ['a-rcb', 88, 46],
      ['a-rb', 80, 17],
      ['a-gk', 95, 53],
    ]),
    read(
      'h-l8',
      'Attacking',
      'Their six is closing from inside. Our striker is showing for the ball, and your path beyond the six stays to the left of the centre-back.',
      n(
        'Pass into the striker and continue',
        'The striker receives with room to set the ball while you continue beyond the midfield challenge.',
        [['h-st', 78, 43]],
        [
          ['h-l8', 78, 33],
          ['a-six', 73, 40],
        ],
      ),
      k(
        'Send the ball out to the left winger',
        'The winger retains possession, but the six stays between you and the box.',
        [
          ['h-l8', 67, 30],
          ['h-lw', 74, 15],
        ],
      ),
      l(
        'Carry diagonally through midfield',
        'The six can meet the diagonal carrying touch.',
        [
          ['h-l8', 71, 36],
          ['a-six', 72, 36],
        ],
      ),
    ),
    read(
      'h-st',
      'Attacking',
      'You have the ball at your feet. Our left midfielder has continued beyond their six and is still behind the centre-back line.',
      g(
        'Lay the ball into the midfielder’s run',
        'The return meets the continuing run and the midfielder finishes before the back line narrows.',
        [
          ['h-st', 78, 43],
          ['h-l8', 86, 35],
        ],
        [['a-rcb', 88, 45]],
        48,
      ),
      k(
        'Turn and carry across the area',
        'You keep possession, but the continuing midfielder has to stop the run.',
        [['h-st', 80, 49]],
      ),
      l(
        'Pass toward the right winger',
        'The six has recovered across that switch and intercepts.',
        [
          ['h-st', 78, 43],
          ['a-six', 79, 60],
        ],
      ),
    ),
  ),

  easy(
    'right-eight-front-foot',
    'Receive on the front foot',
    'The receiving touch takes a midfielder away from pressure.',
    'h-rcb',
    attacking([
      ['h-rcb', 63, 64],
      ['h-r8', 75, 61],
      ['a-l8', 72, 69],
      ['a-six', 74, 45],
      ['a-lcb', 88, 66],
      ['a-gk', 95, 48],
    ]),
    read(
      'h-rcb',
      'Attacking',
      'Our right midfielder has space in front, with an opponent approaching from behind and outside. A pass to the forward foot can keep the next touch away from pressure.',
      n(
        'Pass ahead of the midfielder’s right foot',
        'The forward-foot delivery lets the midfielder take the ball toward the box instead of stopping under the challenge.',
        [
          ['h-rcb', 63, 64],
          ['h-r8', 79, 59],
        ],
        [['a-l8', 76, 67]],
      ),
      k(
        'Pass across to our left centre-back',
        'The ball stays ours while the opponent closes the receiving space.',
        [
          ['h-rcb', 63, 64],
          ['h-lcb', 62, 35],
        ],
      ),
      l(
        'Pass toward the midfielder’s trailing foot',
        'The opponent arrives from that side and takes the exposed ball.',
        [
          ['h-rcb', 63, 64],
          ['a-l8', 75, 65],
        ],
      ),
    ),
    read(
      'h-r8',
      'Attacking',
      'Your forward touch has escaped the trailing opponent. The left centre-back is guarding the wider channel; you can strike through the inside lane.',
      g(
        'Take one touch toward the middle and shoot',
        'The inside touch changes the shooting angle before the centre-back can close it.',
        [['h-r8', 84, 53]],
        [['a-lcb', 88, 63]],
        43,
      ),
      k(
        'Pass back to the centre-back',
        'The return retains the ball but gives the trailing opponent time to recover.',
        [
          ['h-r8', 79, 59],
          ['h-rcb', 70, 64],
        ],
      ),
      l(
        'Carry toward the right corner',
        'The centre-back is waiting in that wider channel and takes the touch.',
        [
          ['h-r8', 85, 66],
          ['a-lcb', 86, 66],
        ],
      ),
    ),
  ),

  easy(
    'wide-to-six-shot',
    'The edge arrives',
    'A winger spots the six arriving behind the first wave.',
    'h-lw',
    attacking([
      ['h-lw', 83, 17],
      ['h-six', 73, 44],
      ['h-st', 83, 54],
      ['a-rb', 85, 21],
      ['a-rcb', 88, 39],
      ['a-lcb', 88, 57],
      ['a-gk', 95, 50],
    ]),
    read(
      'h-lw',
      'Attacking',
      'Both centre-backs are following our striker toward goal. Our six is arriving behind them near the edge of the area, with a clear backward passing lane.',
      n(
        'Pull the ball back to the six',
        'The backward delivery reaches the arriving midfielder outside the centre-backs’ first line.',
        [
          ['h-lw', 83, 17],
          ['h-six', 79, 42],
        ],
        [
          ['a-rcb', 91, 39],
          ['a-lcb', 91, 54],
          ['h-st', 90, 55],
        ],
      ),
      k(
        'Return to the left-back',
        'The left-back keeps possession while the centre-backs recover their shape.',
        [
          ['h-lw', 83, 17],
          ['h-lb', 74, 13],
        ],
      ),
      l(
        'Cross beside the goalkeeper',
        'The keeper can step forward and claim a delivery through the central goalmouth.',
        [
          ['h-lw', 83, 17],
          ['a-gk', 92, 47],
        ],
      ),
    ),
    read(
      'h-six',
      'Attacking',
      'You have controlled the pull-back at the edge. The defenders are deeper and our striker has moved away from your shooting line.',
      g(
        'Strike through the open central lane',
        'The controlled first touch sets up a firm finish before the defenders can come out.',
        [['h-six', 81, 43]],
        [
          ['h-st', 92, 60],
          ['a-gk', 96, 49],
        ],
        45,
      ),
      k(
        'Pass across to the right midfielder',
        'The extra pass retains possession but lets the defence step out together.',
        [
          ['h-six', 79, 42],
          ['h-r8', 77, 68],
        ],
      ),
      l(
        'Carry toward the penalty spot',
        'The recovering centre-back can meet the carrying touch nearer the box.',
        [
          ['h-six', 86, 44],
          ['a-rcb', 86, 44],
        ],
      ),
    ),
  ),

  easy(
    'left-winger-low-square',
    'Across the six-yard line',
    'The ball reaches a second winger from behind the defensive line.',
    'h-lw',
    attacking([
      ['h-lw', 85, 14],
      ['h-rw', 83, 67],
      ['h-st', 84, 47],
      ['a-rb', 84, 20],
      ['a-rcb', 89, 37],
      ['a-lcb', 89, 55],
      ['a-gk', 94, 43],
    ]),
    read(
      'h-lw',
      'Attacking',
      'The defender is approaching from inside. You can reach the byline outside, while our right winger waits behind the ball’s eventual crossing position.',
      n(
        'Carry outside toward the byline',
        'The outside touch takes you beyond the full-back; our right winger begins a run toward the back of the six-yard area.',
        [['h-lw', 92, 18]],
        [
          ['a-rb', 88, 22],
          ['h-rw', 88, 65],
          ['a-gk', 94, 43],
        ],
      ),
      k(
        'Set the ball to the left midfielder',
        'The set retains possession, but the full-back can protect the byline.',
        [
          ['h-lw', 85, 14],
          ['h-l8', 76, 31],
        ],
      ),
      l(
        'Carry inside toward the centre-back',
        'The centre-back closes the inside lane before you can cross.',
        [
          ['h-lw', 88, 29],
          ['a-rcb', 89, 30],
        ],
      ),
    ),
    read(
      'h-lw',
      'Attacking',
      'You have reached the byline. The keeper is near the left post; our right winger is behind your ball position and arriving toward the far side.',
      g(
        'Square low to the far-side winger',
        'The pass travels behind the keeper and the winger meets it before the defender can turn.',
        [
          ['h-lw', 92, 18],
          ['h-rw', 94, 59],
        ],
        [
          ['a-gk', 94, 45],
          ['a-lcb', 92, 53],
        ],
        59,
      ),
      k(
        'Pull back to the left midfielder',
        'The ball remains ours outside the area, but the close-range crossing chance ends.',
        [
          ['h-lw', 92, 18],
          ['h-l8', 80, 31],
        ],
      ),
      l(
        'Shoot at the near post',
        'The keeper is already protecting that post and catches the angled shot.',
        [
          ['h-lw', 92, 18],
          ['a-gk', 95, 42],
        ],
      ),
    ),
  ),

  easy(
    'right-cross-front-header',
    'In front of the marker',
    'A striker attacks a delivery ahead of the centre-back.',
    'h-rw',
    attacking([
      ['h-rw', 79, 87],
      ['h-st', 80, 57],
      ['a-lb', 81, 80],
      ['a-lcb', 87, 63],
      ['a-rcb', 89, 41],
      ['a-gk', 95, 49],
    ]),
    read(
      'h-rw',
      'Attacking',
      'Our striker is level with the ball and inside the nearest centre-back. The full-back is closing; a delivery now can meet the striker’s run across the marker.',
      n(
        'Cross early in front of the striker',
        'The striker starts onside, crosses the defender’s front and makes the first header.',
        [
          ['h-rw', 79, 87],
          ['h-st', 88, 59],
        ],
        [
          ['a-lcb', 89, 63],
          ['a-gk', 95, 46],
        ],
      ),
      k(
        'Pass back to the right-back',
        'The return retains possession while the striker has to pause the run.',
        [
          ['h-rw', 79, 87],
          ['h-rb', 71, 87],
        ],
      ),
      l(
        'Take another touch toward the corner',
        'The full-back reaches that touch before you can deliver.',
        [
          ['h-rw', 83, 89],
          ['a-lb', 84, 89],
        ],
      ),
    ),
    read(
      'h-st',
      'Attacking',
      'Your first header has brought the ball down in front of you. The marker is outside your right shoulder and the keeper has moved toward the far side.',
      g(
        'Finish low toward the right corner',
        'The controlled header leaves a short finishing touch into the nearer corner.',
        [['h-st', 91, 60]],
        [
          ['a-lcb', 90, 65],
          ['a-gk', 96, 46],
        ],
        59,
      ),
      k(
        'Set the ball toward the arriving midfielder',
        'The set keeps possession, but the centre-back can recover goal side.',
        [
          ['h-st', 88, 59],
          ['h-r8', 80, 68],
        ],
      ),
      l(
        'Turn back toward the marker',
        'The centre-back is close enough to collect that turning touch.',
        [
          ['h-st', 88, 64],
          ['a-lcb', 89, 64],
        ],
      ),
    ),
  ),

  easy(
    'striker-channel-slide',
    'Slide into the channel',
    'A striker receives beyond midfield without starting beyond the back line.',
    'h-six',
    attacking([
      ['h-six', 68, 53],
      ['h-st', 79, 44],
      ['a-six', 73, 58],
      ['a-rcb', 87, 35],
      ['a-lcb', 88, 61],
      ['a-gk', 94, 50],
    ]),
    read(
      'h-six',
      'Attacking',
      'Their six is to the right of the ball. Our striker starts behind both centre-backs and points toward the left channel between them.',
      n(
        'Slide the pass into the left channel',
        'The striker runs from an onside position and receives between the centre-backs.',
        [
          ['h-six', 68, 53],
          ['h-st', 85, 46],
        ],
        [
          ['a-rcb', 89, 35],
          ['a-lcb', 89, 62],
          ['a-gk', 91, 51],
        ],
      ),
      k(
        'Pass right to the midfielder',
        'The midfielder keeps the ball, but their six can recover across the channel.',
        [
          ['h-six', 68, 53],
          ['h-r8', 74, 69],
        ],
      ),
      l(
        'Carry toward their six',
        'The six meets the carrying touch before the striker receives.',
        [
          ['h-six', 73, 56],
          ['a-six', 74, 56],
        ],
      ),
    ),
    read(
      'h-st',
      'Attacking',
      'You have controlled the channel pass. The keeper has advanced toward the middle, leaving a low angle on your left.',
      g(
        'Finish low to the left of the keeper',
        'You place the shot away from the advancing keeper before the defender can cross.',
        [['h-st', 87, 43]],
        [
          ['a-gk', 93, 51],
          ['a-rcb', 89, 38],
        ],
        42,
      ),
      k(
        'Turn out toward the left winger',
        'The pass keeps possession wide but lets the keeper recover toward the goal.',
        [
          ['h-st', 85, 46],
          ['h-lw', 84, 18],
        ],
      ),
      l(
        'Carry straight toward the keeper',
        'The keeper can meet a straight carrying touch and smother the ball.',
        [
          ['h-st', 89, 48],
          ['a-gk', 90, 48],
        ],
      ),
    ),
  ),

  easy(
    'goalkeeper-middle-switch',
    'The keeper starts the switch',
    'A goalkeeper reads the press before a midfielder drives into the next gap.',
    'h-gk',
    attacking([
      ['h-gk', 18, 47],
      ['h-six', 43, 41],
      ['h-l8', 57, 29],
      ['a-st', 30, 51],
      ['a-r8', 40, 64],
      ['a-six', 63, 53],
      ['a-rcb', 88, 39],
      ['a-gk', 95, 53],
    ]),
    read(
      'h-gk',
      'Attacking',
      'Their striker presses from your right and their midfielder has followed our right centre-back. Our six shows on the opposite side with room to turn.',
      n(
        'Pass to the six on the left of the press',
        'The six controls away from the striker, while the right-sided press continues beyond the ball.',
        [
          ['h-gk', 18, 47],
          ['h-six', 48, 39],
        ],
        [
          ['a-st', 24, 53],
          ['a-r8', 43, 65],
          ['h-l8', 70, 30],
        ],
      ),
      k(
        'Roll to the left centre-back',
        'We retain possession behind the press, but do not reach the turning midfielder.',
        [
          ['h-gk', 18, 47],
          ['h-lcb', 25, 32],
        ],
      ),
      l(
        'Pass toward the right centre-back',
        'The pressing midfielder is already positioned to collect that delivery.',
        [
          ['h-gk', 18, 47],
          ['a-r8', 30, 62],
        ],
      ),
    ),
    read(
      'h-six',
      'Attacking',
      'You have turned on the left side of the press. Our left midfielder has advanced behind their six, still well behind the centre-backs; a diagonal pass can reach the next space.',
      g(
        'Find the left midfielder beyond their six',
        'The midfielder receives facing goal, takes the open lane and finishes from the left edge of the box.',
        [
          ['h-six', 48, 39],
          ['h-l8', 78, 31],
          ['h-l8', 85, 35],
        ],
        [
          ['a-six', 65, 54],
          ['a-rcb', 88, 42],
        ],
        47,
      ),
      k(
        'Play back to the goalkeeper',
        'The return keeps the ball but lets the press turn toward the new side.',
        [
          ['h-six', 48, 39],
          ['h-gk', 22, 47],
        ],
      ),
      l(
        'Drive the pass through central midfield',
        'Their six is still protecting the direct central route.',
        [
          ['h-six', 48, 39],
          ['a-six', 63, 50],
        ],
      ),
    ),
  ),

  easy(
    'right-eight-outside-cross',
    'Use the outside shoulder',
    'A midfielder escapes an inside challenge and delivers from a new angle.',
    'h-r8',
    attacking([
      ['h-r8', 72, 68],
      ['h-st', 82, 51],
      ['a-six', 73, 61],
      ['a-lb', 81, 87],
      ['a-lcb', 88, 60],
      ['a-rcb', 88, 39],
      ['a-gk', 95, 55],
    ]),
    read(
      'h-r8',
      'Attacking',
      'Their six approaches from your left. The lane outside your right foot is clear, and our striker waits behind the centre-back line.',
      n(
        'Carry outside the approaching midfielder',
        'The outside touch removes the six from your delivery line and draws the full-back toward you.',
        [['h-r8', 80, 75]],
        [
          ['a-six', 77, 66],
          ['a-lb', 83, 82],
          ['h-st', 85, 48],
        ],
      ),
      k(
        'Set the ball to our six',
        'The set retains possession while their midfielder turns back toward the box.',
        [
          ['h-r8', 72, 68],
          ['h-six', 66, 49],
        ],
      ),
      l(
        'Carry inside the midfielder',
        'Their six is already approaching from that side and wins the touch.',
        [
          ['h-r8', 75, 63],
          ['a-six', 76, 63],
        ],
      ),
    ),
    read(
      'h-r8',
      'Attacking',
      'You have the ball in the right channel. Their full-back is coming outside toward you; our striker is behind the centre-backs and moving toward the left side of goal.',
      g(
        'Lift the delivery beyond the nearer centre-back',
        'The striker starts onside, meets the delivery on the far side and heads across the keeper.',
        [
          ['h-r8', 80, 75],
          ['h-st', 92, 43],
        ],
        [
          ['a-lcb', 90, 60],
          ['a-gk', 96, 54],
        ],
        42,
      ),
      k(
        'Pass out to the right winger',
        'The winger retains the ball but the full-back no longer has to cross toward your delivery.',
        [
          ['h-r8', 80, 75],
          ['h-rw', 83, 89],
        ],
      ),
      l(
        'Drive low toward the near centre-back',
        'The centre-back can cut out a low pass through their current position.',
        [
          ['h-r8', 80, 75],
          ['a-lcb', 88, 59],
        ],
      ),
    ),
  ),

  easy(
    'left-back-support-finish',
    'The supporting left-back',
    'The defender follows a winger and leaves a supporting run.',
    'h-lw',
    attacking([
      ['h-lw', 79, 20],
      ['h-lb', 69, 11],
      ['a-rb', 81, 22],
      ['a-rcb', 88, 44],
      ['h-l8', 73, 35],
      ['a-gk', 95, 54],
    ]),
    read(
      'h-lw',
      'Attacking',
      'The right-back is square in front of you. Our left-back is starting outside; a short inside touch can bring the defender away from that supporting run.',
      n(
        'Touch inside and set to the midfielder',
        'The right-back follows your inside touch, while our left-back continues outside behind the back line.',
        [
          ['h-lw', 80, 28],
          ['h-l8', 77, 35],
        ],
        [
          ['a-rb', 82, 28],
          ['h-lb', 83, 13],
        ],
      ),
      k(
        'Return down the line to the left-back',
        'The return keeps possession but the full-back remains facing both attackers.',
        [
          ['h-lw', 79, 20],
          ['h-lb', 71, 12],
        ],
      ),
      l(
        'Push the ball directly past the defender',
        'The full-back is balanced in front of that touch and takes the ball.',
        [
          ['h-lw', 83, 20],
          ['a-rb', 84, 20],
        ],
      ),
    ),
    read(
      'h-l8',
      'Attacking',
      'You have the set pass. Their right-back is narrow with our winger; our left-back has continued outside from behind the centre-back line.',
      g(
        'Release the left-back outside',
        'The supporting left-back collects the pass outside the defender and finishes from the left corner of the area.',
        [
          ['h-l8', 77, 35],
          ['h-lb', 89, 27],
        ],
        [
          ['a-rb', 85, 29],
          ['a-gk', 96, 52],
        ],
        43,
      ),
      k(
        'Switch to the right midfielder',
        'The switch retains possession but ends the left-back’s immediate chance.',
        [
          ['h-l8', 77, 35],
          ['h-r8', 75, 68],
        ],
      ),
      l(
        'Pass back into the winger’s turn',
        'The defender stayed with the winger and takes the return pass.',
        [
          ['h-l8', 77, 35],
          ['a-rb', 82, 27],
        ],
      ),
    ),
  ),

  easy(
    'six-wing-switch-shot',
    'A switch into the shot',
    'The six changes the attack from a crowded flank to a shooting winger.',
    'h-six',
    attacking([
      ['h-six', 68, 58],
      ['h-rw', 76, 85],
      ['h-lw', 80, 17],
      ['a-lb', 81, 79],
      ['a-rb', 84, 23],
      ['a-six', 73, 64],
      ['a-gk', 95, 48],
    ]),
    read(
      'h-six',
      'Attacking',
      'Their six and left-back have moved toward our right winger. On the other side, our left winger has room outside the right-back and is behind the centre-backs.',
      n(
        'Switch diagonally to the left winger',
        'The long diagonal reaches the opposite flank before the midfield pressure can cross.',
        [
          ['h-six', 68, 58],
          ['h-lw', 83, 18],
        ],
        [
          ['a-rb', 86, 24],
          ['a-six', 75, 60],
        ],
      ),
      k(
        'Pass to the right-back behind you',
        'The right-back retains the ball on the side their block is already covering.',
        [
          ['h-six', 68, 58],
          ['h-rb', 63, 85],
        ],
      ),
      l(
        'Pass forward through their six',
        'Their six can intercept the central delivery from the strong side.',
        [
          ['h-six', 68, 58],
          ['a-six', 73, 61],
        ],
      ),
    ),
    read(
      'h-lw',
      'Attacking',
      'The switch is controlled outside the right-back. The defender is inside your line; a first step down the outside gives you the angle to shoot across the keeper.',
      g(
        'Go outside and finish across goal',
        'The outside step opens the angle without bringing the ball toward the defender.',
        [['h-lw', 89, 20]],
        [
          ['a-rb', 87, 26],
          ['a-gk', 96, 47],
        ],
        57,
      ),
      k(
        'Return to the left midfielder',
        'The pass retains the ball but allows the defence to cross toward this side.',
        [
          ['h-lw', 83, 18],
          ['h-l8', 75, 32],
        ],
      ),
      l(
        'Carry inward at the full-back',
        'The full-back is already inside and meets that touch.',
        [
          ['h-lw', 86, 25],
          ['a-rb', 87, 25],
        ],
      ),
    ),
  ),

  easy(
    'striker-drop-right-eight',
    'The striker drops out',
    'A dropping striker releases a midfielder into the vacated lane.',
    'h-st',
    attacking([
      ['h-st', 77, 51],
      ['h-r8', 73, 68],
      ['a-lcb', 84, 55],
      ['a-rcb', 88, 37],
      ['a-six', 70, 44],
      ['a-gk', 95, 46],
    ]),
    read(
      'h-st',
      'Attacking',
      'The nearer centre-back is following you closely. Our right midfielder waits behind that defender; a short drop can draw the centre-back out.',
      n(
        'Drop toward midfield with the ball',
        'The centre-back follows your drop and leaves the right channel for the midfielder’s run.',
        [['h-st', 72, 54]],
        [
          ['a-lcb', 79, 56],
          ['h-r8', 78, 67],
        ],
      ),
      k(
        'Lay the ball back to our six',
        'The six retains possession, but the defender can stay near the edge of the area.',
        [
          ['h-st', 77, 51],
          ['h-six', 67, 50],
        ],
      ),
      l(
        'Turn directly at the close centre-back',
        'The defender can meet the ball before your turn is complete.',
        [
          ['h-st', 80, 54],
          ['a-lcb', 81, 54],
        ],
      ),
    ),
    read(
      'h-st',
      'Attacking',
      'The centre-back has come out toward your drop. Our right midfielder is still behind the deeper defender and is running into the empty channel.',
      g(
        'Pass into the right midfielder’s run',
        'The midfielder runs from an onside starting position, collects beyond the drawn-out defender and finishes.',
        [
          ['h-st', 72, 54],
          ['h-r8', 89, 67],
        ],
        [
          ['a-lcb', 83, 56],
          ['a-gk', 96, 48],
        ],
        56,
      ),
      k(
        'Switch out to the left winger',
        'The winger keeps possession, but the centre-back can drop back into the vacated space.',
        [
          ['h-st', 72, 54],
          ['h-lw', 78, 18],
        ],
      ),
      l(
        'Pass straight toward the penalty spot',
        'The deeper centre-back can step across a pass with no runner in that lane.',
        [
          ['h-st', 72, 54],
          ['a-rcb', 87, 47],
        ],
      ),
    ),
  ),

  easy(
    'chest-set-winger',
    'A chest-set opening',
    'A striker controls a high delivery and releases the closer support.',
    'h-st',
    attacking([
      ['h-st', 80, 49],
      ['h-rw', 77, 74],
      ['a-lcb', 82, 43],
      ['a-rcb', 88, 32],
      ['a-six', 73, 55],
      ['a-gk', 95, 46],
    ]),
    read(
      'h-st',
      'Attacking',
      'A high ball is dropping to your chest. The nearest centre-back is on your left, while our right winger offers support across your right shoulder.',
      n(
        'Cushion the ball toward your right foot',
        'The chest control places the ball away from the defender and leaves the winger’s passing lane visible.',
        [['h-st', 81, 53]],
        [
          ['a-lcb', 83, 45],
          ['h-rw', 82, 70],
        ],
      ),
      k(
        'Head the ball back to midfield',
        'The midfielder keeps the ball, but the defender can settle between you and goal.',
        [
          ['h-st', 80, 49],
          ['h-r8', 72, 65],
        ],
      ),
      l(
        'Chest the ball toward the left shoulder',
        'The centre-back reaches the ball on that side before you can settle it.',
        [
          ['h-st', 81, 45],
          ['a-lcb', 82, 45],
        ],
      ),
    ),
    read(
      'h-st',
      'Attacking',
      'The ball is at your right foot. Their centre-back is still on the other side, and our right winger can receive behind the deeper defensive line.',
      g(
        'Set right for the winger to finish',
        'The short pass meets the supporting winger, who finishes before the centre-back crosses.',
        [
          ['h-st', 81, 53],
          ['h-rw', 89, 64],
        ],
        [
          ['a-lcb', 86, 48],
          ['a-gk', 96, 48],
        ],
        57,
      ),
      k(
        'Roll the ball back to our six',
        'The six retains possession but the supporting winger’s moment ends.',
        [
          ['h-st', 81, 53],
          ['h-six', 73, 52],
        ],
      ),
      l(
        'Turn back across the centre-back',
        'The defender is still on that side and reaches your turning touch.',
        [
          ['h-st', 83, 46],
          ['a-lcb', 84, 46],
        ],
      ),
    ),
  ),

  easy(
    'left-eight-volley-set',
    'Let it drop once',
    'A midfielder settles a dropping ball before taking the available shot.',
    { x: 75, y: 37 },
    attacking([
      ['h-l8', 74, 37],
      ['a-six', 71, 48],
      ['a-rcb', 88, 30],
      ['a-lcb', 88, 65],
      ['a-gk', 95, 54],
      ['h-st', 82, 57],
    ]),
    read(
      'h-l8',
      'Attacking',
      'A headed clearance is dropping just in front of you. There is no immediate challenge; the centre-backs are deeper on either side of the central shooting lane.',
      n(
        'Let the ball drop and control forward',
        'A controlled touch sets the ball for a shot without needing to strike the awkward dropping height.',
        [['h-l8', 78, 39]],
        [
          ['a-six', 74, 47],
          ['h-st', 84, 62],
        ],
      ),
      k(
        'Cushion the ball back to our six',
        'The six keeps possession, but the defence can step out together.',
        [
          ['h-l8', 75, 37],
          ['h-six', 68, 49],
        ],
      ),
      l(
        'Volley while leaning backward',
        'The off-balance strike travels toward the centre-back, who controls the block.',
        [
          ['h-l8', 75, 37],
          ['a-rcb', 86, 37],
        ],
      ),
    ),
    read(
      'h-l8',
      'Attacking',
      'The ball is settled in front of your left foot. Their six is recovering from behind and our striker has moved to the right of your shooting line.',
      g(
        'Strike before the six closes',
        'The settled ball lets you shoot firmly across the keeper while the lane is still open.',
        [['h-l8', 80, 40]],
        [
          ['a-six', 77, 47],
          ['a-gk', 96, 53],
        ],
        43,
      ),
      k(
        'Pass wide to the left winger',
        'The wide pass keeps possession but allows the six to get behind the ball.',
        [
          ['h-l8', 78, 39],
          ['h-lw', 80, 17],
        ],
      ),
      l(
        'Take two touches across midfield',
        'The recovering six reaches the second carrying touch.',
        [
          ['h-l8', 81, 47],
          ['a-six', 82, 47],
        ],
      ),
    ),
  ),

  easy(
    'right-winger-slip-six',
    'The winger comes in',
    'A short inward carry makes room for an arriving six.',
    'h-rw',
    attacking([
      ['h-rw', 79, 85],
      ['h-six', 71, 55],
      ['a-lb', 81, 85],
      ['a-lcb', 88, 65],
      ['a-six', 73, 43],
      ['a-gk', 95, 46],
    ]),
    read(
      'h-rw',
      'Attacking',
      'Their left-back is protecting the touchline. Our six is arriving centrally behind their midfield line, so an inward touch can open the short passing lane.',
      n(
        'Carry inward away from the touchline',
        'The full-back follows inward but cannot reach the central support lane behind you.',
        [['h-rw', 81, 74]],
        [
          ['a-lb', 83, 79],
          ['h-six', 78, 57],
        ],
      ),
      k(
        'Return along the line to the right-back',
        'The right-back retains possession but the central arrival is no longer immediate.',
        [
          ['h-rw', 79, 85],
          ['h-rb', 70, 88],
        ],
      ),
      l(
        'Carry straight past the full-back outside',
        'The full-back is protecting that side and takes the carrying touch.',
        [
          ['h-rw', 84, 88],
          ['a-lb', 85, 88],
        ],
      ),
    ),
    read(
      'h-rw',
      'Attacking',
      'You have the ball in the right half-space. The full-back is beside you outside; our six is facing goal behind the ball, away from the centre-back’s wider position.',
      g(
        'Set inside for the arriving six',
        'The short inside set reaches the six, who steps into the open central shot.',
        [
          ['h-rw', 81, 74],
          ['h-six', 82, 55],
        ],
        [
          ['a-lcb', 89, 65],
          ['a-gk', 96, 47],
        ],
        55,
      ),
      k(
        'Pass across to the left midfielder',
        'The switch retains possession but gives their midfield time to recover centrally.',
        [
          ['h-rw', 81, 74],
          ['h-l8', 75, 34],
        ],
      ),
      l(
        'Shoot from the wide angle',
        'The full-back can block the shot from beside your outside foot.',
        [
          ['h-rw', 81, 74],
          ['a-lb', 85, 72],
        ],
      ),
    ),
  ),

  easy(
    'right-centre-back-diagonal',
    'The long diagonal run',
    'A centre-back sees the winger before the first press reaches the ball.',
    'h-rcb',
    attacking([
      ['h-rcb', 58, 64],
      ['h-rw', 78, 85],
      ['a-st', 62, 57],
      ['a-lb', 81, 74],
      ['a-lcb', 88, 62],
      ['a-gk', 95, 43],
    ]),
    read(
      'h-rcb',
      'Attacking',
      'Their striker is coming from inside. Our right winger has room outside the full-back and starts behind the defensive line.',
      n(
        'Pass diagonally outside the full-back',
        'The winger receives the diagonal before the striker can reach you and the full-back has to turn outward.',
        [
          ['h-rcb', 58, 64],
          ['h-rw', 85, 86],
        ],
        [['a-lb', 86, 76]],
      ),
      k(
        'Pass back to our goalkeeper',
        'The return keeps possession but their striker can direct the next press.',
        [
          ['h-rcb', 58, 64],
          ['h-gk', 34, 50],
        ],
      ),
      l(
        'Carry inside toward the striker',
        'The striker is already approaching from that side and collects the touch.',
        [
          ['h-rcb', 62, 59],
          ['a-st', 63, 59],
        ],
      ),
    ),
    read(
      'h-rw',
      'Attacking',
      'The diagonal is controlled outside the full-back. The defender is inside your first touch, so the lane forward outside is available.',
      g(
        'Accelerate outside and shoot across goal',
        'The outside burst reaches the right side of the area and opens a finish across the keeper.',
        [['h-rw', 91, 77]],
        [
          ['a-lb', 89, 79],
          ['a-gk', 96, 45],
        ],
        57,
      ),
      k(
        'Set the ball back to the right-back',
        'The right-back retains possession, but the defender can get goal side again.',
        [
          ['h-rw', 85, 86],
          ['h-rb', 77, 88],
        ],
      ),
      l(
        'Cut back toward the centre-back',
        'The covering centre-back can meet the inward touch.',
        [
          ['h-rw', 88, 65],
          ['a-lcb', 89, 65],
        ],
      ),
    ),
  ),

  easy(
    'halfway-keeper-lob',
    'A keeper beyond the box',
    'A just-won midfield ball offers an unusual chance only if the keeper stays advanced.',
    'h-six',
    attacking([
      ['h-six', 53, 49],
      ['a-six', 55, 55],
      ['a-gk', 76, 47],
      ['a-rcb', 73, 28],
      ['a-lcb', 74, 74],
      ['a-rb', 70, 15],
      ['a-lb', 70, 86],
      ['h-st', 64, 62],
    ]),
    read(
      'h-six',
      'Attacking',
      'You have just won the ball near halfway. Their six is recovering from your right, and the keeper is well outside the area; first you need a settled touch away from pressure.',
      n(
        'Settle forward away from the recovering six',
        'Your controlled touch faces goal while the midfielder recovers behind you and the keeper begins retreating.',
        [['h-six', 54, 48]],
        [
          ['a-gk', 79, 47],
          ['a-six', 55, 56],
        ],
      ),
      k(
        'Pass back to the centre-back',
        'You keep possession with the backward pass, but the keeper has time to recover.',
        [
          ['h-six', 53, 49],
          ['h-lcb', 44, 34],
        ],
        [['a-gk', 88, 49]],
      ),
      l(
        'Turn toward the recovering midfielder',
        'Their six reaches the ball as you turn into the recovery challenge.',
        [
          ['h-six', 55, 54],
          ['a-six', 56, 54],
        ],
      ),
    ),
    read(
      'h-six',
      'Attacking',
      'Your regained ball is settled just beyond halfway. The keeper is retreating from outside the box and both centre-backs are well away from the direct shooting lane.',
      g(
        'Lift a measured shot over the retreating keeper',
        'The rare long lob is earned by the settled touch and the keeper’s advanced position. The keeper retreats toward the line but cannot reach the ball above them.',
        [['h-six', 55, 48]],
        [['a-gk', 91, 48]],
        49,
      ),
      k(
        'Pass to our right midfielder',
        'The pass retains possession, but the keeper reaches the box and the unusual opening ends.',
        [
          ['h-six', 54, 48],
          ['h-r8', 61, 67],
        ],
        [['a-gk', 91, 49]],
      ),
      l(
        'Drive the shot at waist height',
        'The retreating keeper remains in the flight of the flatter shot and controls it inside the box.',
        [
          ['h-six', 54, 48],
          ['a-gk', 85, 49],
        ],
      ),
    ),
    true,
  ),

  easy(
    'low-long-drive',
    'A gap from distance',
    'A controlled diagonal touch opens a rare low shot from outside the area.',
    'h-r8',
    attacking([
      ['h-r8', 64, 64],
      ['a-six', 67, 55],
      ['a-lcb', 85, 72],
      ['a-rcb', 86, 31],
      ['a-gk', 95, 58],
      ['h-st', 80, 39],
    ]),
    read(
      'h-r8',
      'Attacking',
      'Their six is approaching from inside. A touch forward away from the six can escape the challenge; the keeper is watching from the right half of goal.',
      n(
        'Control diagonally away from the six',
        'The touch avoids midfield pressure and leaves a clear view of the opposite corner from well outside the box.',
        [['h-r8', 69, 62]],
        [
          ['a-six', 68, 53],
          ['a-gk', 95, 59],
          ['h-st', 82, 33],
        ],
      ),
      k(
        'Return to our right centre-back',
        'The return retains possession while their midfield settles in front of the shooting lane.',
        [
          ['h-r8', 64, 64],
          ['h-rcb', 55, 65],
        ],
      ),
      l(
        'Turn into the six’s approach',
        'The midfielder can take the ball on the side you turn toward.',
        [
          ['h-r8', 67, 56],
          ['a-six', 68, 56],
        ],
      ),
    ),
    read(
      'h-r8',
      'Attacking',
      'The ball is settled outside the area. The central lane is clear and the keeper is still to the right; there is a small window for a low drive toward the left corner.',
      g(
        'Drive low toward the opposite corner',
        'An accurate low strike uses the visible lane and the keeper’s starting position, rather than relying on distance alone.',
        [['h-r8', 70, 61]],
        [['a-gk', 97, 51]],
        42,
      ),
      k(
        'Play wide to the right winger',
        'The winger retains possession, but the keeper can reset centrally before the next shot.',
        [
          ['h-r8', 69, 62],
          ['h-rw', 78, 86],
        ],
        [['a-gk', 95, 50]],
      ),
      l(
        'Loft the shot toward the keeper’s side',
        'The keeper can track the higher effort on the side they already occupy.',
        [
          ['h-r8', 69, 62],
          ['a-gk', 95, 57],
        ],
      ),
    ),
    true,
  ),

  easy(
    'clearance-dipping-shot',
    'Set the dropping clearance',
    'A loose clearance becomes a rare dipping shot after a controlled first touch.',
    { x: 61, y: 38 },
    attacking([
      ['h-l8', 60, 37],
      ['a-six', 65, 55],
      ['a-rcb', 85, 26],
      ['a-lcb', 86, 73],
      ['a-gk', 86, 52],
      ['h-st', 79, 65],
    ]),
    read(
      'h-l8',
      'Attacking',
      'A clearance is dropping ahead of you in midfield. The nearest opponent is to your right, and the keeper has come near the front of the penalty area.',
      n(
        'Cushion the dropping ball forward',
        'The controlled touch leaves the ball settled for your next action, away from the opponent’s approach.',
        [['h-l8', 64, 39]],
        [
          ['a-six', 66, 52],
          ['a-gk', 87, 53],
        ],
      ),
      k(
        'Cushion back to our left centre-back',
        'The defender keeps the ball, but the keeper has time to recover toward the line.',
        [
          ['h-l8', 61, 38],
          ['h-lcb', 49, 34],
        ],
        [['a-gk', 94, 50]],
      ),
      l(
        'Strike the falling ball immediately',
        'The unsettled strike goes toward the wider centre-back, who controls it.',
        [
          ['h-l8', 61, 38],
          ['a-rcb', 83, 31],
        ],
      ),
    ),
    read(
      'h-l8',
      'Attacking',
      'Your first touch is settled outside the area. The keeper remains advanced and the centre-backs are wide of the lane; the opportunity is a measured strike over the keeper, not a hurried volley.',
      g(
        'Send a dipping shot over the keeper',
        'The earned long-range strike rises over the advanced keeper, who retreats toward goal but cannot recover underneath it.',
        [['h-l8', 65, 40]],
        [['a-gk', 94, 48]],
        47,
      ),
      k(
        'Pass to the striker’s feet',
        'The striker retains possession, but the keeper has reset for the shorter attack.',
        [
          ['h-l8', 64, 39],
          ['h-st', 81, 64],
        ],
        [['a-gk', 95, 50]],
      ),
      l(
        'Carry across toward the approaching six',
        'The opponent reaches the next touch before you can find another shooting angle.',
        [
          ['h-l8', 67, 49],
          ['a-six', 68, 49],
        ],
      ),
    ),
    true,
  ),

  easy(
    'right-back-carry-inside',
    'The full-back cuts in',
    'A right-back takes the lane the winger’s width creates.',
    'h-rb',
    attacking([
      ['h-rb', 72, 81],
      ['h-rw', 82, 91],
      ['a-lb', 83, 88],
      ['a-six', 75, 55],
      ['a-lcb', 88, 68],
      ['a-gk', 95, 44],
    ]),
    read(
      'h-rb',
      'Attacking',
      'Their full-back has followed our winger toward the touchline. Their six is central, leaving an inside lane for you between those two defenders.',
      n(
        'Carry diagonally into the inside lane',
        'You advance between the wide full-back and central midfielder while the winger keeps the outside defender occupied.',
        [['h-rb', 80, 71]],
        [
          ['a-lb', 86, 88],
          ['a-six', 77, 54],
          ['a-lcb', 89, 69],
        ],
      ),
      k(
        'Pass back to the right centre-back',
        'The return retains possession but the full-back can turn inward toward the lane.',
        [
          ['h-rb', 72, 81],
          ['h-rcb', 63, 64],
        ],
      ),
      l(
        'Pass along the line to the winger',
        'The full-back is already close to the winger and intercepts the delivery.',
        [
          ['h-rb', 72, 81],
          ['a-lb', 83, 88],
        ],
      ),
    ),
    read(
      'h-rb',
      'Attacking',
      'Your carry has reached the right edge of the box. The centre-back is outside your next touch, and the keeper is toward the left side of goal.',
      g(
        'Touch inward and shoot toward the right corner',
        'The inward touch clears the wider centre-back and leaves a low finish away from the keeper.',
        [['h-rb', 85, 61]],
        [
          ['a-lcb', 90, 69],
          ['a-gk', 96, 47],
        ],
        58,
      ),
      k(
        'Set the ball to our six',
        'The six retains possession, but the centre-back can step back toward the central lane.',
        [
          ['h-rb', 80, 71],
          ['h-six', 73, 50],
        ],
      ),
      l(
        'Carry toward the right side of the box',
        'The centre-back is waiting on that side and takes the touch.',
        [
          ['h-rb', 86, 70],
          ['a-lcb', 87, 70],
        ],
      ),
    ),
  ),

  // Defensive reads include delaying, screening, regains and goalkeeper decisions.
  // Safe second touches are playable outcomes, not automatic credit for a stop.
  easy(
    'left-back-show-line',
    'Keep the winger outside',
    'A full-back waits for the touch that separates ball and opponent.',
    'a-rw',
    defending([
      ['a-rw', 32, 15],
      ['h-lb', 25, 23],
      ['h-lcb', 16, 39],
      ['h-lw', 37, 10],
    ]),
    read(
      'h-lb',
      'Defending',
      'Their right winger is facing you near the left touchline. The inside route leads toward our box; your centre-back is deeper inside.',
      n(
        'Stay inside and match the winger’s run',
        'Your position keeps the winger outside, with you close enough to challenge their next touch down the line.',
        [['a-rw', 26, 14]],
        [
          ['h-lb', 24, 18],
          ['h-lcb', 15, 35],
        ],
      ),
      d(
        'Retreat toward the corner',
        'You delay the attack but give the winger room to stop and recycle.',
        [
          ['a-rw', 26, 18],
          ['a-r8', 33, 31],
        ],
        [['h-lb', 19, 23]],
      ),
      x(
        'Step toward the winger’s outside shoulder',
        'The winger turns inside the challenge, then finishes before the centre-back can cross.',
        [
          ['a-rw', 27, 24],
          ['a-rw', 15, 36],
        ],
        [['h-lb', 24, 14]],
        43,
      ),
    ),
    read(
      'h-lb',
      'Defending',
      'The winger has carried down the outside, with you still inside and close enough to challenge the next touch. Our left winger is available up the line after the tackle.',
      r(
        'Meet the next touch and pass up the line',
        'Your inside position lets you win the next touch and find our winger away from the box.',
        [
          ['a-rw', 26, 14],
          ['h-lb', 25, 14],
          ['h-lw', 38, 10],
        ],
      ),
      d(
        'Keep retreating outside',
        'The winger reaches the ball again and chooses a backward pass.',
        [
          ['a-rw', 23, 14],
          ['a-r8', 31, 28],
        ],
        [['h-lb', 19, 18]],
      ),
      x(
        'Turn inward before challenging',
        'The winger recovers the ball and crosses behind your turn for their striker’s finish.',
        [
          ['a-rw', 23, 14],
          ['a-st', 14, 44],
        ],
        [['h-lb', 22, 23]],
        44,
      ),
    ),
  ),

  easy(
    'right-back-cross-shield',
    'Close the crossing angle',
    'A right-back gets close enough to stop the delivery before tackling.',
    'a-lw',
    defending([
      ['a-lw', 31, 86],
      ['h-rb', 24, 80],
      ['h-rcb', 16, 61],
      ['h-rw', 38, 89],
      ['a-st', 26, 55],
    ]),
    read(
      'h-rb',
      'Defending',
      'Their left winger is preparing a cross from our right side. You are close enough to shorten the crossing angle without running past the ball.',
      n(
        'Approach with short steps toward the ball',
        'Your balanced approach makes the winger put the ball down for another touch instead of crossing immediately.',
        [['a-lw', 27, 86]],
        [['h-rb', 25, 82]],
      ),
      d(
        'Drop toward the centre-back',
        'The box remains protected, but the winger has time to return the ball to midfield.',
        [
          ['a-lw', 29, 86],
          ['a-l8', 37, 67],
        ],
        [['h-rb', 19, 72]],
      ),
      x(
        'Sprint past the winger toward the byline',
        'The winger cuts behind your run and crosses for a close-range finish.',
        [
          ['a-lw', 25, 76],
          ['a-st', 12, 54],
        ],
        [['h-rb', 20, 88]],
        56,
      ),
    ),
    read(
      'h-rb',
      'Defending',
      'The winger still controls the ball on your touchline side. You are close and balanced enough to challenge the next touch, with our right winger ahead as an outlet.',
      r(
        'Block the touch and find our winger',
        'You take the outside touch and move the ball up the line before the winger can challenge again.',
        [
          ['a-lw', 27, 86],
          ['h-rb', 26, 86],
          ['h-rw', 40, 89],
        ],
      ),
      d(
        'Stand off the next touch',
        'The winger regains space to turn and recycle the attack.',
        [
          ['a-lw', 27, 82],
          ['a-l8', 37, 67],
        ],
        [['h-rb', 24, 83]],
      ),
      x(
        'Turn toward the striker in the box',
        'You leave the ball carrier, who crosses for the striker to meet inside the area.',
        [
          ['a-lw', 24, 85],
          ['a-st', 13, 53],
        ],
        [['h-rb', 20, 68]],
        57,
      ),
    ),
  ),

  easy(
    'centre-back-drop-pass',
    'Follow the first run',
    'A centre-back protects depth before the through ball arrives.',
    'a-l8',
    defending([
      ['a-l8', 46, 36],
      ['a-st', 25, 39],
      ['h-lcb', 21, 37],
      ['h-rcb', 20, 61],
      ['h-gk', 7, 51],
      ['h-lb', 22, 17],
      ['h-rb', 22, 84],
    ]),
    read(
      'h-lcb',
      'Defending',
      'The passer has looked up without pressure. Their striker is still onside and is beginning a run toward the left side of our box.',
      n(
        'Turn and drop with the striker',
        'You protect the space behind rather than relying on a late step. The through pass arrives with you between striker and goal.',
        [
          ['a-l8', 46, 36],
          ['a-st', 15, 36],
        ],
        [
          ['h-lcb', 12, 37],
          ['h-rcb', 15, 58],
        ],
      ),
      d(
        'Hold the line and block the central pass',
        'The passer has to keep the ball and switch sideways rather than play through centrally.',
        [
          ['a-l8', 44, 38],
          ['a-r8', 43, 65],
        ],
        [['h-lcb', 20, 40]],
      ),
      x(
        'Step forward after the striker starts',
        'The striker began onside; your late step leaves the through pass beyond you and a finish follows.',
        [
          ['a-l8', 46, 36],
          ['a-st', 13, 36],
        ],
        [['h-lcb', 26, 37]],
        42,
      ),
    ),
    read(
      'h-lcb',
      'Defending',
      'The striker has received the pass but you are goal side, close enough to meet the next touch. Our keeper stays deeper, while the six offers an outlet.',
      r(
        'Meet the striker’s next touch and pass to the six',
        'Your early drop puts you in position to win the next touch and clear the pressure through midfield.',
        [
          ['a-st', 14, 36],
          ['h-lcb', 13, 36],
          ['h-six', 30, 47],
        ],
        [['h-gk', 7, 49]],
      ),
      d(
        'Keep goal side and wait',
        'The striker cannot turn toward goal and recycles to the supporting midfielder.',
        [
          ['a-st', 16, 35],
          ['a-l8', 34, 32],
        ],
        [['h-lcb', 12, 36]],
      ),
      x(
        'Move across toward the other centre-back',
        'The striker uses the space you leave on the left and finishes before the keeper can close.',
        [['a-st', 12, 34]],
        [
          ['h-lcb', 14, 46],
          ['h-gk', 7, 48],
        ],
        42,
      ),
    ),
  ),

  easy(
    'six-screen-square',
    'Protect the square pass',
    'A six stays with the dangerous central lane rather than chasing the wing.',
    'a-lw',
    defending([
      ['a-lw', 28, 83],
      ['a-r8', 26, 52],
      ['h-six', 23, 59],
      ['h-rb', 19, 81],
      ['h-rcb', 15, 66],
      ['h-l8', 35, 35],
    ]),
    read(
      'h-six',
      'Defending',
      'Our right-back is already approaching the winger. Their right midfielder waits inside for a square pass; you are between that receiver and our goal.',
      n(
        'Stay in the square passing lane',
        'You leave the winger to our right-back and stay close to the central receiver as the square pass arrives.',
        [
          ['a-lw', 25, 82],
          ['a-r8', 23, 55],
        ],
        [
          ['h-six', 21, 55],
          ['h-rb', 23, 80],
        ],
      ),
      d(
        'Drop toward the penalty spot',
        'The middle remains protected, but the winger can pass backward and reset.',
        [
          ['a-lw', 27, 81],
          ['a-l8', 37, 68],
        ],
        [['h-six', 17, 54]],
      ),
      x(
        'Join the right-back beside the winger',
        'Both defenders go to the ball, leaving the inside receiver able to finish the square pass.',
        [
          ['a-lw', 25, 82],
          ['a-r8', 15, 54],
        ],
        [['h-six', 23, 76]],
        57,
      ),
    ),
    read(
      'h-six',
      'Defending',
      'The midfielder has controlled the square pass just in front of you. Their next touch turns toward goal, while our left midfielder waits outside the pressure.',
      r(
        'Take the turning touch and pass left',
        'You win the receiver’s exposed touch and find a teammate beyond the crowded side.',
        [
          ['a-r8', 22, 53],
          ['h-six', 21, 53],
          ['h-l8', 36, 35],
        ],
      ),
      d(
        'Keep screening without challenging',
        'The receiver cannot face goal cleanly and returns the ball to the winger.',
        [
          ['a-r8', 24, 55],
          ['a-lw', 29, 82],
        ],
        [['h-six', 20, 53]],
      ),
      x(
        'Turn back toward the winger',
        'The inside receiver uses the space in front of you for a low shot.',
        [['a-r8', 18, 52]],
        [['h-six', 23, 66]],
        44,
      ),
    ),
  ),

  easy(
    'right-eight-track-runner',
    'Stay with the runner',
    'A midfielder tracks the player who is trying to arrive behind the centre-back.',
    'a-six',
    defending([
      ['a-six', 43, 48],
      ['a-l8', 32, 65],
      ['h-r8', 30, 69],
      ['h-rcb', 17, 57],
      ['a-st', 25, 43],
      ['h-rw', 41, 86],
    ]),
    read(
      'h-r8',
      'Defending',
      'Their left midfielder is running forward without the ball. Our centre-back is occupied by the striker, so this is your runner to follow.',
      n(
        'Turn with the midfielder’s forward run',
        'You track the run rather than watching the passer. The midfielder receives with you goal side.',
        [
          ['a-six', 43, 48],
          ['a-l8', 22, 65],
        ],
        [
          ['h-r8', 20, 66],
          ['h-rcb', 15, 54],
        ],
      ),
      d(
        'Stay central beside our six',
        'The central lane remains protected, and their passer recycles rather than risk the tight through pass.',
        [
          ['a-six', 43, 48],
          ['a-r8', 41, 31],
        ],
        [['h-r8', 27, 55]],
      ),
      x(
        'Move toward the passer',
        'The runner starts onside and receives behind your movement before finishing.',
        [
          ['a-six', 43, 48],
          ['a-l8', 15, 63],
        ],
        [['h-r8', 36, 56]],
        57,
      ),
    ),
    read(
      'h-r8',
      'Defending',
      'The tracked runner has controlled the pass. You remain between them and goal, with our right winger available farther up the side.',
      r(
        'Challenge the forward touch and pass wide',
        'Tracking the run lets you win the next forward touch and use the winger as an outlet.',
        [
          ['a-l8', 20, 65],
          ['h-r8', 19, 65],
          ['h-rw', 42, 86],
        ],
      ),
      d(
        'Hold your goal-side position',
        'The runner has no direct shot and returns possession to midfield.',
        [
          ['a-l8', 22, 66],
          ['a-six', 36, 49],
        ],
        [['h-r8', 18, 64]],
      ),
      x(
        'Leave the runner for the centre-back',
        'The centre-back is still occupied, so the midfielder turns toward goal and finishes.',
        [['a-l8', 14, 61]],
        [['h-r8', 23, 53]],
        57,
      ),
    ),
  ),

  easy(
    'left-winger-recovery-outside',
    'The winger comes back',
    'A recovering winger closes a full-back’s forward touch.',
    'a-rb',
    defending([
      ['a-rb', 40, 13],
      ['h-lw', 39, 21],
      ['h-lb', 24, 17],
      ['a-rw', 28, 27],
      ['h-six', 29, 48],
    ]),
    read(
      'h-lw',
      'Defending',
      'Their right-back is carrying down our left side. Our left-back is covering the winger inside, so your recovery can meet the full-back before a cross develops.',
      n(
        'Recover along the full-back’s inside shoulder',
        'Your recovery closes the route inside and brings you alongside the full-back near the line.',
        [['a-rb', 33, 12]],
        [
          ['h-lw', 32, 17],
          ['h-lb', 23, 27],
        ],
      ),
      d(
        'Drop toward our left-back',
        'You add cover inside, but their full-back can turn and recycle outside.',
        [
          ['a-rb', 36, 13],
          ['a-r8', 41, 34],
        ],
        [['h-lw', 27, 27]],
      ),
      x(
        'Stop and watch the inside winger',
        'The full-back continues unopposed to a crossing position and finds the striker’s finish.',
        [
          ['a-rb', 22, 13],
          ['a-st', 14, 46],
        ],
        [['h-lw', 37, 25]],
        44,
      ),
    ),
    read(
      'h-lw',
      'Defending',
      'You have recovered beside the ball-carrying full-back, still blocking the route inside. Our six offers a pass away from the touchline after a challenge.',
      r(
        'Meet the outside touch and pass inside',
        'You win the next outside touch and use the six to escape the line.',
        [
          ['a-rb', 33, 12],
          ['h-lw', 32, 12],
          ['h-six', 31, 47],
        ],
      ),
      d(
        'Keep escorting the full-back outside',
        'The full-back recovers control but has to play backward rather than cross.',
        [
          ['a-rb', 29, 12],
          ['a-r8', 38, 32],
        ],
        [['h-lw', 28, 18]],
      ),
      x(
        'Run ahead toward our corner flag',
        'The full-back cuts behind your run and crosses for the central finish.',
        [
          ['a-rb', 28, 19],
          ['a-st', 13, 45],
        ],
        [['h-lw', 24, 10]],
        43,
      ),
    ),
  ),

  easy(
    'keeper-low-hold-outlet',
    'Hold the low shot',
    'A goalkeeper uses a clean save to choose the next outlet.',
    'a-r8',
    defending([
      ['a-r8', 26, 45],
      ['h-gk', 6, 49],
      ['h-lcb', 16, 34],
      ['h-rcb', 16, 65],
      ['h-lb', 24, 14],
      ['a-st', 24, 57],
      ['a-lw', 31, 83],
    ]),
    read(
      'h-gk',
      'Defending',
      'Their midfielder has room for a low shot from outside our area. Your view is clear and the nearest striker is to the right of the shooting lane.',
      n(
        'Set low and hold the shot',
        'A balanced low set lets you catch the shot rather than leave a rebound near the striker.',
        [
          ['a-r8', 26, 45],
          ['h-gk', 7, 45],
        ],
        [['a-st', 18, 57]],
      ),
      d(
        'Push the shot toward the touchline',
        'The ball goes wide, where their winger collects and resets the attack.',
        [
          ['a-r8', 26, 45],
          ['h-gk', 7, 45],
          ['a-rw', 16, 20],
        ],
      ),
      x(
        'Stay upright through the strike',
        'The low shot passes under your late attempt to get down.',
        [['a-r8', 26, 45]],
        [['h-gk', 6, 50]],
        43,
      ),
    ),
    read(
      'h-gk',
      'Attacking',
      'You have the ball in your hands. Their striker is near our right centre-back, while our left-back waits outside the box with no opponent beside them.',
      r(
        'Roll the ball to the left-back',
        'The left-back receives away from their striker and our team can move out.',
        [
          ['h-gk', 7, 45],
          ['h-lb', 27, 14],
        ],
        [['h-lcb', 21, 34]],
      ),
      d(
        'Kick toward their deeper midfield line',
        'Their midfielder collects the longer ball, although the immediate shooting danger has ended.',
        [
          ['h-gk', 7, 45],
          ['a-six', 42, 50],
        ],
      ),
      x(
        'Roll across to the close right centre-back',
        'The striker intercepts near our centre-back and finishes before you can reset.',
        [
          ['h-gk', 7, 45],
          ['a-st', 15, 59],
        ],
        [['h-rcb', 16, 65]],
        58,
      ),
    ),
  ),

  easy(
    'keeper-near-post-feet',
    'Protect the near-post feet',
    'A keeper follows the angle of a close shot and then secures the loose ball.',
    'a-lw',
    defending([
      ['a-lw', 15, 77],
      ['h-gk', 6, 56],
      ['h-rb', 18, 81],
      ['h-rcb', 15, 62],
      ['a-st', 24, 48],
      ['h-lb', 24, 17],
    ]),
    read(
      'h-gk',
      'Defending',
      'The winger has entered the right side of our area. The angle is narrow and the ball is on the near-post side; you can cover that angle without crossing the goal.',
      n(
        'Set at the near post and block with the feet',
        'The foot block stops the close shot at your feet inside the six-yard area.',
        [
          ['a-lw', 15, 77],
          ['h-gk', 7, 60],
          ['h-gk', 8, 59],
        ],
        [['h-rb', 15, 79]],
      ),
      d(
        'Push the shot farther outside',
        'Their winger gathers the wide rebound but has to move away from goal.',
        [
          ['a-lw', 15, 77],
          ['h-gk', 7, 60],
          ['a-lw', 17, 86],
        ],
      ),
      x(
        'Move across toward the far post',
        'The winger shoots through the near-post space your movement opens.',
        [['a-lw', 15, 77]],
        [['h-gk', 6, 44]],
        59,
      ),
    ),
    read(
      'h-gk',
      'Attacking',
      'Your foot block has stopped the ball at your feet inside the six-yard area. The winger is outside your right-back, so you can gather it before choosing an outlet.',
      r(
        'Gather the ball and roll left',
        'You secure the ball and roll to the opposite full-back beyond the immediate pressure.',
        [
          ['h-gk', 8, 59],
          ['h-gk', 8, 58],
          ['h-lb', 27, 17],
        ],
      ),
      d(
        'Kick the ball toward the touchline',
        'The wide clearance delays danger, but their midfielder collects to restart the attack.',
        [
          ['h-gk', 8, 59],
          ['a-l8', 28, 82],
        ],
      ),
      x(
        'Leave the rebound while looking upfield',
        'The winger reaches the loose ball first and finishes from close range.',
        [['a-lw', 10, 65]],
        [['h-gk', 8, 57]],
        59,
      ),
    ),
  ),

  easy(
    'centre-back-cross-first',
    'Reach the delivery first',
    'A centre-back attacks a cross rather than waiting on the goal line.',
    'a-rw',
    defending([
      ['a-rw', 24, 13],
      ['a-st', 23, 48],
      ['h-lcb', 14, 39],
      ['h-rcb', 16, 64],
      ['h-gk', 6, 52],
      ['h-six', 30, 48],
    ]),
    read(
      'h-lcb',
      'Defending',
      'Their winger is ready to cross from our left. Their striker is outside your right shoulder; moving toward the delivery can keep you in front of that run.',
      n(
        'Move toward the cross and head away',
        'You meet the delivery in front of the striker and direct the first header toward our six.',
        [
          ['a-rw', 24, 13],
          ['h-lcb', 15, 37],
          ['h-six', 29, 45],
        ],
        [['a-st', 16, 45]],
      ),
      d(
        'Stay between striker and goal',
        'The winger chooses to recycle because the striker cannot separate cleanly.',
        [
          ['a-rw', 24, 13],
          ['a-r8', 34, 31],
        ],
        [['h-lcb', 13, 42]],
      ),
      x(
        'Retreat to the goal line',
        'The striker meets the cross in the space you leave in front of goal.',
        [
          ['a-rw', 24, 13],
          ['a-st', 12, 46],
        ],
        [['h-lcb', 7, 42]],
        44,
      ),
    ),
    read(
      'h-six',
      'Attacking',
      'The headed clearance is now controlled at your feet. Their striker is behind you, and our right midfielder is beyond the nearest midfield pressure.',
      r(
        'Turn away and pass to the right midfielder',
        'You use the first header’s direction to escape pressure and retain the cleared ball.',
        [
          ['h-six', 30, 49],
          ['h-r8', 43, 66],
        ],
      ),
      d(
        'Clear straight back toward their defence',
        'The longer clearance delays their attack, but their centre-back collects.',
        [
          ['h-six', 29, 45],
          ['a-lcb', 49, 62],
        ],
      ),
      x(
        'Turn back toward the striker',
        'The striker takes your exposed turn and drives the ball toward goal.',
        [
          ['h-six', 26, 42],
          ['a-st', 18, 43],
        ],
        [],
        43,
      ),
    ),
  ),

  easy(
    'far-side-back-stay',
    'Watch the far-side winger',
    'The far full-back stays with the runner rather than following the ball.',
    'a-rw',
    defending([
      ['a-rw', 27, 13],
      ['a-lw', 25, 73],
      ['h-rb', 18, 76],
      ['h-lcb', 16, 38],
      ['h-rcb', 16, 54],
      ['h-rw', 38, 87],
    ]),
    read(
      'h-rb',
      'Defending',
      'A cross may come from our left. Their far-side winger is on your inside shoulder; the centre-backs are occupied centrally, so you must stay with this runner.',
      n(
        'Turn with the far-side winger',
        'You keep the far runner in view and meet the cross ahead of them.',
        [
          ['a-rw', 27, 13],
          ['h-rb', 13, 68],
        ],
        [
          ['a-lw', 15, 71],
          ['h-rcb', 13, 53],
        ],
      ),
      d(
        'Stay wide and block the return crossing angle',
        'The winger on the ball recycles rather than cross into the covered central line.',
        [
          ['a-rw', 27, 13],
          ['a-r8', 36, 32],
        ],
        [['h-rb', 18, 78]],
      ),
      x(
        'Move toward the nearest centre-back',
        'The far winger arrives outside your movement and meets the cross for a close finish.',
        [
          ['a-rw', 27, 13],
          ['a-lw', 11, 67],
        ],
        [['h-rb', 12, 56]],
        59,
      ),
    ),
    read(
      'h-rb',
      'Attacking',
      'You have brought the cross under control on the far side of our box. Their winger remains close; our right winger is up the line as an outlet.',
      r(
        'Pass up the line before the winger closes',
        'You move the recovered ball away from the area through our right winger.',
        [
          ['h-rb', 13, 68],
          ['h-rw', 39, 86],
        ],
      ),
      d(
        'Clear toward the far touchline',
        'The clearance moves danger away from goal, but their full-back collects outside.',
        [
          ['h-rb', 13, 68],
          ['a-lb', 31, 91],
        ],
      ),
      x(
        'Turn inward toward the far winger',
        'The winger reaches the turning touch and finishes while you are facing inward.',
        [
          ['h-rb', 12, 63],
          ['a-lw', 11, 63],
        ],
        [],
        57,
      ),
    ),
  ),

  easy(
    'six-rebound-outside',
    'The second ball is outside',
    'A six reads where a keeper’s block will fall.',
    'a-st',
    defending([
      ['a-st', 23, 52],
      ['h-gk', 7, 49],
      ['h-six', 20, 60],
      ['a-l8', 26, 69],
      ['h-rb', 27, 84],
      ['h-rcb', 15, 59],
    ]),
    read(
      'h-six',
      'Defending',
      'Their striker sets to shoot from the middle. Our keeper covers the central lane; their midfielder starts toward the rebound area on our right.',
      n(
        'Move toward the outside rebound zone',
        'You anticipate the keeper’s wide block and reach the second ball ahead of their arriving midfielder.',
        [
          ['a-st', 23, 52],
          ['h-gk', 7, 54],
          ['h-six', 15, 68],
        ],
        [['a-l8', 20, 73]],
      ),
      d(
        'Stay in front of the striker',
        'The keeper’s wider block reaches their winger, who has to reset outside the area.',
        [
          ['a-st', 23, 52],
          ['h-gk', 7, 54],
          ['a-lw', 24, 84],
        ],
        [['h-six', 20, 53]],
      ),
      x(
        'Run straight toward the keeper',
        'Their arriving midfielder reaches the outside rebound and finishes from the right side.',
        [
          ['a-st', 23, 52],
          ['h-gk', 7, 54],
          ['a-l8', 13, 65],
        ],
        [['h-six', 11, 52]],
        58,
      ),
    ),
    read(
      'h-six',
      'Attacking',
      'The rebound is now at your feet outside the right side of the six-yard area. Their midfielder is beyond your outside shoulder, so the right-back is the forward outlet.',
      r(
        'Pass forward to the right-back',
        'The pass gets the recovered ball out of the rebound zone before their midfielder can turn back.',
        [
          ['h-six', 15, 68],
          ['h-rb', 30, 83],
        ],
      ),
      d(
        'Clear along the right touchline',
        'The ball moves away from the box, but their wide midfielder collects.',
        [
          ['h-six', 15, 68],
          ['a-lw', 31, 88],
        ],
      ),
      x(
        'Pass across the six-yard area',
        'Their striker intercepts the square pass in front of goal and finishes.',
        [
          ['h-six', 15, 68],
          ['a-st', 10, 51],
        ],
        [],
        46,
      ),
    ),
  ),

  easy(
    'keeper-outside-feet',
    'Outside means feet',
    'A keeper meets a through ball outside the penalty area without using the hands.',
    'a-six',
    defending([
      ['a-six', 45, 47],
      ['a-st', 28, 42],
      ['h-gk', 15, 48],
      ['h-lcb', 25, 35],
      ['h-rcb', 24, 64],
      ['h-lb', 27, 16],
      ['h-rb', 27, 83],
      ['h-six', 35, 53],
    ]),
    read(
      'h-gk',
      'Defending',
      'Their striker starts onside between our centre-backs. The through ball will arrive beyond the penalty-area line before the striker; you can get there first with your feet.',
      n(
        'Come out and clear with your foot',
        'You meet the pass outside the area and direct it to our six rather than handle it illegally.',
        [
          ['a-six', 45, 47],
          ['h-gk', 22, 43],
          ['h-six', 34, 55],
        ],
        [['a-st', 25, 43]],
      ),
      d(
        'Stay inside and narrow the angle',
        'The striker decides against the tight finish and returns the pass to midfield.',
        [
          ['a-six', 45, 47],
          ['a-st', 21, 44],
          ['a-six', 35, 48],
        ],
        [['h-gk', 16, 47]],
      ),
      x(
        'Retreat to the goal line immediately',
        'The striker receives with room to choose a corner before you can close the angle.',
        [
          ['a-six', 45, 47],
          ['a-st', 17, 43],
        ],
        [['h-gk', 6, 50]],
        42,
      ),
    ),
    read(
      'h-six',
      'Attacking',
      'You have the keeper’s clearance at your feet. The keeper is still outside the box, so your next pass should keep possession while they recover.',
      r(
        'Pass wide to the right-back',
        'The wide outlet retains the cleared ball and gives the keeper time to return inside the area.',
        [
          ['h-six', 34, 55],
          ['h-rb', 39, 84],
        ],
        [['h-gk', 13, 48]],
      ),
      d(
        'Clear forward toward their midfield',
        'The ball reaches their midfielder; the immediate through-ball danger is over, but possession is theirs.',
        [
          ['h-six', 34, 55],
          ['a-r8', 48, 35],
        ],
        [['h-gk', 12, 49]],
      ),
      x(
        'Pass backward toward the keeper’s old position',
        'The striker intercepts the pass into the empty area and finishes before the keeper recovers.',
        [
          ['h-six', 34, 55],
          ['a-st', 17, 46],
        ],
        [['h-gk', 20, 44]],
        47,
      ),
    ),
  ),

  easy(
    'right-centre-back-body-block',
    'Stay on the shooting side',
    'A centre-back blocks the forward touch without turning away from the striker.',
    'a-st',
    defending([
      ['a-st', 21, 59],
      ['h-rcb', 16, 61],
      ['h-lcb', 16, 38],
      ['h-gk', 6, 49],
      ['h-six', 29, 47],
      ['a-l8', 33, 71],
    ]),
    read(
      'h-rcb',
      'Defending',
      'Their striker is facing goal on the right side of our area. You are goal side and close enough to block a forward shooting touch without crossing your feet.',
      n(
        'Stay balanced in the shooting lane',
        'The striker’s forward touch meets your body position and you collect the blocked ball.',
        [
          ['a-st', 18, 59],
          ['h-rcb', 17, 59],
        ],
        [['h-gk', 7, 53]],
      ),
      d(
        'Keep the striker facing away from the middle',
        'The striker turns out and returns the ball to the supporting midfielder.',
        [
          ['a-st', 22, 65],
          ['a-l8', 34, 71],
        ],
        [['h-rcb', 17, 62]],
      ),
      x(
        'Turn sideways before the striker touches forward',
        'Your turn opens the inside shooting line and the striker finishes low.',
        [['a-st', 15, 54]],
        [['h-rcb', 16, 66]],
        44,
      ),
    ),
    read(
      'h-rcb',
      'Attacking',
      'The blocked ball is controlled at your feet. Their striker remains close, and our six offers a forward pass outside the box.',
      r(
        'Pass into the six before turning',
        'The forward outlet moves the ball out of the area without exposing it to the striker behind you.',
        [
          ['h-rcb', 17, 59],
          ['h-six', 31, 47],
        ],
      ),
      d(
        'Clear toward the right touchline',
        'The clearance delays danger, but their winger gathers it outside.',
        [
          ['h-rcb', 17, 59],
          ['a-lw', 32, 88],
        ],
      ),
      x(
        'Turn back toward the striker',
        'The striker reaches the exposed turning touch and finishes from close range.',
        [
          ['h-rcb', 17, 62],
          ['a-st', 14, 61],
        ],
        [],
        58,
      ),
    ),
  ),

  easy(
    'left-eight-inside-cover',
    'Cover behind the challenge',
    'A midfielder covers the lane the pressing six cannot protect alone.',
    'a-r8',
    defending([
      ['a-r8', 40, 32],
      ['a-st', 28, 44],
      ['h-six', 34, 38],
      ['h-l8', 31, 29],
      ['h-lcb', 18, 38],
      ['h-lw', 41, 13],
    ]),
    read(
      'h-l8',
      'Defending',
      'Our six is stepping toward their right midfielder. You are behind that challenge, with their striker waiting inside for the next pass.',
      n(
        'Cover inside behind our six',
        'You stay on the striker’s passing side and reach the ball when the midfielder tries to play beyond the challenge.',
        [
          ['a-r8', 38, 34],
          ['h-l8', 29, 39],
        ],
        [
          ['h-six', 36, 35],
          ['a-st', 26, 45],
        ],
      ),
      d(
        'Stay beside their midfielder',
        'Their midfielder returns the ball rather than trying the covered central pass.',
        [
          ['a-r8', 38, 31],
          ['a-six', 48, 49],
        ],
        [['h-l8', 33, 28]],
      ),
      x(
        'Join our six in front of the ball',
        'The striker receives behind both midfielders and finishes after the pass through.',
        [
          ['a-r8', 40, 32],
          ['a-st', 16, 43],
        ],
        [['h-l8', 37, 32]],
        43,
      ),
    ),
    read(
      'h-l8',
      'Attacking',
      'You have intercepted the inside pass. Our left winger is outside the pressure, while the striker remains between you and the centre-back.',
      r(
        'Turn outside and find our left winger',
        'The outside outlet avoids the striker and secures possession beyond the challenge.',
        [
          ['h-l8', 31, 32],
          ['h-lw', 44, 13],
        ],
      ),
      d(
        'Clear straight down the centre',
        'Their six collects the longer ball, although the immediate inside pass is stopped.',
        [
          ['h-l8', 29, 39],
          ['a-six', 49, 49],
        ],
      ),
      x(
        'Pass backward through the striker',
        'The striker takes the backward pass and finishes from the left side of our box.',
        [
          ['h-l8', 29, 39],
          ['a-st', 17, 43],
        ],
        [],
        42,
      ),
    ),
  ),

  easy(
    'striker-backpress-six',
    'Pressure from behind',
    'A striker helps recover the ball before a midfielder can turn forward.',
    'a-six',
    defending([
      ['a-six', 43, 50],
      ['h-st', 47, 51],
      ['h-six', 34, 47],
      ['a-r8', 34, 29],
      ['h-l8', 38, 32],
      ['h-rw', 49, 86],
    ]),
    read(
      'h-st',
      'Defending',
      'Their six is trying to turn toward our goal. Our own six is between the receiver and goal; you are recovering from the midfield side to press the next turning touch.',
      n(
        'Close from behind without running past',
        'Pressure on both sides makes their six turn sideways, with you still close enough to challenge.',
        [['a-six', 41, 55]],
        [
          ['h-st', 42, 54],
          ['h-six', 35, 49],
        ],
      ),
      d(
        'Screen the pass back to their centre-back',
        'Their six cannot return directly and chooses a sideways midfield pass.',
        [
          ['a-six', 43, 50],
          ['a-l8', 43, 71],
        ],
        [['h-st', 48, 51]],
      ),
      x(
        'Run forward toward their centre-back',
        'Their six turns into the space behind you and sends the striker through for a finish.',
        [
          ['a-six', 40, 49],
          ['a-st', 15, 48],
        ],
        [['h-st', 53, 51]],
        46,
      ),
    ),
    read(
      'h-st',
      'Defending',
      'Their six has turned sideways with you close behind, and our six still in front. Our right winger is outside the midfield traffic after a challenge.',
      r(
        'Challenge the sideways touch and pass wide',
        'You win the ball from behind the turn and move possession out to the winger.',
        [
          ['a-six', 41, 55],
          ['h-st', 42, 55],
          ['h-rw', 51, 85],
        ],
      ),
      d(
        'Keep pressing from behind',
        'Their six shields the ball and returns it to a deeper teammate.',
        [
          ['a-six', 43, 56],
          ['a-lcb', 58, 65],
        ],
        [['h-st', 44, 55]],
      ),
      x(
        'Turn away before making the challenge',
        'Their six turns forward without your pressure and releases the striker through the middle.',
        [
          ['a-six', 39, 53],
          ['a-st', 15, 48],
        ],
        [['h-st', 45, 62]],
        47,
      ),
    ),
  ),

  easy(
    'right-winger-block-switch',
    'Read the switch early',
    'A winger moves toward a long switch before the full-back is left alone.',
    'a-lcb',
    defending([
      ['a-lcb', 61, 60],
      ['a-lb', 40, 89],
      ['h-rw', 39, 82],
      ['h-rb', 25, 85],
      ['h-r8', 33, 66],
    ]),
    read(
      'h-rw',
      'Defending',
      'Their centre-back is opening up for a switch toward the left-back on our right side. You are close to the receiving lane and can move while the pass is struck.',
      n(
        'Move outside toward the receiving lane',
        'You meet the switch before their full-back can control it and bring the ball down outside.',
        [
          ['a-lcb', 61, 60],
          ['h-rw', 38, 89],
        ],
        [['a-lb', 41, 91]],
      ),
      d(
        'Stay narrow with our right midfielder',
        'The full-back receives outside but has to recycle against our deeper right-back.',
        [
          ['a-lcb', 61, 60],
          ['a-lb', 35, 89],
          ['a-l8', 45, 68],
        ],
        [['h-rw', 34, 74]],
      ),
      x(
        'Press the centre-back across the pitch',
        'The full-back receives behind your movement and crosses for a striker’s finish.',
        [
          ['a-lcb', 61, 60],
          ['a-lb', 31, 89],
          ['a-st', 14, 54],
        ],
        [['h-rw', 50, 67]],
        57,
      ),
    ),
    read(
      'h-rw',
      'Attacking',
      'The switched ball is now under your control near the right line. Their full-back is outside you; our right midfielder is inside as a short outlet.',
      r(
        'Pass inside to the right midfielder',
        'The inside pass moves the recovered ball away from the full-back’s pressure.',
        [
          ['h-rw', 38, 89],
          ['h-r8', 37, 65],
        ],
      ),
      d(
        'Clear forward along the touchline',
        'Their deeper midfielder collects the clearance; the immediate switch has been stopped.',
        [
          ['h-rw', 38, 89],
          ['a-l8', 57, 87],
        ],
      ),
      x(
        'Turn outward toward their full-back',
        'The full-back wins your outward touch and delivers the ball for a central finish.',
        [
          ['h-rw', 39, 92],
          ['a-lb', 38, 92],
          ['a-st', 14, 54],
        ],
        [],
        57,
      ),
    ),
  ),

  easy(
    'centre-back-long-bounce',
    'Judge the long bounce',
    'A centre-back allows a harmless bounce before controlling away from the striker.',
    'a-rcb',
    defending([
      ['a-rcb', 64, 35],
      ['a-st', 33, 44],
      ['h-lcb', 27, 37],
      ['h-rcb', 26, 64],
      ['h-gk', 8, 50],
      ['h-lb', 30, 16],
      ['h-rb', 30, 84],
      ['h-six', 38, 50],
    ]),
    read(
      'h-lcb',
      'Defending',
      'Their centre-back is sending a high ball toward our left channel. The striker starts onside but is behind you; you have room to judge the bounce instead of heading under pressure.',
      n(
        'Drop underneath and control after the bounce',
        'You stay goal side and bring the long ball down before the striker reaches it.',
        [
          ['a-rcb', 64, 35],
          ['h-lcb', 21, 34],
        ],
        [
          ['a-st', 27, 41],
          ['h-gk', 9, 47],
        ],
      ),
      d(
        'Head the ball back toward midfield',
        'The header delays danger, but their midfielder collects the second ball.',
        [
          ['a-rcb', 64, 35],
          ['h-lcb', 24, 35],
          ['a-r8', 42, 31],
        ],
      ),
      x(
        'Step forward before judging the flight',
        'The ball drops behind your step and the striker reaches it for a finish.',
        [
          ['a-rcb', 64, 35],
          ['a-st', 15, 38],
        ],
        [['h-lcb', 32, 37]],
        43,
      ),
    ),
    read(
      'h-lcb',
      'Attacking',
      'The long ball is controlled at your feet. The striker approaches from inside; our left-back is outside as a short outlet.',
      r(
        'Pass outside to the left-back',
        'You avoid the striker’s inside pressure and secure the ball through the full-back.',
        [
          ['h-lcb', 21, 34],
          ['h-lb', 32, 16],
        ],
      ),
      d(
        'Clear high into their midfield',
        'Their six collects the clearance, but the long-ball threat has ended.',
        [
          ['h-lcb', 21, 34],
          ['a-six', 49, 49],
        ],
      ),
      x(
        'Turn inward across the striker',
        'The striker takes the exposed turning touch and finishes before our keeper can close.',
        [
          ['h-lcb', 23, 40],
          ['a-st', 17, 40],
        ],
        [],
        43,
      ),
    ),
  ),

  easy(
    'keeper-deflection-reset',
    'Adjust to the deflection',
    'A goalkeeper makes a small second movement after a shot changes direction.',
    'a-l8',
    defending([
      ['a-l8', 27, 62],
      ['h-rcb', 17, 57],
      ['h-gk', 6, 51],
      ['a-st', 24, 42],
      ['h-lb', 25, 15],
    ]),
    read(
      'h-gk',
      'Defending',
      'Their midfielder is shooting through the right side of our area. Our centre-back is in the lane, so stay balanced for a possible deflection instead of committing early.',
      n(
        'Stay balanced and adjust after the block',
        'The shot touches our centre-back and changes left; your small adjustment reaches the slower deflected ball.',
        [
          ['a-l8', 27, 62],
          ['h-rcb', 17, 56],
          ['h-gk', 7, 45],
        ],
        [['a-st', 19, 40]],
      ),
      d(
        'Push the deflected ball outside',
        'The wider push keeps it out of the goal, but their winger collects away from the box.',
        [
          ['a-l8', 27, 62],
          ['h-rcb', 17, 56],
          ['h-gk', 7, 45],
          ['a-rw', 22, 15],
        ],
      ),
      x(
        'Commit right before the strike',
        'Their shot deflects off our centre-back into the left corner after you have committed the other way; the deflected ball goes in.',
        [
          ['a-l8', 27, 62],
          ['h-rcb', 17, 56],
        ],
        [['h-gk', 6, 58]],
        42,
      ),
    ),
    read(
      'h-gk',
      'Attacking',
      'You have caught the slower deflected shot. Their striker is left of the centre, while our left-back is farther outside the immediate pressure.',
      r(
        'Throw beyond the striker to the left-back',
        'The full-back receives outside the striker’s reach and takes the team away from the box.',
        [
          ['h-gk', 7, 45],
          ['h-lb', 30, 14],
        ],
      ),
      d(
        'Send the ball long toward their centre-back',
        'Their centre-back wins the long distribution, although the shot has been stopped.',
        [
          ['h-gk', 7, 45],
          ['a-rcb', 57, 36],
        ],
      ),
      x(
        'Roll through the striker’s central lane',
        'The striker intercepts the short distribution and finishes before you can set again.',
        [
          ['h-gk', 7, 45],
          ['a-st', 14, 42],
        ],
        [],
        43,
      ),
    ),
  ),

  easy(
    'left-back-inside-handover',
    'Hand over the inside run',
    'A full-back follows the inside runner while the midfielder closes the ball.',
    'a-rw',
    defending([
      ['a-rw', 34, 19],
      ['a-r8', 28, 14],
      ['h-lb', 23, 22],
      ['h-l8', 30, 30],
      ['h-lcb', 16, 41],
      ['h-lw', 39, 12],
    ]),
    read(
      'h-lb',
      'Defending',
      'Their winger is carrying inside as their midfielder runs outside you toward the left channel. Our left midfielder can close the ball, leaving you to follow the runner.',
      n(
        'Track the runner and leave the ball to midfield',
        'The handover keeps both players covered; the outside pass reaches the runner with you goal side.',
        [
          ['a-rw', 31, 25],
          ['a-r8', 20, 17],
        ],
        [
          ['h-lb', 18, 19],
          ['h-l8', 29, 27],
        ],
      ),
      d(
        'Stay narrow beside our centre-back',
        'The central lane is protected, but the winger can return to midfield.',
        [
          ['a-rw', 32, 24],
          ['a-six', 43, 48],
        ],
        [['h-lb', 20, 32]],
      ),
      x(
        'Follow the ball carrier inside',
        'The runner starts onside and receives outside both defenders before squaring for a finish.',
        [
          ['a-rw', 31, 25],
          ['a-r8', 17, 15],
          ['a-st', 12, 45],
        ],
        [['h-lb', 26, 31]],
        43,
      ),
    ),
    read(
      'h-lb',
      'Defending',
      'The runner has controlled the outside pass, but you are still close and between them and goal. You can meet a forward touch before it takes them beyond you.',
      r(
        'Meet the forward touch and find our winger',
        'Following the runner gives you the tackle, then the winger carries the recovered ball away.',
        [
          ['a-r8', 19, 17],
          ['h-lb', 18, 17],
          ['h-lw', 41, 12],
        ],
      ),
      d(
        'Keep the runner facing the touchline',
        'The runner cannot turn inward and chooses a backward pass.',
        [
          ['a-r8', 22, 14],
          ['a-rw', 32, 25],
        ],
        [['h-lb', 17, 18]],
      ),
      x(
        'Turn inward toward the original ball carrier',
        'The runner uses the outside space for a cross that the striker finishes.',
        [
          ['a-r8', 17, 14],
          ['a-st', 12, 45],
        ],
        [['h-lb', 21, 31]],
        43,
      ),
    ),
  ),

  easy(
    'six-stop-edge-turn',
    'Do not let the ten turn',
    'A six stays close to a receiver facing away from goal.',
    'a-st',
    defending([
      ['a-st', 31, 48],
      ['h-six', 27, 47],
      ['a-r8', 40, 32],
      ['h-l8', 37, 29],
      ['h-r8', 37, 67],
    ]),
    read(
      'h-six',
      'Defending',
      'Their striker has dropped outside our box to receive with their back to goal. You are close on the goal side, with both midfield outlets covered by our eights.',
      n(
        'Stay close behind the receiver’s first touch',
        'You stay goal side and make the receiver turn sideways rather than face our goal.',
        [['a-st', 30, 51]],
        [
          ['h-six', 27, 50],
          ['h-r8', 36, 64],
        ],
      ),
      d(
        'Stand off and screen the forward pass',
        'The striker cannot pass through centrally and returns the ball to midfield.',
        [
          ['a-st', 32, 48],
          ['a-r8', 41, 32],
        ],
        [['h-six', 24, 47]],
      ),
      x(
        'Move beyond the striker toward the passer',
        'The receiver turns into the gap behind you and finishes from the edge of the box.',
        [
          ['a-st', 25, 49],
          ['a-st', 18, 47],
        ],
        [['h-six', 34, 41]],
        44,
      ),
    ),
    read(
      'h-six',
      'Defending',
      'The receiver still controls the ball while facing sideways, with you close behind on the goal side. Our right midfielder offers an outlet after a challenge.',
      r(
        'Challenge the sideways touch and pass right',
        'You win the ball before the receiver can turn toward goal and secure it through our right midfielder.',
        [
          ['a-st', 30, 51],
          ['h-six', 29, 51],
          ['h-r8', 40, 67],
        ],
      ),
      d(
        'Stay close without taking the touch',
        'The striker shields and recycles rather than finding a turn toward goal.',
        [
          ['a-st', 32, 52],
          ['a-six', 43, 50],
        ],
        [['h-six', 28, 51]],
      ),
      x(
        'Step across toward the left midfielder',
        'The striker turns the other way and shoots before the centre-back can step out.',
        [
          ['a-st', 23, 54],
          ['a-st', 18, 54],
        ],
        [['h-six', 28, 42]],
        58,
      ),
    ),
  ),

  easy(
    'centre-back-cutback-zone',
    'Guard the cut-back zone',
    'A centre-back protects the arriving striker rather than crowding the near post.',
    'a-lw',
    defending([
      ['a-lw', 14, 85],
      ['a-st', 25, 52],
      ['h-rb', 16, 81],
      ['h-rcb', 15, 60],
      ['h-lcb', 14, 39],
      ['h-gk', 6, 55],
      ['h-six', 29, 47],
    ]),
    read(
      'h-rcb',
      'Defending',
      'The winger is close to the right byline and our full-back is beside them. Their striker is arriving behind the ball; you can guard the backward delivery rather than join the full-back.',
      n(
        'Stay between the arriving striker and the ball',
        'Your position lets you intercept the backward delivery before the striker can meet it.',
        [
          ['a-lw', 12, 84],
          ['h-rcb', 17, 57],
        ],
        [
          ['a-st', 21, 54],
          ['h-rb', 13, 79],
        ],
      ),
      d(
        'Hold near the middle of the goalmouth',
        'The winger has no clean central delivery and returns the ball outside.',
        [
          ['a-lw', 14, 85],
          ['a-l8', 28, 75],
        ],
        [['h-rcb', 10, 55]],
      ),
      x(
        'Join the full-back at the near post',
        'The cut-back reaches the arriving striker behind both defenders for a first-time finish.',
        [
          ['a-lw', 12, 84],
          ['a-st', 18, 52],
        ],
        [['h-rcb', 8, 65]],
        44,
      ),
    ),
    read(
      'h-rcb',
      'Attacking',
      'The cut-back is controlled at your feet. Their striker closes the central passing lane, while our right-back offers a wide outlet away from the byline.',
      r(
        'Pass outside to the right-back',
        'The wide outlet avoids the striker’s central pressure and secures the intercepted ball.',
        [
          ['h-rcb', 17, 57],
          ['h-rb', 28, 80],
        ],
      ),
      d(
        'Clear toward the right touchline',
        'The ball leaves the danger zone, but their full-back collects outside.',
        [
          ['h-rcb', 17, 57],
          ['a-lb', 34, 90],
        ],
      ),
      x(
        'Turn toward the arriving striker',
        'The striker takes your exposed turn and finishes from the central area.',
        [
          ['h-rcb', 18, 54],
          ['a-st', 14, 53],
        ],
        [],
        46,
      ),
    ),
  ),
];
