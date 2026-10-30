import type { DecisionNode, MatchChoice, MatchTone } from './match-day';

// Legacy non-terminal decisions also need a verdict; do not infer it from the next player's role.
const adverse = new Set([
  'm1-gk/force-six',
  'm1-six/turn',
  'm1-defend-six/dive',
  'm1-defend-six/chase-ball',
  'm1-defend-cb/step',
  'm2-winger/ball',
  'm2-winger/stay',
  'm2-lb/follow',
  'm4-six/tackle',
  'm4-six/retreat',
  'm4-cb/step',
]);
export function matchChoiceTone(
  node: DecisionNode,
  choice: MatchChoice,
): MatchTone {
  return (
    choice.tone ??
    choice.outcome?.tone ??
    (adverse.has(`${node.id}/${choice.id}`) ? 'negative' : 'positive')
  );
}
export function matchChoiceSignal(node: DecisionNode, choice: MatchChoice) {
  const tone = matchChoiceTone(node, choice);
  const label = choice.outcome?.homeGoals
    ? 'Chance converted'
    : choice.outcome?.awayGoals
      ? 'Defence breached'
      : tone === 'neutral'
        ? 'Play reset'
        : tone === 'negative'
          ? node.phase === 'Attacking'
            ? 'Advantage lost'
            : 'Danger grows'
          : node.phase === 'Attacking'
            ? 'Opening found'
            : 'Danger contained';
  return { tone, label };
}
