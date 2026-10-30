import assert from 'node:assert/strict';
import { test } from 'node:test';
import { courses } from '../lib/scenarios.ts';
import { startRevealPlayback, REVEAL_TIMING, getResponsibilityBadge } from '../lib/lesson-playback.ts';

function clock() {
  const jobs = [];
  return { jobs, schedule(callback, delay) { jobs.push({ callback, delay }); return jobs.length - 1; }, clear(id) { jobs[id].cleared = true; } };
}

test('reveal starts with the cue, then movement, then space', () => {
  const timer = clock();
  const beats = [];
  startRevealPlayback({ ...timer, onBeat: (beat) => beats.push(beat), reducedMotion: false });
  assert.deepEqual(beats, ['cue']);
  assert.deepEqual(timer.jobs.map((job) => job.delay), [REVEAL_TIMING.movement, REVEAL_TIMING.space]);
  assert.ok(REVEAL_TIMING.space - REVEAL_TIMING.movement >= 1750, 'movement finishes before the space reveal');
  timer.jobs.forEach((job) => job.callback());
  assert.deepEqual(beats, ['cue', 'movement', 'space']);
});

test('rapid replays cancel pending and already queued callbacks from older runs', () => {
  const timer = clock();
  const beats = [];
  let stop = () => {};
  for (let n = 0; n < 6; n++) {
    stop();
    stop = startRevealPlayback({ ...timer, onBeat: (beat) => beats.push(beat), reducedMotion: false });
  }
  assert.equal(timer.jobs.filter((job) => job.cleared).length, 10);
  timer.jobs.forEach((job) => job.callback());
  assert.deepEqual(beats, [...Array(6).fill('cue'), 'movement', 'space']);
});

test('manual pause cancels auto-advance and reduced motion creates no timers', () => {
  const timer = clock();
  const beats = [];
  const stop = startRevealPlayback({ ...timer, onBeat: (beat) => beats.push(beat), reducedMotion: false });
  stop();
  timer.jobs.forEach((job) => job.callback());
  assert.deepEqual(beats, ['cue']);
  const reduced = clock();
  startRevealPlayback({ ...reduced, onBeat: (beat) => beats.push(beat), reducedMotion: true });
  assert.equal(reduced.jobs.length, 0);
  assert.equal(beats.at(-1), 'cue');
});

test('automatic reveal asks for a fresh loop after the space beat', () => {
  const timer = clock();
  let loops = 0;
  startRevealPlayback({ ...timer, onBeat: () => {}, onLoop: () => loops++, reducedMotion: false });
  assert.deepEqual(timer.jobs.map((job) => job.delay), [REVEAL_TIMING.movement, REVEAL_TIMING.space, REVEAL_TIMING.loop]);
  timer.jobs.at(-1).callback();
  assert.equal(loops, 1);
});

test('all 55 situations have a responsibility reward', () => {
  const scenarios = courses.flatMap((course) => course.scenarios);
  assert.equal(scenarios.length, 55);
  for (const scenario of scenarios) {
    assert.ok(getResponsibilityBadge(scenario.id, scenario.teachingPoint).endsWith('spotted'));
    assert.ok(scenario.reveal.cue.trim());
    assert.ok(scenario.reveal.focus.label.trim());
  }
});
