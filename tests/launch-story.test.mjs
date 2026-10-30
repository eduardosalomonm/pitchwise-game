import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchFixtures } from '../lib/match-fixtures.ts';
import { courses } from '../lib/scenarios.ts';
import { choiceHandoff, visiblePossession, previousPlay } from '../lib/match-narrative.ts';
import { chooseMatchOption, continueMatch, createMatchRun } from '../lib/match-day.ts';

const moments = matchFixtures.flatMap(f => f.moments);
test('every reveal hands possession to the same team as continuation, without scoring early', () => {
  for (const moment of moments) for (const node of moment.nodes) for (const choice of node.choices) {
    const run = { ...createMatchRun([moment]), nodeId: node.id, possession: node.phase === 'Attacking' ? 'home' : 'away' };
    const locked = chooseMatchOption(run, moment.id, node.id, choice.id, [moment]);
    const after = continueMatch(locked, [moment]);
    const handoff = choiceHandoff(moment, node, choice);
    assert.equal(visiblePossession(locked, [moment], false), run.possession);
    assert.equal(visiblePossession(locked, [moment], true), after.possession);
    assert.equal(handoff.possession, after.possession);
    assert.equal(locked.homeScore + locked.awayScore, 0);
    if (choice.nextNodeId) {
      assert.equal(previousPlay(after, moment).feedback, choice.feedback);
      assert.equal(handoff.nextActor, moment.nodes.find(n => n.id === choice.nextNodeId).actor);
    }
  }
});
test('counterattack goal animations show the scoring contact before the ball reaches goal', () => {
  for (const moment of moments) for (const node of moment.nodes.filter(n => n.id.endsWith('-recover')))
    for (const choice of node.choices.filter(c => c.outcome?.awayGoals)) {
      assert.ok(choice.ballPath.length >= 2, node.id);
      const contact = choice.ballPath.at(-2);
      assert.ok(choice.movement.some(m => m.playerId.startsWith('a-') && m.to.x === contact.x && m.to.y === contact.y), node.id);
    }
});
test('the wide trap starts without our possession and the regain changes it', () => {
  const moment = moments.find(m => m.id === 'direct-press');
  let run = createMatchRun([moment]);
  assert.equal(run.possession, 'away');
  run = continueMatch(chooseMatchOption(run, moment.id, run.nodeId, 'build', [moment]), [moment]);
  assert.equal(run.possession, 'home');
});
test('defensive clearances and an abandoned press do not award us possession', () => {
  for (const id of ['block-rebound', 'block-cross', 'direct-duel', 'direct-cover', 'direct-press']) {
    const moment = moments.find(m => m.id === id);
    const run = createMatchRun([moment]);
    const result = continueMatch(chooseMatchOption(run, id, run.nodeId, 'reset', [moment]), [moment]);
    assert.equal(result.possession, 'away', id);
  }
});
test('watching cues are unique and touchline notes remain specific and concise', () => {
  const lessons = courses.flatMap(c => c.scenarios);
  assert.equal(new Set(lessons.map(s => s.reveal.watchFor)).size, lessons.length);
  for (const s of lessons) {
    assert.doesNotMatch(s.reveal.touchline, /starts with the read/i);
    assert.ok(s.reveal.touchline.split(/\s+/).length <= 24, s.id);
  }
});
