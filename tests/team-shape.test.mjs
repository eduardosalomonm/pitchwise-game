import assert from 'node:assert/strict';
import { test } from 'node:test';
import { courses } from '../lib/scenarios.ts';
import { matchMoments } from '../lib/match-day.ts';
import { completeTeamShape, teamMovements } from '../lib/team-shape.ts';

test('every training and match scene has eleven players per side and two keepers', () => {
  const scenes = [...courses.flatMap(course => course.scenarios), ...matchMoments.flatMap(moment => moment.nodes.map(node => node.scene))];
  for (const scene of scenes) {
    const players = completeTeamShape(scene.players, scene.ball);
    assert.equal(players.length, 22);
    assert.equal(new Set(players.map(player => player.id)).size, 22);
    for (const team of ['home', 'away']) {
      assert.equal(players.filter(player => player.team === team).length, 11);
      assert.equal(players.filter(player => player.team === team && player.label === 'GK').length, 1);
    }
    for (const player of scene.players) {const rendered=players.find(item => item.id === player.id);assert.deepEqual([rendered.x,rendered.y,rendered.team],[player.x,player.y,player.team]);}
  }
});

test('coordinated movement preserves authored actions and keeps support on the pitch', () => {
  for (const scenario of courses.flatMap(course => course.scenarios)) {
    const players = completeTeamShape(scenario.players, scenario.ball);
    const moves = teamMovements(players, scenario.reveal.movements, scenario.ball, scenario.reveal.ballTo, scenario.mode === 'Defending');
    for (const move of scenario.reveal.movements) assert.deepEqual(moves.find(item => item.playerId === move.playerId), move);
    assert.equal(moves.length, scenario.reveal.movements.length);
    assert.equal(new Set(moves.map(move => move.playerId)).size, moves.length);
    assert.ok(moves.every(move => move.to.x >= 0 && move.to.x <= 100 && move.to.y >= 0 && move.to.y <= 100));
  }
});
