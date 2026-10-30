import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  playerFacing,
  goalPath,
  trainingPossession,
} from '../lib/pitch-cues.ts';
import { possessionNotice } from '../lib/match-narrative.ts';
import { firstMatchMoments } from '../lib/first-match.ts';
import {
  createMatchRun,
  chooseMatchOption,
  continueMatch,
} from '../lib/match-day.ts';
import { matchFixtures } from '../lib/match-fixtures.ts';
import { courses } from '../lib/scenarios.ts';

test('facing is explicit, team-relative and never inferred from somebody else or a future movement', () => {
  const p = { x: 60, y: 40, active: true, team: 'home', role: 'Striker' };
  assert.deepEqual(playerFacing(p, 'You have your back to goal.'), {
    x: 0,
    y: 40,
  });
  assert.deepEqual(playerFacing(p, 'You face goal with the ball.'), {
    x: 100,
    y: 40,
  });
  assert.deepEqual(
    playerFacing({ ...p, team: 'away' }, 'You have your back to goal.'),
    { x: 100, y: 40 },
  );
  assert.equal(
    playerFacing(p, 'Their striker is facing goal. You are marking him.'),
    undefined,
  );
  assert.equal(
    playerFacing(p, 'Our six is facing goal behind you.'),
    undefined,
  );
  assert.equal(playerFacing(p, 'You could turn and face goal.'), undefined);
  assert.deepEqual(playerFacing({ ...p, facing: { x: 65, y: 80 } }, ''), {
    x: 65,
    y: 80,
  });
  assert.deepEqual(
    playerFacing({ ...p, role: 'Goalkeeper' }, '', { x: 80, y: 60 }),
    { x: 80, y: 60 },
  );
});

test('goal drawing maps only the final confirmed scoring frame inside the correct net', () => {
  for (const f of matchFixtures)
    for (const m of f.moments)
      for (const n of m.nodes)
        for (const c of n.choices) {
          const copy = structuredClone(c.ballPath);
          const path = goalPath(
            c.ballPath,
            c.outcome?.homeGoals,
            c.outcome?.awayGoals,
          );
          assert.deepEqual(
            c.ballPath,
            copy,
            'source contacts are never rewritten',
          );
          if (!c.outcome?.homeGoals && !c.outcome?.awayGoals) {
            assert.equal(path, c.ballPath);
            continue;
          }
          if (!path?.length) continue;
          assert.deepEqual(path.slice(0, -1), c.ballPath.slice(0, -1));
          const end = path.at(-1);
          assert.equal(end.x, c.outcome.homeGoals ? 98 : 2);
          assert.ok(end.y >= 45.5 && end.y <= 54.5);
        }
});

test('possession banners wait for reveal, survive continuation and do not confuse a goal with a turnover', () => {
  const m = firstMatchMoments[1];
  let run = createMatchRun([m]);
  const n = m.nodes.find((n) => n.id === run.nodeId);
  const catchChoice = n.choices.find((c) => c.nextNodeId);
  run = chooseMatchOption(run, m.id, n.id, catchChoice.id, [m]);
  assert.equal(possessionNotice(run, m, false), undefined);
  assert.match(possessionNotice(run, m, true), /Ball won/);
  run = continueMatch(run, [m]);
  assert.match(possessionNotice(run, m, false), /Ball won/);
  const attack = firstMatchMoments[0];
  const finish = attack.nodes.find((n) =>
    n.choices.some((c) => c.outcome?.homeGoals),
  );
  const goal = finish.choices.find((c) => c.outcome?.homeGoals);
  const scoring = chooseMatchOption(
    { ...createMatchRun([attack]), nodeId: finish.id },
    attack.id,
    finish.id,
    goal.id,
    [attack],
  );
  assert.equal(
    possessionNotice(scoring, attack, true),
    'Goal! Rival kick-off next.',
  );
  assert.equal(possessionNotice(createMatchRun([m]), m, true), undefined);
});

test('training signals require a clear final owner and never equate defending with a regain', () => {
  const s = courses[0].scenarios[0];
  assert.equal(trainingPossession(s, false), 'home');
  const emptyEnd = {
    ...s,
    reveal: {
      ...s.reveal,
      ballPath: [{ x: 99, y: 99 }],
      ballTo: { x: 99, y: 99 },
    },
  };
  assert.equal(trainingPossession(emptyEnd, true), undefined);
  const away = s.players.find((p) => p.team === 'away');
  const lost = {
    ...s,
    reveal: {
      ...s.reveal,
      movements: [],
      ballPath: [{ x: away.x, y: away.y }],
    },
  };
  assert.equal(trainingPossession(lost, true), 'away');
});
