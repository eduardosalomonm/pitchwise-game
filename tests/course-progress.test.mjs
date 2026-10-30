import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseProgress, recordSituation } from '../lib/course-progress.ts';

test('records each completed situation once', () => {
  let progress = {};
  progress = recordSituation(progress, 'goalkeeper', 'goalkeeper-1', true);
  const same = recordSituation(progress, 'goalkeeper', 'goalkeeper-1', true);
  assert.equal(same, progress);
  progress = recordSituation(progress, 'goalkeeper', 'goalkeeper-2', true);
  assert.deepEqual(progress.goalkeeper, ['goalkeeper-1', 'goalkeeper-2']);
});

test('wrong answers never light a menu star', () => {
  const progress = recordSituation({}, 'goalkeeper', 'goalkeeper-1', false);
  assert.deepEqual(progress, {});
});

test('saved progress is safe to parse and deduplicated', () => {
  assert.deepEqual(parseProgress('{bad'), {});
  assert.deepEqual(parseProgress('{"striker":["striker-1","striker-1",9]}'), { striker:['striker-1'] });
});
