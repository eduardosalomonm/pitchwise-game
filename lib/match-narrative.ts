import type {
  MatchChoice,
  MatchMoment,
  MatchPossession,
  MatchRun,
  DecisionNode,
} from './match-day';

export function phasePossession(node: DecisionNode): MatchPossession {
  return node.phase === 'Attacking' ? 'home' : 'away';
}

export function choiceHandoff(
  moment: MatchMoment,
  node: DecisionNode,
  choice: MatchChoice,
) {
  const next = moment.nodes.find((item) => item.id === choice.nextNodeId);
  const possession = next
    ? phasePossession(next)
    : (choice.outcome?.possession ?? phasePossession(node));
  const changed = possession !== phasePossession(node);
  const label = choice.outcome?.homeGoals
    ? 'Goal for Our XI · Rival XI restart'
    : choice.outcome?.awayGoals
      ? 'Goal for Rival XI · Our XI restart'
      : possession === 'neutral'
        ? 'Ball loose · neither side in control'
        : changed
          ? possession === 'home'
            ? 'Ball won · Our XI take over'
            : 'Possession lost · Rival XI take over'
          : possession === 'home'
            ? 'Our XI keep the ball'
            : 'Rival XI keep the ball';
  return { possession, label, nextActor: next?.actor, changed };
}

export function visiblePossession(
  run: MatchRun,
  moments: MatchMoment[],
  revealReady: boolean,
) {
  if (!revealReady || !run.pending) return run.possession;
  const moment = moments[run.momentIndex];
  const node = moment.nodes.find((item) => item.id === run.nodeId);
  const choice = node?.choices.find(
    (item) => item.id === run.pending?.choiceId,
  );
  return node && choice
    ? choiceHandoff(moment, node, choice).possession
    : run.possession;
}

export function previousPlay(run: MatchRun, moment: MatchMoment) {
  // Keep the cause of a turnover visible on the following decision, not just in the dismissed reveal.
  return run.decisions
    .filter((item) => item.momentId === moment.id && item.nodeId !== run.nodeId)
    .at(-1);
}

export function possessionNotice(
  run: MatchRun,
  moment: MatchMoment,
  ready: boolean,
): string | undefined {
  const node = moment.nodes.find((n) => n.id === run.nodeId);
  if (!node) return;
  if (run.pending) {
    if (!ready) return;
    const choice = node.choices.find((c) => c.id === run.pending!.choiceId);
    if (!choice) return;
    if (choice.outcome?.homeGoals) return 'Goal! Rival kick-off next.';
    if (choice.outcome?.awayGoals) return 'Goal conceded. Our kick-off next.';
    const next = choiceHandoff(moment, node, choice);
    if (!next.changed) return;
    return next.possession === 'home'
      ? 'Ball won — we attack now.'
      : next.possession === 'away'
        ? 'Ball lost — we defend now.'
        : 'Ball loose — possession is contested.';
  }
  const previous = previousPlay(run, moment);
  const before = moment.nodes.find((n) => n.id === previous?.nodeId);
  if (!before || phasePossession(before) === phasePossession(node)) return;
  return phasePossession(node) === 'home'
    ? 'Ball won — we attack now.'
    : 'Ball lost — we defend now.';
}
