import type { MatchFixture } from './match-fixtures';
import { renameOpponentText, type TeamIdentity } from './teams.ts';

// Cup draws change the opponent, not the authored tactical geometry or IDs.
export function tournamentFixture(
  fixture: MatchFixture,
  opponent: string,
  home?: TeamIdentity,
): MatchFixture {
  const original = fixture.opponent;
  const text = (value: string) => renameOpponentText(value, original, opponent, home);
  return {
    ...fixture,
    opponent,
    description: text(fixture.description),
    moments: fixture.moments.map((moment) => ({
      ...moment,
      name: text(moment.name),
      introduction: text(moment.introduction),
      nodes: moment.nodes.map((node) => ({
        ...node,
        prompt: text(node.prompt),
        context: text(node.context),
        choices: node.choices.map((choice) => ({
          ...choice,
          label: text(choice.label),
          feedback: text(choice.feedback),
          outcome: choice.outcome
            ? {
                ...choice.outcome,
                headline: text(choice.outcome.headline),
                recap: text(choice.outcome.recap),
              }
            : undefined,
        })),
      })),
    })),
  };
}
