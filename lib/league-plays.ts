import {
  action,
  advancedMoment,
  turn,
  type Action,
} from './advanced-match-builder.ts';
import type { MatchMoment, MatchPhase, MatchTone } from './match-day.ts';
import type { Placement } from './tactical-scene.ts';

// League-only content. Do not append this to the historical cup play pool.
type Touch = [player: string, x: number, y: number];
type Read = {
  actor: string;
  phase: MatchPhase;
  context: string;
  choices: [Action, Action, Action, Action];
};
type Spec = {
  id: string;
  tier: 0 | 1 | 2;
  name: string;
  intro: string;
  owner: string | { x: number; y: number };
  placements: Placement[];
  reads: [Read, Read];
};

// Contact bookkeeping is shared; situations, decisions and alternatives are authored below.
function c(
  label: string,
  feedback: string,
  touches: Touch[],
  result: Action['result'],
  tone: MatchTone,
  support: Placement[] = [],
  goalY = 50,
  art?: string,
): Action {
  const byPlayer = new Map<string, [number, number][]>();
  for (const [id, x, y] of touches)
    byPlayer.set(id, [...(byPlayer.get(id) ?? []), [x, y]]);
  if (
    support.some(([id]) => byPlayer.has(id)) ||
    new Set(support.map(([id]) => id)).size !== support.length
  )
    throw new Error('Duplicate league action movement: ' + label);
  const moves: Placement[] = [
    ...[...byPlayer].map(([id, points]): Placement => [id, ...points.at(-1)!]),
    ...support,
  ];
  const path: [number, number][] = touches.map(([, x, y]) => [x, y]);
  if (result === 'goal') path.push([100, goalY]);
  if (result === 'concede') path.push([0, goalY]);
  if (!path.length) throw new Error('Empty league contact route: ' + label);
  const routes = Object.fromEntries(
    [...byPlayer]
      .filter(([, points]) => points.length > 1)
      .map(([id, points]) => [id, points.slice(0, -1)]),
  );
  const image =
    art ??
    (result === 'goal'
      ? 'match-home-goal'
      : result === 'concede'
        ? 'match-rival-goal'
        : result === 'lost'
          ? 'match-interception'
          : result === 'regain'
            ? 'right-midfielder-5'
            : result === 'contained'
              ? 'match-duel'
              : 'right-midfielder-1');
  return {
    ...action(label, feedback, image, moves, path, result, tone),
    routes,
  };
}
const n = (
  l: string,
  f: string,
  t: Touch[],
  s: Placement[] = [],
  art?: string,
) => c(l, f, t, 'next', 'positive', s, 50, art);
const g = (l: string, f: string, t: Touch[], s: Placement[] = [], y = 50) =>
  c(l, f, t, 'goal', 'positive', s, y);
const r = (
  l: string,
  f: string,
  t: Touch[],
  s: Placement[] = [],
  art?: string,
) => c(l, f, t, 'regain', 'positive', s, 50, art);
const l = (
  label: string,
  f: string,
  t: Touch[],
  s: Placement[] = [],
  art?: string,
) => c(label, f, t, 'lost', 'negative', s, 50, art);
const k = (
  label: string,
  f: string,
  t: Touch[],
  s: Placement[] = [],
  art?: string,
) => c(label, f, t, 'retain', 'neutral', s, 50, art);
const d = (
  label: string,
  f: string,
  t: Touch[],
  s: Placement[] = [],
  tone: MatchTone = 'neutral',
) => c(label, f, t, 'contained', tone, s);
const x = (label: string, f: string, t: Touch[], s: Placement[] = [], y = 50) =>
  c(label, f, t, 'concede', 'negative', s, y);
const read = (
  actor: string,
  phase: MatchPhase,
  context: string,
  best: Action,
  a: Action,
  b: Action,
  other: Action,
): Read => ({ actor, phase, context, choices: [best, a, b, other] });

function places(base: Placement[], authored: Placement[]): Placement[] {
  const result = new Map(base.map((p) => [p[0], p]));
  for (const p of authored) result.set(p[0], p);
  return [...result.values()];
}
// Explicit last lines are part of the geometry, not an automatic offside correction.
const attacking = (p: Placement[]): Placement[] =>
  places(
    [
      ['a-gk', 95, 50],
      ['a-rcb', 88, 42],
      ['a-lcb', 88, 60],
      ['a-rb', 83, 18],
      ['a-lb', 83, 84],
      ['a-six', 73, 50],
      ['h-st', 80, 50],
      ['h-lw', 72, 16],
      ['h-rw', 72, 84],
    ],
    p,
  );
const defending = (p: Placement[]): Placement[] =>
  places(
    [
      ['h-gk', 6, 50],
      ['h-lcb', 16, 40],
      ['h-rcb', 16, 60],
      ['h-lb', 20, 18],
      ['h-rb', 20, 84],
      ['h-six', 28, 50],
      ['h-lw', 32, 16],
      ['h-rw', 32, 84],
      ['a-st', 26, 50],
      ['a-rw', 34, 16],
      ['a-lw', 34, 84],
    ],
    p,
  );
const spec = (
  id: string,
  tier: 0 | 1 | 2,
  name: string,
  intro: string,
  owner: Spec['owner'],
  placements: Placement[],
  first: Read,
  second: Read,
): Spec => ({
  id: 'lg-' + id,
  tier,
  name,
  intro,
  owner,
  placements,
  reads: [first, second],
});
const A: MatchPhase = 'Attacking';
const D: MatchPhase = 'Defending';
const T: MatchPhase = 'Transition';

const specs: Spec[] = [
  // Easy: nine attacking, eight defending and two transition situations.
  spec(
    'outside-stepover',
    0,
    'The planted inside foot',
    'Our right winger faces one defender with space outside.',
    'h-rw',
    attacking([
      ['h-rw', 76, 84],
      ['a-lb', 80, 81],
      ['a-lcb', 86, 59],
    ]),
    read(
      'h-rw',
      A,
      'Their full-back plants toward the middle. The outside lane is open and their centre-back stays inside.',
      n(
        'Step over and accelerate outside',
        'The defender has to turn off the planted foot. You reach the outside of the box.',
        [
          ['h-rw', 80, 89],
          ['h-rw', 87, 87],
        ],
        [
          ['a-lb', 81, 84],
          ['a-gk', 95, 58],
        ],
        'right-winger-3',
      ),
      l(
        'Push the next touch toward the centre',
        'The planted inside foot reaches your touch before you can pass it.',
        [['a-lb', 80, 78]],
        [['h-rw', 79, 78]],
      ),
      k(
        'Set the ball back to our full-back',
        'The return keeps possession, but the centre-back moves across to cover.',
        [['h-rb', 67, 86]],
      ),
      l(
        'Lift an early cross over the centre-back',
        'The centre-back is facing the delivery and heads it to safety.',
        [['a-lcb', 88, 58]],
      ),
    ),
    read(
      'h-rw',
      A,
      'You have beaten the full-back. The keeper guards the near side and their centre-back blocks a square pass.',
      g(
        'Shoot low across the keeper',
        'The far corner is beyond the keeper’s planted position.',
        [['h-rw', 89, 70]],
        [],
        46,
      ),
      l(
        'Square the ball toward our central striker',
        'The centre-back stays in the square-pass lane and intercepts.',
        [['a-lcb', 89, 57]],
      ),
      k(
        'Stop and bring the full-back into play',
        'You keep it, but the beaten defender recovers outside you.',
        [['h-rw', 87, 77]],
      ),
      l(
        'Lift the finish toward the near corner',
        'The keeper is already covering that side and catches the shot.',
        [['a-gk', 94, 58]],
        [],
        'match-save',
      ),
    ),
  ),

  spec(
    'stop-start-byline',
    0,
    'Let the defender keep running',
    'Our left winger and their full-back race toward the byline.',
    'h-lw',
    attacking([
      ['h-lw', 86, 16],
      ['a-rb', 87, 20],
      ['h-l8', 79, 38],
      ['a-rcb', 91, 40],
    ]),
    read(
      'h-lw',
      A,
      'The full-back is running beside you at full speed. Our eight arrives behind the defenders.',
      n(
        'Stop the ball, then go again',
        'The defender continues toward the line. Your restart opens a passing angle inside.',
        [
          ['h-lw', 89, 18],
          ['h-lw', 92, 26],
        ],
        [['a-rb', 94, 17]],
        'left-winger-3',
      ),
      l(
        'Keep racing beside him toward the flag',
        'He matches your pace and pokes the next touch away.',
        [['a-rb', 92, 15]],
      ),
      k(
        'Turn back and find our left-back',
        'The ball is safe, but their full-back can recover.',
        [['h-lb', 73, 12]],
      ),
      l(
        'Send the cross before changing your stride',
        'His extended foot blocks the delivery into their centre-back.',
        [
          ['a-rb', 88, 19],
          ['a-rcb', 90, 39],
        ],
      ),
    ),
    read(
      'h-lw',
      A,
      'The full-back is behind you. Both centre-backs have run toward the six-yard box; our eight is near the penalty spot.',
      g(
        'Pull it back to our eight',
        'The backward pass escapes the retreating defenders. Our eight finishes first time.',
        [['h-l8', 85, 42]],
        [],
        46,
      ),
      l(
        'Send it across the front of goal',
        'The near centre-back is already there and clears.',
        [['a-rcb', 94, 42]],
      ),
      l(
        'Shoot toward the near post from here',
        'The keeper has the narrow angle covered.',
        [['a-gk', 95, 38]],
        [],
        'match-save',
      ),
      k(
        'Carry back out toward the touchline',
        'We keep the ball, but their midfield arrives behind the eight.',
        [['h-lw', 88, 16]],
      ),
    ),
  ),

  spec(
    'across-the-body',
    0,
    'Receive beyond the reaching foot',
    'Our midfielder slides a ground pass toward the striker.',
    'h-l8',
    attacking([
      ['h-l8', 75, 38],
      ['h-st', 80, 50],
      ['a-rcb', 82, 46],
      ['a-lcb', 89, 64],
    ]),
    read(
      'h-st',
      A,
      'The ball comes from your left. Their defender closes that foot, while the right side of your body has space.',
      n(
        'Let it travel across your body',
        'Your touch takes the ball beyond the defender’s reaching leg and into the right side of the box.',
        [
          ['h-st', 81, 56],
          ['h-st', 85, 60],
        ],
        [
          ['a-rcb', 82, 51],
          ['a-gk', 94, 57],
        ],
        'striker-1',
      ),
      l(
        'Meet the pass with your left foot',
        'The defender arrives on that side and takes the exposed touch.',
        [['a-rcb', 81, 49]],
      ),
      k(
        'Set it back toward the same midfielder',
        'The set pass is safe, but their other centre-back closes the shooting lane.',
        [['h-l8', 75, 40]],
      ),
      l(
        'Turn toward the ball before controlling it',
        'Turning into the arriving defender lets them win the ball.',
        [['a-rcb', 81, 51]],
        [['h-st', 80, 52]],
      ),
    ),
    read(
      'h-st',
      A,
      'Your first touch has opened the far corner. Their centre-back is turning and the keeper shifts toward you.',
      g(
        'Finish before the defender turns',
        'The early low shot beats the shifting keeper into the opposite corner.',
        [['h-st', 86, 59]],
        [],
        44,
      ),
      l(
        'Carry back across toward your left foot',
        'You return to the defender’s side and their tackle stops the move.',
        [['a-rcb', 85, 53]],
        [['h-st', 84, 54]],
      ),
      k(
        'Set it outside to the arriving eight',
        'Our eight retains it, but both centre-backs reset.',
        [['h-r8', 77, 67]],
      ),
      l(
        'Lift the shot toward the keeper’s side',
        'The keeper’s sideways movement takes them into its path.',
        [['a-gk', 94, 57]],
        [],
        'match-save',
      ),
    ),
  ),

  spec(
    'dummy-cross',
    0,
    'Let the cross find the second runner',
    'A low right-wing cross reaches two arriving attackers.',
    'h-rw',
    attacking([
      ['h-rw', 86, 84],
      ['h-st', 85, 48],
      ['h-lw', 83, 62],
      ['a-rcb', 90, 46],
      ['a-lcb', 90, 54],
    ]),
    read(
      'h-st',
      A,
      'Our right winger prepares the cross. Both centre-backs follow your far-post movement; our left winger arrives behind them.',
      n(
        'Let it run and continue across',
        'Your run carries both markers away. The untouched ball reaches our second runner.',
        [['h-lw', 90, 62]],
        [
          ['h-st', 94, 42],
          ['a-rcb', 94, 45],
          ['a-lcb', 92, 48],
          ['a-gk', 95, 43],
        ],
        'striker-3',
      ),
      l(
        'Stop the cross under your front foot',
        'The two defenders close around the stopping touch.',
        [
          ['h-st', 88, 48],
          ['a-rcb', 88, 49],
        ],
      ),
      l(
        'Stretch for a shot toward the far post',
        'The following defender reaches across and blocks the finish.',
        [['a-rcb', 91, 44]],
        [],
        'match-blocked-shot',
      ),
      k(
        'Cushion it back outside the penalty area',
        'The ball is retained, but our second runner’s arrival is wasted.',
        [
          ['h-st', 88, 48],
          ['h-r8', 77, 66],
        ],
      ),
    ),
    read(
      'h-lw',
      A,
      'The dummy has left you facing goal. The keeper followed the striker toward the other post.',
      g(
        'Side-foot into the keeper’s open side',
        'The finish uses the space opened by the dummy and run.',
        [['h-lw', 91, 61]],
        [],
        57,
      ),
      l(
        'Send it back toward the far-post striker',
        'Their recovering centre-back cuts out the extra pass.',
        [['a-lcb', 94, 48]],
      ),
      k(
        'Take the ball back toward our winger',
        'We keep possession while the keeper returns to the middle.',
        [['h-rw', 86, 79]],
      ),
      l(
        'Carry toward the keeper before shooting',
        'The keeper reaches your next touch and smothers it.',
        [['a-gk', 93, 59]],
        [['h-lw', 92, 60]],
        'match-save',
      ),
    ),
  ),

  spec(
    'near-post-disguise',
    0,
    'The keeper expects the cut-back',
    'Our winger reaches the right side of their box.',
    'h-rw',
    attacking([
      ['h-rw', 88, 80],
      ['h-r8', 83, 60],
      ['a-gk', 93, 53],
      ['a-lcb', 89, 63],
    ]),
    read(
      'h-rw',
      A,
      'Their keeper starts to leave the near post for our arriving eight. The full-back trails your run.',
      n(
        'Shape to pass and keep going',
        'The keeper takes another step inside. You keep the ball for a shot from a better angle.',
        [
          ['h-rw', 91, 76],
          ['h-rw', 93, 70],
        ],
        [
          ['a-gk', 92, 49],
          ['a-lcb', 88, 59],
        ],
        'right-winger-3',
      ),
      l(
        'Send the cut-back toward our eight now',
        'Their centre-back follows the expected pass and intercepts.',
        [['a-lcb', 86, 61]],
      ),
      k(
        'Return the ball outside to our full-back',
        'Safe possession, but the keeper returns to the near post.',
        [['h-rb', 73, 86]],
      ),
      l(
        'Cross high toward the central striker',
        'The keeper’s move toward the middle helps them claim the high delivery.',
        [['a-gk', 94, 50]],
        [],
        'goalkeeper-4',
      ),
    ),
    read(
      'h-rw',
      A,
      'The keeper has moved into the middle and the near post is exposed. Their defender still covers the square pass.',
      g(
        'Finish inside the near post',
        'The keeper cannot reverse the inside step quickly enough.',
        [['h-rw', 94, 68]],
        [],
        58,
      ),
      l(
        'Square the ball across to our eight',
        'The defender remains in that passing lane.',
        [['a-lcb', 88, 59]],
      ),
      l(
        'Shoot back across toward the far corner',
        'The keeper’s inside position now covers that direction.',
        [['a-gk', 94, 47]],
        [],
        'match-save',
      ),
      k(
        'Pause and bring our full-back forward',
        'The defender and keeper have time to reset while we keep possession.',
        [['h-rw', 92, 75]],
      ),
    ),
  ),

  spec(
    'ankle-volley',
    0,
    'Meet the cross before it drops',
    'A left-wing delivery travels low across their box.',
    'h-lw',
    attacking([
      ['h-lw', 85, 15],
      ['h-st', 83, 54],
      ['a-rcb', 88, 41],
      ['a-lcb', 87, 59],
    ]),
    read(
      'h-st',
      A,
      'Our winger shapes for a low cross. Their near centre-back steps toward the near-post lane; space opens behind that run.',
      n(
        'Hold behind the defender’s crossing run',
        'The defender passes in front of you. The cross reaches your right foot with room to swing.',
        [['h-st', 88, 54]],
        [['a-rcb', 91, 45]],
        'striker-5',
      ),
      l(
        'Sprint in front toward the near post',
        'You move into the centre-back’s clearing path.',
        [['a-rcb', 90, 44]],
      ),
      k(
        'Check outside the box for a return',
        'The winger keeps the ball instead of crossing into the vacated space.',
        [['h-lw', 84, 19]],
        [['h-st', 77, 53]],
      ),
      l(
        'Move toward the far centre-back’s shoulder',
        'The second defender meets the delivery before you.',
        [['a-lcb', 89, 58]],
      ),
    ),
    read(
      'h-st',
      A,
      'The cross reaches ankle height. A defender arrives behind you, and the keeper is still moving across.',
      g(
        'Volley low with the inside foot',
        'The first-time finish reaches the opposite corner before the keeper sets.',
        [['h-st', 89, 53]],
        [],
        45,
      ),
      l(
        'Stop it first and turn toward goal',
        'The arriving defender reaches the stopping touch.',
        [['a-lcb', 89, 54]],
      ),
      k(
        'Set it backward toward our midfielder',
        'Our midfielder retains it, but the direct finishing chance closes.',
        [['h-r8', 77, 62]],
      ),
      l(
        'Lift the ball toward the near top corner',
        'The keeper’s movement takes them toward that side and they save.',
        [['a-gk', 94, 56]],
        [],
        'match-save',
      ),
    ),
  ),

  spec(
    'outside-foot-poke',
    0,
    'Around the stretching defender',
    'Our eight looks for the striker beside a stretching centre-back.',
    'h-r8',
    attacking([
      ['h-r8', 77, 65],
      ['h-st', 82, 58],
      ['a-lcb', 85, 55],
      ['a-rcb', 88, 43],
    ]),
    read(
      'h-r8',
      A,
      'The centre-back reaches across the striker’s inside foot. The pass to the outside foot avoids that leg.',
      n(
        'Pass toward the striker’s outside foot',
        'The ball reaches the right side of the striker, beyond the defender’s stretch.',
        [['h-st', 87, 60]],
        [['a-lcb', 86, 56]],
        'striker-2',
      ),
      l(
        'Play into the striker’s inside foot instead',
        'The extended defending leg cuts out that pass.',
        [['a-lcb', 85, 55]],
      ),
      k(
        'Move it across to our holding midfielder',
        'Possession is safe, but the defender regains balance.',
        [['h-six', 65, 50]],
      ),
      l(
        'Drive a shot through the same channel',
        'The centre-back blocks the shot with the reaching leg.',
        [['a-lcb', 84, 58]],
        [],
        'match-blocked-shot',
      ),
    ),
    read(
      'h-st',
      A,
      'The defender still reaches across your left side. The ball is on your right and the near corner is open.',
      g(
        'Poke it around him with the outside',
        'A short outside-foot finish avoids both the tackle and keeper.',
        [['h-st', 88, 60]],
        [],
        55,
      ),
      l(
        'Bring the ball back onto your left foot',
        'The defender’s stretching leg is waiting there.',
        [['a-lcb', 88, 57]],
      ),
      k(
        'Set it outside to the same midfielder',
        'Our eight keeps the ball, but the defender recovers.',
        [['h-r8', 79, 66]],
      ),
      l(
        'Take another touch straight toward the keeper',
        'The keeper arrives at the extra touch and holds the ball.',
        [['a-gk', 91, 59]],
        [],
        'match-save',
      ),
    ),
  ),

  spec(
    'chest-then-finish',
    0,
    'Time for the chest control',
    'A floated right-wing cross reaches our striker.',
    'h-rw',
    attacking([
      ['h-rw', 86, 85],
      ['h-st', 82, 49],
      ['a-rcb', 89, 37],
      ['a-lcb', 90, 66],
    ]),
    read(
      'h-st',
      A,
      'The ball comes at chest height. Both defenders are several steps away and the keeper stays on the line.',
      n(
        'Cushion it down with your chest',
        'The controlled drop puts the ball in front of your shooting foot.',
        [
          ['h-st', 85, 49],
          ['h-st', 86, 50],
        ],
        [],
        'striker-1',
      ),
      l(
        'Attempt a volley from that chest height',
        'The awkward contact loops toward the keeper, who catches it.',
        [['a-gk', 95, 50]],
        [],
        'match-save',
      ),
      k(
        'Head it back outside to our eight',
        'We retain possession but lose the space inside the box.',
        [
          ['h-st', 85, 49],
          ['h-r8', 76, 65],
        ],
      ),
      l(
        'Let the ball bounce behind your body',
        'Their centre-back reaches it as you turn.',
        [['a-lcb', 87, 53]],
      ),
    ),
    read(
      'h-st',
      A,
      'The ball has dropped onto your strong foot. Their centre-back now starts to close from your right.',
      g(
        'Shoot across the keeper from here',
        'You finish before the centre-back can block the strike.',
        [['h-st', 87, 50]],
        [],
        44,
      ),
      l(
        'Carry toward the closing centre-back first',
        'The extra touch takes the ball within tackling reach.',
        [['a-lcb', 88, 54]],
      ),
      k(
        'Lay it back to our supporting eight',
        'The eight keeps the ball while both centre-backs close the box.',
        [['h-r8', 78, 64]],
      ),
      l(
        'Chip toward the centre of the goal',
        'The keeper stayed on the line and catches the chip.',
        [['a-gk', 95, 50]],
        [],
        'match-save',
      ),
    ),
  ),

  spec(
    'goal-kick-wide',
    0,
    'The landing zone outside the press',
    'Rival XI press our central goal-kick outlets.',
    'h-gk',
    attacking([
      ['h-gk', 6, 50],
      ['h-lw', 43, 15],
      ['h-st', 72, 46],
      ['a-st', 15, 49],
      ['a-rw', 22, 28],
      ['a-six', 35, 49],
      ['a-rb', 76, 23],
      ['a-rcb', 82, 43],
      ['a-lcb', 82, 60],
    ]),
    read(
      'h-gk',
      A,
      'Their forwards crowd our centre-backs and six. Our left winger has a clear landing zone outside their press.',
      n(
        'Drive the goal kick toward our winger',
        'The delivery skips the central pressure and reaches our winger outside.',
        [['h-lw', 48, 16]],
        [],
        'goalkeeper-1',
      ),
      l(
        'Roll it directly into our six’s feet',
        'Their holding midfielder steps into the short lane.',
        [['a-six', 31, 49]],
      ),
      k(
        'Roll it wide to our left-back instead',
        'The full-back keeps the ball, but their winger can close that short route.',
        [['h-lb', 24, 12]],
      ),
      l(
        'Send the long ball straight down the middle',
        'Their centre-back faces the delivery and heads it away.',
        [['a-rcb', 76, 46]],
      ),
    ),
    read(
      'h-lw',
      A,
      'You have brought the ball down. Their full-back steps up on your side, while our striker starts behind their centre-backs.',
      g(
        'Release the striker behind that step',
        'The striker starts onside, meets the diagonal pass and finishes low.',
        [['h-st', 88, 43]],
        [['a-rb', 64, 24]],
        46,
      ),
      l(
        'Carry inward toward their holding midfielder',
        'Their six closes the inside touch and wins it.',
        [['a-six', 52, 31]],
        [['h-lw', 51, 29]],
      ),
      k(
        'Pass back toward our left centre-back',
        'We retain possession while their full-back drops into line.',
        [['h-lcb', 31, 35]],
      ),
      l(
        'Lift an early cross toward the far post',
        'The delivery carries too far and the keeper claims it.',
        [['a-gk', 94, 46]],
        [],
        'goalkeeper-4',
      ),
    ),
  ),

  spec(
    'jockey-crossing-touch',
    0,
    'Wait for the crossing touch',
    'Their winger carries toward our right-back.',
    'a-lw',
    defending([
      ['a-lw', 34, 87],
      ['h-rb', 29, 82],
      ['a-l8', 39, 69],
    ]),
    read(
      'h-rb',
      D,
      'The winger protects the ball on the far foot. An inside midfielder is ready for the pass around an early tackle.',
      n(
        'Stay side-on and guide him outside',
        'Your position removes the inside pass and slows the winger near the line.',
        [['a-lw', 24, 91]],
        [['h-rb', 25, 87]],
        'right-back-3',
      ),
      x(
        'Step across to tackle his protected foot',
        'He skips the tackle, feeds the inside runner and their striker finishes.',
        [
          ['a-lw', 29, 85],
          ['a-l8', 24, 67],
          ['a-st', 13, 52],
        ],
      ),
      d(
        'Back straight toward our near post',
        'He keeps the ball and has room to prepare the cross.',
        [['a-lw', 23, 87]],
        [['h-rb', 13, 65]],
      ),
      d(
        'Move inside to follow their midfielder',
        'The winger advances outside you and keeps attacking.',
        [['a-lw', 20, 90]],
        [['h-rb', 27, 68]],
        'negative',
      ),
    ),
    read(
      'h-rb',
      D,
      'The winger has pushed the ball away from the protected foot to set a cross. You are still beside the next touch.',
      r(
        'Step through the crossing touch',
        'You take the exposed ball before the delivery and keep possession.',
        [['h-rb', 23, 90]],
        [],
        'right-back-5',
      ),
      x(
        'Turn toward the box before challenging him',
        'He crosses while you turn; their striker finishes the delivery.',
        [
          ['a-lw', 22, 91],
          ['a-st', 10, 54],
        ],
      ),
      d(
        'Hold your distance and wait for the cross',
        'He keeps possession and recycles inside rather than exposing another touch.',
        [['a-l8', 30, 69]],
      ),
      d(
        'Slide across both his legs and the ball',
        'You arrive across his standing leg. Rival XI receive a free kick.',
        [['a-lw', 23, 91]],
        [['h-rb', 22, 89]],
        'negative',
      ),
    ),
  ),

  spec(
    'catch-clean-shot',
    0,
    'A shot you can hold',
    'Their midfielder shoots from outside the box.',
    'a-l8',
    defending([
      ['a-l8', 24, 58],
      ['a-st', 27, 43],
      ['h-six', 27, 66],
    ]),
    read(
      'h-gk',
      D,
      'Their midfielder shapes to shoot from outside the box. Your view is clear and no attacker is close enough to obstruct a catch.',
      n(
        'Set your hands and hold it',
        'You catch cleanly and remove the rebound chance.',
        [['h-gk', 7, 53]],
        [],
        'match-save',
      ),
      x(
        'Punch it back toward the penalty spot',
        'The central rebound reaches their striker, who scores.',
        [
          ['h-gk', 8, 53],
          ['a-st', 13, 48],
        ],
      ),
      d(
        'Push the ball beyond our right post',
        'The save avoids a rebound, but Rival XI keep the attack from the corner.',
        [
          ['h-gk', 8, 57],
          ['a-lw', 2, 98],
        ],
      ),
      x(
        'Take a step toward the arriving striker',
        'Your movement opens the shooting corner and the original shot goes in.',
        [['a-l8', 23, 58]],
        [['h-gk', 10, 46]],
        56,
      ),
    ),
    read(
      'h-gk',
      A,
      'The ball is secure in your hands. Their striker waits near our centre-back; our six is open on the other side.',
      r(
        'Roll it toward our six',
        'The six receives away from the striker and keeps our ball.',
        [['h-six', 28, 66]],
        [],
        'goalkeeper-1',
      ),
      l(
        'Roll it toward the watched centre-back',
        'Their striker reads the release and intercepts.',
        [['a-st', 17, 41]],
      ),
      k(
        'Carry it across and use our full-back',
        'The full-back keeps possession, though their midfield has time to reset.',
        [
          ['h-gk', 8, 58],
          ['h-rb', 24, 84],
        ],
      ),
      l(
        'Kick it straight toward our central striker',
        'Their centre-back reaches the isolated long delivery first.',
        [['a-rcb', 64, 45]],
      ),
    ),
  ),

  spec(
    'parry-away-runner',
    0,
    'Send the rebound outside',
    'A low shot approaches our keeper with a striker following.',
    'a-r8',
    defending([
      ['a-r8', 24, 45],
      ['a-st', 22, 51],
      ['h-lb', 19, 23],
    ]),
    read(
      'h-gk',
      D,
      'Their midfielder winds up for a powerful shot. Their striker runs toward the middle, while our left-back is outside.',
      n(
        'Parry toward our left-back’s side',
        'Your angled save sends the rebound away from the central striker.',
        [
          ['h-gk', 8, 46],
          ['h-lb', 14, 23],
        ],
        [],
        'match-save',
      ),
      x(
        'Push the rebound straight back into play',
        'Their striker follows the central rebound and scores.',
        [
          ['h-gk', 8, 46],
          ['a-st', 13, 49],
        ],
      ),
      d(
        'Turn the ball toward our right post',
        'The keeper prevents the goal, but their winger reaches the wide rebound.',
        [
          ['h-gk', 8, 55],
          ['a-lw', 13, 80],
        ],
      ),
      x(
        'Come toward the shooter before setting',
        'The low shot reaches the corner while your feet are still moving.',
        [['a-r8', 23, 45]],
        [['h-gk', 10, 50]],
        44,
      ),
    ),
    read(
      'h-lb',
      D,
      'The keeper’s parry reaches your side. The striker must change direction to chase it.',
      r(
        'Meet it and secure the first touch',
        'You collect before the striker can reach the wide rebound.',
        [['h-lb', 15, 22]],
        [],
        'left-midfielder-1',
      ),
      x(
        'Wait for the ball to come closer',
        'Their striker changes direction and reaches the rebound before you.',
        [['a-st', 13, 24]],
      ),
      k(
        'Clear it along the line toward our winger',
        'The clearance reaches our winger, but they must control under pressure.',
        [
          ['h-lb', 15, 22],
          ['h-lw', 32, 15],
        ],
      ),
      x(
        'Pass it back across toward the goalkeeper',
        'The central striker intercepts your return and finishes.',
        [
          ['h-lb', 15, 22],
          ['a-st', 11, 44],
        ],
      ),
    ),
  ),

  spec(
    'shield-for-keeper',
    0,
    'The keeper is already coming',
    'Their overhit through ball rolls toward our penalty area.',
    { x: 13, y: 51 },
    defending([
      ['h-lcb', 14, 45],
      ['a-st', 19, 50],
      ['h-gk', 6, 50],
    ]),
    read(
      'h-lcb',
      D,
      'Our keeper calls and reaches the ball first. Their striker chases from behind you.',
      n(
        'Shield the chase and leave the ball',
        'Your position delays the striker while the keeper gathers the rolling ball.',
        [['h-gk', 7, 52]],
        [['h-lcb', 11, 48]],
        'right-centre-back-3',
      ),
      x(
        'Turn with the ball beside the striker',
        'The extra touch gives their striker a chance to steal and finish.',
        [
          ['h-lcb', 13, 51],
          ['a-st', 12, 50],
        ],
      ),
      k(
        'Clear it wide toward our left winger',
        'The winger keeps the ball, but the keeper’s clean claim was available.',
        [
          ['h-lcb', 13, 51],
          ['h-lw', 30, 16],
        ],
      ),
      x(
        'Leave the chase and run toward midfield',
        'The striker reaches the loose ball without your cover and scores.',
        [['a-st', 11, 51]],
        [['h-lcb', 22, 41]],
      ),
    ),
    read(
      'h-gk',
      A,
      'You have the ball. Their striker remains near our left centre-back, while our right-back is outside that pressure.',
      r(
        'Release it toward our right-back',
        'The safe outside release completes the defensive recovery.',
        [['h-rb', 26, 82]],
        [],
        'goalkeeper-1',
      ),
      l(
        'Roll it toward the same centre-back',
        'The striker is still beside that outlet and steals the release.',
        [['a-st', 12, 46]],
      ),
      k(
        'Hold it, then throw toward our left-back',
        'We keep possession, but Rival XI have time to drop into shape.',
        [
          ['h-gk', 8, 48],
          ['h-lb', 24, 17],
        ],
      ),
      l(
        'Kick it low through the central striker',
        'He blocks the kick and Rival XI collect the ball.',
        [['a-st', 15, 49]],
      ),
    ),
  ),

  spec(
    'near-post-lane',
    0,
    'The cross in front of the post',
    'Their winger prepares a hard low delivery from our right.',
    'a-lw',
    defending([
      ['a-lw', 9, 90],
      ['a-st', 21, 52],
      ['h-six', 20, 61],
      ['h-rcb', 10, 55],
    ]),
    read(
      'h-six',
      D,
      'Our centre-back guards the striker. The low lane in front of the near post is yours to cover.',
      n(
        'Step into the low crossing lane',
        'You meet the delivery before it reaches the striker or goalkeeper.',
        [['h-six', 13, 62]],
        [],
        'right-midfielder-5',
      ),
      x(
        'Move beside our centre-back to mark the striker',
        'Both of you watch the striker, leaving their arriving midfielder to finish the cross.',
        [
          ['a-lw', 8, 90],
          ['a-l8', 12, 65],
        ],
      ),
      d(
        'Stay outside the box for the clearance',
        'Their striker collects the delivery while our centre-back contains the turn.',
        [['a-st', 13, 52]],
        [['h-six', 25, 64]],
      ),
      x(
        'Run toward the winger to block the cross',
        'The delivery leaves before you arrive and the striker finishes.',
        [
          ['a-lw', 8, 90],
          ['a-st', 10, 53],
        ],
        [['h-six', 10, 84]],
      ),
    ),
    read(
      'h-six',
      D,
      'You have stopped the cross. Their striker is close to the central return, while our left winger is outside the box.',
      r(
        'Clear diagonally toward our winger',
        'The diagonal avoids their striker and lets our winger retain the ball.',
        [
          ['h-six', 14, 61],
          ['h-lw', 33, 18],
        ],
      ),
      x(
        'Send the ball straight across our goal',
        'Their striker intercepts the central clearance and scores.',
        [['a-st', 9, 52]],
      ),
      k(
        'Shield it and use our right-back',
        'Our right-back keeps the ball, but remains beside the attacking winger.',
        [
          ['h-six', 14, 62],
          ['h-rb', 20, 84],
        ],
      ),
      x(
        'Turn toward the nearby striker with it',
        'He catches the turn and shoots from close range.',
        [['a-st', 12, 59]],
      ),
    ),
  ),

  spec(
    'far-cross-head-out',
    0,
    'See the ball and the runner',
    'A floated delivery travels across toward our left-back.',
    'a-lw',
    defending([
      ['a-lw', 10, 90],
      ['a-rw', 24, 25],
      ['h-lb', 17, 26],
      ['h-lw', 30, 15],
    ]),
    read(
      'h-lb',
      D,
      'The far winger begins behind your shoulder. You have time to turn and see both the runner and the cross.',
      n(
        'Turn and get between runner and goal',
        'You stay goal-side and meet the delivery before the winger.',
        [['h-lb', 11, 28]],
        [['a-rw', 14, 25]],
        'right-back-4',
      ),
      x(
        'Face only the crossing winger and wait',
        'The far runner escapes behind your shoulder and heads in.',
        [['a-rw', 10, 26]],
      ),
      d(
        'Drop onto the goal line beside our keeper',
        'Their winger controls the delivery and keeps the attack alive.',
        [['a-rw', 12, 25]],
        [['h-lb', 3, 35]],
      ),
      x(
        'Step toward the centre to meet it earlier',
        'The ball clears your head and the winger finishes beyond you.',
        [['a-rw', 9, 26]],
        [['h-lb', 15, 40]],
      ),
    ),
    read(
      'h-lb',
      D,
      'The ball reaches you above the far side of the box. Our winger is outside, while their striker waits in the middle.',
      r(
        'Head it outside to our winger',
        'The header avoids the central striker and reaches our outlet.',
        [
          ['h-lb', 12, 27],
          ['h-lw', 30, 16],
        ],
      ),
      x(
        'Head it back toward the penalty spot',
        'The striker meets your central clearance and finishes.',
        [
          ['h-lb', 12, 27],
          ['a-st', 13, 50],
        ],
      ),
      k(
        'Cushion it down and use our centre-back',
        'Our centre-back keeps possession, though the winger closes from behind.',
        [
          ['h-lb', 12, 27],
          ['h-lcb', 17, 39],
        ],
      ),
      x(
        'Let it drop before turning to control',
        'The winger reaches around your turn and shoots.',
        [['a-rw', 10, 28]],
      ),
    ),
  ),

  spec(
    'punch-corner-distance',
    0,
    'Clear the crowd with the punch',
    'Their corner drops above a congested six-yard box.',
    'a-lw',
    defending([
      ['a-lw', 1, 99],
      ['h-gk', 5, 50],
      ['a-st', 12, 47],
      ['a-lcb', 14, 57],
      ['h-rcb', 19, 65],
      ['a-l8', 25, 63],
    ]),
    read(
      'h-gk',
      D,
      'Their corner taker prepares a high delivery into the crowded six-yard box. Bodies obstruct a clean catch; our defender waits beyond the crowd.',
      n(
        'Punch beyond the six-yard crowd',
        'A strong punch sends the ball toward our centre-back at the edge of the box.',
        [
          ['h-gk', 7, 49],
          ['h-rcb', 22, 65],
        ],
        [],
        'goalkeeper-4',
      ),
      x(
        'Try to catch while reaching over the striker',
        'The reaching catch spills among their attackers and their centre-back scores.',
        [
          ['h-gk', 7, 49],
          ['a-lcb', 9, 56],
        ],
      ),
      d(
        'Stay on the line behind the crowd',
        'Their striker controls the dropping delivery and keeps the pressure on.',
        [['a-st', 10, 48]],
      ),
      x(
        'Punch straight down toward the striker',
        'The short punch drops at his feet and he finishes.',
        [
          ['h-gk', 7, 49],
          ['a-st', 9, 47],
        ],
      ),
    ),
    read(
      'h-rcb',
      D,
      'The punch reaches you at the edge of the box. Their eight approaches from midfield; our six offers an inside outlet.',
      r(
        'Meet it and set our six',
        'You reach the dropping ball first and pass away from their arriving eight.',
        [
          ['h-rcb', 23, 64],
          ['h-six', 29, 48],
        ],
      ),
      x(
        'Let their eight reach the first bounce',
        'Their eight volleys the dropping ball into the far corner.',
        [['a-l8', 23, 64]],
        [],
        44,
      ),
      k(
        'Head it along the line to our winger',
        'Our winger retains the second clearance under pressure.',
        [
          ['h-rcb', 23, 64],
          ['h-rw', 34, 84],
        ],
      ),
      x(
        'Control and turn toward the outside runner',
        'Their eight steals the exposed touch and shoots.',
        [['a-l8', 22, 64]],
      ),
    ),
  ),

  spec(
    'low-free-kick-wall',
    0,
    'The low route under the wall',
    'Rival XI line up a direct free kick near our box.',
    'a-r8',
    defending([
      ['a-r8', 24, 50],
      ['h-six', 20, 49],
      ['h-l8', 20, 44],
      ['h-r8', 20, 55],
      ['h-lcb', 15, 38],
      ['a-st', 23, 40],
    ]),
    read(
      'h-six',
      D,
      'The taker looks at the bottom corner. A low strike can pass beneath a jumping wall; our keeper watches the other side.',
      n(
        'Keep your feet ready in the wall',
        'The low shot meets your foot and deflects toward our centre-back.',
        [
          ['h-six', 20, 48],
          ['h-lcb', 15, 38],
        ],
        [],
        'match-blocked-shot',
      ),
      x(
        'Jump high with both midfielders beside you',
        'The shot travels beneath the wall into the corner.',
        [['a-r8', 23, 50]],
        [
          ['h-six', 20, 51],
          ['h-l8', 20, 46],
          ['h-r8', 20, 57],
        ],
        44,
      ),
      d(
        'Leave the wall and close the taker',
        'They roll the ball outside your run and retain the free-kick attack.',
        [['a-l8', 25, 63]],
        [['h-six', 23, 50]],
      ),
      x(
        'Turn sideways before the ball arrives',
        'The low shot passes through the gap your turn opens.',
        [['a-r8', 23, 50]],
        [['h-six', 20, 52]],
        45,
      ),
    ),
    read(
      'h-lcb',
      D,
      'The wall’s block reaches your left side. Their striker is arriving and our winger waits beyond the box.',
      r(
        'Clear before the striker arrives',
        'Your early clearance reaches the winger and ends the free-kick pressure.',
        [
          ['h-lcb', 16, 37],
          ['h-lw', 33, 16],
        ],
      ),
      x(
        'Take the ball toward the approaching striker',
        'The striker steals the exposed first touch and finishes.',
        [['a-st', 16, 39]],
      ),
      k(
        'Pass inside toward our other centre-back',
        'We retain the ball, though their striker keeps us near our goal.',
        [
          ['h-lcb', 16, 37],
          ['h-rcb', 16, 60],
        ],
      ),
      x(
        'Wait for our goalkeeper to leave the line',
        'The striker reaches the ball before our keeper can claim it.',
        [['a-st', 14, 38]],
      ),
    ),
  ),

  spec(
    'underhit-midfield-square',
    0,
    'Their square pass is short',
    'Rival XI try to move the ball across midfield.',
    'a-six',
    attacking([
      ['a-six', 62, 42],
      ['a-r8', 59, 61],
      ['h-six', 54, 51],
      ['h-st', 78, 48],
      ['a-rcb', 85, 40],
      ['a-lcb', 85, 62],
    ]),
    read(
      'h-six',
      T,
      'Their square pass lacks pace. You can reach it before their eight, and our striker starts behind their line.',
      n(
        'Step through and take the pass',
        'You win the square ball facing forward before their eight can turn.',
        [['h-six', 59, 52]],
        [['a-r8', 60, 61]],
        'right-midfielder-5',
      ),
      d(
        'Drop back and leave it for their eight',
        'Their eight receives and Rival XI retain possession.',
        [['a-r8', 59, 60]],
        [['h-six', 48, 50]],
      ),
      x(
        'Run beyond their six to press the original passer',
        'The square pass escapes your run and their eight releases a scoring counter.',
        [
          ['a-r8', 59, 60],
          ['a-st', 18, 49],
        ],
        [['h-six', 64, 43]],
      ),
      d(
        'Slide through the arriving eight’s feet',
        'You arrive after the pass and concede a free kick in midfield.',
        [['a-r8', 58, 58]],
        [['h-six', 58, 59]],
        'negative',
      ),
    ),
    read(
      'h-six',
      A,
      'You face forward with possession. Their centre-backs have not dropped yet and our striker starts onside.',
      g(
        'Release our striker before they drop',
        'The striker meets the early through ball and finishes beyond the keeper.',
        [['h-st', 90, 47]],
        [],
        45,
      ),
      l(
        'Carry directly toward their holding midfielder',
        'Their six recovers into your next touch and wins it.',
        [['a-six', 64, 49]],
        [['h-six', 63, 49]],
      ),
      k(
        'Pass sideways toward our centre-back first',
        'We retain possession, but their centre-backs drop and close the run.',
        [['h-rcb', 41, 62]],
      ),
      l(
        'Clip a high pass behind their defensive line',
        'The overhit forward ball reaches the keeper instead of our striker.',
        [['a-gk', 94, 49]],
        [],
        'goalkeeper-4',
      ),
    ),
  ),

  spec(
    'keeper-launch-recovery',
    0,
    'Recover after their keeper catches',
    'Our cross is caught and their keeper looks up immediately.',
    'a-gk',
    defending([
      ['a-gk', 92, 50],
      ['h-rb', 69, 84],
      ['a-lw', 55, 88],
      ['h-rcb', 32, 60],
      ['h-lcb', 32, 40],
      ['h-gk', 7, 50],
    ]),
    read(
      'h-rb',
      T,
      'Their keeper can release the winger behind you. The inside route toward our goal must be covered first.',
      n(
        'Recover inside the winger’s running lane',
        'Your diagonal recovery stops the winger turning toward the centre.',
        [['a-lw', 45, 88]],
        [['h-rb', 40, 80]],
        'right-back-3',
      ),
      x(
        'Keep running toward their goalkeeper instead',
        'Their keeper releases the winger into your vacated channel and the counter ends in a goal.',
        [
          ['a-lw', 45, 88],
          ['a-st', 18, 50],
        ],
        [['h-rb', 85, 70]],
      ),
      d(
        'Retreat straight along the outside touchline',
        'The winger receives and carries inside your straight recovery.',
        [['a-lw', 42, 78]],
        [['h-rb', 42, 94]],
      ),
      d(
        'Stop to call our centre-back across',
        'The winger receives before the cover arrives and Rival XI keep the attack.',
        [['a-lw', 42, 87]],
        [['h-rb', 66, 82]],
        'negative',
      ),
    ),
    read(
      'h-gk',
      D,
      'Our recovering full-back has forced their winger outside. He prepares a long cross; no attacker is in our box yet.',
      r(
        'Come through and catch the cross',
        'The forced wide delivery is yours. The counterattack ends with the ball secure.',
        [
          ['a-lw', 24, 92],
          ['h-gk', 8, 58],
        ],
        [],
        'goalkeeper-4',
      ),
      x(
        'Stay on the line while it crosses goal',
        'Their late striker reaches the delivery before our retreating defender.',
        [
          ['a-lw', 24, 92],
          ['a-st', 12, 53],
        ],
      ),
      k(
        'Punch the delivery toward our right-back',
        'Our full-back keeps the rebound, although the catch was available.',
        [
          ['h-gk', 8, 58],
          ['h-rb', 23, 80],
        ],
      ),
      x(
        'Rush toward the winger before the delivery',
        'Your early charge leaves the goal open for the cross and finish.',
        [
          ['a-lw', 24, 92],
          ['a-st', 13, 50],
        ],
        [['h-gk', 17, 76]],
      ),
    ),
  ),

  // Intermediate: six attacking, four defending and one transition situation.
  spec(
    'six-underlap',
    1,
    'The runner behind both markers',
    'Our winger has drawn two defenders toward the left.',
    'h-lw',
    attacking([
      ['h-lw', 77, 18],
      ['h-lb', 81, 10],
      ['h-six', 70, 31],
      ['a-rb', 82, 14],
      ['a-six', 78, 25],
      ['a-rcb', 88, 44],
    ]),
    read(
      'h-lw',
      A,
      'Their full-back follows our overlapping left-back. Their six comes toward you, leaving our own six a diagonal route between them.',
      n(
        'Slip the pass into our six’s underlap',
        'Both markers face other players. Our six receives inside the full-back.',
        [['h-six', 85, 30]],
        [
          ['a-rb', 84, 10],
          ['a-six', 79, 20],
          ['a-gk', 95, 42],
        ],
        'left-midfielder-3',
      ),
      l(
        'Release the overlapping full-back outside them',
        'Their full-back is already following that run and intercepts.',
        [['a-rb', 85, 11]],
      ),
      k(
        'Set the ball back to our left eight',
        'Possession survives, but the two defenders close the diagonal gap.',
        [['h-l8', 67, 33]],
      ),
      l(
        'Carry inside across their holding midfielder',
        'Their six reaches your inside touch.',
        [['a-six', 79, 24]],
        [['h-lw', 79, 23]],
      ),
    ),
    read(
      'h-six',
      A,
      'You receive inside the box. The near centre-back blocks a square pass, while the keeper protects the near post.',
      g(
        'Finish low beyond the keeper’s far foot',
        'Your diagonal shot uses the lane left beyond the square-pass defender.',
        [['h-six', 87, 32]],
        [],
        55,
      ),
      l(
        'Square it across to our central striker',
        'The centre-back remained in that lane and intercepts.',
        [['a-rcb', 90, 44]],
      ),
      k(
        'Turn back and release our overlapping full-back',
        'Our full-back keeps possession, but their defender catches up.',
        [['h-lb', 88, 12]],
      ),
      l(
        'Carry across the front of the centre-back',
        'Your extra touch brings the ball within the centre-back’s reach.',
        [['a-rcb', 88, 37]],
        [['h-six', 87, 37]],
      ),
    ),
  ),

  spec(
    'low-keeper-chip',
    1,
    'Lift it after the keeper commits',
    'Our striker receives with the goalkeeper beginning to rush.',
    'h-r8',
    attacking([
      ['h-r8', 78, 66],
      ['h-st', 82, 49],
      ['a-lcb', 85, 46],
      ['a-gk', 94, 51],
    ]),
    read(
      'h-st',
      A,
      'The defender reaches across the direct shooting line. The keeper comes low through the middle, leaving room on your right.',
      n(
        'Take the touch around the reaching leg',
        'Your sideways control escapes the defender while the keeper keeps coming low.',
        [
          ['h-st', 84, 54],
          ['h-st', 87, 57],
        ],
        [
          ['a-lcb', 85, 49],
          ['a-gk', 90, 55],
        ],
        'striker-1',
      ),
      l(
        'Shoot through the defender before controlling it',
        'The centre-back’s extended leg blocks that first-time shot.',
        [['a-lcb', 85, 48]],
        [],
        'match-blocked-shot',
      ),
      k(
        'Return the pass to our right eight',
        'The eight retains it, but the keeper stops the charge and resets.',
        [
          ['h-st', 84, 51],
          ['h-r8', 79, 65],
        ],
      ),
      l(
        'Take the first touch directly at the keeper',
        'The keeper reaches the straight control touch and smothers it.',
        [['a-gk', 89, 51]],
        [['h-st', 88, 51]],
        'match-save',
      ),
    ),
    read(
      'h-st',
      A,
      'The ball is clear of the defender. The keeper has lowered both hands and committed their body toward your feet.',
      g(
        'Lift the finish over his lowered body',
        'The committed keeper cannot rise to the chip in time.',
        [['h-st', 88, 57]],
        [],
        50,
      ),
      l(
        'Drive the finish low toward the far corner',
        'His lowered hands and body already cover the ground route.',
        [['a-gk', 90, 56]],
        [],
        'match-save',
      ),
      k(
        'Set it backward to the supporting eight',
        'Our eight keeps the ball while the keeper gets upright.',
        [['h-r8', 80, 63]],
      ),
      l(
        'Carry another touch toward the goal line',
        'The keeper reaches the longer touch before you can turn.',
        [['a-gk', 90, 59]],
        [],
        'match-save',
      ),
    ),
  ),

  spec(
    'box-backheel',
    1,
    'The arrival behind your heel',
    'Our striker receives with their back to goal inside the box.',
    'h-l8',
    attacking([
      ['h-l8', 76, 36],
      ['h-st', 84, 48],
      ['h-r8', 77, 61],
      ['a-rcb', 87, 46],
      ['a-lcb', 90, 66],
    ]),
    read(
      'h-st',
      A,
      'The near centre-back presses your front-foot turn. Our right eight arrives behind your right heel, facing goal.',
      n(
        'Set the backheel into our eight’s stride',
        'The backheel uses the arrival without turning into the centre-back.',
        [
          ['h-st', 85, 48],
          ['h-r8', 84, 59],
        ],
        [
          ['a-rcb', 86, 46],
          ['a-gk', 94, 48],
        ],
        'striker-2',
      ),
      l(
        'Turn toward goal on the front foot',
        'The centre-back meets the turn with the ball exposed.',
        [['a-rcb', 85, 47]],
      ),
      k(
        'Bounce the pass back to our left eight',
        'Our left eight keeps possession, but the right eight has to stop the run.',
        [
          ['h-st', 85, 48],
          ['h-l8', 77, 37],
        ],
      ),
      l(
        'Flick the ball over the centre-back’s head',
        'The far centre-back sees the lifted touch and takes possession.',
        [['a-lcb', 89, 52]],
      ),
    ),
    read(
      'h-r8',
      A,
      'You meet the backheel facing goal. The keeper moves toward the striker and the far defender has not reached your shooting lane.',
      g(
        'Finish first time across the moving keeper',
        'The shot leaves before either defender can cover your arrival.',
        [['h-r8', 85, 58]],
        [],
        45,
      ),
      l(
        'Control and turn back toward the striker',
        'The centre-back follows the extra touch and intercepts the return.',
        [['a-rcb', 87, 51]],
      ),
      k(
        'Set it outside to our right winger',
        'Our winger retains it while the keeper returns to position.',
        [['h-rw', 81, 83]],
      ),
      l(
        'Carry across toward the far centre-back first',
        'That defender stands in the path of your next touch.',
        [['a-lcb', 88, 62]],
      ),
    ),
  ),

  spec(
    'outside-boot-delivery',
    1,
    'Deliver around the blocking foot',
    'Our right winger receives with a defender closing the crossing arc.',
    'h-rb',
    attacking([
      ['h-rb', 74, 87],
      ['h-rw', 82, 84],
      ['h-st', 82, 49],
      ['a-lb', 85, 80],
      ['a-lcb', 89, 60],
      ['a-gk', 95, 58],
    ]),
    read(
      'h-rw',
      A,
      'The defender blocks a normal instep cross inside you. The ball arrives outside your right foot and our striker begins an onside run.',
      n(
        'Cross early with the outside of your boot',
        'The outside-foot delivery bends beyond the blocking leg and reaches the striker.',
        [
          ['h-rw', 84, 85],
          ['h-st', 90, 49],
        ],
        [
          ['a-lb', 85, 81],
          ['a-gk', 95, 51],
        ],
        'right-winger-2',
      ),
      l(
        'Pull the ball inside for an instep cross',
        'The setup touch enters the defender’s blocking foot.',
        [['a-lb', 85, 81]],
      ),
      k(
        'Set it back down the line to our full-back',
        'The full-back keeps the ball, but their centre-back follows the striker’s run.',
        [
          ['h-rw', 84, 85],
          ['h-rb', 76, 89],
        ],
      ),
      l(
        'Attempt a rabona after another sideways touch',
        'The extra setup gives the full-back time to close and win it.',
        [['a-lb', 85, 84]],
      ),
    ),
    read(
      'h-st',
      A,
      'The bending cross reaches you between the defenders. The keeper is moving from the near post toward the middle.',
      g(
        'Guide the touch beyond the moving keeper',
        'Your first-time redirection sends the delivery behind the keeper’s movement.',
        [['h-st', 91, 49]],
        [],
        43,
      ),
      l(
        'Stop it and turn toward the far defender',
        'The far defender reaches the second touch and clears.',
        [['a-rcb', 91, 47]],
      ),
      k(
        'Cushion it backward to our left eight',
        'The midfielder keeps the ball, but the defence sets again.',
        [
          ['h-st', 91, 49],
          ['h-l8', 80, 36],
        ],
      ),
      l(
        'Head it toward the keeper’s moving side',
        'The keeper is already moving into that finishing direction.',
        [['a-gk', 94, 52]],
        [],
        'match-save',
      ),
    ),
  ),

  spec(
    'wait-for-checkback',
    1,
    'Make the striker eligible again',
    'Our eight sees a striker who has run beyond their defensive line.',
    'h-l8',
    attacking([
      ['h-l8', 75, 38],
      ['h-st', 86, 50],
      ['a-rcb', 84, 43],
      ['a-lcb', 84, 59],
      ['a-rb', 80, 18],
      ['a-lb', 80, 84],
    ]),
    read(
      'h-l8',
      A,
      'The striker is beyond both centre-backs and calls for the pass. They can check back while you carry into the space ahead.',
      n(
        'Carry forward while the striker checks back',
        'Your carry buys the check-back. The striker returns behind the ball before the next release.',
        [
          ['h-l8', 79, 40],
          ['h-l8', 82, 42],
        ],
        [['h-st', 80, 50]],
        'right-centre-back-2',
      ),
      l(
        'Play the early through ball toward the striker',
        'The centre-back cuts out the direct lane before it can reach the striker.',
        [['a-rcb', 82, 45]],
      ),
      k(
        'Switch the ball wide to our left winger',
        'We keep possession, but the striker’s central run must start again.',
        [['h-lw', 76, 15]],
      ),
      l(
        'Carry across toward their holding midfielder',
        'Their six steps across the inside route and steals your touch.',
        [['a-six', 78, 48]],
      ),
    ),
    read(
      'h-l8',
      A,
      'Our striker now starts behind the ball. Their nearest centre-back steps toward you, leaving the renewed run beyond them.',
      g(
        'Release the striker’s renewed forward run',
        'The pass is released after the check-back. The onside striker finishes the run.',
        [['h-st', 91, 49]],
        [['a-rcb', 83, 43]],
        46,
      ),
      l(
        'Shoot from outside the penalty area instead',
        'The stepping centre-back blocks the shot and takes possession.',
        [['a-rcb', 84, 43]],
        [],
        'match-blocked-shot',
      ),
      k(
        'Set it backward to our holding midfielder',
        'The ball is safe, but the renewed run is no longer useful.',
        [['h-six', 65, 49]],
      ),
      l(
        'Carry directly into the stepping centre-back',
        'He has set his feet and wins the next touch.',
        [['a-rcb', 84, 43]],
      ),
    ),
  ),

  spec(
    'nutmeg-exit',
    1,
    'The exit beyond the nutmeg',
    'Our winger faces a square defender with cover on the inside.',
    'h-rw',
    attacking([
      ['h-rw', 78, 82],
      ['a-lb', 82, 81],
      ['a-lcb', 87, 62],
      ['h-st', 80, 50],
    ]),
    read(
      'h-rw',
      A,
      'Their full-back stands square with feet apart. The outside exit is clear, but their centre-back covers the inside exit.',
      n(
        'Push through his feet and exit outside',
        'You collect beyond the square defender on the side their cover cannot reach.',
        [
          ['h-rw', 82, 87],
          ['h-rw', 87, 90],
        ],
        [['a-lb', 82, 83]],
        'right-winger-3',
      ),
      l(
        'Push through his feet and follow inside',
        'The centre-back covers that exit and takes the ball.',
        [['a-lcb', 86, 70]],
      ),
      k(
        'Set the ball back to our right-back',
        'Safe possession, but the full-back closes the gap between their feet.',
        [['h-rb', 70, 87]],
      ),
      l(
        'Lift the ball over his head into the centre',
        'The covering centre-back reads the lifted touch and collects.',
        [['a-lcb', 87, 68]],
      ),
    ),
    read(
      'h-rw',
      A,
      'You have collected outside the beaten defender. The keeper guards your angle; our striker starts behind the ball.',
      g(
        'Send the low pass across to our striker',
        'The striker meets the square delivery and finishes beyond the keeper.',
        [['h-st', 92, 50]],
        [],
        48,
      ),
      l(
        'Shoot high toward the covered near post',
        'The keeper remains on that side and saves.',
        [['a-gk', 95, 59]],
        [],
        'match-save',
      ),
      k(
        'Take the ball backward toward our full-back',
        'We keep it, but the full-back you beat recovers.',
        [['h-rw', 81, 86]],
      ),
      l(
        'Dribble inside toward the remaining centre-back',
        'The covering defender is still there and wins the inward touch.',
        [['a-lcb', 88, 65]],
      ),
    ),
  ),

  spec(
    'deny-nutmeg',
    1,
    'Close the gate before the touch',
    'Their winger tries to draw our left-back into a square stance.',
    'a-rw',
    defending([
      ['a-rw', 30, 16],
      ['h-lb', 25, 19],
      ['a-r8', 35, 34],
    ]),
    read(
      'h-lb',
      D,
      'The winger looks between your feet while their eight offers an inside exit. A narrow, angled stance can remove the nutmeg route.',
      n(
        'Narrow your stance and retreat at an angle',
        'The central gap disappears. The winger must push the ball outside instead.',
        [['a-rw', 23, 13]],
        [['h-lb', 23, 18]],
        'right-back-3',
      ),
      x(
        'Spread your feet and step straight forward',
        'The ball goes between your feet and their winger feeds a close-range finish.',
        [
          ['a-rw', 21, 17],
          ['a-st', 12, 48],
        ],
      ),
      d(
        'Move inside to follow their supporting eight',
        'The winger carries down the line without your pressure.',
        [['a-rw', 20, 12]],
        [['h-lb', 29, 31]],
      ),
      d(
        'Back away while facing square toward the ball',
        'The winger retains both exits and advances into crossing range.',
        [['a-rw', 21, 16]],
        [['h-lb', 19, 19]],
        'negative',
      ),
    ),
    read(
      'h-lb',
      D,
      'Their outside touch now leaves the ball beyond the protecting foot. You stayed beside its path.',
      r(
        'Step across the exposed outside touch',
        'You reach the ball before the winger can get around your angled stance.',
        [['h-lb', 22, 13]],
        [],
        'right-back-5',
      ),
      x(
        'Turn toward the supporting eight first',
        'The winger crosses while you turn and their striker finishes.',
        [
          ['a-rw', 21, 13],
          ['a-st', 11, 47],
        ],
      ),
      d(
        'Keep retreating and allow the next touch',
        'The winger keeps possession and brings the eight back into play.',
        [['a-r8', 27, 31]],
      ),
      d(
        'Slide across the winger’s standing leg',
        'The tackle catches the leg after the ball moves. Free kick to Rival XI.',
        [['a-rw', 22, 13]],
        [['h-lb', 21, 15]],
        'negative',
      ),
    ),
  ),

  spec(
    'chest-set-screen',
    1,
    'Stay balanced for the set pass',
    'Their striker receives a chest-high pass with our centre-back behind.',
    'a-six',
    defending([
      ['a-six', 44, 50],
      ['a-st', 28, 58],
      ['a-l8', 35, 47],
      ['h-rcb', 23, 60],
      ['h-six', 32, 49],
    ]),
    read(
      'h-rcb',
      D,
      'The striker has their back to goal and the ball arrives above their feet. Our six is ready to attack the set pass inside.',
      n(
        'Stay balanced behind the chest control',
        'You prevent the striker turning without jumping through their back. They have to set inside.',
        [['a-st', 27, 58]],
        [
          ['h-rcb', 23, 59],
          ['h-six', 30, 48],
        ],
        'right-centre-back-3',
      ),
      x(
        'Jump through the striker to contest the ball',
        'The striker rolls away from your landing and finishes beyond our keeper.',
        [['a-st', 18, 56]],
        [['h-rcb', 28, 58]],
      ),
      d(
        'Drop toward the goalkeeper before he controls',
        'The striker can bring the ball down and carry, keeping the attack alive.',
        [['a-st', 24, 57]],
        [['h-rcb', 12, 60]],
      ),
      x(
        'Step around his outside shoulder immediately',
        'He turns inside the space you leave and shoots.',
        [['a-st', 17, 54]],
        [['h-rcb', 28, 65]],
      ),
    ),
    read(
      'h-six',
      D,
      'The striker cannot turn and sets toward their eight. You face that lane while the eight approaches from the far side.',
      r(
        'Step through the set-pass lane',
        'You meet the layoff facing forward and win the ball.',
        [
          ['a-st', 27, 57],
          ['h-six', 30, 49],
        ],
      ),
      x(
        'Run past the striker toward their original passer',
        'The eight receives behind your run and finishes from the box edge.',
        [
          ['a-st', 27, 57],
          ['a-l8', 26, 46],
        ],
        [['h-six', 39, 50]],
      ),
      d(
        'Hold beside our centre-back and wait',
        'Their eight receives the set pass and Rival XI retain the ball.',
        [
          ['a-st', 27, 57],
          ['a-l8', 31, 46],
        ],
      ),
      d(
        'Tackle the striker from behind instead',
        'The ball has already left. Your challenge gives Rival XI a free kick.',
        [
          ['a-st', 27, 57],
          ['a-l8', 31, 46],
        ],
        [['h-six', 27, 58]],
        'negative',
      ),
    ),
  ),

  spec(
    'keeper-smother-touch',
    1,
    'Arrive at the ball, not the runner',
    'Their through ball enters our box before the striker’s long stride.',
    'a-r8',
    defending([
      ['a-r8', 35, 42],
      ['a-st', 23, 46],
      ['h-gk', 7, 50],
      ['h-lcb', 19, 36],
      ['h-rcb', 20, 59],
      ['a-rw', 34, 28],
      ['a-lw', 42, 68],
    ]),
    read(
      'h-gk',
      D,
      'The pass rolls inside our box. The striker stretches for it but you can reach the ball before their first touch.',
      n(
        'Advance directly to the ball and smother',
        'You arrive before the stretched touch and hold the ball inside the area.',
        [['h-gk', 15, 44]],
        [],
        'goalkeeper-2',
      ),
      x(
        'Stay on the line and set for the shot',
        'The striker controls freely and places the finish beyond you.',
        [['a-st', 14, 45]],
      ),
      d(
        'Stop halfway and block the passing lane',
        'The striker takes the ball wide and retains the attack.',
        [['a-st', 14, 29]],
        [['h-gk', 11, 46]],
      ),
      x(
        'Dive toward the striker’s running feet',
        'The pass travels beside your dive and the striker collects behind you.',
        [['a-st', 12, 45]],
        [['h-gk', 17, 49]],
      ),
    ),
    read(
      'h-gk',
      A,
      'The ball is secure. Their nearest winger stays inside our left-back; our right-back offers an open release.',
      r(
        'Throw outside into our right-back’s stride',
        'The quick outside release escapes the recovered central pressure.',
        [['h-rb', 31, 83]],
        [],
        'goalkeeper-1',
      ),
      l(
        'Roll it centrally toward our watched six',
        'Their eight steps into the central release.',
        [['a-r8', 25, 47]],
      ),
      k(
        'Walk back and use our left centre-back',
        'The centre-back keeps it, but Rival XI reset their press.',
        [
          ['h-gk', 8, 49],
          ['h-lcb', 22, 35],
        ],
      ),
      l(
        'Kick a flat pass down the left side',
        'Their winger controls the misplaced clearance before our outlet can receive it.',
        [['a-lw', 37, 77]],
      ),
    ),
  ),

  spec(
    'screen-diagonal-jump',
    1,
    'The diagonal is the escape',
    'Their eight wants to draw our midfielder away from the centre.',
    'a-l8',
    defending([
      ['a-l8', 57, 65],
      ['a-six', 51, 48],
      ['a-lw', 64, 85],
      ['h-r8', 53, 61],
      ['h-rw', 69, 82],
    ]),
    read(
      'h-r8',
      D,
      'Their eight looks at the six while their winger checks outside. Our winger can attack that diagonal if you keep the central lane closed.',
      n(
        'Hold the central screen as he turns',
        'Their six remains unavailable. The eight prepares the diagonal our winger can read.',
        [['a-l8', 56, 66]],
        [
          ['h-r8', 52, 57],
          ['h-rw', 67, 82],
        ],
        'right-midfielder-4',
      ),
      x(
        'Run directly toward the ball carrier now',
        'The central pass opens and their six launches a scoring counter.',
        [
          ['a-six', 49, 48],
          ['a-st', 18, 49],
        ],
        [['h-r8', 56, 65]],
      ),
      d(
        'Follow their winger toward the touchline',
        'Their six receives through the middle and keeps possession.',
        [['a-six', 50, 49]],
        [['h-r8', 62, 82]],
      ),
      d(
        'Drop behind our full-back to wait',
        'The eight carries forward before selecting the next pass.',
        [['a-l8', 49, 64]],
        [['h-r8', 23, 77]],
        'negative',
      ),
    ),
    read(
      'h-rw',
      D,
      'Our eight has closed the middle. Their diagonal toward the touchline is leaving the passer’s foot and the winger checks toward it.',
      r(
        'Jump across the diagonal as it travels',
        'You intercept facing up the line before their winger can turn.',
        [['h-rw', 63, 84]],
        [],
        'right-winger-4',
      ),
      x(
        'Run at the passer after the release',
        'Their winger receives outside you and delivers a scoring cross.',
        [
          ['a-lw', 60, 86],
          ['a-st', 14, 50],
        ],
        [['h-rw', 56, 67]],
      ),
      d(
        'Back off and let their winger control',
        'They retain the ball on the line and recycle backward.',
        [['a-lw', 62, 85]],
      ),
      d(
        'Slide toward the receiver after his first touch',
        'You arrive late and foul the receiving winger.',
        [['a-lw', 62, 85]],
        [['h-rw', 62, 86]],
        'negative',
      ),
    ),
  ),

  spec(
    'third-man-loss-cover',
    1,
    'Cover the runner after our wall pass fails',
    'A short central combination breaks down with our centre-back stepping forward.',
    'a-six',
    defending([
      ['a-six', 51, 49],
      ['a-st', 32, 44],
      ['a-l8', 46, 63],
      ['h-six', 55, 49],
      ['h-lcb', 35, 40],
      ['h-rcb', 29, 59],
    ]),
    read(
      'h-six',
      T,
      'Their six has intercepted. Our left centre-back is ahead of the striker; the pass behind that defender is the immediate danger.',
      n(
        'Recover across the striker’s passing lane',
        'You remove the direct release and give our centre-back time to recover.',
        [['a-six', 46, 53]],
        [
          ['h-six', 39, 46],
          ['h-lcb', 28, 41],
        ],
        'left-midfielder-5',
      ),
      x(
        'Chase the interceptor straight through the middle',
        'Their six releases the striker beyond our stepping defender and they score.',
        [['a-st', 18, 44]],
        [['h-six', 49, 51]],
      ),
      d(
        'Drop beside our right-back on the outside',
        'The central runner stays available and Rival XI keep the counter moving.',
        [['a-l8', 38, 59]],
        [['h-six', 32, 81]],
      ),
      d(
        'Stop and ask our centre-back to retreat',
        'Their six advances before the defender can reorganise.',
        [['a-six', 42, 51]],
        [['h-six', 54, 49]],
        'negative',
      ),
    ),
    read(
      'h-lcb',
      D,
      'Our six blocks the striker’s direct lane. Their passer now sends a diagonal toward the striker’s outside foot; you have recovered goal-side.',
      r(
        'Step across the redirected pass',
        'Your recovery position lets you intercept the second route and stop the counter.',
        [['h-lcb', 27, 43]],
        [],
        'right-centre-back-5',
      ),
      x(
        'Step back up toward their midfielder',
        'The diagonal reaches the striker behind your new step and they score.',
        [['a-st', 19, 44]],
        [['h-lcb', 37, 47]],
      ),
      d(
        'Stay deep and allow the striker to receive',
        'The striker receives with their back to goal and Rival XI retain possession.',
        [['a-st', 25, 44]],
        [['h-lcb', 18, 40]],
      ),
      x(
        'Follow the outside midfielder away from goal',
        'The striker receives through the gap you leave and finishes.',
        [['a-st', 17, 44]],
        [['h-lcb', 32, 60]],
      ),
    ),
  ),

  // Hard: six attacking, four defending and one transition situation.
  spec(
    'urgent-rabona',
    2,
    'The delivery without a setup touch',
    'Our right-footed left winger controls near the byline.',
    'h-lw',
    attacking([
      ['h-lw', 89, 17],
      ['h-st', 87, 50],
      ['a-rb', 88, 25],
      ['a-rcb', 94, 40],
      ['a-lcb', 93, 62],
      ['a-gk', 95, 44],
    ]),
    read(
      'h-lw',
      A,
      'The defender closes from inside. Your strong right foot needs the ball kept outside your planted left leg; the striker waits behind the ball.',
      n(
        'Stop it outside your planted left foot',
        'The outside control protects the ball and keeps the striker behind the coming release.',
        [
          ['h-lw', 91, 19],
          ['h-lw', 92, 23],
        ],
        [
          ['a-rb', 91, 29],
          ['h-st', 90, 50],
        ],
        'left-winger-3',
      ),
      l(
        'Bring the ball inside onto your right foot',
        'The inside setup touch moves directly into the closing defender.',
        [['a-rb', 91, 25]],
      ),
      k(
        'Turn backward and return to our left-back',
        'The full-back retains it while the striker’s immediate opening closes.',
        [['h-lb', 78, 15]],
      ),
      l(
        'Send a high delivery with your weaker foot',
        'Your weaker-foot contact lifts the ball for the keeper to claim.',
        [['a-gk', 95, 45]],
        [],
        'goalkeeper-4',
      ),
    ),
    read(
      'h-lw',
      A,
      'The ball is outside your left leg and the defender blocks an inside setup. You can wrap your strong right foot behind; the striker still starts behind the ball.',
      g(
        'Wrap the right foot behind for a rabona',
        'The immediate rabona avoids the setup touch. The striker meets the cross and finishes.',
        [
          ['h-lw', 93, 24],
          ['h-st', 95, 50],
        ],
        [],
        53,
      ),
      l(
        'Touch it inside before using your right foot',
        'That setup lets the defender reach the ball before the cross.',
        [['a-rb', 93, 27]],
      ),
      k(
        'Turn back and pass toward our left eight',
        'The midfielder keeps possession, but the defender removes the delivery angle.',
        [['h-l8', 79, 34]],
      ),
      l(
        'Lift the ball directly toward the near post',
        'The keeper has that narrow angle covered and holds the shot.',
        [['a-gk', 96, 40]],
        [],
        'match-save',
      ),
    ),
  ),

  spec(
    'curl-to-volley',
    2,
    'Find the blind-side volley',
    'Our left eight can deliver diagonally behind their far full-back.',
    'h-l8',
    attacking([
      ['h-l8', 75, 35],
      ['h-rw', 80, 72],
      ['h-st', 83, 48],
      ['a-lb', 84, 77],
      ['a-lcb', 88, 59],
      ['a-rcb', 89, 42],
      ['a-gk', 95, 44],
    ]),
    read(
      'h-l8',
      A,
      'Their far full-back watches the striker inside. Our winger starts onside outside that shoulder; a curling delivery can reach the run before the defender turns.',
      n(
        'Curl the diagonal behind the far full-back',
        'The onside winger meets the cross on the blind side, away from the striker’s markers.',
        [['h-rw', 91, 65]],
        [
          ['a-lb', 87, 76],
          ['a-lcb', 89, 53],
          ['a-gk', 95, 58],
        ],
        'right-winger-2',
      ),
      l(
        'Drive a flat pass toward our striker',
        'The near centre-back reads that direct line and intercepts.',
        [['a-rcb', 86, 40]],
      ),
      k(
        'Set it wide to our left-back first',
        'The full-back keeps it, but their far defender checks the winger and recovers.',
        [['h-lb', 73, 14]],
      ),
      l(
        'Carry toward their holding midfielder before crossing',
        'Their six closes your carry and wins the ball before delivery.',
        [['a-six', 77, 39]],
      ),
    ),
    read(
      'h-rw',
      A,
      'The cross drops at knee height beyond the full-back. The keeper moves toward you and their centre-back will reach a settling touch.',
      g(
        'Volley back across the keeper’s movement',
        'The first-time volley uses the corner the keeper has just left.',
        [['h-rw', 92, 64]],
        [],
        43,
      ),
      l(
        'Bring it down before turning toward the goal',
        'The recovering centre-back reaches the settling touch.',
        [['a-lcb', 92, 62]],
      ),
      k(
        'Cushion it backward toward our right eight',
        'Our eight retains it while their defenders return to the box.',
        [
          ['h-rw', 92, 64],
          ['h-r8', 79, 66],
        ],
      ),
      l(
        'Volley toward the same side as the keeper',
        'The keeper’s movement takes them into that finish.',
        [['a-gk', 95, 59]],
        [],
        'match-save',
      ),
    ),
  ),

  spec(
    'free-kick-wall-step',
    2,
    'The wall’s outer player steps',
    'We have a central free kick with an outside midfielder ready.',
    'h-l8',
    attacking([
      ['h-l8', 77, 43],
      ['h-r8', 75, 65],
      ['a-six', 82, 47],
      ['a-r8', 82, 53],
      ['a-l8', 82, 59],
      ['a-lcb', 91, 62],
      ['a-rcb', 91, 39],
    ]),
    read(
      'h-l8',
      A,
      'The outer wall player starts to close our eight. A short disguised layoff can draw them farther out and open the shooting channel they leave.',
      n(
        'Disguise the shot and lay off outside',
        'The wall’s outer player follows the layoff. Our eight receives beyond their reaching foot.',
        [['h-r8', 79, 66]],
        [['a-l8', 83, 62]],
        'right-midfielder-1',
      ),
      l(
        'Drive the direct shot low toward the corner',
        'The central wall blocks the direct strike.',
        [['a-r8', 82, 53]],
        [],
        'match-blocked-shot',
      ),
      k(
        'Roll it backward toward our holding midfielder',
        'We keep the free-kick possession while the wall and defence reset.',
        [['h-six', 65, 48]],
      ),
      l(
        'Clip it straight toward the central striker',
        'The centre-back faces that lofted delivery and heads it away.',
        [['a-rcb', 89, 46]],
      ),
    ),
    read(
      'h-r8',
      A,
      'The outer wall player has stepped out. A touch inside reaches the gap behind that step; the central wall still blocks a straight strike.',
      g(
        'Touch inside and shoot through the vacated gap',
        'The short control avoids the closing player and opens the low shooting channel.',
        [
          ['h-r8', 80, 61],
          ['h-r8', 82, 59],
        ],
        [],
        55,
      ),
      l(
        'Shoot first time toward the outside corner',
        'The closing midfielder blocks the direct strike.',
        [['a-l8', 82, 65]],
        [],
        'match-blocked-shot',
      ),
      k(
        'Return it to the original taker',
        'The taker retains it, but the outer player rejoins the wall.',
        [['h-l8', 77, 44]],
      ),
      l(
        'Carry outside before looking for the shot',
        'The closing player recovers to that outside touch and tackles.',
        [['a-l8', 82, 66]],
      ),
    ),
  ),

  spec(
    'long-throw-flick-volley',
    2,
    'The throw, the flick, the finish',
    'Our right-back prepares a long throw near their box.',
    'h-rb',
    attacking([
      ['h-rb', 94, 99],
      ['h-rcb', 85, 61],
      ['h-st', 84, 50],
      ['a-lcb', 92, 64],
      ['a-rcb', 93, 42],
      ['a-gk', 96, 48],
    ]),
    read(
      'h-rb',
      A,
      'Our centre-back can reach a throw above the near defender. The striker begins behind that flicking position and their far defender is watching the thrower.',
      n(
        'Throw beyond the near defender for the flick',
        'Our centre-back glances it onward. The striker is onside at that second touch and receives inside.',
        [
          ['h-rcb', 88, 61],
          ['h-st', 93, 52],
        ],
        [['a-lcb', 91, 65]],
        'right-centre-back-5',
      ),
      l(
        'Throw directly into the near defender’s zone',
        'The defender faces the short landing point and heads it clear.',
        [['a-lcb', 90, 64]],
      ),
      k(
        'Take the short throw toward our winger',
        'The winger retains possession, but the flicking opportunity closes.',
        [['h-rw', 88, 87]],
      ),
      l(
        'Launch the throw straight toward the keeper',
        'The keeper moves through and claims the direct delivery.',
        [['a-gk', 95, 51]],
        [],
        'goalkeeper-4',
      ),
    ),
    read(
      'h-st',
      A,
      'The flick reaches your thigh height. The keeper guards the far side, and the far defender approaches your landing touch.',
      g(
        'Volley before the ball reaches the ground',
        'You finish the flick first time before the defender can meet a settling touch.',
        [['h-st', 94, 52]],
        [],
        55,
      ),
      l(
        'Let it drop and turn toward the defender',
        'The defender reaches that landing touch and clears.',
        [['a-rcb', 94, 49]],
      ),
      k(
        'Cushion the ball back toward our eight',
        'The eight keeps it while the defenders regroup.',
        [
          ['h-st', 94, 52],
          ['h-r8', 81, 65],
        ],
      ),
      l(
        'Head the ball toward the keeper’s far side',
        'The keeper still covers that side and holds the finish.',
        [['a-gk', 96, 46]],
        [],
        'match-save',
      ),
    ),
  ),

  spec(
    'centre-back-last-man',
    2,
    'Carry until the final defender chooses',
    'Our centre-back has broken into the attacking half with a winger beside.',
    'h-rcb',
    attacking([
      ['h-rcb', 68, 61],
      ['h-lw', 72, 34],
      ['a-lcb', 80, 54],
      ['a-rcb', 61, 39],
      ['a-rb', 59, 18],
      ['a-lb', 60, 85],
      ['a-six', 57, 49],
      ['h-st', 70, 49],
    ]),
    read(
      'h-rcb',
      A,
      'Their last centre-back stays between you and our winger. The winger can remain behind the ball while you force that defender to choose.',
      n(
        'Carry until the last defender steps across',
        'Your direct carry commits their centre-back. The winger stays behind your new ball position.',
        [
          ['h-rcb', 76, 59],
          ['h-rcb', 83, 57],
        ],
        [
          ['a-lcb', 81, 58],
          ['h-lw', 80, 34],
        ],
        'right-centre-back-2',
      ),
      l(
        'Send the diagonal before the defender commits',
        'The spare defender reads the early diagonal and intercepts.',
        [['a-lcb', 78, 47]],
      ),
      k(
        'Return it toward our holding midfielder',
        'We retain possession while their other defenders recover.',
        [['h-six', 57, 48]],
      ),
      l(
        'Clip a high pass behind the last defender',
        'The overhit delivery reaches the keeper without an attacking touch.',
        [['a-gk', 94, 50]],
        [],
        'goalkeeper-4',
      ),
    ),
    read(
      'h-rcb',
      A,
      'The last defender has stepped toward your carry. Our winger starts behind the ball on the other side and can attack the square release.',
      g(
        'Release the winger from behind the ball',
        'The winger is eligible because the release starts ahead of them. They meet it and finish.',
        [['h-lw', 89, 37]],
        [['a-lcb', 83, 58]],
        45,
      ),
      l(
        'Carry straight through the last defender now',
        'The committed defender is close enough to win that touch.',
        [['a-lcb', 84, 58]],
      ),
      k(
        'Stop and bring our holding midfielder forward',
        'We keep the ball, but the recovering defence reaches the box.',
        [['h-rcb', 81, 60]],
      ),
      l(
        'Shoot low toward the keeper from this angle',
        'The keeper still covers your direct shooting line.',
        [['a-gk', 94, 54]],
        [],
        'match-save',
      ),
    ),
  ),

  spec(
    'keeper-drag-reverse',
    2,
    'Escape the keeper’s first-touch press',
    'Rival XI screen our static outlets and press the goalkeeper’s next touch.',
    'h-gk',
    attacking([
      ['h-gk', 9, 50],
      ['h-six', 27, 49],
      ['h-rb', 24, 84],
      ['h-lcb', 24, 35],
      ['h-rw', 66, 82],
      ['a-st', 17, 50],
      ['a-l8', 29, 56],
      ['a-r8', 27, 36],
      ['a-rb', 81, 20],
    ]),
    read(
      'h-gk',
      A,
      'Their striker commits toward your left-foot setup and the centre-back outlet is screened. A short drag right opens the reverse pass to our six.',
      n(
        'Drag the ball right of the striker’s run',
        'The striker runs past your setup side. You preserve the ball and expose the six’s lane.',
        [
          ['h-gk', 10, 54],
          ['h-gk', 11, 58],
        ],
        [
          ['a-st', 12, 48],
          ['a-l8', 24, 57],
        ],
        'goalkeeper-5',
      ),
      x(
        'Roll it toward the screened centre-back now',
        'Their eight intercepts the predictable release and scores.',
        [['a-r8', 22, 35]],
      ),
      k(
        'Lift the ball wide toward our right-back',
        'The full-back keeps the delivery, but the press can reset around that side.',
        [['h-rb', 27, 85]],
      ),
      x(
        'Carry left along the striker’s pressing run',
        'The striker reaches that setup touch and finishes into our open goal.',
        [['a-st', 10, 48]],
      ),
    ),
    read(
      'h-six',
      A,
      'The keeper now has a clear reverse lane to you. Their eight has followed the keeper’s drag, and our right winger starts behind the full-back.',
      g(
        'Receive the reverse and release our winger',
        'The reverse pass beats the first press. Your early diagonal sends the onside winger through to finish.',
        [
          ['h-six', 28, 49],
          ['h-rw', 88, 73],
        ],
        [['a-l8', 24, 57]],
        53,
      ),
      l(
        'Turn the first touch toward their central eight',
        'The midfielder closes that turn and steals the ball.',
        [
          ['h-six', 28, 49],
          ['a-l8', 29, 51],
        ],
      ),
      k(
        'Return the reverse pass to our goalkeeper',
        'The keeper retains it, but their striker has time to curve back into the lane.',
        [
          ['h-six', 28, 49],
          ['h-gk', 12, 56],
        ],
      ),
      l(
        'Clip the diagonal over their midfield line',
        'The diagonal is too central and their defender controls it.',
        [
          ['h-six', 28, 49],
          ['a-lcb', 79, 61],
        ],
      ),
    ),
  ),

  spec(
    'third-man-screen',
    2,
    'The short striker is a decoy',
    'Their striker checks toward midfield while an eight runs beyond.',
    'a-six',
    defending([
      ['a-six', 43, 48],
      ['a-st', 26, 50],
      ['a-l8', 36, 64],
      ['a-lw', 28, 85],
      ['h-six', 29, 48],
      ['h-rcb', 18, 59],
      ['h-rb', 20, 80],
    ]),
    read(
      'h-six',
      D,
      'The striker’s check invites you forward. Their eight runs into the space you would leave, while the winger pins our full-back outside.',
      n(
        'Hold the return lane behind the striker',
        'The striker can receive but cannot turn. You preserve cover against the eight’s third-man run.',
        [['a-st', 30, 50]],
        [
          ['h-six', 27, 51],
          ['h-rcb', 19, 56],
        ],
        'right-midfielder-4',
      ),
      x(
        'Follow the striker’s checking run into midfield',
        'The layoff releases their eight through the space behind your run.',
        [
          ['a-st', 30, 50],
          ['a-l8', 19, 61],
        ],
        [['h-six', 33, 49]],
      ),
      d(
        'Move outside to help against their winger',
        'Their striker receives with room to turn and Rival XI keep the central attack.',
        [['a-st', 28, 49]],
        [['h-six', 25, 75]],
      ),
      x(
        'Press the original passer beyond the striker',
        'The striker sets the ball into the eight’s uncovered run and they score.',
        [
          ['a-st', 30, 50],
          ['a-l8', 18, 61],
        ],
        [['h-six', 39, 49]],
      ),
    ),
    read(
      'h-rcb',
      D,
      'Our six blocks the striker’s direct return. The striker redirects the set pass toward the eight’s outside run, which you see from goal-side.',
      r(
        'Step across the redirected third-man pass',
        'Your position intercepts the new route before the eight can enter the box.',
        [
          ['a-st', 29, 50],
          ['h-rcb', 21, 57],
        ],
        [],
        'right-centre-back-5',
      ),
      x(
        'Follow the striker away from our box',
        'The redirected set reaches their eight behind your step and they finish.',
        [
          ['a-st', 29, 50],
          ['a-l8', 17, 61],
        ],
        [['h-rcb', 29, 52]],
      ),
      d(
        'Drop onto the six-yard line to wait',
        'The eight receives outside the box and keeps the attack alive.',
        [
          ['a-st', 29, 50],
          ['a-l8', 22, 62],
        ],
        [['h-rcb', 7, 57]],
      ),
      x(
        'Move wide toward the pinned full-back',
        'The eight reaches the set pass through the central gap you leave.',
        [
          ['a-st', 29, 50],
          ['a-l8', 16, 59],
        ],
        [['h-rcb', 20, 77]],
      ),
    ),
  ),

  spec(
    'trap-too-late',
    2,
    'The passer is already releasing',
    'Our back line wants to step as their passer opens their body.',
    'a-six',
    defending([
      ['a-six', 48, 45],
      ['a-st', 35, 41],
      ['h-lcb', 35, 39],
      ['h-rcb', 35, 60],
      ['h-lb', 35, 18],
      ['h-rb', 35, 84],
      ['h-six', 42, 50],
      ['h-lw', 50, 16],
      ['h-rw', 50, 84],
      ['h-gk', 12, 50],
    ]),
    read(
      'h-lcb',
      D,
      'Their striker starts level with our line and the passer is already striking. Stepping after this touch cannot make the original run offside.',
      n(
        'Turn and recover with the eligible runner',
        'You stay goal-side of the legal run and direct the striker’s first touch outside.',
        [['a-st', 25, 39]],
        [
          ['h-lcb', 23, 42],
          ['h-rcb', 29, 56],
        ],
        'right-centre-back-4',
      ),
      x(
        'Step up after the passing touch leaves',
        'The striker was eligible at release and scores beyond your late step.',
        [['a-st', 18, 42]],
        [['h-lcb', 43, 39]],
      ),
      d(
        'Sprint toward the passer instead of the run',
        'The striker receives with space and Rival XI keep the attack.',
        [['a-st', 23, 40]],
        [['h-lcb', 45, 44]],
      ),
      x(
        'Leave the runner to our far centre-back',
        'Your partner cannot cross in time and the striker finishes.',
        [['a-st', 17, 41]],
        [['h-lcb', 31, 27]],
      ),
    ),
    read(
      'h-gk',
      D,
      'Our centre-back has pushed the striker’s next touch outside. The ball is outside our penalty area; you can arrive before the striker’s long stride.',
      r(
        'Clear outside the box with your foot',
        'You reach the exposed touch with your foot and clear to our right-back.',
        [
          ['a-st', 23, 38],
          ['h-gk', 20, 39],
          ['h-rb', 31, 83],
        ],
        [],
        'goalkeeper-2',
      ),
      x(
        'Stay on the line for the final shot',
        'The striker collects the next touch and finishes before the recovering defender.',
        [['a-st', 16, 40]],
      ),
      d(
        'Wait at the edge and protect the middle',
        'The striker takes the ball wide and retains the attack.',
        [['a-st', 19, 25]],
        [['h-gk', 18, 45]],
      ),
      d(
        'Gather the ball with your hands out here',
        'Handling outside the area gives Rival XI a free kick before the danger ends.',
        [['h-gk', 20, 39]],
        [],
        'negative',
      ),
    ),
  ),

  spec(
    'two-save-recovery',
    2,
    'The second save changes sides',
    'A shot approaches with a second attacker outside its rebound lane.',
    'a-r8',
    defending([
      ['a-r8', 24, 43],
      ['a-st', 22, 63],
      ['h-gk', 6, 50],
      ['h-rcb', 15, 60],
      ['h-lcb', 16, 40],
    ]),
    read(
      'h-gk',
      D,
      'Their eight shoots from your left. Their striker waits on the opposite side and can reach a wide rebound; stay ready for a second effort.',
      n(
        'Parry wide and prepare the second save',
        'The first save goes outside. You see the second attacker reaching it and prepare to recover across.',
        [
          ['h-gk', 7, 44],
          ['a-st', 14, 65],
        ],
        [],
        'match-save',
      ),
      x(
        'Push the first save straight back inside',
        'Their striker meets the central rebound and scores.',
        [
          ['h-gk', 7, 44],
          ['a-st', 12, 48],
        ],
      ),
      d(
        'Turn the original shot beyond our right post',
        'You prevent the goal, but their winger keeps the wide ball in play.',
        [
          ['h-gk', 7, 56],
          ['a-lw', 2, 91],
        ],
      ),
      x(
        'Move toward the rebound runner before saving',
        'The original shot reaches the corner you leave open.',
        [['a-r8', 23, 43]],
        [['h-gk', 9, 56]],
        44,
      ),
    ),
    read(
      'h-gk',
      D,
      'Their striker has the rebound and shapes to shoot toward the exposed near corner. Recover across from your first saving position.',
      r(
        'Recover across and hold the second effort',
        'Your second movement meets the redirected shot. You hold it to prevent another rebound.',
        [
          ['a-st', 13, 64],
          ['h-gk', 7, 57],
        ],
        [],
        'match-save',
      ),
      x(
        'Stay at the first saving position instead',
        'The redirected shot reaches the opposite side before you move.',
        [['a-st', 13, 64]],
        [],
        57,
      ),
      k(
        'Push it outside toward our full-back',
        'The second save reaches our right-back, though holding it was possible.',
        [
          ['a-st', 13, 64],
          ['h-gk', 7, 57],
          ['h-rb', 20, 82],
        ],
      ),
      x(
        'Rush straight toward the rebound shooter',
        'The attacker redirects past your charge into the open goal.',
        [['a-st', 13, 64]],
        [['h-gk', 11, 62]],
        44,
      ),
    ),
  ),

  spec(
    'read-rabona-cutback',
    2,
    'Read the wrapped-foot delivery',
    'Their winger reaches our right byline with the ball outside the standing leg.',
    'a-lw',
    defending([
      ['a-lw', 10, 90],
      ['a-st', 23, 53],
      ['a-l8', 25, 63],
      ['h-rb', 12, 82],
      ['h-six', 23, 58],
      ['h-rcb', 10, 54],
    ]),
    read(
      'h-rb',
      D,
      'Their right-footed winger wraps the striking leg behind the planted left leg. Our centre-back guards the striker; the open angle points back toward their eight.',
      n(
        'Protect the backward delivery toward their eight',
        'Your inside position blocks the rabona’s cut-back. The deflection travels toward our six.',
        [
          ['a-lw', 9, 89],
          ['h-rb', 13, 68],
          ['h-six', 20, 57],
        ],
        [],
        'right-back-4',
      ),
      x(
        'Run toward the winger’s normal crossing foot',
        'The wrapped-foot delivery travels behind your run and their eight finishes.',
        [
          ['a-lw', 9, 89],
          ['a-l8', 18, 61],
        ],
        [['h-rb', 10, 87]],
      ),
      d(
        'Drop beside the striker and our centre-back',
        'The cut-back reaches their eight outside your doubled marking.',
        [
          ['a-lw', 9, 89],
          ['a-l8', 20, 62],
        ],
        [['h-rb', 10, 56]],
      ),
      x(
        'Step outside to block the near-post cross',
        'The actual backward delivery reaches the arriving eight, who scores.',
        [
          ['a-lw', 9, 89],
          ['a-l8', 17, 61],
        ],
        [['h-rb', 8, 82]],
      ),
    ),
    read(
      'h-six',
      D,
      'The blocked rabona reaches your left foot. Their eight approaches from your right; our left-back offers a pass on the opposite side.',
      r(
        'Meet it and pass away from the eight',
        'You win the second ball and use the outlet their arriving runner cannot reach.',
        [
          ['h-six', 21, 56],
          ['h-lb', 25, 18],
        ],
      ),
      x(
        'Turn right toward their arriving midfielder',
        'Their eight steals the exposed turning touch and finishes.',
        [['a-l8', 20, 58]],
      ),
      k(
        'Clear along the line toward our right winger',
        'The winger retains the clearance, but their full-back can pressure the first touch.',
        [
          ['h-six', 21, 56],
          ['h-rw', 35, 84],
        ],
      ),
      x(
        'Wait for the ball to settle beside you',
        'Their eight attacks it first and scores from the box edge.',
        [['a-l8', 19, 57]],
      ),
    ),
  ),

  spec(
    'delivery-loss-diagonal',
    2,
    'Recover across their first outlet',
    'Our ambitious wide delivery is intercepted with the far winger still high.',
    'a-lcb',
    defending([
      ['a-lcb', 83, 62],
      ['a-six', 63, 49],
      ['a-r8', 65, 31],
      ['h-lw', 87, 18],
      ['h-six', 54, 49],
      ['h-lcb', 39, 40],
      ['h-rcb', 39, 61],
      ['h-rw', 75, 84],
    ]),
    read(
      'h-lw',
      T,
      'Their centre-back looks diagonally toward the far eight. Chasing the interceptor leaves that outlet open; our six can attack a forced inside pass.',
      n(
        'Recover across the far diagonal outlet',
        'Your recovery closes the long escape. Their centre-back must play inside toward the six.',
        [['a-six', 62, 50]],
        [
          ['h-lw', 59, 35],
          ['h-six', 54, 49],
        ],
        'left-midfielder-5',
      ),
      x(
        'Chase their centre-back across the penalty area',
        'The far diagonal reaches their eight and starts a scoring counter.',
        [
          ['a-r8', 58, 30],
          ['a-st', 18, 48],
        ],
        [['h-lw', 82, 57]],
      ),
      d(
        'Stay high and wait for another attacking pass',
        'Their eight receives the diagonal and Rival XI keep the counterattack.',
        [['a-r8', 60, 30]],
        [['h-lw', 86, 16]],
      ),
      d(
        'Retreat directly down the outside touchline',
        'The diagonal remains inside your recovery and their eight receives.',
        [['a-r8', 59, 31]],
        [['h-lw', 60, 13]],
        'negative',
      ),
    ),
    read(
      'h-six',
      D,
      'Our winger has removed the far diagonal. Their six receives facing their own goal and sets backward toward the original defender; you can reach that set.',
      r(
        'Step through the set and keep it',
        'You intercept the forced return and retain the ball before their counter can open.',
        [
          ['a-six', 61, 50],
          ['h-six', 64, 51],
          ['h-rcb', 43, 62],
        ],
      ),
      x(
        'Run beyond the six toward their original defender',
        'The six turns away from your run and releases their striker through the centre.',
        [
          ['a-six', 61, 50],
          ['a-st', 19, 48],
        ],
        [['h-six', 74, 56]],
      ),
      d(
        'Hold beside our centre-back and allow the set',
        'Their centre-back collects the return and Rival XI reset with possession.',
        [
          ['a-six', 61, 50],
          ['a-lcb', 77, 60],
        ],
        [['h-six', 43, 52]],
      ),
      d(
        'Slide through their six after the set leaves',
        'Your late challenge concedes a midfield free kick.',
        [
          ['a-six', 61, 50],
          ['a-lcb', 77, 60],
        ],
        [['h-six', 61, 51]],
        'negative',
      ),
    ),
  ),
];

function build(spec: Spec): MatchMoment {
  const turns = spec.reads.map(({ actor, phase, context, choices }) =>
    turn(actor, phase, context, 'What do you do?', ...choices),
  );
  return advancedMoment(
    spec.id,
    50,
    spec.name,
    spec.intro,
    spec.owner,
    spec.placements,
    turns,
  );
}

export const leaguePlays = specs.map((s) => ({
  tier: s.tier,
  moment: build(s),
}));

// Only the initial restart delivery is exempt from offside. Flicks and returns are ordinary passes.
export const leagueDirectRestarts = new Set([
  'lg-goal-kick-wide-1',
  'lg-punch-corner-distance-1',
  'lg-long-throw-flick-volley-1',
]);
// The second attacker remains eligible at the original shot, not at the goalkeeper's save.
export const leagueReboundReferences = [
  { nodeId: 'lg-parry-away-runner-1', receiverId: 'a-st' },
  { nodeId: 'lg-catch-clean-shot-1', receiverId: 'a-st' },
  { nodeId: 'lg-two-save-recovery-1', receiverId: 'a-st' },
] as const;
