import assert from 'node:assert/strict';
import {
  isolateGameTelemetry,
  previewOrigin,
} from './browser-test-support.mjs';
import { matchFixtures } from '../lib/match-fixtures.ts';
import { matchLeadIns } from '../lib/match-lead-ins.ts';
import {
  createMatchRun,
  chooseMatchOption,
  continueMatch,
} from '../lib/match-day.ts';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const browser = await chromium.launch({ headless: true });
const fixture = matchFixtures.find((f) => f.id === 'original');
const page = await browser.newPage({
  viewport: { width: 375, height: 667 },
  reducedMotion: 'no-preference',
});
const errors = [];
page.setDefaultTimeout(15000);
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await isolateGameTelemetry(page);
await page.addInitScript(() => {
  window.matchTools = {};
  Object.defineProperty(document, 'modelContext', {
    value: {
      registerTool(tool, options) {
        window.matchTools[tool.name] = tool.execute;
        options?.signal?.addEventListener('abort', () => {
          if (window.matchTools[tool.name] === tool.execute)
            delete window.matchTools[tool.name];
        });
      },
    },
  });
});
const origin = previewOrigin();
const choices = page.locator('.match-choice-list button');
const controls = page.locator('.build-up-controls');
const waitReady = () =>
  page.waitForFunction(() =>
    document
      .querySelector('.build-up-controls')
      ?.textContent.includes('Paused · your move'),
  );
const svgPosition = (id) =>
  page.locator(`.match-pitch [data-player-id="${id}"]`).evaluate((el) => {
    const c = el.querySelector('.player-disc'),
      m = el.getCTM();
    const p = new DOMPoint(
      +c.getAttribute('cx'),
      +c.getAttribute('cy'),
    ).matrixTransform(m);
    return { x: p.x, y: p.y };
  });
try {
  await page.goto(`${origin}/#match/original/play`);
  await controls.waitFor();
  let run = createMatchRun(fixture.moments);
  for (const [i, moment] of fixture.moments.entries()) {
    const node = moment.nodes.find((n) => n.id === moment.rootNodeId);
    console.log(`Checking build-up: ${node.id}`);
    const clip = matchLeadIns[i];
    await controls.waitFor();
    // Replay is restartable even during playback, without scrolling the pitch away.
    const replay = page.getByRole('button', {
      name: 'Replay build-up',
      exact: true,
    });
    await replay.click();
    assert.equal(
      await page.locator('.match-possession').textContent(),
      'Build-up',
      'history is distinguished from current possession',
    );
    const a = await svgPosition(clip.players[0].id);
    await page.waitForTimeout(700);
    const b = await svgPosition(clip.players[0].id);
    assert.ok(
      Math.hypot(a.x - b.x, a.y - b.y) > 1,
      `${node.id}: player genuinely moves`,
    );
    assert.equal(
      await choices.locator(':scope:disabled').count(),
      node.choices.length,
    );
    assert.equal(
      await page
        .locator('.match-movement-path,.ball-trail,.decision-signal')
        .count(),
      0,
      'no future routes or verdict before the answer',
    );
    const candidate = node.choices.find((c) => c.outcome) ?? node.choices[0];
    const blocked = await page.evaluate(
      (input) => {
        try {
          window.matchTools.choose_match_option(input);
          return '';
        } catch (e) {
          return e.message;
        }
      },
      { momentId: moment.id, nodeId: node.id, choiceId: candidate.id },
    );
    assert.match(blocked, /build-up/);
    await replay.click();
    await replay.click();
    await waitReady();
    assert.notEqual(
      await page.locator('.match-possession').textContent(),
      'Build-up',
    );
    assert.equal(await choices.locator(':scope:disabled').count(), 0);
    const frozenA = await svgPosition(clip.players[0].id);
    await page.waitForTimeout(250);
    assert.deepEqual(
      await svgPosition(clip.players[0].id),
      frozenA,
      'pitch stays frozen before choosing',
    );
    const positions = await page
      .locator('.match-pitch [data-player-id]')
      .evaluateAll((els) =>
        els.map((el) => ({
          id: el.dataset.playerId,
          x: +el.querySelector('.player-disc').getAttribute('cx') / 10,
          y: +el.querySelector('.player-disc').getAttribute('cy') / 7,
        })),
      );
    for (const p of positions) {
      const expected = node.scene.players.find((n) => n.id === p.id);
      assert.equal(p.x, expected.x);
      assert.equal(p.y, expected.y);
    }
    assert.equal(
      await page.locator('.match-consequence').count(),
      0,
      'replay did not choose an answer',
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    for (const box of await controls
      .locator('button')
      .evaluateAll((els) =>
        els.map((e) => ({ w: e.offsetWidth, h: e.offsetHeight })),
      ))
      assert.ok(box.w >= 44 && box.h >= 44);
    await page.evaluate(() => window.scrollTo(0, 0));
    const pitch = await page.locator('.match-pitch').boundingBox();
    const last = await choices.last().boundingBox();
    assert.ok(
      pitch.y >= 0 && pitch.y + pitch.height <= 667,
      `${node.id}: the full pitch fits on the opening mobile screen`,
    );
    assert.ok(
      last.y + last.height <= 667 * 2,
      `${node.id}: all options within one short scroll, without shrinking the pitch`,
    );
    // Keyboard skip and replay; the visible pitch remains above the choices.
    await replay.focus();
    await page.keyboard.press('Enter');
    const skip = page.getByRole('button', {
      name: 'Skip build-up',
      exact: true,
    });
    await skip.focus();
    await page.keyboard.press('Enter');
    await waitReady();
    await choices.filter({ hasText: candidate.label }).click();
    run = chooseMatchOption(
      run,
      moment.id,
      node.id,
      candidate.id,
      fixture.moments,
    );
    assert.equal(
      await controls.count(),
      0,
      'history replay is not offered after a locked decision',
    );
    while (true) {
      await page.locator('.match-consequence > button').click();
      run = continueMatch(run, fixture.moments);
      if (run.momentIndex !== i || run.status === 'final') break;
      const next = moment.nodes.find((n) => n.id === run.nodeId);
      const choice = next.choices.find((c) => c.outcome) ?? next.choices[0];
      await choices.filter({ hasText: choice.label }).click();
      run = chooseMatchOption(
        run,
        moment.id,
        next.id,
        choice.id,
        fixture.moments,
      );
    }
  }
  assert.equal(
    await page.locator('.final-score strong').innerText(),
    `${run.homeScore}–${run.awayScore}`,
    'no points from watching, skipping or replaying',
  );
  await page.evaluate(() => window.matchTools.restart_final_match({}));
  await controls.waitFor();
  assert.equal(await page.locator('.scoreboard strong').innerText(), '0–0');
  assert.equal(
    await choices.first().isEnabled(),
    false,
    'restarting the match restarts the lead-in',
  );
  await waitReady();

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 750 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${origin}/#match/original/play`);
    await page.reload();
    await waitReady();
    assert.equal(
      await choices.first().isEnabled(),
      true,
      'reduced motion skips autoplay and its wait',
    );
    await page
      .getByRole('button', { name: 'View before the play', exact: true })
      .click();
    assert.equal(
      await page.locator('.match-pitch .has-route').count(),
      0,
      'reduced motion shows a still before frame',
    );
    assert.equal(await choices.first().isEnabled(), false);
    await page
      .getByRole('button', { name: 'Return to decision', exact: true })
      .click();
    assert.equal(await choices.first().isEnabled(), true);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.equal(
      await page.locator('.match-pitch').getAttribute('viewBox'),
      '0 0 1000 700',
    );
  }
  await page.screenshot({
    path: '/private/tmp/pitchwise-build-up-desktop.png',
    fullPage: false,
  });
  await page.setViewportSize({ width: 375, height: 667 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: '/private/tmp/pitchwise-build-up-mobile.png',
    fullPage: false,
  });
  // Navigating away cancels the clip and never blocks the next activity.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page
    .getByRole('button', { name: 'Replay build-up', exact: true })
    .click();
  await page.setViewportSize({ width: 320, height: 568 });
  await waitReady();
  assert.equal(await choices.first().isEnabled(), true);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page
    .getByRole('button', { name: 'Replay build-up', exact: true })
    .click();
  await page.goto(`${origin}/#match/low-block/play`);
  await choices.first().waitFor();
  assert.equal(await controls.count(), 1);
  await waitReady();
  assert.equal(await choices.first().isEnabled(), true);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: five lead-ins, real motion and exact freeze, replay/skip/keyboard, anti-spoiler/score/WebMCP guards, reduced motion and 320–1280px.',
  );
} catch (error) {
  await page.screenshot({
    path: '/private/tmp/pitchwise-build-up-failure.png',
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
}
