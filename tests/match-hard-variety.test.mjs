import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hardVarietyFixtures } from '../lib/match-hard-variety.ts';
import { generatedArt } from '../lib/generated-art.ts';
import { chooseMatchOption, continueMatch, createMatchRun, validateMatchMoments } from '../lib/match-day.ts';

test('hard replacements preserve their fixture and moment identities and three-read ideal routes', () => {
  assert.deepEqual(hardVarietyFixtures.map(f => f.id), ['bait-traps', 'breakers-transition', 'compass-rhythm']);
  for (const [index, fixture] of hardVarietyFixtures.entries()) {
    assert.equal(fixture.difficulty, 'Hard');
    assert.deepEqual(fixture.moments.map(m => m.id), Array.from({length: 5}, (_, i) => `${fixture.id}-${i + 1}`));
    assert.deepEqual(fixture.moments.map(m => m.minute), [8, 26, 43, 66, 87]);
    assert.equal(validateMatchMoments(fixture.moments), true);
    let run = createMatchRun(fixture.moments);
    while (run.status !== 'final') {
      const moment = fixture.moments[run.momentIndex];
      const node = moment.nodes.find(n => n.id === run.nodeId);
      const choice = node.choices.find(c => c.tone === 'positive');
      run = continueMatch(chooseMatchOption(run, moment.id, node.id, choice.id, fixture.moments), fixture.moments);
    }
    assert.ok(run.results.every(r => r.decisions.length === 3), fixture.id);
    assert.equal(run.homeScore, index === 2 ? 3 : 2, fixture.id);
    assert.equal(run.awayScore, 0, fixture.id);
  }
});

test('hard scenes keep every contact, player identity and possession continuous across every branch', () => {
  for (const fixture of hardVarietyFixtures) for (const moment of fixture.moments) {
    const reached = new Set();
    function visit(id, ancestors = new Set()) {
      assert.ok(!ancestors.has(id), `${id}: no cycles`);
      const node = moment.nodes.find(n => n.id === id);
      assert.ok(node, id);
      reached.add(id);
      const followingAncestors = new Set([...ancestors, id]);
      assert.equal(node.scene.players.length, 22, id);
      assert.equal(new Set(node.scene.players.map(p => p.id)).size, 22, id);
      assert.equal(node.scene.players.filter(p => p.active).length, 1, id);
      assert.equal(node.choices.length, 4, id);
      assert.equal(node.choices.filter(c => c.tone === 'positive').length, 1, id);
      for (const choice of node.choices) {
        const key = `${id}/${choice.id}`;
        assert.ok(generatedArt[choice.artId], `${key}: illustration exists`);
        assert.ok(choice.ballPath.length, key);
        const after = node.scene.players.map(p => ({...p, ...choice.movement.find(m => m.playerId === p.id)?.to}));
        for (const p of [...after, ...choice.ballPath]) assert.ok(p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100, key);
        assert.deepEqual(choice.ballPath.at(-1), choice.ballTo, key);
        const contactPath = choice.outcome?.homeGoals || choice.outcome?.awayGoals ? choice.ballPath.slice(0, -1) : choice.ballPath;
        for (const contact of contactPath) assert.ok(after.some(p => p.x === contact.x && p.y === contact.y), `${key}: player at each authored contact`);
        if (choice.nextNodeId) {
          const next = moment.nodes.find(n => n.id === choice.nextNodeId);
          assert.deepEqual(next.scene.ball, choice.ballTo, key);
          for (const p of after) {
            const nextPlayer = next.scene.players.find(other => other.id === p.id);
            assert.deepEqual([nextPlayer.x, nextPlayer.y, nextPlayer.label], [p.x, p.y, p.label], key);
          }
          visit(choice.nextNodeId, followingAncestors);
        } else {
          assert.ok(choice.outcome, key);
          if (choice.outcome.homeGoals) assert.deepEqual(choice.ballTo, {x: 100, y: 50}, key);
          else if (choice.outcome.awayGoals) assert.deepEqual(choice.ballTo, {x: 0, y: 50}, key);
          else {
            const onBall = after.filter(p => p.x === choice.ballTo.x && p.y === choice.ballTo.y);
            const team = choice.outcome.possession === 'home' ? 'home' : 'away';
            assert.ok(onBall.some(p => p.team === team), `${key}: terminal possession`);
          }
        }
      }
    }
    visit(moment.rootNodeId);
    assert.equal(reached.size, moment.nodes.length, `${moment.id}: every node reachable`);
  }
});

test('hard replacements each describe a distinct tactical picture', () => {
  const contexts = new Set();
  for (const fixture of hardVarietyFixtures)
    for (const node of fixture.moments.flatMap(m => m.nodes)) {
      assert.ok(!contexts.has(node.context), `${node.id}: a distinct tactical picture`);
      contexts.add(node.context);
    }
});

test('every replacement branch completes without a repeated score award', () => {
  for (const fixture of hardVarietyFixtures) for (const moment of fixture.moments) {
    const moments = [moment];
    function visit(run) {
      if (run.status === 'final') return;
      const node = moment.nodes.find(n => n.id === run.nodeId);
      for (const choice of node.choices) {
        const locked = chooseMatchOption(run, moment.id, node.id, choice.id, moments);
        assert.equal(locked.homeScore + locked.awayScore, 0, node.id);
        const lockedSnapshot = structuredClone(locked);
        assert.throws(() => chooseMatchOption(locked, moment.id, node.id, choice.id, moments), /already locked/);
        assert.deepEqual(locked, lockedSnapshot);
        const next = continueMatch(locked, moments);
        if (choice.outcome) {
          assert.equal(next.homeScore, choice.outcome.homeGoals);
          assert.equal(next.awayScore, choice.outcome.awayGoals);
          const finalSnapshot = structuredClone(next);
          assert.throws(() => continueMatch(next, moments), /Choose an option/);
          assert.deepEqual(next, finalSnapshot);
        }
        visit(next);
      }
    }
    visit(createMatchRun(moments));
  }
});
