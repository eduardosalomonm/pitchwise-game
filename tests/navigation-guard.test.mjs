import assert from 'node:assert/strict';
import { test } from 'node:test';
import { confirmLeave, setLeaveGuard } from '../lib/navigation-guard.ts';

test('one Back action may confirm twice, but a different match must ask again', (t) => {
  t.mock.method(Date, 'now', () => 10_000);
  t.after(() => setLeaveGuard(null));
  setLeaveGuard(() => 'Leave match A?');
  let prompts = 0;
  const yes = () => { prompts++; return true; };
  assert.equal(confirmLeave(yes), true);
  assert.equal(confirmLeave(yes), true);
  assert.equal(prompts, 1, 'popstate and hashchange share one confirmation');
  setLeaveGuard(null);
  setLeaveGuard(() => 'Leave match B?');
  assert.equal(confirmLeave(() => { prompts++; return false; }), false);
  assert.equal(prompts, 2, 'approval is not transferable to another match');
});

test('cancelling does not suppress the next confirmation, and an expired approval asks again', (t) => {
  let now = 10_000;
  t.mock.method(Date, 'now', () => now);
  t.after(() => setLeaveGuard(null));
  setLeaveGuard(() => 'Leave?');
  assert.equal(confirmLeave(() => false), false);
  assert.equal(confirmLeave(() => false), false);
  assert.equal(confirmLeave(() => true), true);
  now += 1001;
  assert.equal(confirmLeave(() => false), false);
});
