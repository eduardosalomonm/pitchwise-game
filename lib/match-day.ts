import type { Player, Point, Movement, CourseId } from './scenarios';
import { reviewMatchMoments } from './match-story.ts';
import { matchChoiceTone } from './match-feedback.ts';

export type MatchPossession = 'home' | 'away' | 'neutral';
export type MatchPhase = 'Attacking' | 'Defending' | 'Transition';
export type MatchTone = 'positive' | 'negative' | 'neutral';

export type MatchOutcome = {
  id: string;
  // How the possession ended (goal, lost, loose…), when authored through endingOutcome.
  result?: string;
  possession: MatchPossession;
  homeGoals: number;
  awayGoals: number;
  headline: string;
  recap: string;
  tone: MatchTone;
};

export type MatchChoice = {
  booking?: string;
  artId?: string;
  tone?: MatchTone;
  id: string;
  label: string;
  feedback: string;
  movement: Movement[];
  ballPath?: Point[];
  ballTo?: Point;
  nextNodeId?: string;
  outcome?: MatchOutcome;
};

export type MatchScene = { players: Player[]; ball: Point; unavailablePlayerIds?: string[] };

export type DecisionNode = {
  id: string;
  actor: string;
  actorLabel: string;
  phase: MatchPhase;
  prompt: string;
  context: string;
  trainingCourseId: CourseId;
  scene: MatchScene;
  choices: MatchChoice[];
  // Display order; set per fixture so the best option is spread evenly across positions.
  choiceOrder?: string[];
};

export type MatchMoment = {
  id: string;
  minute: number;
  name: string;
  phase: MatchPhase;
  introduction: string;
  rootNodeId: string;
  nodes: DecisionNode[];
};

export type MatchDecision = {
  booking?: string;
  momentId: string;
  nodeId: string;
  choiceId: string;
  actor: string;
  label: string;
  feedback: string;
  tone: MatchTone;
};

export type MatchMomentResult = {
  momentId: string;
  name: string;
  minute: number;
  outcome: MatchOutcome;
  decisions: MatchDecision[];
};

export type PendingMatchChoice = {
  momentId: string;
  nodeId: string;
  choiceId: string;
  nextNodeId?: string;
  outcome?: MatchOutcome;
};

export type MatchRun = {
  momentIndex: number;
  nodeId: string;
  homeScore: number;
  awayScore: number;
  possession: MatchPossession;
  status: 'active' | 'final';
  decisions: MatchDecision[];
  results: MatchMomentResult[];
  pending?: PendingMatchChoice;
};

const outcome = (
  id: string,
  headline: string,
  recap: string,
  tone: MatchTone,
  possession: MatchPossession,
  homeGoals = 0,
  awayGoals = 0,
): MatchOutcome => ({ id, headline, recap, tone, possession, homeGoals, awayGoals });

const scene = (): MatchScene => ({ players: [], ball: { x: 0, y: 0 } });

const choice = (
  id: string,
  label: string,
  feedback: string,
  to: Point,
  nextNodeId?: string,
  terminal?: MatchOutcome,
): MatchChoice => ({ id, label, feedback, movement: [{ playerId: 'actor', to, label }], ballTo: to, nextNodeId, outcome: terminal });

const m1OurGoal = outcome('m1-our-goal', 'GOAL — the press is beaten!', 'Five connected decisions turn pressure at our goal into a finish at theirs.', 'positive', 'away', 1);
const m1RivalGoal = outcome('m1-rival-goal', 'Rival XI score.', 'The central turnover becomes a direct counter before our shape can recover.', 'negative', 'home', 0, 1);

export const matchMoments: MatchMoment[] = reviewMatchMoments([
  {
    id: 'play-through-press', minute: 8, name: 'Play Through the Press', phase: 'Attacking', rootNodeId: 'm1-gk',
    introduction: 'Rival XI press player for player. Build from our goalkeeper—or give them the first chance.',
    nodes: [
      { id: 'm1-gk', actor: 'Goalkeeper', actorLabel: 'GK', phase: 'Attacking', trainingCourseId: 'goalkeeper', context: 'The striker blocks the pass into the six and curves toward the left centre-back.', prompt: 'Where does the goalkeeper begin?', scene: scene(), choices: [
        choice('right-cb', 'Pass to the right centre-back', 'The pass moves away from the curved press and gives the defender room to advance.', { x: 24, y: 68 }, 'm1-cb'),
        choice('force-six', 'Pass into the six’s feet', 'Their midfielder intercepts the pass intended for our six and carries toward our goal. Our six is now recovering.', { x: 39, y: 50 }, 'm1-defend-six'),
        choice('go-long', 'Clip it long toward the striker', 'The team escapes danger, but the isolated striker cannot secure the second ball.', { x: 66, y: 50 }, undefined, outcome('m1-long', 'Pressure escaped, attack ended.', 'A safe exit avoids danger but concedes possession before a chance develops.', 'neutral', 'away')),
      ] },
      { id: 'm1-cb', actor: 'Right centre-back', actorLabel: 'CB', phase: 'Attacking', trainingCourseId: 'right-centre-back', context: 'The centre-back receives with grass ahead while the winger waits outside.', prompt: 'What does the centre-back do with this space?', scene: scene(), choices: [
        choice('carry', 'Carry forward toward the winger', 'The carry commits the winger and frees the next pass inside.', { x: 43, y: 34 }, 'm1-six'),
        choice('early-wide', 'Pass wide immediately', 'The full-back receives facing the touchline and recycles safely.', { x: 36, y: 12 }, undefined, outcome('m1-recycle', 'Possession retained.', 'The press is avoided, but the early pass removes the chance to break its second line.', 'neutral', 'home')),
        choice('square', 'Play square across the defence', 'The pressing striker reads it and forces a hurried clearance.', { x: 20, y: 50 }, undefined, outcome('m1-clearance', 'The press forces a clearance.', 'No goal is conceded, but Rival XI take the next possession.', 'negative', 'away')),
      ] },
      { id: 'm1-six', actor: 'Defensive midfielder', actorLabel: '6', phase: 'Attacking', trainingCourseId: 'defensive-midfielder', context: 'The winger jumps to the ball. The six is marked from behind but the right eight is free around the corner.', prompt: 'How should the six receive this pass?', scene: scene(), choices: [
        choice('half-turn', 'Receive side-on and bounce it to the eight', 'One touch around the corner removes two pressers.', { x: 51, y: 63 }, 'm1-combine'),
        choice('turn', 'Control and turn toward goal', 'The marker wins it cleanly and Rival XI attack the open centre.', { x: 49, y: 52 }, 'm1-defend-six'),
        choice('back', 'Return it to the centre-back', 'The safe pass keeps the ball but allows Rival XI to reset their press.', { x: 31, y: 61 }, undefined, outcome('m1-reset', 'The opening closes.', 'Our team keeps possession, but the advantage created by the carry disappears.', 'neutral', 'home')),
      ] },
      { id: 'm1-combine', actor: 'Right winger', actorLabel: 'RW', phase: 'Attacking', trainingCourseId: 'right-winger', context: 'Our right winger has received the eight’s pass. The eight offers a return inside while our right-back occupies the outside defender.', prompt: 'What should the winger do after coming short?', scene: scene(), choices: [
        choice('set-run', 'Set the eight, then sprint behind', 'The set pass draws the full-back forward and the return releases the winger beyond them.', { x: 72, y: 76 }, 'm1-striker'),
        choice('dribble', 'Receive and dribble inside', 'The defence compresses around the ball and the shot lane disappears.', { x: 62, y: 57 }, undefined, outcome('m1-blocked', 'The attack is crowded out.', 'Our team keeps the ball, but Rival XI recover their defensive shape.', 'neutral', 'home')),
        choice('stay-wide', 'Wait on the touchline', 'The passing lane is visible but static, allowing the full-back to intercept.', { x: 60, y: 89 }, undefined, outcome('m1-intercepted', 'Rival XI intercept.', 'The delayed movement gives the defender time to read the pass.', 'negative', 'away')),
      ] },
      { id: 'm1-striker', actor: 'Striker', actorLabel: '9', phase: 'Attacking', trainingCourseId: 'striker', context: 'The winger breaks behind. The near centre-back watches the ball and the goalkeeper protects the near post.', prompt: 'How does the striker complete the move?', scene: scene(), choices: [
        choice('bend-finish', 'Bend across the defender and finish far post', 'The curved run stays onside, creates separation, and opens the far corner.', { x: 86, y: 58 }, undefined, m1OurGoal),
        choice('near', 'Run straight to the near post', 'The centre-back sees the run and blocks the first-time finish.', { x: 84, y: 42 }, undefined, outcome('m1-shot-blocked', 'Shot blocked.', 'The chance arrives, but the visible run lets the centre-back recover.', 'neutral', 'away')),
        choice('hold', 'Wait near the penalty spot', 'The cut-back travels behind the striker and Rival XI clear.', { x: 77, y: 50 }, undefined, outcome('m1-cleared', 'Rival XI clear.', 'The hesitation wastes the separation created by the first four decisions.', 'negative', 'away')),
      ] },
      { id: 'm1-defend-six', actor: 'Defensive midfielder', actorLabel: '6', phase: 'Transition', trainingCourseId: 'defensive-midfielder', context: 'Possession is lost centrally. Rival XI carry at an exposed back line.', prompt: 'What must the six do first?', scene: scene(), choices: [
        choice('delay', 'Curve the recovery run and delay the carrier', 'The six blocks the direct pass and buys time for the centre-backs to recover.', { x: 52, y: 47 }, undefined, outcome('m1-recovered-shape', 'The counter is stopped.', 'A patient recovery forces Rival XI sideways and the defence resets.', 'positive', 'away')),
        choice('dive', 'Step in for an immediate tackle', 'Their midfielder skips our six’s tackle and advances with an outside runner. Our right centre-back must defend the two-against-one.', { x: 62, y: 40 }, 'm1-defend-cb'),
        choice('chase-ball', 'Run directly behind the ball', 'Their midfielder carries beyond our six, who is chasing from behind. Our right centre-back now faces the carrier and an outside runner.', { x: 57, y: 34 }, 'm1-defend-cb'),
      ] },
      { id: 'm1-defend-cb', actor: 'Centre-back', actorLabel: 'CB', phase: 'Defending', trainingCourseId: 'centre-back', context: 'The carrier has a runner outside and another between the centre-backs.', prompt: 'How does the centre-back defend the two-against-one?', scene: scene(), choices: [
        choice('delay-cover', 'Drop inside and delay the pass', 'Our centre-back drops inside, forcing the carrier wide. The six recovers into shape; Rival XI keep the ball but the clear chance is gone.', { x: 47, y: 53 }, undefined, outcome('m1-forced-wide', 'Rival XI are forced wide.', 'The recovery prevents a clear shot, although Rival XI keep possession.', 'positive', 'away')),
        choice('step', 'Step hard toward the carrier', 'The square pass releases the runner alone against the goalkeeper.', { x: 68, y: 62 }, 'm1-defend-gk'),
      ] },
      { id: 'm1-defend-gk', actor: 'Goalkeeper', actorLabel: 'GK', phase: 'Defending', trainingCourseId: 'goalkeeper', context: 'The runner is through and takes a long touch inside the box.', prompt: 'Can the goalkeeper rescue the opening play?', scene: scene(), choices: [
        choice('sweep', 'Explode forward and smother the touch', 'The goalkeeper reaches the loose touch first and prevents the shot.', { x: 29, y: 50 }, undefined, outcome('m1-save', 'Saved!', 'The goalkeeper rescues the team after the central turnover.', 'positive', 'home')),
        choice('hold-line', 'Stay on the line and set', 'The forward has the whole goal to aim at and finishes beyond the goalkeeper.', { x: 9, y: 50 }, undefined, m1RivalGoal),
      ] },
    ],
  },
  {
    id: 'stop-overload', minute: 27, name: 'Stop the Overload', phase: 'Defending', rootNodeId: 'm2-winger',
    introduction: 'Rival XI create a two-against-one down our left. Read the run before the cross arrives.',
    nodes: [
      { id: 'm2-winger', actor: 'Left winger', actorLabel: 'LW', phase: 'Defending', trainingCourseId: 'left-winger', context: 'Their right winger dribbles inside as the right-back overlaps.', prompt: 'Where should our winger recover?', scene: scene(), choices: [
        choice('track', 'Track the overlapping full-back', 'The recovery removes the free outside runner and lets our left-back protect inside.', { x: 45, y: 17 }, 'm2-lb'),
        choice('ball', 'Sprint straight at the ball', 'Both defenders are drawn inside and the overlap is released.', { x: 58, y: 42 }, 'm2-cross'),
        choice('stay', 'Stay high for the counter', 'Rival XI keep their two-against-one and reach crossing space.', { x: 66, y: 19 }, 'm2-cross'),
      ] },
      { id: 'm2-lb', actor: 'Left-back', actorLabel: 'LB', phase: 'Defending', trainingCourseId: 'full-back', context: 'The winger covers outside. The ball carrier now looks for the striker inside.', prompt: 'Where should the left-back move now?', scene: scene(), choices: [
        choice('inside', 'Narrow and block the central lane', 'The full-back and winger pass the runners cleanly and win the ball.', { x: 49, y: 34 }, undefined, outcome('m2-win', 'Overload solved.', 'Clear role-swapping turns a dangerous overload into our possession.', 'positive', 'home')),
        choice('follow', 'Follow the overlapping runner too', 'Both players chase the same runner, leaving the striker free inside.', { x: 42, y: 16 }, 'm2-cross'),
      ] },
      { id: 'm2-cross', actor: 'Left centre-back', actorLabel: 'CB', phase: 'Defending', trainingCourseId: 'centre-back', context: 'The cross is delivered with the striker goal-side.', prompt: 'How does the centre-back attack the delivery?', scene: scene(), choices: [
        choice('front', 'Get goal-side and attack the first contact', 'The defender meets the cross and clears the danger.', { x: 46, y: 43 }, undefined, outcome('m2-clear', 'Danger cleared.', 'The recovery was late, but the centre-back wins the decisive duel.', 'positive', 'away')),
        choice('watch', 'Watch the ball and hold position', 'The striker moves across the defender and heads into the corner.', { x: 58, y: 33 }, undefined, outcome('m2-rival-goal', 'Rival XI score.', 'Ball-watching leaves the runner free at the near post.', 'negative', 'home', 0, 1)),
      ] },
    ],
  },
  {
    id: 'create-chance', minute: 43, name: 'Create the Chance', phase: 'Attacking', rootNodeId: 'm3-eight',
    introduction: 'Rival XI sit narrow. Use the left side to move them before attacking the box.',
    nodes: [
      { id: 'm3-eight', actor: 'Left number eight', actorLabel: '8', phase: 'Attacking', trainingCourseId: 'left-midfielder', context: 'The eight receives between midfield and the left wing.', prompt: 'How should the eight start the attack?', scene: scene(), choices: [
        choice('winger', 'Feed the winger, then run beyond', 'The pass and run force two defenders toward the same side.', { x: 62, y: 24 }, 'm3-winger'),
        choice('carry', 'Carry through the centre', 'Three defenders compress the central lane and steal the ball.', { x: 61, y: 49 }, undefined, outcome('m3-lost', 'Possession lost.', 'The dribble attacks the strongest part of Rival XI’s shape.', 'negative', 'away')),
        choice('switch', 'Switch immediately to the far side', 'The ball travels safely, but Rival XI slide across before it arrives.', { x: 54, y: 83 }, undefined, outcome('m3-slow', 'Attack reset.', 'The team keeps possession without creating a clear chance.', 'neutral', 'home')),
      ] },
      { id: 'm3-winger', actor: 'Left winger', actorLabel: 'LW', phase: 'Attacking', trainingCourseId: 'left-winger', context: 'The overlapping eight drags the full-back outside. The striker pins both centre-backs.', prompt: 'What should the winger do next?', scene: scene(), choices: [
        choice('inside', 'Drive inside and cut back', 'The winger attacks the gap created by the run and finds the late arrival.', { x: 76, y: 36 }, 'm3-finish'),
        choice('overlap-pass', 'Pass down the line to the overlapping eight', 'Rival XI trap the receiver against the touchline.', { x: 71, y: 13 }, undefined, outcome('m3-trap', 'The chance disappears.', 'The obvious pass leads into the defender’s cover.', 'neutral', 'away')),
      ] },
      { id: 'm3-finish', actor: 'Right number eight', actorLabel: '8', phase: 'Attacking', trainingCourseId: 'right-midfielder', context: 'The cut-back reaches the edge of the box as defenders retreat toward goal.', prompt: 'How does the far eight finish the move?', scene: scene(), choices: [
        choice('arrive', 'Arrive late and guide it into the corner', 'Our right midfielder arrives as the winger cuts the ball back, then guides the first-time shot into the corner.', { x: 83, y: 60 }, undefined, outcome('m3-goal', 'GOAL — arrived at the perfect time!', 'The wide rotation creates the cut-back and the late runner finishes it.', 'positive', 'away', 1)),
        choice('early', 'Wait inside the box before the cross', 'A midfielder tracks the static target and blocks the shot.', { x: 78, y: 60 }, undefined, outcome('m3-block', 'Shot blocked.', 'Arriving too early makes the final runner easy to mark.', 'neutral', 'away')),
      ] },
    ],
  },
  {
    id: 'stop-counter', minute: 67, name: 'Stop the Counter', phase: 'Defending', rootNodeId: 'm4-six',
    introduction: 'Our attack breaks down with both full-backs high. Rival XI counter through the centre.',
    nodes: [
      { id: 'm4-six', actor: 'Defensive midfielder', actorLabel: '6', phase: 'Transition', trainingCourseId: 'defensive-midfielder', context: 'The ball carrier has runners on both sides and space ahead.', prompt: 'How should the six approach the carrier?', scene: scene(), choices: [
        choice('delay', 'Screen the central pass and delay', 'The recovery run slows the carrier without opening a passing lane.', { x: 51, y: 48 }, 'm4-cb'),
        choice('tackle', 'Step forward to tackle the carrier', 'The carrier touches it around the challenge and attacks an exposed defence.', { x: 64, y: 43 }, 'm4-gk'),
        choice('retreat', 'Sprint back toward the penalty spot', 'Retreating without pressure gives the carrier time to release the runner.', { x: 43, y: 51 }, 'm4-gk'),
      ] },
      { id: 'm4-cb', actor: 'Right centre-back', actorLabel: 'CB', phase: 'Defending', trainingCourseId: 'right-centre-back', context: 'Our six has slowed the carrier. Their outside runner continues beyond our centre-back toward the right channel.', prompt: 'How does the centre-back protect the space behind?', scene: scene(), choices: [
        choice('drop', 'Drop diagonally and show play outside', 'The defender protects goal while the six recovers beside them.', { x: 43, y: 61 }, undefined, outcome('m4-stopped', 'Counter stopped.', 'Delay and cover restore the defensive shape without needing a tackle.', 'positive', 'home')),
        choice('step', 'Step out to win the ball', 'The runner attacks the space behind and receives in stride.', { x: 65, y: 59 }, 'm4-gk'),
      ] },
      { id: 'm4-gk', actor: 'Goalkeeper', actorLabel: 'GK', phase: 'Defending', trainingCourseId: 'goalkeeper', context: 'The through ball releases a forward beyond the back line.', prompt: 'Where should the goalkeeper meet the danger?', scene: scene(), choices: [
        choice('sweep', 'Start high and sweep outside the box', 'Our goalkeeper reaches the through ball outside the box and clears toward the right touchline. The immediate threat is over; the ball is still loose.', { x: 30, y: 50 }, undefined, outcome('m4-swept', 'Swept clear.', 'Starting position prevents the shot. The clearance is still being contested.', 'positive', 'neutral')),
        choice('line', 'Retreat onto the goal line', 'The forward controls freely and finishes the one-against-one.', { x: 8, y: 50 }, undefined, outcome('m4-rival-goal', 'Rival XI score.', 'Waiting on the line gives the runner the decisive first touch.', 'negative', 'home', 0, 1)),
      ] },
    ],
  },
  {
    id: 'one-last-attack', minute: 86, name: 'One Last Attack', phase: 'Attacking', rootNodeId: 'm5-ten',
    introduction: 'One last attack. Rival XI protect the middle and hold a high line.',
    nodes: [
      { id: 'm5-ten', actor: 'Attacking midfielder', actorLabel: '10', phase: 'Attacking', trainingCourseId: 'right-midfielder', context: 'The ten turns between the lines. The striker checks short and the right winger stays wide.', prompt: 'Where should the eight send the next pass?', scene: scene(), choices: [
        choice('feet', 'Play into the striker’s feet and continue the run', 'Our eight passes into the striker’s feet and runs beyond. A centre-back follows the striker, leaving a gap for that run.', { x: 69, y: 50 }, 'm5-striker'),
        choice('through', 'Force the first through ball', 'The striker has not begun the run and is caught offside.', { x: 84, y: 50 }, undefined, outcome('m5-offside', 'Offside.', 'The idea arrives before the movement creates the lane.', 'negative', 'away')),
        choice('switch', 'Take a touch and switch to the winger', 'Rival XI slide across and protect the box.', { x: 65, y: 86 }, undefined, outcome('m5-retain', 'Possession retained.', 'The safe switch keeps the ball but uses the remaining time without a chance.', 'neutral', 'home')),
      ] },
      { id: 'm5-striker', actor: 'Striker', actorLabel: '9', phase: 'Attacking', trainingCourseId: 'striker', context: 'The centre-back follows the striker away from goal. The ten runs beyond.', prompt: 'How does the striker release the runner?', scene: scene(), choices: [
        choice('set', 'Set the ball first time around the corner', 'The one-touch layoff sends the ten through the gap before it closes.', { x: 72, y: 44 }, 'm5-finish'),
        choice('turn', 'Try to turn the centre-back', 'The defender uses contact to slow the turn and wins the ball.', { x: 73, y: 50 }, undefined, outcome('m5-lost', 'Possession lost.', 'The extra touches allow Rival XI to collapse around the ball.', 'negative', 'away')),
      ] },
      { id: 'm5-finish', actor: 'Attacking midfielder', actorLabel: '10', phase: 'Attacking', trainingCourseId: 'right-midfielder', context: 'The ten enters the box. The goalkeeper narrows the angle and the far winger arrives unmarked.', prompt: 'What is the final decision?', scene: scene(), choices: [
        choice('square', 'Square it for the far-post finish', 'The pass takes the goalkeeper out and gives the winger an open goal.', { x: 85, y: 72 }, undefined, outcome('m5-goal', 'GOAL — the extra pass wins it!', 'Patience in the final action creates the clearest possible finish.', 'positive', 'away', 1)),
        choice('shoot', 'Shoot from the tight angle', 'The goalkeeper blocks with their feet and Rival XI clear.', { x: 88, y: 48 }, undefined, outcome('m5-save', 'Saved.', 'The shot ignores the unmarked teammate beyond the goalkeeper.', 'neutral', 'away')),
      ] },
    ],
  },
]);

export function getMatchMoment(momentIndex: number, moments = matchMoments) {
  return moments[momentIndex];
}

export function getDecisionNode(moment: MatchMoment, nodeId: string) {
  return moment.nodes.find((node) => node.id === nodeId);
}

export function createMatchRun(moments = matchMoments): MatchRun {
  return { momentIndex: 0, nodeId: moments[0].rootNodeId, homeScore: 0, awayScore: 0, possession: moments[0].phase === 'Attacking' ? 'home' : 'away', status: 'active', decisions: [], results: [] };
}

export function chooseMatchOption(run: MatchRun, momentId: string, nodeId: string, choiceId: string, moments = matchMoments): MatchRun {
  if (run.status !== 'active') throw new Error('The match has finished.');
  if (run.pending) throw new Error('The current decision is already locked.');
  const moment = moments[run.momentIndex];
  if (!moment || moment.id !== momentId) throw new Error(`Out-of-order moment: ${momentId}`);
  if (run.nodeId !== nodeId) throw new Error(`Stale decision node: ${nodeId}`);
  const node = getDecisionNode(moment, nodeId);
  if (!node) throw new Error(`Unknown decision node: ${nodeId}`);
  const selected = node.choices.find((item) => item.id === choiceId);
  if (!selected) throw new Error(`Unknown match choice: ${choiceId}`);
  const tone = matchChoiceTone(node, selected);
  return {
    ...run,
    decisions: [...run.decisions, { momentId, nodeId, choiceId, actor: node.actor, label: selected.label, feedback: selected.feedback, tone, ...(selected.booking ? {booking:selected.booking} : {}) }],
    pending: { momentId, nodeId, choiceId, nextNodeId: selected.nextNodeId, outcome: selected.outcome },
  };
}

export function continueMatch(run: MatchRun, moments = matchMoments): MatchRun {
  if (!run.pending) throw new Error('Choose an option before continuing.');
  const moment = moments[run.momentIndex];
  const pending = run.pending;
  if (pending.nextNodeId) {
    const next = getDecisionNode(moment, pending.nextNodeId);
    if (!next) throw new Error(`Broken match transition: ${pending.nextNodeId}`);
    return { ...run, nodeId: next.id, possession: next.phase === 'Defending' || next.phase === 'Transition' ? 'away' : 'home', pending: undefined };
  }
  if (!pending.outcome) throw new Error('A terminal choice requires an outcome.');
  const momentDecisions = run.decisions.filter((decision) => decision.momentId === moment.id);
  const result: MatchMomentResult = { momentId: moment.id, name: moment.name, minute: moment.minute, outcome: pending.outcome, decisions: momentDecisions };
  const homeScore = run.homeScore + pending.outcome.homeGoals;
  const awayScore = run.awayScore + pending.outcome.awayGoals;
  const nextIndex = run.momentIndex + 1;
  if (nextIndex >= moments.length) {
    return { ...run, homeScore, awayScore, possession: pending.outcome.possession, results: [...run.results, result], status: 'final', pending: undefined };
  }
  return { ...run, momentIndex: nextIndex, nodeId: moments[nextIndex].rootNodeId, homeScore, awayScore, possession: moments[nextIndex].phase === 'Attacking' ? 'home' : 'away', results: [...run.results, result], pending: undefined };
}

export function createMomentReview(completed: MatchRun, index: number, moments = matchMoments): MatchRun {
  if (completed.status !== 'final' || !moments[index]) throw new Error('Complete the match before reviewing a valid moment.');
  return { ...createMatchRun(moments), momentIndex: index, nodeId: moments[index].rootNodeId, possession: moments[index].phase === 'Attacking' ? 'home' : 'away' };
}

export function validateMatchMoments(moments: MatchMoment[] = matchMoments) {
  const momentIds = new Set<string>();
  for (const moment of moments) {
    if (momentIds.has(moment.id)) throw new Error(`Duplicate match moment: ${moment.id}`);
    momentIds.add(moment.id);
    const nodeIds = new Set(moment.nodes.map((node) => node.id));
    if (nodeIds.size !== moment.nodes.length || !nodeIds.has(moment.rootNodeId)) throw new Error(`Invalid node IDs in ${moment.id}`);
    const reachable = new Set<string>();
    const visiting = new Set<string>();
    const walk = (nodeId: string) => {
      if (visiting.has(nodeId)) throw new Error(`Cycle detected in ${moment.id}`);
      if (reachable.has(nodeId)) return;
      const node = moment.nodes.find((item) => item.id === nodeId);
      if (!node) throw new Error(`Missing node ${nodeId}`);
      reachable.add(nodeId);
      visiting.add(nodeId);
      if (node.choices.length < 2 || node.choices.length > 4) throw new Error(`Invalid choice count in ${node.id}`);
      if (new Set(node.choices.map((item) => item.id)).size !== node.choices.length) throw new Error(`Duplicate choice in ${node.id}`);
      for (const point of [node.scene.ball, ...node.scene.players, ...node.choices.flatMap((item) => [...item.movement.map((move) => move.to), ...(item.ballTo ? [item.ballTo] : [])])]) {
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100) throw new Error(`Invalid coordinate in ${node.id}`);
      }
      for (const item of node.choices) {
        if (!item.label.trim() || !item.feedback.trim()) throw new Error(`Missing choice copy in ${node.id}`);
        for (const point of [...(item.ballPath ?? []), ...item.movement.flatMap(move => move.via ?? [])]) {
          if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100) throw new Error(`Invalid route coordinate in ${node.id}`);
        }
        if (item.outcome && (![item.outcome.homeGoals,item.outcome.awayGoals].every(score => Number.isInteger(score) && score >= 0 && score <= 1) || item.outcome.homeGoals + item.outcome.awayGoals > 1 || !item.outcome.recap.trim())) throw new Error(`Invalid outcome in ${node.id}`);
        if (Boolean(item.nextNodeId) === Boolean(item.outcome)) throw new Error(`Choice ${item.id} must have exactly one transition`);
        if (item.nextNodeId) walk(item.nextNodeId);
      }
      visiting.delete(nodeId);
    };
    walk(moment.rootNodeId);
    if (reachable.size !== moment.nodes.length) throw new Error(`Unreachable node in ${moment.id}`);
  }
  return true;
}
