import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchFixtures } from '../lib/match-fixtures.ts';
import { orderedMatchChoices } from '../lib/match-choice-order.ts';
import { matchChoiceTone } from '../lib/match-feedback.ts';

test('match options describe actions without explicit verdicts or giveaway adjectives', () => {
  for (const fixture of matchFixtures)
    for (const moment of fixture.moments)
      for (const node of moment.nodes)
        for (const choice of node.choices) {
          assert.doesNotMatch(
            choice.label,
            /\b(blindly|unchallenged|hesitate|marked|crowded|free|lunge|force|slowly)\b/i,
            node.id,
          );
          assert.ok(choice.label.split(/\s+/).length <= 13, node.id);
        }
});

test('visible choice order is stable, non-mutating, and does not always put the best action first', () => {
  for (const fixture of matchFixtures) {
    const positions = new Set();
    for (const moment of fixture.moments)
      for (const node of moment.nodes) {
        const before = node.choices.map((c) => c.id);
        const ordered = orderedMatchChoices(node);
        assert.deepEqual(ordered, orderedMatchChoices(node));
        assert.deepEqual(
          node.choices.map((c) => c.id),
          before,
        );
        assert.deepEqual(ordered.map((c) => c.id).sort(), [...before].sort());
        positions.add(
          ordered.findIndex((c) => matchChoiceTone(node, c) === 'positive'),
        );
      }
    assert.ok(positions.has(0) && positions.has(1), fixture.name);
  }
});

test('match decisions are a fair challenge: four options, one best, no position or length clues', () => {
  for (const fixture of matchFixtures) {
    const nodes = fixture.moments.flatMap((moment) => moment.nodes);
    const slots = [0, 0, 0, 0];
    let longest = 0;
    let shortest = 0;
    for (const node of nodes) {
      assert.equal(node.choices.length, 4, `${node.id}: four playable options`);
      const ordered = orderedMatchChoices(node);
      assert.equal(
        new Set(ordered.map((c) => c.label)).size,
        ordered.length,
        node.id,
      );
      const best = ordered.filter(
        (c) => matchChoiceTone(node, c) === 'positive',
      );
      assert.equal(best.length, 1, `${node.id}: exactly one best option`);
      slots[ordered.indexOf(best[0])]++;
      const others = ordered
        .filter((c) => c !== best[0])
        .map((c) => c.label.length);
      if (best[0].label.length > Math.max(...others)) longest++;
      if (best[0].label.length < Math.min(...others)) shortest++;
    }
    for (const count of slots)
      assert.ok(
        count <= Math.ceil(nodes.length / 4) + 1,
        `${fixture.name}: best option slots ${slots.join(',')}`,
      );
    assert.ok(
      longest / nodes.length <= 0.35,
      `${fixture.name}: best option is the longest in ${longest}/${nodes.length}`,
    );
    assert.ok(
      shortest / nodes.length <= 0.35,
      `${fixture.name}: best option is the shortest in ${shortest}/${nodes.length}`,
    );
  }
});

test('every goal in a fixture has its own headline', () => {
  for (const fixture of matchFixtures) {
    const headlines = fixture.moments.flatMap((moment) =>
      moment.nodes.flatMap((node) => node.choices.filter((c) => c.outcome?.homeGoals).map((c) => c.outcome.headline)),
    );
    assert.equal(new Set(headlines).size, headlines.length, fixture.name);
  }
});
