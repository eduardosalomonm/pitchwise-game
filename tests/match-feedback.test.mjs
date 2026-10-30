import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchFixtures } from '../lib/match-fixtures.ts';
import { matchChoiceSignal, matchChoiceTone } from '../lib/match-feedback.ts';
import { chooseMatchOption, createMatchRun } from '../lib/match-day.ts';

test('every match decision has an immediate, non-category feedback signal', () => {
  for (const fixture of matchFixtures)
    for (const moment of fixture.moments)
      for (const node of moment.nodes)
        for (const choice of node.choices) {
          const signal = matchChoiceSignal(node, choice);
          assert.ok(['positive', 'neutral', 'negative'].includes(signal.tone));
          assert.ok(signal.label.length > 0);
          assert.ok(
            !['good', 'bad', 'neutral'].includes(signal.label.toLowerCase()),
          );
          const run = {
            ...createMatchRun(fixture.moments),
            momentIndex: fixture.moments.indexOf(moment),
            nodeId: node.id,
          };
          assert.equal(
            chooseMatchOption(
              run,
              moment.id,
              node.id,
              choice.id,
              fixture.moments,
            ).decisions[0].tone,
            signal.tone,
          );
        }
});
test('non-terminal defensive mistakes are not praised just because the match continues', () => {
  const moment = matchFixtures[0].moments[1];
  const node = moment.nodes.find((n) => n.id === 'm2-winger');
  assert.equal(
    matchChoiceTone(
      node,
      node.choices.find((c) => c.id === 'ball'),
    ),
    'negative',
  );
  assert.equal(
    matchChoiceTone(
      node,
      node.choices.find((c) => c.id === 'track'),
    ),
    'positive',
  );
});
