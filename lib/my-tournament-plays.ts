import { action, advancedMoment, turn, type Ending } from './advanced-match-builder.ts';
import type { MatchMoment, MatchPhase, MatchTone } from './match-day.ts';
import type { Placement } from './tactical-scene.ts';

// 34 plays written for My Tournament (109 in its library with the training plays). Each is two linked
// decisions with four options and one best read. Attacking plays end in a goal when read
// well; defensive plays end with the ball won. "Rival XI" / "Our XI" are renamed live.
type Option = [label: string, feedback: string, art: string, moves: Placement[], path: [number, number][], result: Ending, tone: MatchTone, headline?: string];
type Best = [label: string, feedback: string, art: string, moves: Placement[], path: [number, number][]];
type Decision = { actor: string; phase: MatchPhase; context: string; prompt: string; best: Best; others: [Option, Option, Option] };
type Spec = { id: string; tier: 0 | 1 | 2; title: string; intro: string; owner: string | { x: number; y: number }; placements: Placement[]; first: Decision; second: Decision & { finish: Ending } };

function build(spec: Spec): MatchMoment {
  const second = spec.second;
  const finalTurn = turn(
    second.actor,
    second.phase,
    second.context,
    second.prompt,
    action(...second.best, second.finish, 'positive'),
    ...second.others.map((o) => action(...o)),
  );
  const first = spec.first;
  const opening = turn(first.actor, first.phase, first.context, first.prompt, action(...first.best, 'next', 'positive'), ...first.others.map((o) => action(...o)));
  return advancedMoment(spec.id, 50, spec.title, spec.intro, spec.owner, spec.placements, [opening, finalTurn]);
}

const specs: Spec[] = [
  // ——— Hard ———
  {
    id: 'mt-drop-nine', tier: 2, title: 'Our striker drops deep', intro: 'Rival XI defend high. Our striker has come short to collect the ball.',
    owner: 'h-st', placements: [['h-st', 62, 50], ['h-lw', 68, 16], ['h-six', 50, 52], ['a-rcb', 70, 40], ['a-lcb', 72, 60]],
    first: {
      actor: 'h-st', phase: 'Attacking', context: 'You have dropped into midfield with the ball. Their right centre-back has followed you; our left winger starts to run.', prompt: 'What do you do with the ball?',
      best: ['Slip it into the winger’s run behind', 'The centre-back is caught upfield. Our winger runs onto the pass inside the box.', 'striker-2', [['h-lw', 84, 34], ['a-rcb', 64, 44], ['h-st', 72, 50]], [[84, 34]]],
      others: [
        ['Turn and carry at the other centre-back', 'Their left centre-back steps in and takes the ball off you.', 'match-interception', [['h-st', 70, 54], ['a-lcb', 70, 55]], [[70, 55]], 'lost', 'negative'],
        ['Lay it back to our six and go again', 'Safe. Their centre-back drops back into line and the space closes.', 'right-midfielder-1', [['h-st', 63, 50]], [[50, 52]], 'retain', 'neutral'],
        ['Shoot from thirty yards', 'The keeper gathers it comfortably. Rival XI take possession.', 'match-blocked-shot', [['a-gk', 92, 50]], [[92, 50]], 'lost', 'negative'],
      ],
    },
    second: {
      actor: 'h-lw', phase: 'Attacking', finish: 'goal', context: 'You are inside the box on the left. The keeper comes out toward you; our striker arrives level with the penalty spot.', prompt: 'How do you finish the move?',
      best: ['Square it across to the arriving striker', 'The keeper is committed. Our striker taps into the empty net.', 'match-home-goal', [['h-st', 88, 50], ['a-gk', 88, 40]], [[88, 50], [100, 50]]],
      others: [
        ['Shoot early at the near post before he arrives', 'The keeper narrows the angle and saves. Rival XI collect it.', 'match-blocked-shot', [['a-gk', 92, 38]], [[92, 38]], 'lost', 'negative'],
        ['Try to dribble round the keeper', 'The keeper smothers the ball at your feet.', 'match-interception', [['a-gk', 87, 36], ['h-lw', 86, 35]], [[87, 36]], 'lost', 'negative'],
        ['Hold it up by the byline for support', 'Defenders recover and the chance is gone, but we keep the ball.', 'left-winger-1', [['h-lw', 92, 26]], [[92, 26]], 'retain', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-press-goal-kick', tier: 2, title: 'Their goal kick, short', intro: 'Rival XI want to play out from the back. Our front three wait on the edge of their box.',
    owner: 'a-gk', placements: [['h-st', 80, 50], ['h-rw', 78, 72], ['h-lw', 78, 28], ['h-r8', 68, 60], ['a-gk', 94, 50], ['a-lcb', 88, 66], ['a-rcb', 88, 34], ['a-six', 74, 50]],
    first: {
      actor: 'h-st', phase: 'Defending', context: 'Their keeper rolls the ball toward their left centre-back. Their six stands behind you, open for a pass into midfield.', prompt: 'How do you press?',
      best: ['Curve your run to cut out the six', 'You press the centre-back while blocking the pass into midfield. He has to go wide.', 'striker-4', [['h-st', 84, 58], ['a-lcb', 88, 72]], [[88, 72]]],
      others: [
        ['Sprint straight at the centre-back', 'He simply passes into their six behind you. The press is broken.', 'match-failed-tackle', [['h-st', 87, 64]], [[74, 50]], 'contained', 'negative'],
        ['Drop off and protect the halfway line', 'Rival XI play out calmly and keep the ball.', 'right-midfielder-4', [['h-st', 66, 50]], [[88, 66]], 'contained', 'neutral'],
        ['Chase the keeper after the pass', 'Too late. The ball is already gone and their six turns freely.', 'striker-1', [['h-st', 92, 52]], [[74, 50]], 'contained', 'negative'],
      ],
    },
    second: {
      actor: 'h-rw', phase: 'Defending', finish: 'regain', context: 'Their centre-back has carried toward the touchline. Their left-back waits ahead of him on the line.', prompt: 'Where does our winger step?',
      best: ['Jump onto the pass to the full-back', 'You read it, intercept and win the ball high up the pitch.', 'right-winger-4', [['h-rw', 84, 84]], [[84, 84]]],
      others: [
        ['Close down the centre-back directly', 'He plays round you to the full-back and they escape.', 'match-failed-tackle', [['h-rw', 87, 74], ['a-lb', 80, 88]], [[80, 88]], 'contained', 'negative'],
        ['Hold your position in the channel', 'Rival XI keep the ball and play back to their keeper.', 'right-winger-1', [['h-rw', 78, 72]], [[94, 50]], 'contained', 'neutral'],
        ['Dive into a slide tackle', 'You miss and concede a free kick. Rival XI restart calmly.', 'match-failed-tackle', [['h-rw', 87, 72]], [[88, 72]], 'contained', 'negative'],
      ],
    },
  },
  {
    id: 'mt-corner-against', tier: 2, title: 'Their corner from our right', intro: 'Rival XI win a corner. Their tallest players crowd the six-yard box.',
    owner: 'a-lw', placements: [['a-lw', 2, 98], ['a-st', 8, 48], ['a-lcb', 12, 57], ['h-lcb', 9, 52], ['h-rcb', 9, 61], ['h-six', 16, 46], ['a-l8', 20, 62], ['h-gk', 4, 50]],
    first: {
      actor: 'h-rcb', phase: 'Defending', context: 'Their centre-back starts a run from the edge of the box toward the near post. You are marking him.', prompt: 'How do you defend the run?',
      best: ['Stay goal-side and attack the ball first', 'You get there first and head the corner out to the edge of the box.', 'right-centre-back-5', [['h-rcb', 8, 56], ['a-lcb', 9, 59]], [[8, 56], [18, 58]]],
      others: [
        ['Hold your spot and watch the ball', 'He runs across you and glances the header in.', 'match-rival-header', [['a-lcb', 5, 52]], [[5, 52], [0, 50]], 'concede', 'negative'],
        ['Follow him and grab his shirt', 'The referee sees it. Penalty — and they score it.', 'match-failed-tackle', [['a-st', 11, 50]], [[11, 50], [0, 47]], 'concede', 'negative'],
        ['Step out toward the taker to block the delivery', 'Nobody marks the runner. The header flashes just wide; goal kick.', 'match-duel', [['h-rcb', 6, 90]], [[0, 40]], 'loose', 'neutral'],
      ],
    },
    second: {
      actor: 'h-six', phase: 'Defending', finish: 'regain', context: 'The clearance drops at the edge of our box. Their eight is arriving to shoot first time.', prompt: 'What do you do with the dropping ball?',
      best: ['Attack the ball before the eight arrives', 'You control it first and play out to safety. Danger over.', 'right-midfielder-5', [['h-six', 18, 57]], [[18, 57]]],
      others: [
        ['Wait for the bounce', 'Their eight volleys it on the half-volley into the corner.', 'match-rival-goal', [['a-l8', 18, 58]], [[18, 58], [0, 46]], 'concede', 'negative'],
        ['Back off to the penalty spot to block the shot', 'He controls, steps inside and keeps the pressure on.', 'match-duel', [['h-six', 12, 52]], [[20, 58]], 'contained', 'neutral'],
        ['Slide in from the side', 'You catch him. Free kick on the edge of the box.', 'match-failed-tackle', [['h-six', 19, 60]], [[18, 58]], 'contained', 'negative'],
      ],
    },
  },
  {
    id: 'mt-overload-right', tier: 2, title: 'Three against two on our right', intro: 'We have moved the ball quickly to our right side. Rival XI are a player short there.',
    owner: 'h-rb', placements: [['h-rb', 66, 88], ['h-rw', 76, 82], ['h-r8', 72, 70], ['a-lb', 78, 84], ['a-l8', 70, 76], ['a-lcb', 86, 62], ['h-st', 84, 50]],
    first: {
      actor: 'h-rb', phase: 'Attacking', context: 'You have the ball. Their full-back and eight face three of us: our winger wide, our eight inside.', prompt: 'Which pass keeps the advantage?',
      best: ['Play into our eight between the two', 'Both defenders were watching the winger. Our eight turns with time.', 'right-midfielder-1', [['h-r8', 76, 72], ['a-l8', 72, 79]], [[76, 72]]],
      others: [
        ['Go down the line to the winger', 'Their full-back steps in front and intercepts.', 'match-interception', [['a-lb', 76, 85]], [[76, 85]], 'lost', 'negative'],
        ['Run the overlap and keep the ball yourself', 'Their eight closes you down and wins a throw-in.', 'match-duel', [['h-rb', 72, 94], ['a-l8', 72, 92]], [[74, 99]], 'contained', 'negative'],
        ['Switch it back to the centre-backs', 'We keep the ball but lose the overload.', 'right-back-1', [['h-rb', 64, 88], ['h-rcb', 40, 62]], [[40, 62]], 'retain', 'neutral'],
      ],
    },
    second: {
      actor: 'h-r8', phase: 'Attacking', finish: 'goal', context: 'You have turned. Their centre-back comes out to meet you; our striker is running behind him.', prompt: 'What now?',
      best: ['Thread it behind the stepping centre-back', 'Our striker runs through and slots it past the keeper.', 'match-home-goal', [['h-st', 90, 54], ['a-lcb', 82, 66]], [[90, 54], [100, 52]]],
      others: [
        ['Shoot early from distance', 'The centre-back blocks it and they clear.', 'match-blocked-shot', [['a-lcb', 82, 68]], [[82, 68]], 'lost', 'negative'],
        ['Dribble at the centre-back', 'He stands his ground and takes the ball.', 'match-interception', [['a-lcb', 81, 70], ['h-r8', 80, 70]], [[81, 70]], 'lost', 'negative'],
        ['Hold it up and wait for the full-back to overlap', 'The moment passes. We keep possession on the right.', 'right-midfielder-1', [['h-r8', 77, 73]], [[77, 73]], 'retain', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-counter-two-v-one', tier: 2, title: 'Two of them, one of us', intro: 'We lost the ball at a corner. Rival XI break with two players against our last defender.',
    owner: 'a-st', placements: [['a-st', 46, 48], ['a-rw', 44, 26], ['h-lcb', 34, 44], ['h-gk', 8, 50], ['h-six', 56, 56], ['h-rcb', 64, 62], ['h-lb', 68, 18], ['h-rb', 70, 84]],
    first: {
      actor: 'h-lcb', phase: 'Defending', context: 'Their striker carries the ball; their winger runs wide on your left. Our six is sprinting back behind them.', prompt: 'How do you defend the two-against-one?',
      best: ['Back off and delay, showing him wide', 'You slow the striker and push him toward the winger’s side. Our six catches up.', 'right-centre-back-4', [['h-lcb', 26, 42], ['a-st', 36, 40], ['h-six', 38, 48]], [[36, 40]]],
      others: [
        ['Dive in to win the ball now', 'He skips past you and is through on goal. He scores.', 'match-rival-goal', [['h-lcb', 44, 48], ['a-st', 14, 50]], [[14, 50], [0, 48]], 'concede', 'negative'],
        ['Run across to pick up the winger on your left', 'The striker carries straight through the middle and scores.', 'match-rival-goal', [['h-lcb', 36, 28], ['a-st', 15, 48]], [[15, 48], [0, 50]], 'concede', 'negative'],
        ['Pull the striker down', 'Yellow card and a free kick on the edge of the area. The danger is not over.', 'match-failed-tackle', [['h-lcb', 45, 47]], [[46, 48]], 'contained', 'neutral'],
      ],
    },
    second: {
      actor: 'h-six', phase: 'Defending', finish: 'regain', context: 'You have caught up behind the striker as he slows down. His winger is still wide.', prompt: 'How do you finish the recovery?',
      best: ['Nick the ball from his blind side', 'He never sees you coming. Ball won.', 'right-midfielder-5', [['h-six', 35, 41]], [[35, 41]]],
      others: [
        ['Shout for our defender to make the tackle', 'Nobody commits. The winger receives and crosses.', 'match-duel', [['a-rw', 22, 24]], [[22, 24], [14, 44]], 'loose', 'neutral'],
        ['Barge into him from behind', 'Free kick and a yellow card for you.', 'match-failed-tackle', [['h-six', 36, 42]], [[36, 40]], 'contained', 'negative'],
        ['Run past to mark the winger', 'The striker shoots from the edge and scores.', 'match-rival-goal', [['h-six', 30, 28], ['a-st', 24, 44]], [[24, 44], [0, 48]], 'concede', 'negative'],
      ],
    },
  },
  {
    id: 'mt-third-man', tier: 2, title: 'Pressed in our half', intro: 'Rival XI press us man for man near halfway. One clever pass could take three of them out.',
    owner: 'h-rcb', placements: [['h-rcb', 36, 62], ['h-r8', 46, 64], ['h-six', 44, 48], ['h-rw', 58, 84], ['a-l8', 48, 66], ['a-st', 40, 56], ['a-six', 52, 50]],
    first: {
      actor: 'h-rcb', phase: 'Attacking', context: 'You have the ball. Our eight is marked tightly from behind; our six faces you with space around him.', prompt: 'Where does the ball go?',
      best: ['Into the eight, who lays it to our six', 'The eight bounces it first time. Our six receives facing forward with the press beaten.', 'right-midfielder-3', [['h-six', 48, 50], ['a-six', 54, 52]], [[46, 64], [48, 50]]],
      others: [
        ['Long ball over their press to our winger', 'It sails out of play. Throw-in to Rival XI.', 'match-duel', [['h-rcb', 37, 62]], [[60, 99]], 'contained', 'negative'],
        ['Carry it forward yourself', 'Their striker steals it as you step up.', 'match-interception', [['a-st', 40, 60], ['h-rcb', 40, 61]], [[40, 60]], 'lost', 'negative'],
        ['Back to the keeper', 'Safe, but the press resets.', 'goalkeeper-1', [['h-rcb', 34, 62]], [[8, 50]], 'retain', 'neutral'],
      ],
    },
    second: {
      actor: 'h-six', phase: 'Attacking', finish: 'goal', context: 'You face forward in midfield. Our winger is running behind their full-back on the right.', prompt: 'How do you use the space?',
      best: ['Release the winger behind the full-back', 'He runs onto it, cuts inside and finishes low.', 'match-home-goal', [['h-rw', 86, 70]], [[86, 70], [100, 52]]],
      others: [
        ['Carry the ball into midfield', 'Their eights recover and surround you.', 'match-interception', [['a-six', 56, 50], ['h-six', 55, 50]], [[56, 50]], 'lost', 'negative'],
        ['Shoot from forty yards', 'Way over the bar. Goal kick.', 'striker-5', [['h-six', 50, 50]], [[100, 30]], 'contained', 'negative'],
        ['Pass sideways to our centre-back to keep it', 'We keep it, but Rival XI reorganise.', 'right-centre-back-1', [['h-six', 47, 49]], [[36, 62]], 'retain', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-low-block-patience', tier: 2, title: 'Ten men behind the ball', intro: 'Rival XI defend deep and narrow. We have the ball around their box.',
    owner: 'h-l8', placements: [['h-l8', 72, 36], ['h-lb', 80, 12], ['h-st', 86, 50], ['h-rw', 82, 86], ['a-rb', 84, 26], ['a-rcb', 88, 42], ['a-lcb', 88, 58], ['a-lb', 86, 76]],
    first: {
      actor: 'h-l8', phase: 'Attacking', context: 'The middle is crowded. Our left-back is free on the touchline; our right winger is alone on the far side.', prompt: 'How do you move them?',
      best: ['Switch it out to our right winger', 'The whole block has to slide across. Our winger has space to attack.', 'right-midfielder-2', [['h-rw', 82, 86], ['a-lb', 82, 80]], [[82, 86]]],
      others: [
        ['Squeeze a pass through the middle of them', 'Their centre-back cuts it out.', 'match-interception', [['a-rcb', 86, 44]], [[86, 44]], 'lost', 'negative'],
        ['Shoot through the crowd', 'Blocked straight away. They clear.', 'match-blocked-shot', [['a-rcb', 84, 40]], [[84, 40]], 'lost', 'negative'],
        ['Play it wide to our left-back on the touchline', 'Safe, but the block stays compact on that side.', 'left-midfielder-1', [['h-lb', 80, 12]], [[80, 12]], 'retain', 'neutral'],
      ],
    },
    second: {
      actor: 'h-rw', phase: 'Attacking', finish: 'goal', context: 'Their full-back is still running across to you. Our striker stands between the centre-backs.', prompt: 'How do you attack before they set?',
      best: ['Cross low and early to the striker', 'The defence is still moving. Our striker sweeps it in.', 'match-home-goal', [['h-st', 90, 54], ['a-lb', 84, 82]], [[90, 54], [100, 52]]],
      others: [
        ['Wait for the overlap', 'The full-back arrives and the block is set again.', 'right-winger-1', [['h-rw', 84, 86]], [[84, 86]], 'retain', 'neutral'],
        ['Shoot early from the narrow angle at the near post', 'Straight at the keeper.', 'match-blocked-shot', [['a-gk', 94, 56]], [[94, 56]], 'lost', 'negative'],
        ['Dribble into the full-back', 'He reaches you in time and wins it.', 'match-interception', [['a-lb', 83, 85], ['h-rw', 83, 84]], [[83, 85]], 'lost', 'negative'],
      ],
    },
  },
  {
    id: 'mt-keeper-sweeper', tier: 2, title: 'A ball over our high line', intro: 'We push our defence up to halfway. Rival XI look for the ball over the top.',
    owner: 'a-six', placements: [['a-six', 56, 50], ['a-st', 46, 46], ['h-lcb', 44, 42], ['h-rcb', 44, 58], ['h-gk', 18, 50]],
    first: {
      actor: 'h-gk', phase: 'Defending', context: 'Their six lifts the ball over our line. Their striker is racing onto it; our centre-backs turn to chase.', prompt: 'Where does our keeper go?',
      best: ['Sprint out and clear it first', 'You reach it outside the box and head it away to our centre-back.', 'goalkeeper-2', [['h-gk', 28, 47], ['a-st', 32, 46], ['h-lcb', 36, 40]], [[28, 47], [36, 40]]],
      others: [
        ['Stay on your line', 'He gets there, takes a touch and scores.', 'match-rival-goal', [['a-st', 18, 48]], [[18, 48], [0, 50]], 'concede', 'negative'],
        ['Come halfway and stop', 'He lobs you from the edge of the box.', 'match-rival-goal', [['h-gk', 16, 50], ['a-st', 26, 48]], [[26, 48], [0, 52]], 'concede', 'negative'],
        ['Leave it for the centre-backs', 'They catch him and the ball runs out for a corner.', 'match-duel', [['h-lcb', 22, 44]], [[0, 30]], 'contained', 'neutral'],
      ],
    },
    second: {
      actor: 'h-lcb', phase: 'Attacking', finish: 'regain', context: 'The keeper’s clearance drops to you. Their striker is right behind you.', prompt: 'How do you keep the ball?',
      best: ['One touch out to our full-back', 'Calm and quick. We keep possession and the danger is gone.', 'right-centre-back-1', [['h-lb', 34, 14]], [[34, 14]]],
      others: [
        ['Turn and dribble', 'The striker steals it and scores.', 'match-rival-goal', [['a-st', 30, 42]], [[30, 42], [0, 48]], 'concede', 'negative'],
        ['Hoof it upfield', 'It goes straight to their centre-back.', 'match-interception', [['a-lcb', 66, 60]], [[66, 60]], 'lost', 'negative'],
        ['Shield it and wait for a teammate to help', 'The striker wins a corner off your leg.', 'match-duel', [['a-st', 35, 41]], [[0, 20]], 'contained', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-wide-free-kick', tier: 2, title: 'A free kick out wide', intro: 'We have a free kick out on the left, level with the edge of their box.',
    owner: 'h-l8', placements: [['h-l8', 78, 14], ['h-lb', 72, 20], ['h-lcb', 84, 40], ['h-st', 86, 52], ['h-rcb', 82, 62], ['a-rcb', 88, 44], ['a-lcb', 89, 56], ['a-gk', 95, 50]],
    first: {
      actor: 'h-l8', phase: 'Attacking', context: 'Their wall is two players. Their defence holds a line on the edge of the six-yard box; our centre-backs are lined up to attack the ball.', prompt: 'Where do you put the free kick?',
      best: ['Whip it between the line and the keeper', 'Pace on the ball, and the keeper hesitates. Our centre-back gets a touch.', 'right-centre-back-5', [['h-lcb', 92, 46], ['a-rcb', 90, 42]], [[92, 46]]],
      others: [
        ['Float it high toward the far post for a header', 'Too much air under it. The keeper claims.', 'goalkeeper-4', [['a-gk', 94, 58]], [[94, 58]], 'lost', 'negative'],
        ['Shoot directly at goal', 'It hits the wall.', 'match-blocked-shot', [['a-rb', 82, 20]], [[82, 20]], 'lost', 'negative'],
        ['Play it short and keep it', 'We keep possession, but the chance to deliver is gone.', 'left-midfielder-1', [['h-lb', 76, 22]], [[76, 22]], 'retain', 'neutral'],
      ],
    },
    second: {
      actor: 'h-st', phase: 'Attacking', finish: 'goal', context: 'The flick runs across the six-yard box toward you. The keeper is on the wrong side.', prompt: 'How do you finish?',
      best: ['Side-foot it into the open goal', 'Simple and calm. GOAL.', 'match-home-goal', [['h-st', 93, 52]], [[93, 52], [100, 50]]],
      others: [
        ['Blast it with your laces', 'It flies over the bar.', 'striker-5', [['h-st', 92, 52]], [[100, 30]], 'contained', 'negative'],
        ['Take a touch to steady yourself', 'Their centre-back recovers and clears.', 'match-interception', [['a-lcb', 92, 54]], [[92, 54]], 'lost', 'negative'],
        ['Head it back across goal', 'It loops into a crowd and nobody controls it.', 'match-duel', [['h-st', 92, 52]], [[90, 44]], 'loose', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-press-trap-wing', tier: 2, title: 'Their full-back on the ball', intro: 'Rival XI build down their left side. We want to trap them against the touchline.',
    owner: 'a-lb', placements: [['a-lb', 64, 86], ['a-l8', 58, 72], ['a-lw', 56, 92], ['h-rw', 70, 78], ['h-r8', 56, 66], ['h-rb', 54, 90], ['a-six', 50, 60]],
    first: {
      actor: 'h-rw', phase: 'Defending', context: 'Their full-back has the ball by the line. Their eight offers a pass inside; their winger waits further up the line.', prompt: 'How do you press him?',
      best: ['Close him from inside, showing the line', 'The inside pass is gone. He can only go down the line.', 'right-winger-4', [['h-rw', 66, 82]], [[56, 92]]],
      others: [
        ['Run straight at him', 'He plays inside to their eight and they escape.', 'match-failed-tackle', [['h-rw', 65, 86]], [[58, 72]], 'contained', 'negative'],
        ['Leave him and mark their eight on the inside', 'He carries forward unopposed and crosses.', 'match-duel', [['h-rw', 60, 72], ['a-lb', 54, 88]], [[54, 88], [30, 56]], 'loose', 'negative'],
        ['Stand off and wait', 'Rival XI keep the ball and recycle it.', 'right-winger-1', [['h-rw', 72, 76]], [[50, 60]], 'contained', 'neutral'],
      ],
    },
    second: {
      actor: 'h-rb', phase: 'Defending', finish: 'regain', context: 'The pass goes down the line to their winger. You are goal-side, close enough to challenge.', prompt: 'When do you challenge?',
      best: ['Step in front as the pass travels', 'You get there first and win the ball on the touchline.', 'right-back-4', [['h-rb', 56, 91]], [[56, 91]]],
      others: [
        ['Wait for his first touch', 'His touch takes him past you.', 'match-failed-tackle', [['a-lw', 48, 90]], [[48, 90]], 'contained', 'negative'],
        ['Slide in as he receives', 'Foul. Free kick to Rival XI.', 'match-failed-tackle', [['h-rb', 57, 92]], [[56, 92]], 'contained', 'negative'],
        ['Drop off toward our box and protect the space', 'He turns and plays back. Rival XI keep it.', 'right-back-3', [['h-rb', 48, 84]], [[64, 86]], 'contained', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-late-winner', tier: 2, title: 'The ball at the edge of their box', intro: 'Rival XI have dropped very deep. The ball breaks to us 20 yards from goal.',
    owner: 'h-r8', placements: [['h-r8', 76, 56], ['h-st', 86, 48], ['h-lw', 84, 24], ['a-six', 80, 54], ['a-rcb', 88, 42], ['a-lcb', 88, 60]],
    first: {
      actor: 'h-r8', phase: 'Attacking', context: 'Their six is closing you down. Our striker is back to goal between the centre-backs; our left winger is free on the far side.', prompt: 'What do you do first?',
      best: ['Play a one-two with the striker', 'The striker sets it back into your stride, past the six.', 'striker-2', [['h-r8', 82, 52], ['a-six', 78, 56]], [[86, 48], [82, 52]]],
      others: [
        ['Shoot through the six', 'He blocks it and they clear.', 'match-blocked-shot', [['a-six', 78, 55]], [[78, 55]], 'lost', 'negative'],
        ['Chip it over everyone to the far winger', 'Their full-back reads it and heads away.', 'match-interception', [['a-rb', 84, 28]], [[84, 28]], 'lost', 'negative'],
        ['Pass back to keep the ball', 'We keep it, but they re-form their line.', 'right-midfielder-1', [['h-r8', 75, 56], ['h-six', 62, 60]], [[62, 60]], 'retain', 'neutral'],
      ],
    },
    second: {
      actor: 'h-r8', phase: 'Attacking', finish: 'goal', context: 'You are on the edge of the box with the ball on your stronger foot. The keeper is slightly off his line.', prompt: 'How do you finish?',
      best: ['Curl it low into the far corner', 'Perfect placement. The keeper cannot reach it.', 'match-home-goal', [['h-r8', 83, 52]], [[100, 46]]],
      others: [
        ['Blast it as hard as you can at the near post', 'Straight at the keeper. He holds it.', 'match-blocked-shot', [['a-gk', 94, 52]], [[94, 52]], 'lost', 'negative'],
        ['Take another touch closer', 'A centre-back blocks your shot.', 'match-blocked-shot', [['a-lcb', 86, 54]], [[86, 54]], 'lost', 'negative'],
        ['Look for the far winger', 'The pass is too slow and goes out.', 'left-winger-1', [['h-r8', 83, 52]], [[90, 0]], 'contained', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-throw-in-trap', tier: 2, title: 'Their throw-in near our box', intro: 'Rival XI have a throw-in on our left, close to our box.',
    owner: 'a-rw', placements: [['a-rw', 24, 1], ['a-r8', 28, 12], ['a-st', 18, 30], ['h-lb', 22, 10], ['h-l8', 30, 18], ['h-lcb', 16, 34]],
    first: {
      actor: 'h-lb', phase: 'Defending', context: 'Their eight comes short for the throw; their striker waits inside our box. You are between the eight and the striker.', prompt: 'Who do you take?',
      best: ['Stay inside and screen the striker', 'The throw goes short to the eight, away from danger. Our eight closes him.', 'right-back-3', [['h-lb', 20, 18], ['a-r8', 28, 10]], [[28, 10]]],
      others: [
        ['Press the short receiver tightly from behind', 'The throw goes over you to the striker, who turns and scores.', 'match-rival-goal', [['h-lb', 27, 12], ['a-st', 14, 40]], [[14, 40], [0, 46]], 'concede', 'negative'],
        ['Mark the thrower', 'Their striker receives inside the box. Our keeper saves at his feet.', 'match-save', [['a-st', 12, 36]], [[12, 36], [6, 44]], 'loose', 'neutral'],
        ['Drop onto the goal line', 'Their eight receives unopposed and crosses.', 'match-duel', [['h-lb', 4, 40]], [[28, 10], [16, 46]], 'loose', 'negative'],
      ],
    },
    second: {
      actor: 'h-l8', phase: 'Defending', finish: 'regain', context: 'Their eight has the ball near the touchline, facing his own goal.', prompt: 'How do you win it?',
      best: ['Press from behind, blocking his turn', 'He has nowhere to go. You win the ball.', 'left-midfielder-4', [['h-l8', 28, 11]], [[28, 11]]],
      others: [
        ['Dive in from the side', 'He rolls you and gets away.', 'match-failed-tackle', [['a-r8', 22, 18]], [[22, 18]], 'contained', 'negative'],
        ['Stand off him', 'He plays it back for a long throw again.', 'left-midfielder-1', [['h-l8', 32, 20], ['a-rb', 40, 6]], [[40, 6]], 'contained', 'neutral'],
        ['Push him over', 'Free kick. They keep the pressure on.', 'match-failed-tackle', [['h-l8', 29, 12]], [[28, 10]], 'contained', 'negative'],
      ],
    },
  },
  {
    id: 'mt-rebound-keeper', tier: 2, title: 'Their keeper spills it', intro: 'Our shot from distance has been parried by their keeper.',
    owner: { x: 90, y: 40 }, placements: [['h-st', 84, 46], ['h-lw', 84, 26], ['a-gk', 95, 48], ['a-rcb', 88, 38], ['a-lcb', 87, 58]],
    first: {
      actor: 'h-st', phase: 'Attacking', context: 'The ball spins loose six yards out. Their centre-back is turning toward it too.', prompt: 'What do you do?',
      best: ['Attack the loose ball first', 'You get there a split second ahead of the defender.', 'striker-5', [['h-st', 90, 41], ['a-rcb', 89, 38]], [[90, 41]]],
      others: [
        ['Wait for it to bounce', 'Their centre-back hacks it clear.', 'match-interception', [['a-rcb', 90, 40]], [[90, 40]], 'lost', 'negative'],
        ['Appeal for a penalty', 'Nothing given. They clear.', 'match-interception', [['a-rcb', 90, 40]], [[90, 40]], 'lost', 'negative'],
        ['Hold your run and stay onside', 'Their keeper recovers and claims it.', 'goalkeeper-4', [['a-gk', 90, 40]], [[90, 40]], 'lost', 'neutral'],
      ],
    },
    second: {
      actor: 'h-st', phase: 'Attacking', finish: 'goal', context: 'You have the ball on the six-yard line. The keeper is still on the floor; a defender slides across the line.', prompt: 'How do you finish?',
      best: ['Lift it over the sliding defender', 'A delicate dink into the roof of the net.', 'match-home-goal', [['h-st', 91, 42]], [[100, 50]]],
      others: [
        ['Smash it low', 'The sliding defender blocks it on the line.', 'match-blocked-shot', [['a-lcb', 98, 48]], [[98, 48]], 'lost', 'negative'],
        ['Square it to the winger', 'The pass is cut out by the keeper on the floor.', 'match-interception', [['a-gk', 92, 38]], [[92, 38]], 'lost', 'negative'],
        ['Take it round the keeper before he gets up', 'You run it too wide. Goal kick.', 'striker-5', [['h-st', 96, 30]], [[100, 26]], 'contained', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-switch-defend', tier: 2, title: 'They switch the play', intro: 'Rival XI have pulled us across to our left. Now the ball is coming the other way.',
    owner: 'a-six', placements: [['a-six', 40, 30], ['a-lw', 34, 86], ['a-st', 24, 48], ['h-rb', 30, 70], ['h-rcb', 22, 56], ['h-rw', 44, 72]],
    first: {
      actor: 'h-rb', phase: 'Defending', context: 'Their six opens his body to switch. Their left winger is alone on our right touchline; you are inside, near our centre-back.', prompt: 'Where do you move while the ball is in the air?',
      best: ['Shift out to the winger as it travels', 'You arrive as the ball does. He has no time to turn.', 'right-back-3', [['h-rb', 32, 82], ['a-lw', 34, 86]], [[34, 86]]],
      others: [
        ['Stay narrow next to the centre-back and watch', 'The winger controls, runs at goal and scores.', 'match-rival-goal', [['a-lw', 18, 62]], [[18, 62], [0, 54]], 'concede', 'negative'],
        ['Sprint to intercept the switch', 'You miss it in the air. He is through.', 'match-failed-tackle', [['h-rb', 38, 76], ['a-lw', 24, 80]], [[24, 80], [12, 56]], 'loose', 'negative'],
        ['Drop toward our goal', 'He controls with time and plays it back.', 'right-back-3', [['h-rb', 16, 72], ['a-l8', 40, 60]], [[40, 60]], 'contained', 'neutral'],
      ],
    },
    second: {
      actor: 'h-rb', phase: 'Defending', finish: 'regain', context: 'He has taken a heavy first touch toward the line. Our winger is coming back to help.', prompt: 'How do you deal with him?',
      best: ['Pounce on the heavy touch', 'You poke it away from him and our winger collects.', 'right-back-4', [['h-rb', 30, 90], ['h-rw', 32, 88]], [[32, 88]]],
      others: [
        ['Dive into a slide', 'He drags it back and you miss.', 'match-failed-tackle', [['a-lw', 28, 82]], [[28, 82]], 'contained', 'negative'],
        ['Back off and wait', 'He recovers and plays a one-two.', 'right-back-3', [['h-rb', 26, 80], ['a-l8', 40, 72]], [[40, 72]], 'contained', 'neutral'],
        ['Let our winger deal with it', 'Nobody commits. He crosses for a header that hits the bar.', 'match-duel', [['a-st', 12, 50]], [[34, 88], [12, 50]], 'loose', 'negative'],
      ],
    },
  },
  // ——— Intermediate ———
  {
    id: 'mt-overlap-left', tier: 1, title: 'Our winger has the ball', intro: 'Our left winger receives near halfway with the full-back running outside.',
    owner: 'h-lw', placements: [['h-lw', 60, 20], ['h-lb', 54, 8], ['h-st', 78, 46], ['a-rb', 66, 18], ['a-rcb', 80, 38]],
    first: {
      actor: 'h-lw', phase: 'Attacking', context: 'Their full-back faces you. Our left-back is overlapping on the outside.', prompt: 'How do you beat him?',
      best: ['Draw him in, then release the overlap', 'He steps toward you and our left-back runs free outside him.', 'left-winger-3', [['h-lb', 76, 8], ['a-rb', 63, 23]], [[76, 8]]],
      others: [
        ['Take him on yourself', 'He blocks the run and wins it.', 'match-interception', [['a-rb', 63, 20]], [[63, 20]], 'lost', 'negative'],
        ['Pass back to the centre-back and start again', 'Safe, but the overlap is wasted.', 'left-winger-1', [['h-lw', 58, 21]], [[26, 37]], 'retain', 'neutral'],
        ['Cross from deep', 'Their centre-back heads it clear easily.', 'match-duel', [['a-rcb', 82, 40]], [[82, 40]], 'lost', 'negative'],
      ],
    },
    second: {
      actor: 'h-lb', phase: 'Attacking', finish: 'goal', context: 'You have space to cross. Our striker attacks the near post; the far post is empty.', prompt: 'Where do you cross?',
      best: ['Low and hard to the near post', 'Our striker gets across the defender and flicks it in.', 'match-home-goal', [['h-st', 92, 46]], [[92, 46], [100, 48]]],
      others: [
        ['Float it to the empty far post', 'Nobody there. Goal kick.', 'left-winger-1', [['h-lb', 86, 8]], [[100, 80]], 'contained', 'negative'],
        ['Cut it back to the edge', 'Nobody has arrived yet. Their six collects.', 'match-interception', [['a-six', 78, 46]], [[78, 46]], 'lost', 'negative'],
        ['Win a corner off the defender', 'You hit his leg. Corner to us.', 'match-duel', [['h-lb', 86, 8]], [[100, 2]], 'retain', 'neutral', 'Our corner. Time to reset.'],
      ],
    },
  },
  {
    id: 'mt-midfield-turn', tier: 1, title: 'Back to goal in midfield', intro: 'Our six receives in the centre circle with a midfielder close behind him.',
    owner: 'h-six', placements: [['h-six', 50, 50], ['a-r8', 53, 46], ['h-l8', 58, 34], ['h-r8', 60, 66]],
    first: {
      actor: 'h-six', phase: 'Attacking', context: 'Their eight is tight on your left shoulder. There is space on your right.', prompt: 'How do you turn?',
      best: ['Spin away to your right', 'You spin away from him and face forward.', 'right-midfielder-1', [['h-six', 54, 56]], [[54, 56]]],
      others: [
        ['Turn into him, to your left', 'He takes the ball off you.', 'match-interception', [['a-r8', 50, 46]], [[50, 46]], 'lost', 'negative'],
        ['Lay it back first time', 'Safe. We keep the ball but go backwards.', 'right-centre-back-1', [['h-six', 49, 50]], [[26, 37]], 'retain', 'neutral'],
        ['Hold the ball and shield', 'The ball catches your hand as you hold him off. Free kick to Rival XI.', 'match-duel', [['a-r8', 51, 47]], [[50, 50]], 'contained', 'negative'],
      ],
    },
    second: {
      actor: 'h-six', phase: 'Attacking', finish: 'goal', context: 'You face forward. Our right eight runs between their full-back and centre-back.', prompt: 'Which pass hurts them?',
      best: ['Into the right eight’s run', 'He runs onto it and finishes first time.', 'match-home-goal', [['h-r8', 88, 60]], [[88, 60], [100, 52]]],
      others: [
        ['Sideways to the left eight', 'We keep it, but nothing changes.', 'left-midfielder-1', [['h-l8', 58, 34]], [[58, 34]], 'retain', 'neutral'],
        ['Shoot from long range', 'High and wide.', 'striker-5', [['h-six', 55, 56]], [[100, 20]], 'contained', 'negative'],
        ['Carry into traffic', 'Their six steps in and wins it.', 'match-interception', [['a-six', 62, 54]], [[62, 54]], 'lost', 'negative'],
      ],
    },
  },
  {
    id: 'mt-recover-shape', tier: 1, title: 'We lose it on the halfway line', intro: 'Our pass is cut out near halfway. Rival XI attack quickly.',
    owner: 'a-r8', placements: [['a-r8', 50, 34], ['a-st', 40, 50], ['h-l8', 52, 30], ['h-six', 44, 48], ['h-lcb', 28, 40], ['a-rw', 30, 13]],
    first: {
      actor: 'h-l8', phase: 'Defending', context: 'Their eight has the ball facing our goal. Their striker is moving forward through the middle.', prompt: 'What do you do first?',
      best: ['Press him at once, from behind', 'He has to rush his pass. It goes wide.', 'left-midfielder-4', [['h-l8', 48, 34], ['a-r8', 46, 32]], [[38, 20]]],
      others: [
        ['Jog back to your position', 'He has time to pick a pass to the striker.', 'match-rival-goal', [['a-st', 16, 50]], [[16, 50], [0, 50]], 'concede', 'negative'],
        ['Foul him straight away', 'Yellow card. Free kick in midfield.', 'match-failed-tackle', [['h-l8', 50, 33]], [[50, 34]], 'contained', 'neutral'],
        ['Run to mark the striker', 'The eight carries forward unopposed.', 'match-duel', [['h-l8', 40, 46], ['a-r8', 34, 34]], [[34, 34]], 'contained', 'negative'],
      ],
    },
    second: {
      actor: 'h-lcb', phase: 'Defending', finish: 'regain', context: 'The rushed pass is heading toward their winger, out wide on our left.', prompt: 'How do you react?',
      best: ['Step across and intercept', 'You read the pass and win it.', 'right-centre-back-3', [['h-lcb', 36, 22]], [[36, 22]]],
      others: [
        ['Stay in the middle', 'The winger controls it and runs at our full-back.', 'match-duel', [['a-rw', 36, 20]], [[36, 20]], 'contained', 'neutral'],
        ['Sprint toward goal', 'The winger crosses and they win a corner.', 'match-duel', [['h-lcb', 14, 42]], [[0, 10]], 'contained', 'negative'],
        ['Shout at the full-back', 'Nobody moves. The winger gets in behind.', 'match-failed-tackle', [['a-rw', 24, 22]], [[24, 22]], 'contained', 'negative'],
      ],
    },
  },
  {
    id: 'mt-keeper-throw', tier: 1, title: 'Our keeper catches a cross', intro: 'Our goalkeeper has caught a cross. Rival XI have many players forward.',
    owner: 'h-gk', placements: [['h-gk', 8, 48], ['h-rb', 30, 84], ['h-rw', 50, 88], ['a-lw', 18, 70], ['a-st', 14, 48]],
    first: {
      actor: 'h-gk', phase: 'Attacking', context: 'Their winger is still near our box. Our right-back is free near the touchline.', prompt: 'Where do you start the attack?',
      best: ['Quick throw to the right-back', 'He receives in space with Rival XI caught upfield.', 'goalkeeper-1', [['h-rb', 32, 86]], [[32, 86]]],
      others: [
        ['Kick it long down the middle', 'Their centre-back heads it back.', 'match-duel', [['a-rcb', 62, 50]], [[62, 50]], 'lost', 'negative'],
        ['Roll it to the nearest defender', 'Their striker presses and wins a corner.', 'match-duel', [['a-st', 18, 44]], [[0, 30]], 'contained', 'negative'],
        ['Hold the ball and calm things', 'We keep it, but they get back in shape.', 'goalkeeper-5', [['h-gk', 10, 50]], [[10, 50]], 'retain', 'neutral'],
      ],
    },
    second: {
      actor: 'h-rb', phase: 'Attacking', finish: 'goal', context: 'You carry forward. Our winger is sprinting ahead of you down the line; their defence is retreating.', prompt: 'What now?',
      best: ['Release the winger into space', 'He races clear into the box and finishes past the keeper.', 'match-home-goal', [['h-rw', 86, 70]], [[86, 70], [100, 52]]],
      others: [
        ['Keep carrying', 'Their midfielder catches you.', 'match-interception', [['a-l8', 50, 80]], [[50, 80]], 'lost', 'negative'],
        ['Pass inside to midfield', 'We keep the ball, but the counter slows down.', 'right-back-1', [['h-r8', 48, 66]], [[48, 66]], 'retain', 'neutral'],
        ['Cross from deep', 'Easy header for their defender.', 'match-duel', [['a-lcb', 86, 60]], [[86, 60]], 'lost', 'negative'],
      ],
    },
  },
  {
    id: 'mt-defend-cutback', tier: 1, title: 'They reach our byline', intro: 'Rival XI have got to our byline on the right.',
    owner: 'a-lw', placements: [['a-lw', 6, 76], ['a-l8', 18, 58], ['a-st', 8, 48], ['h-six', 22, 52], ['h-rcb', 9, 56], ['h-rb', 10, 80]],
    first: {
      actor: 'h-six', phase: 'Defending', context: 'Their striker attacks the near post. Their eight is arriving toward the penalty spot.', prompt: 'Where do you go?',
      best: ['Cover the cut-back space for their eight', 'The ball is pulled back and you are there to block.', 'right-midfielder-5', [['h-six', 18, 57], ['a-l8', 20, 60]], [[18, 57]]],
      others: [
        ['Run to the near post too', 'The cut-back finds their eight alone. GOAL.', 'match-rival-goal', [['h-six', 8, 52], ['a-l8', 16, 56]], [[16, 56], [0, 50]], 'concede', 'negative'],
        ['Stay at the edge of the box for the rebound', 'Their eight shoots from close range and hits the post.', 'match-save', [['a-l8', 14, 56]], [[14, 56], [2, 58]], 'loose', 'negative'],
        ['Go to the winger', 'Two of us on him. The cut-back is blocked by luck.', 'match-duel', [['h-six', 10, 74]], [[12, 66]], 'loose', 'neutral'],
      ],
    },
    second: {
      actor: 'h-six', phase: 'Defending', finish: 'regain', context: 'The ball has bounced off your shin and spins in front of you.', prompt: 'What do you do?',
      best: ['Control and pass out to the full-back', 'Calm. We keep the ball.', 'right-midfielder-5', [['h-rb', 22, 84]], [[22, 84]]],
      others: [
        ['Hack it anywhere', 'It goes straight to their midfielder.', 'match-interception', [['a-r8', 40, 40]], [[40, 40]], 'lost', 'negative'],
        ['Dribble out of the box', 'Their eight tackles you.', 'match-interception', [['a-l8', 22, 58]], [[22, 58]], 'lost', 'negative'],
        ['Kick it out for a throw', 'Safe. Throw-in to Rival XI.', 'match-duel', [['h-six', 18, 57]], [[30, 100]], 'contained', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-short-corner', tier: 1, title: 'Our corner on the right', intro: 'We have a corner on the right. Rival XI pack the six-yard box.',
    owner: 'h-rw', placements: [['h-rw', 99, 98], ['h-r8', 90, 86], ['h-st', 90, 52], ['a-lw', 92, 88], ['a-lcb', 94, 56]],
    first: {
      actor: 'h-rw', phase: 'Attacking', context: 'Their winger stands close to our eight, who has come short. The box is crowded.', prompt: 'How do you take it?',
      best: ['Play it short to our eight', 'Their winger is too slow. Our eight has a better angle.', 'right-winger-3', [['h-r8', 90, 84]], [[90, 84]]],
      others: [
        ['Swing it into the crowd', 'Their keeper punches it clear.', 'goalkeeper-4', [['a-gk', 96, 52]], [[96, 52]], 'lost', 'negative'],
        ['Shoot at the near post', 'Easily held by the keeper.', 'match-blocked-shot', [['a-gk', 97, 58]], [[97, 58]], 'lost', 'negative'],
        ['Play it back to midfield', 'We keep the ball, but the corner is wasted.', 'right-winger-1', [['h-r8', 76, 74]], [[76, 74]], 'retain', 'neutral'],
      ],
    },
    second: {
      actor: 'h-r8', phase: 'Attacking', finish: 'goal', context: 'You have space at the corner of the box. Our striker is unmarked at the far post.', prompt: 'Where do you deliver?',
      best: ['Curl it to the far post', 'Our striker heads it back across the keeper. GOAL.', 'match-home-goal', [['h-st', 94, 40]], [[94, 40], [100, 48]]],
      others: [
        ['Shoot from the angle', 'Blocked by the near defender.', 'match-blocked-shot', [['a-lcb', 92, 66]], [[92, 66]], 'lost', 'negative'],
        ['Cross to the near post', 'Headed clear.', 'match-duel', [['a-lcb', 94, 58]], [[94, 58]], 'lost', 'negative'],
        ['Wait for support', 'Rival XI push out. We keep the ball.', 'right-midfielder-1', [['h-r8', 88, 82]], [[88, 82]], 'retain', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-long-ball-duel', tier: 1, title: 'A long ball to their striker', intro: 'Rival XI go long toward their big striker.',
    owner: 'a-gk', placements: [['a-gk', 92, 50], ['a-st', 40, 50], ['h-rcb', 36, 54], ['h-six', 46, 52], ['a-r8', 48, 40]],
    first: {
      actor: 'h-rcb', phase: 'Defending', context: 'The ball is coming toward their striker. You are behind him; their eight waits for the knockdown.', prompt: 'How do you challenge?',
      best: ['Get tight and contest the header', 'He cannot control the header. The ball drops loose.', 'right-centre-back-5', [['h-rcb', 38, 52], ['a-st', 40, 50]], [[40, 50], [44, 46]]],
      others: [
        ['Stay off and let him head it', 'He flicks it on to their eight, who runs through and scores.', 'match-rival-goal', [['a-r8', 16, 46]], [[40, 50], [16, 46], [0, 50]], 'concede', 'negative'],
        ['Go round the front of him', 'You misjudge it. He chests it down and is through.', 'match-failed-tackle', [['a-st', 28, 50]], [[28, 50]], 'contained', 'negative'],
        ['Drop and cover the space behind', 'He wins the header and they keep the ball.', 'right-centre-back-3', [['h-rcb', 28, 54]], [[40, 50], [48, 40]], 'contained', 'neutral'],
      ],
    },
    second: {
      actor: 'h-six', phase: 'Defending', finish: 'regain', context: 'The loose ball drops between you and their eight.', prompt: 'How do you win it?',
      best: ['Get your body between him and the ball', 'You shield it and win the second ball.', 'right-midfielder-5', [['h-six', 45, 47]], [[45, 47]]],
      others: [
        ['Wait for it to land', 'Their eight gets there first.', 'match-interception', [['a-r8', 44, 46]], [[44, 46]], 'lost', 'negative'],
        ['Head it back toward our goalkeeper first time', 'Short. Their striker nearly reaches it; our keeper claims.', 'match-save', [['h-gk', 18, 50]], [[18, 50]], 'retain', 'neutral'],
        ['Kick at it in mid-air', 'You catch their eight. Free kick.', 'match-failed-tackle', [['h-six', 44, 46]], [[44, 46]], 'contained', 'negative'],
      ],
    },
  },
  {
    id: 'mt-inside-forward', tier: 1, title: 'Our winger cuts inside', intro: 'Our right winger has the ball and their full-back is showing him inside.',
    owner: 'h-rw', placements: [['h-rw', 74, 80], ['h-rb', 66, 92], ['h-st', 86, 52], ['a-lb', 78, 82], ['a-lcb', 86, 62]],
    first: {
      actor: 'h-rw', phase: 'Attacking', context: 'Their full-back stands on your outside. Our right-back is overlapping behind him.', prompt: 'Which way do you go?',
      best: ['Cut inside onto your stronger foot', 'You get past and look up with the goal in front of you.', 'right-winger-3', [['h-rw', 80, 70], ['a-lb', 79, 78]], [[80, 70]]],
      others: [
        ['Go down the outside', 'He is ready for it and blocks you.', 'match-interception', [['a-lb', 80, 88]], [[80, 88]], 'lost', 'negative'],
        ['Pass back to the overlapping right-back', 'We keep the ball. The chance is gone.', 'right-back-1', [['h-rb', 66, 92]], [[66, 92]], 'retain', 'neutral'],
        ['Cross from where you are', 'Their centre-back heads away.', 'match-duel', [['a-lcb', 86, 58]], [[86, 58]], 'lost', 'negative'],
      ],
    },
    second: {
      actor: 'h-rw', phase: 'Attacking', finish: 'goal', context: 'Their centre-back is stepping toward you. Our striker spins off his shoulder.', prompt: 'What do you do?',
      best: ['Slide the striker in', 'He goes clean through and scores.', 'match-home-goal', [['h-st', 92, 52], ['a-lcb', 82, 66]], [[92, 52], [100, 50]]],
      others: [
        ['Shoot through the centre-back', 'Blocked.', 'match-blocked-shot', [['a-lcb', 83, 66]], [[83, 66]], 'lost', 'negative'],
        ['Keep dribbling', 'You run into a second defender.', 'match-interception', [['a-six', 84, 62]], [[84, 62]], 'lost', 'negative'],
        ['Turn back', 'Rival XI regroup. We still have it.', 'right-winger-1', [['h-rw', 78, 74]], [[78, 74]], 'retain', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-half-space-run', tier: 1, title: 'Their full-back pushes up', intro: 'Rival XI attack down their right. Their full-back has gone forward, leaving space behind him.',
    owner: 'h-l8', placements: [['h-l8', 46, 30], ['h-lw', 58, 14], ['h-st', 70, 48], ['a-rb', 48, 12], ['a-rcb', 70, 36], ['a-r8', 50, 34]],
    first: {
      actor: 'h-l8', phase: 'Attacking', context: 'We have just won the ball. Their full-back is still high up the pitch; our left winger is already running into the space behind him.', prompt: 'Where does the first pass go?',
      best: ['Into the space behind the full-back', 'Our winger runs onto it with nobody near him.', 'left-midfielder-3', [['h-lw', 72, 16], ['a-rb', 54, 14]], [[72, 16]]],
      others: [
        ['To the striker’s feet', 'Their centre-back steps in front and intercepts.', 'match-interception', [['a-rcb', 68, 42]], [[68, 42]], 'lost', 'negative'],
        ['Carry it forward yourself', 'Their eight recovers and blocks your path.', 'match-interception', [['a-r8', 50, 31], ['h-l8', 49, 31]], [[50, 31]], 'lost', 'negative'],
        ['Back to our centre-back', 'Safe, but Rival XI get back into shape.', 'left-midfielder-1', [['h-l8', 45, 31]], [[26, 37]], 'retain', 'neutral'],
      ],
    },
    second: {
      actor: 'h-lw', phase: 'Attacking', finish: 'goal', context: 'You are racing toward the box. Their centre-back comes across; our striker runs to the far post.', prompt: 'How do you finish the break?',
      best: ['Pass across to the striker at the far post', 'The centre-back is beaten. Our striker taps it in.', 'match-home-goal', [['h-st', 92, 56], ['a-rcb', 80, 26]], [[92, 56], [100, 54]]],
      others: [
        ['Shoot from the angle', 'The keeper saves at the near post.', 'match-blocked-shot', [['a-gk', 94, 42]], [[94, 42]], 'lost', 'negative'],
        ['Take on the centre-back', 'He tackles you on the edge of the box.', 'match-interception', [['a-rcb', 76, 20], ['h-lw', 75, 19]], [[76, 20]], 'lost', 'negative'],
        ['Wait for our eight to arrive in support', 'The defence recovers. We keep the ball.', 'left-winger-1', [['h-lw', 74, 16]], [[74, 16]], 'retain', 'neutral'],
      ],
    },
  },
  // ——— Easy ———
  {
    id: 'mt-easy-through-ball', tier: 0, title: 'A run behind their line', intro: 'Rival XI hold a flat back line near halfway. Our striker is ready to run.',
    owner: 'h-l8', placements: [['h-l8', 56, 40], ['h-st', 66, 48], ['a-rcb', 70, 42], ['a-lcb', 70, 58], ['h-lw', 64, 16]],
    first: {
      actor: 'h-l8', phase: 'Attacking', context: 'You have time on the ball. Our striker starts sprinting behind their centre-backs.', prompt: 'Where does the pass go?',
      best: ['Into the striker’s run behind them', 'Perfect weight. Our striker is through on goal.', 'left-midfielder-3', [['h-st', 86, 48]], [[86, 48]]],
      others: [
        ['To the striker’s feet', 'He is facing his own goal and their centre-back steals it.', 'match-interception', [['a-rcb', 67, 47]], [[67, 47]], 'lost', 'negative'],
        ['Out to the left winger', 'Safe, but the striker’s run is wasted.', 'left-winger-1', [['h-lw', 64, 16]], [[64, 16]], 'retain', 'neutral'],
        ['Shoot from halfway', 'Their keeper catches it easily.', 'match-blocked-shot', [['a-gk', 92, 50]], [[92, 50]], 'lost', 'negative'],
      ],
    },
    second: {
      actor: 'h-st', phase: 'Attacking', finish: 'goal', context: 'You are through on your own. The keeper comes out to meet you.', prompt: 'How do you finish?',
      best: ['Slide it past him into the corner', 'Calm and low. GOAL.', 'match-home-goal', [['h-st', 88, 48]], [[100, 54]]],
      others: [
        ['Blast it straight at him', 'He blocks it with his body.', 'match-blocked-shot', [['a-gk', 90, 49]], [[90, 49]], 'lost', 'negative'],
        ['Stop and wait for help', 'A defender catches up and clears.', 'match-interception', [['a-rcb', 86, 46]], [[86, 46]], 'lost', 'negative'],
        ['Turn back toward the halfway line', 'We keep the ball, but the chance is gone.', 'striker-1', [['h-st', 80, 48]], [[80, 48]], 'retain', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-easy-cutback', tier: 0, title: 'At the byline on the right', intro: 'Our right winger has beaten the Rival XI full-back and reached the byline.',
    owner: 'h-rw', placements: [['h-rw', 92, 82], ['h-r8', 80, 58], ['h-st', 92, 52], ['a-lcb', 92, 58], ['a-lb', 88, 84]],
    first: {
      actor: 'h-rw', phase: 'Attacking', context: 'Their defenders are all running back to the six-yard box. Our eight arrives alone near the penalty spot.', prompt: 'Where do you pass?',
      best: ['Pull it back to the penalty spot', 'The defenders ran past it. Our eight has the ball and space.', 'right-winger-3', [['h-r8', 84, 56]], [[84, 56]]],
      others: [
        ['Cross into the six-yard box', 'Their centre-back heads it out.', 'match-duel', [['a-lcb', 92, 60]], [[92, 60]], 'lost', 'negative'],
        ['Shoot from the byline', 'Off the side netting. Goal kick.', 'striker-5', [['h-rw', 93, 82]], [[100, 70]], 'contained', 'negative'],
        ['Pass back to the halfway line', 'We keep the ball, but the chance is gone.', 'right-winger-1', [['h-rb', 60, 88]], [[60, 88]], 'retain', 'neutral'],
      ],
    },
    second: {
      actor: 'h-r8', phase: 'Attacking', finish: 'goal', context: 'The ball rolls to you at the penalty spot. Nobody is near you.', prompt: 'What do you do?',
      best: ['Side-foot it first time into the corner', 'No time for the keeper to react. GOAL.', 'match-home-goal', [['h-r8', 85, 55]], [[100, 46]]],
      others: [
        ['Take three touches first', 'A defender recovers and blocks.', 'match-blocked-shot', [['a-lcb', 86, 56]], [[86, 56]], 'lost', 'negative'],
        ['Pass to the striker in the crowd', 'It is cut out on the line.', 'match-interception', [['a-lcb', 92, 54]], [[92, 54]], 'lost', 'negative'],
        ['Lay it back outside the box', 'We keep it, but the defence is back.', 'right-midfielder-1', [['h-six', 70, 52]], [[70, 52]], 'retain', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-easy-two-on-one', tier: 0, title: 'Two of us, one of them', intro: 'A fast break. Our winger carries the ball with our striker alongside and one Rival XI defender back.',
    owner: 'h-lw', placements: [['h-lw', 70, 36], ['h-st', 70, 56], ['a-rcb', 82, 46], ['a-gk', 94, 50], ['a-lcb', 58, 64], ['a-rb', 56, 20], ['a-lb', 54, 82], ['a-six', 52, 50]],
    first: {
      actor: 'h-lw', phase: 'Attacking', context: 'The last defender has to choose between you and the striker. He steps toward you.', prompt: 'What now?',
      best: ['Pass to the striker as he comes to you', 'The defender is out of the game. Our striker runs at goal.', 'left-winger-2', [['h-st', 84, 54], ['a-rcb', 78, 40]], [[84, 54]]],
      others: [
        ['Dribble at the defender', 'He tackles you.', 'match-interception', [['a-rcb', 78, 40]], [[78, 40]], 'lost', 'negative'],
        ['Shoot from distance', 'The keeper holds it.', 'match-blocked-shot', [['a-gk', 94, 48]], [[94, 48]], 'lost', 'negative'],
        ['Slow down and wait', 'Other defenders get back. We keep the ball.', 'left-winger-1', [['h-lw', 72, 36]], [[72, 36]], 'retain', 'neutral'],
      ],
    },
    second: {
      actor: 'h-st', phase: 'Attacking', finish: 'goal', context: 'Only the keeper is left in front of you.', prompt: 'How do you finish?',
      best: ['Shoot low across the keeper', 'In off the far post. GOAL.', 'match-home-goal', [['h-st', 86, 54]], [[100, 46]]],
      others: [
        ['Chip it high over him', 'It goes over the bar.', 'striker-5', [['h-st', 85, 54]], [[100, 28]], 'contained', 'negative'],
        ['Run it round him', 'He grabs the ball at your feet.', 'match-interception', [['a-gk', 90, 56], ['h-st', 89, 56]], [[90, 56]], 'lost', 'negative'],
        ['Pass back to the winger', 'The defender recovers. We keep the ball.', 'striker-2', [['h-lw', 76, 40]], [[76, 40]], 'retain', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-easy-far-post', tier: 0, title: 'Our left-back crosses', intro: 'Our left-back is near the byline. Rival XI defenders crowd the near post.',
    owner: 'h-lb', placements: [['h-lb', 86, 10], ['h-st', 88, 44], ['h-rw', 86, 64], ['a-rcb', 90, 40], ['a-lcb', 90, 48]],
    first: {
      actor: 'h-lb', phase: 'Attacking', context: 'Two defenders guard our striker at the near post. Our right winger has run into the box at the far post.', prompt: 'Where do you cross?',
      best: ['Cross to the far post', 'Over everyone. Our winger is waiting.', 'right-winger-2', [['h-rw', 90, 62]], [[90, 62]]],
      others: [
        ['Cross to the near post', 'Two defenders there. Headed clear.', 'match-duel', [['a-rcb', 89, 42]], [[89, 42]], 'lost', 'negative'],
        ['Shoot from the angle', 'Wide of the post. Goal kick.', 'striker-5', [['h-lb', 87, 10]], [[100, 34]], 'contained', 'negative'],
        ['Pass it back to midfield', 'We keep it. The defence stays in place.', 'left-winger-1', [['h-l8', 70, 32]], [[70, 32]], 'retain', 'neutral'],
      ],
    },
    second: {
      actor: 'h-rw', phase: 'Attacking', finish: 'goal', context: 'The cross drops to you at the far post. The keeper is on the other side.', prompt: 'How do you finish?',
      best: ['Head it down into the open side', 'Back across the keeper. GOAL.', 'match-home-goal', [['h-rw', 91, 60]], [[100, 50]]],
      others: [
        ['Let it bounce first', 'A defender gets back and clears.', 'match-interception', [['a-lcb', 90, 58]], [[90, 58]], 'lost', 'negative'],
        ['Head it back across the box', 'Nobody is there. Their defender collects.', 'match-interception', [['a-rcb', 88, 46]], [[88, 46]], 'lost', 'negative'],
        ['Control it and wait', 'Defenders surround you. We keep the ball, just.', 'right-winger-1', [['h-rw', 88, 66]], [[88, 66]], 'retain', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-easy-follow-up', tier: 0, title: 'Our shot is saved', intro: 'Our eight shoots from the edge of the box. The Rival XI keeper dives to save.',
    owner: { x: 86, y: 46 }, placements: [['h-st', 82, 48], ['a-gk', 93, 50], ['a-lcb', 86, 58], ['h-l8', 76, 38]],
    first: {
      actor: 'h-st', phase: 'Attacking', context: 'The keeper pushes it out but cannot hold it. The ball spins near the penalty spot.', prompt: 'What do you do?',
      best: ['Run in for the rebound', 'You are first to the loose ball.', 'striker-5', [['h-st', 87, 47]], [[87, 47]]],
      others: [
        ['Stand still and watch', 'Their defender clears it.', 'match-interception', [['a-lcb', 86, 48]], [[86, 48]], 'lost', 'negative'],
        ['Jog back into position', 'Their defender clears it.', 'match-interception', [['a-lcb', 86, 47]], [[86, 47]], 'lost', 'negative'],
        ['Ask our eight to go for it', 'He is too far away. Their keeper grabs it.', 'goalkeeper-4', [['a-gk', 86, 46]], [[86, 46]], 'lost', 'neutral'],
      ],
    },
    second: {
      actor: 'h-st', phase: 'Attacking', finish: 'goal', context: 'The keeper is still on the ground. The goal is open.', prompt: 'How do you finish?',
      best: ['Tap it into the empty net', 'The simplest goal of the day. GOAL.', 'match-home-goal', [['h-st', 88, 47]], [[100, 50]]],
      others: [
        ['Smash it as hard as you can', 'It flies over the bar.', 'striker-5', [['h-st', 88, 47]], [[100, 26]], 'contained', 'negative'],
        ['Pass to our eight outside', 'The keeper gets up and the chance is gone.', 'striker-2', [['h-l8', 76, 38]], [[76, 38]], 'retain', 'neutral'],
        ['Dribble round the keeper', 'He grabs your ankle... and the ball.', 'match-interception', [['a-gk', 89, 49], ['h-st', 89, 48]], [[89, 49]], 'lost', 'negative'],
      ],
    },
  },
  {
    id: 'mt-easy-high-steal', tier: 0, title: 'Their defender has the ball', intro: 'Rival XI try to pass out from the back. Their centre-back looks nervous.',
    owner: 'a-rcb', placements: [['a-rcb', 84, 40], ['h-st', 76, 44], ['a-gk', 94, 50], ['a-lcb', 84, 60]],
    first: {
      actor: 'h-st', phase: 'Defending', context: 'Their centre-back takes a slow first touch. You are close to him.', prompt: 'What do you do?',
      best: ['Close him down at once', 'He panics and you steal the ball near their box.', 'striker-4', [['h-st', 84, 42], ['a-rcb', 82, 38]], [[84, 42]]],
      others: [
        ['Stay back near halfway', 'He passes calmly to his partner.', 'striker-1', [['h-st', 62, 46]], [[84, 60]], 'contained', 'neutral'],
        ['Run at the keeper', 'The centre-back plays round you.', 'match-failed-tackle', [['h-st', 90, 48]], [[84, 60]], 'contained', 'negative'],
        ['Slide in from far away', 'You arrive late and foul him.', 'match-failed-tackle', [['h-st', 83, 41]], [[84, 40]], 'contained', 'negative'],
      ],
    },
    second: {
      actor: 'h-st', phase: 'Attacking', finish: 'goal', context: 'You have stolen the ball 18 yards from goal. The keeper is off his line.', prompt: 'What now?',
      best: ['Shoot before the keeper sets', 'Low into the corner. GOAL.', 'match-home-goal', [['h-st', 85, 43]], [[100, 46]]],
      others: [
        ['Take it wide first', 'Their other centre-back blocks your shot.', 'match-blocked-shot', [['a-lcb', 88, 50]], [[88, 50]], 'lost', 'negative'],
        ['Wait for teammates', 'The defence recovers. We keep the ball.', 'striker-1', [['h-st', 84, 44]], [[84, 44]], 'retain', 'neutral'],
        ['Pass back to the halfway line', 'A wasted chance. Their striker intercepts.', 'match-interception', [['a-six', 66, 48]], [[66, 48]], 'lost', 'negative'],
      ],
    },
  },
  {
    id: 'mt-easy-switch-wing', tier: 0, title: 'Too crowded on the left', intro: 'Rival XI have moved everyone to our left. The other side of the pitch is empty.',
    owner: 'h-six', placements: [['h-six', 60, 36], ['h-rw', 72, 84], ['h-st', 84, 50], ['a-lb', 74, 64], ['a-six', 64, 32]],
    first: {
      actor: 'h-six', phase: 'Attacking', context: 'Players crowd the left side around you. Our right winger stands alone on the far touchline.', prompt: 'Where do you pass?',
      best: ['Switch it to the right winger', 'The ball flies across. Our winger has space to run while our striker checks back level with the ball.', 'right-midfielder-2', [['h-rw', 74, 84], ['h-st', 74, 50]], [[74, 84]]],
      others: [
        ['Pass into the crowd', 'Their six intercepts.', 'match-interception', [['a-six', 63, 34]], [[63, 34]], 'lost', 'negative'],
        ['Dribble through them', 'They surround you and win it.', 'match-interception', [['a-six', 62, 36], ['h-six', 62, 37]], [[62, 36]], 'lost', 'negative'],
        ['Pass back to the defence', 'Safe. Rival XI stay compact.', 'right-centre-back-1', [['h-lcb', 34, 37]], [[34, 37]], 'retain', 'neutral'],
      ],
    },
    second: {
      actor: 'h-rw', phase: 'Attacking', finish: 'goal', context: 'Their full-back is slowly coming across; our striker starts level with the ball, ready to run into the box.', prompt: 'What do you do?',
      best: ['Pass across to the striker', 'Before the full-back arrives. Our striker scores.', 'match-home-goal', [['h-st', 90, 52]], [[90, 52], [100, 50]]],
      others: [
        ['Wait for the full-back', 'He arrives and blocks the way.', 'match-interception', [['a-lb', 78, 80]], [[78, 80]], 'lost', 'negative'],
        ['Shoot from very wide', 'Easy for the keeper.', 'match-blocked-shot', [['a-gk', 94, 56]], [[94, 56]], 'lost', 'negative'],
        ['Turn and go backwards', 'We keep the ball. The chance is gone.', 'right-winger-1', [['h-rw', 70, 84]], [[70, 84]], 'retain', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-easy-give-and-go', tier: 0, title: 'One-two on the left', intro: 'Our left-back has the ball. The Rival XI winger is closing him down.',
    owner: 'h-lb', placements: [['h-lb', 62, 12], ['h-lw', 70, 20], ['h-st', 84, 48], ['a-rw', 64, 16], ['a-rb', 76, 18]],
    first: {
      actor: 'h-lb', phase: 'Attacking', context: 'Their winger is right in front of you. Our left winger is close by, ready for a short pass.', prompt: 'How do you get past?',
      best: ['Pass to the winger and run past', 'He gives it straight back. You are behind their winger while our striker checks back level with the ball.', 'left-winger-3', [['h-lb', 80, 10], ['a-rw', 62, 14], ['h-st', 80, 48]], [[70, 20], [80, 10]]],
      others: [
        ['Dribble at their winger', 'He wins the ball.', 'match-interception', [['a-rw', 63, 14]], [[63, 14]], 'lost', 'negative'],
        ['Kick it long down the line', 'Out for a throw-in to Rival XI.', 'left-winger-1', [['h-lb', 62, 12]], [[90, 0]], 'contained', 'negative'],
        ['Pass back to the centre-back', 'Safe, but we go backwards.', 'right-centre-back-1', [['h-lcb', 40, 34]], [[40, 34]], 'retain', 'neutral'],
      ],
    },
    second: {
      actor: 'h-lb', phase: 'Attacking', finish: 'goal', context: 'You have space on the left. Our striker starts level with the ball before running into the middle of the box.', prompt: 'Where do you cross?',
      best: ['Low across the box to the striker', 'He meets it first time. GOAL.', 'match-home-goal', [['h-st', 90, 48]], [[90, 48], [100, 50]]],
      others: [
        ['High into the keeper’s hands', 'The keeper catches it.', 'goalkeeper-4', [['a-gk', 93, 46]], [[93, 46]], 'lost', 'negative'],
        ['Shoot from the angle', 'Into the side netting.', 'striker-5', [['h-lb', 81, 10]], [[100, 36]], 'contained', 'negative'],
        ['Stop and wait', 'Their full-back gets back. We still have it.', 'left-winger-1', [['h-lb', 82, 13]], [[82, 13]], 'retain', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-easy-corner-header', tier: 0, title: 'Our corner from the left', intro: 'We have a corner. Rival XI defenders mark the near post.',
    owner: 'h-l8', placements: [['h-l8', 99, 2], ['h-lb', 88, 14], ['h-lcb', 86, 54], ['h-st', 92, 42], ['a-rcb', 94, 37], ['a-lcb', 92, 47]],
    first: {
      actor: 'h-l8', phase: 'Attacking', context: 'Defenders crowd the near post around our striker. Our centre-back waits near the penalty spot with space around him.', prompt: 'Where do you aim the corner?',
      best: ['Toward the penalty spot', 'Right onto our centre-back’s head.', 'right-centre-back-5', [['h-lcb', 88, 54]], [[88, 54]]],
      others: [
        ['At the near post', 'Their defenders head it away.', 'match-duel', [['a-rcb', 93, 38]], [[93, 38]], 'lost', 'negative'],
        ['Straight at goal', 'The keeper punches it clear.', 'goalkeeper-4', [['a-gk', 95, 48]], [[95, 48]], 'lost', 'negative'],
        ['Short to a teammate', 'We keep the ball. The defence stays set.', 'left-midfielder-1', [['h-lb', 92, 10]], [[92, 10]], 'retain', 'neutral'],
      ],
    },
    second: {
      actor: 'h-lcb', phase: 'Attacking', finish: 'goal', context: 'The ball is coming down toward you near the penalty spot.', prompt: 'How do you head it?',
      best: ['Down toward the bottom corner', 'Into the ground and into the net. GOAL.', 'match-home-goal', [['h-lcb', 88, 54]], [[100, 56]]],
      others: [
        ['Up over the bar', 'Too high. Goal kick.', 'striker-5', [['h-lcb', 88, 54]], [[100, 30]], 'contained', 'negative'],
        ['Back to the corner taker', 'Their defender intercepts.', 'match-interception', [['a-rcb', 92, 30]], [[92, 30]], 'lost', 'negative'],
        ['Let it drop and control it', 'The defenders close in. We keep it, barely.', 'right-centre-back-1', [['h-lcb', 87, 55]], [[87, 55]], 'retain', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-simple-wall-pass', tier: 0, title: 'A one-two near their box', intro: 'Our eight runs at the Rival XI defence with the striker close by.',
    owner: 'h-l8', placements: [['h-l8', 70, 40], ['h-st', 80, 46], ['a-rcb', 82, 42], ['a-six', 74, 46]],
    first: {
      actor: 'h-l8', phase: 'Attacking', context: 'Their six is coming toward you. Our striker is free next to you.', prompt: 'What do you do?',
      best: ['Pass to the striker and run past', 'The striker plays it back into your path and the centre-back follows him away from your run.', 'left-midfielder-3', [['h-l8', 82, 38], ['a-six', 72, 44], ['a-rcb', 77, 46], ['a-lcb', 75, 62], ['a-rb', 74, 20]], [[80, 46], [82, 38]]],
      others: [
        ['Dribble at the six', 'He takes the ball.', 'match-interception', [['a-six', 73, 44]], [[73, 44]], 'lost', 'negative'],
        ['Shoot from far out', 'Over the bar.', 'striker-5', [['h-l8', 71, 40]], [[100, 30]], 'contained', 'negative'],
        ['Pass backwards', 'We keep the ball.', 'left-midfielder-1', [['h-l8', 69, 40], ['h-six', 56, 44]], [[56, 44]], 'retain', 'neutral'],
      ],
    },
    second: {
      actor: 'h-l8', phase: 'Attacking', finish: 'goal', context: 'You are in the box with only the keeper to beat.', prompt: 'How do you finish?',
      best: ['Pass it into the corner', 'Calm finish. GOAL.', 'match-home-goal', [['h-l8', 86, 40]], [[100, 46]]],
      others: [
        ['Shoot straight at the keeper', 'Saved.', 'match-blocked-shot', [['a-gk', 94, 48]], [[94, 48]], 'lost', 'negative'],
        ['Wait for a defender', 'He tackles you.', 'match-interception', [['a-rcb', 85, 40]], [[85, 40]], 'lost', 'negative'],
        ['Look for a teammate', 'Nobody is there. We keep it.', 'left-midfielder-1', [['h-l8', 84, 40]], [[84, 40]], 'retain', 'neutral'],
      ],
    },
  },
  {
    id: 'mt-clear-danger', tier: 0, title: 'A loose ball in our box', intro: 'A Rival XI cross has dropped loose inside our box.',
    owner: { x: 14, y: 50 }, placements: [['h-lcb', 12, 46], ['a-st', 16, 54], ['h-gk', 6, 50], ['h-lw', 32, 20]],
    first: {
      actor: 'h-lcb', phase: 'Defending', context: 'The ball is right in front of you. Their striker is running in.', prompt: 'What do you do?',
      best: ['Get to it first and clear it wide', 'Away to safety. Our winger picks it up.', 'right-centre-back-5', [['h-lcb', 14, 49]], [[14, 49], [30, 20]]],
      others: [
        ['Wait for the keeper', 'Their striker gets there first and scores.', 'match-rival-goal', [['a-st', 13, 50]], [[13, 50], [0, 50]], 'concede', 'negative'],
        ['Try a fancy turn', 'He steals it. The keeper saves.', 'match-save', [['a-st', 14, 50]], [[14, 50], [6, 50]], 'loose', 'negative'],
        ['Kick it straight up', 'It drops in the box again.', 'match-duel', [['h-lcb', 14, 49]], [[18, 52]], 'loose', 'neutral'],
      ],
    },
    second: {
      actor: 'h-lw', phase: 'Defending', finish: 'regain', context: 'The clearance is rolling toward you near our left touchline.', prompt: 'What now?',
      best: ['Control it and keep it', 'Simple. We have the ball.', 'left-winger-1', [['h-lw', 30, 20]], [[30, 20]]],
      others: [
        ['Let it run out', 'Throw-in to Rival XI.', 'left-winger-1', [['h-lw', 32, 18]], [[34, 0]], 'contained', 'neutral'],
        ['Hoof it upfield', 'Their defender heads it back.', 'match-duel', [['a-rcb', 64, 40]], [[64, 40]], 'lost', 'negative'],
        ['Pass across our box', 'Their striker intercepts.', 'match-interception', [['a-st', 18, 44]], [[18, 44]], 'lost', 'negative'],
      ],
    },
  },
];

export const tournamentPlays = specs.map((spec) => ({ tier: spec.tier, moment: build(spec) }));
