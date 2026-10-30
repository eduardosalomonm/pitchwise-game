import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstMatchMoments } from '../lib/first-match.ts';
import { easyLeaguePlays } from '../lib/league-easy-plays.ts';
import {
  createMatchRun,
  chooseMatchOption,
  continueMatch,
  validateMatchMoments,
} from '../lib/match-day.ts';

test('the friendly starts with two actions and preserves audited routes and the league catalogue', () => {
  assert.equal(validateMatchMoments(firstMatchMoments), true);
  assert.deepEqual(
    firstMatchMoments.map((m) => m.phase),
    ['Attacking', 'Defending'],
  );
  assert.equal(firstMatchMoments[0].nodes[0].choices.length, 2);
  for (const moment of firstMatchMoments) {
    const source = easyLeaguePlays.find(
      (p) => p.moment.id === moment.id,
    ).moment;
    for (const node of moment.nodes) {
      const original = source.nodes.find((n) => n.id === node.id);
      assert.equal(original.choices.length, 3);
      assert.deepEqual(
        {
          ...node.scene,
          players: node.scene.players.map(({ facing: _facing, ...player }) => player),
        },
        original.scene,
      );
      for (const player of node.scene.players.filter((p) => p.facing)) {
        assert.ok(player.active);
        assert.deepEqual(player.facing, { x: 100, y: player.y });
      }
      for (const choice of node.choices) {
        const { label, feedback, ...route } = choice;
        const {
          label: _originalLabel,
          feedback: _originalFeedback,
          ...sourceRoute
        } = original.choices.find((c) => c.id === choice.id);
        assert.deepEqual(route, sourceRoute);
        assert.ok(label.length && feedback.length);
      }
    }
  }
  assert.equal(
    easyLeaguePlays[0].moment.nodes[0].choices[0].label,
    'Pass beside the press',
  );
});

test('every friendly route finishes in at most four decisions, including mistakes, with honest results', () => {
  const endings = new Set();
  function walk(run, depth = 0) {
    assert.ok(depth <= 4, 'the guide stays short');
    if (run.status === 'final') {
      assert.equal(run.results.length, 2);
      endings.add(Math.sign(run.homeScore - run.awayScore));
      return;
    }
    const moment = firstMatchMoments[run.momentIndex];
    const node = moment.nodes.find((n) => n.id === run.nodeId);
    for (const choice of node.choices) {
      const selected = chooseMatchOption(
        run,
        moment.id,
        node.id,
        choice.id,
        firstMatchMoments,
      );
      assert.deepEqual(
        [selected.homeScore, selected.awayScore],
        [run.homeScore, run.awayScore],
      );
      assert.throws(() =>
        chooseMatchOption(
          selected,
          moment.id,
          node.id,
          choice.id,
          firstMatchMoments,
        ),
      );
      walk(continueMatch(selected, firstMatchMoments), depth + 1);
    }
  }
  walk(createMatchRun(firstMatchMoments));
  assert.deepEqual([...endings].sort((a, b) => a - b), [-1, 0, 1]);
});
