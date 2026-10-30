import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openOnPlainClick } from '../lib/link-navigation.ts';

test('ordinary link clicks run in-page navigation once', () => {
  let prevented = 0, opened = 0;
  openOnPlainClick({ button: 0, defaultPrevented: false, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false,
    preventDefault: () => prevented++ }, () => opened++);
  assert.equal(prevented, 1);
  assert.equal(opened, 1);
});

test('modified, middle/right and already-handled clicks keep native behavior', () => {
  for (const override of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { button: 2 }, { defaultPrevented: true }]) {
    const event = { button: 0, defaultPrevented: false, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...override,
      preventDefault: () => assert.fail('native link must not be intercepted') };
    openOnPlainClick(event, () => assert.fail('modified click must not change the current screen'));
  }
});
