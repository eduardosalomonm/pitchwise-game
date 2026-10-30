import type { DecisionNode, MatchMoment } from './match-day';
import { matchChoiceTone } from './match-feedback.ts';

const hash = (text: string) =>
  Array.from(text).reduce(
    (value, char) => (value * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
const permutations = [
  [2, 0, 3, 1],
  [1, 3, 0, 2],
  [3, 1, 2, 0],
  [0, 2, 1, 3],
];

// Stable across rerenders and review; option position must not reveal the verdict.
export function orderedMatchChoices(node: DecisionNode) {
  if (node.choiceOrder)
    return node.choiceOrder.map((id) =>
      node.choices.find((choice) => choice.id === id)!,
    );
  const offset = hash(node.id) % node.choices.length;
  return [...node.choices.slice(offset), ...node.choices.slice(0, offset)];
}

// Spread the best option evenly across A–D within a fixture, so position is never a clue.
// A salt (My Tournament) reshuffles positions per tournament while staying stable within it.
export function balanceChoiceOrder(moments: MatchMoment[], salt = ''): MatchMoment[] {
  const nodes = moments.flatMap((moment) => moment.nodes);
  const slotFor = new Map(
    nodes.map((node, index) => {
      const group = nodes[index - (index % 4)].id;
      return [
        node.id,
        permutations[hash(group + salt) % permutations.length][index % 4],
      ];
    }),
  );
  return moments.map((moment) => ({
    ...moment,
    nodes: moment.nodes.map((node) => {
      const best = node.choices.find(
        (choice) => matchChoiceTone(node, choice) === 'positive',
      );
      if (!best) return node;
      let others = orderedMatchChoices(node).filter(
        (choice) => choice !== best,
      );
      if (salt && others.length) {
        const offset = hash(node.id + salt) % others.length;
        others = [...others.slice(offset), ...others.slice(0, offset)];
      }
      const slot = slotFor.get(node.id)! % node.choices.length;
      others.splice(slot, 0, best);
      return { ...node, choiceOrder: others.map((choice) => choice.id) };
    }),
  }));
}
