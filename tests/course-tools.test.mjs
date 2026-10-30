import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerCourseTools } from '../lib/course-tools.ts';

test('course tools preserve all eight public names, actions and lifecycle', () => {
  const registered = new Map(), calls = [];
  const dispose = registerCourseTools({ registerTool: (tool, options) => registered.set(tool.name, { tool, signal: options.signal }) },
    (...args) => { calls.push(['answer', ...args]); return 'revealed'; },
    (...args) => { calls.push(['restart', ...args]); return 'restarted'; });
  assert.deepEqual([...registered.keys()], [
    'answer_full_back_scenario', 'restart_full_back_lesson',
    'answer_defensive_midfielder_scenario', 'restart_defensive_midfielder_lesson',
    'answer_centre_back_scenario', 'restart_centre_back_lesson',
    'answer_position_scenario', 'restart_position_lesson',
  ]);
  for (const [suffix, course] of [['full_back', 'full-back'], ['defensive_midfielder', 'defensive-midfielder'], ['centre_back', 'centre-back']]) {
    assert.equal(registered.get(`answer_${suffix}_scenario`).tool.execute({ scenarioId: 'scene', choiceId: 'choice' }), 'revealed');
    assert.deepEqual(calls.at(-1), ['answer', course, 'scene', 'choice']);
    assert.equal(registered.get(`restart_${suffix}_lesson`).tool.execute({}), 'restarted');
    assert.deepEqual(calls.at(-1), ['restart', course]);
  }
  registered.get('answer_position_scenario').tool.execute({ courseId: 'striker', scenarioId: 'scene', choiceId: 'choice' });
  assert.deepEqual(calls.at(-1), ['answer', 'striker', 'scene', 'choice']);
  registered.get('restart_position_lesson').tool.execute({ courseId: 'goalkeeper' });
  assert.deepEqual(calls.at(-1), ['restart', 'goalkeeper']);
  for (const { tool, signal } of registered.values()) {
    assert.equal(signal.aborted, false);
    assert.equal(tool.inputSchema.additionalProperties, false);
  }
  dispose();
  for (const { signal } of registered.values()) assert.equal(signal.aborted, true);
});

test('invalid course tool inputs never call a visible action', () => {
  const tools = new Map();
  const dispose = registerCourseTools({ registerTool: (tool) => tools.set(tool.name, tool) },
    () => assert.fail('invalid answer must not change state'), () => assert.fail('invalid restart must not change state'));
  for (const name of ['answer_full_back_scenario', 'answer_defensive_midfielder_scenario', 'answer_centre_back_scenario'])
    for (const input of [null, undefined, {}, { scenarioId: 1, choiceId: 'a' }, { scenarioId: 's' }])
      assert.throws(() => tools.get(name).execute(input));
  for (const input of [null, {}, { courseId: 'unknown', scenarioId: 's', choiceId: 'a' }, { courseId: 'striker', scenarioId: 's', choiceId: 1 }])
    assert.throws(() => tools.get('answer_position_scenario').execute(input));
  for (const input of [null, {}, { courseId: 'unknown' }, { courseId: 1 }])
    assert.throws(() => tools.get('restart_position_lesson').execute(input));
  dispose();
});

test('unsupported tool registration does not break ordinary play', async () => {
  const dispose = registerCourseTools({ registerTool: () => { throw new Error('unsupported'); } }, () => {}, () => {});
  assert.doesNotThrow(dispose);
  const asynchronous = registerCourseTools({ registerTool: () => Promise.reject(new Error('unsupported')) }, () => {}, () => {});
  await new Promise((resolve) => setImmediate(resolve));
  asynchronous();
});
