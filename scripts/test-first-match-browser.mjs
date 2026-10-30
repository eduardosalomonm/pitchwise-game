import assert from 'node:assert/strict';
import {
  previewOrigin,
  isolateGameTelemetry,
  assertReadableButtons,
  checkOptionalReading,
} from './browser-test-support.mjs';
import { firstMatchMoments } from '../lib/first-match.ts';
import { FIRST_MATCH_KEY } from '../lib/first-match-progress.ts';
import {
  createMatchRun,
  chooseMatchOption,
  continueMatch,
} from '../lib/match-day.ts';
import { RECORDS_KEY } from '../lib/match-records.ts';
import { createLeague, serializeLeague, LEAGUE_KEY } from '../lib/league.ts';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const browser = await chromium.launch({ headless: true });
const origin = previewOrigin();
const errors = [];
async function createPage(options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await isolateGameTelemetry(page);
  return { page, context };
}
async function fits(page) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  for (const button of await page
    .locator('.first-match button:visible')
    .all()) {
    const box = await button.boundingBox();
    assert.ok(
      box.height >= 44 &&
        box.x >= -1 &&
        box.x + box.width <= page.viewportSize().width + 1,
    );
  }
}
try {
  const { page, context } = await createPage({
    viewport: { width: 320, height: 740 },
    reducedMotion: 'no-preference',
  });
  const season = serializeLeague(
    createLeague(7, {
      name: 'Friends FC',
      kitId: 'forest',
      size: 6,
      legs: 1,
      difficulty: 'hard',
    }),
  );
  await context.addInitScript(
    ({ season, key }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, season);
    },
    { season, key: LEAGUE_KEY },
  );
  await page.goto(origin);
  const start = page.getByRole('link', {
    name: 'Play your first match',
    exact: true,
  });
  await start.waitFor();
  await start.focus();
  await page.keyboard.press('Enter');
  await page.locator('.first-question').waitFor();
  await page.waitForFunction(() =>
    document
      .querySelector('.build-up-controls')
      ?.textContent.includes('Paused · your move'),
  );
  assert.equal(new URL(page.url()).hash, '#first-match');
  assert.equal(await page.locator('.match-choice-list button').count(), 2);
  assert.equal(await page.locator('.pitch-goal').count(), 2);
  assert.equal(await page.locator('.you-label').textContent(), 'YOU');
  assert.equal(await page.locator('[data-facing]').count(), 1);
  assert.equal(await page.locator('.you-badge').getAttribute('width'), '62');
  assert.equal(await page.locator('.you-badge').getAttribute('height'), '26');
  await checkOptionalReading(page);
  await fits(page);
  await page.screenshot({
    path: '/private/tmp/pitchwise-first-match-320.png',
    fullPage: true,
  });
  let run = createMatchRun(firstMatchMoments),
    count = 0;
  while (run.status !== 'final') {
    const moment = firstMatchMoments[run.momentIndex],
      node = moment.nodes.find((n) => n.id === run.nodeId);
    const choice = node.choices.find((c) => c.tone === 'positive');
    assert.equal(
      await page.locator('.first-actor strong').innerText(),
      node.actor,
    );
    if (node.phase === 'Attacking' && run.momentIndex === 1)
      assert.match(await page.locator('.first-tip').innerText(), /Ball won/);
    const option = page.getByRole('button', {
      name: new RegExp(choice.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    });
    assert.equal(
      await page.locator('.read-the-play').getAttribute('open'),
      null,
      'each new decision starts collapsed',
    );
    await page.locator('.read-the-play summary').click();
    await option.evaluate((el) => {
      el.click();
      el.click();
    });
    run = chooseMatchOption(
      run,
      moment.id,
      node.id,
      choice.id,
      firstMatchMoments,
    );
    const next = page.locator('.first-feedback > button').first();
    assert.equal(
      await next.isDisabled(),
      true,
      'the animation completes before continuation',
    );
    assert.equal(await page.locator('.match-choice-list button').count(), 0);
    assert.equal(
      await page.locator('.read-the-play').count(),
      0,
      'no stale starting-board help after answering',
    );
    await page.waitForFunction(
      () => !document.querySelector('.first-feedback > button')?.disabled,
    );
    if (run.momentIndex === 1 && choice.nextNodeId)
      assert.match(
        await page.locator('.possession-notice').innerText(),
        /Ball won/,
      );
    const visibleScore = `${run.homeScore + (choice.outcome?.homeGoals ?? 0)}–${run.awayScore + (choice.outcome?.awayGoals ?? 0)}`;
    assert.equal(
      await page.locator('.first-match-nav .friendly-score').innerText(),
      visibleScore,
    );
    if (count === 0) {
      const before = await page.locator('.first-feedback p').innerText();
      await page
        .getByRole('button', { name: 'Replay movement', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Replay movement', exact: true })
        .click();
      assert.equal(await page.locator('.first-feedback p').innerText(), before);
      assert.equal(
        await page.locator('.first-match-nav .friendly-score').innerText(),
        visibleScore,
      );
    }
    await fits(page);
    await next.focus();
    await page.keyboard.press('Enter');
    run = continueMatch(run, firstMatchMoments);
    count++;
    if (run.status !== 'final') {
      await page.locator('.first-question').waitFor();
      assert.equal(
        await page
          .locator('.first-step')
          .evaluate((el) => el === document.activeElement),
        true,
      );
      const box = await page.locator('.first-actor').boundingBox();
      const prompt = await page.locator('.first-question h2').boundingBox();
      const inView =
        box.y >= -1 && prompt.y + prompt.height <= page.viewportSize().height;
      if (!inView)
        await page.screenshot({
          path: '/private/tmp/pitchwise-first-match-layout-failure.png',
          fullPage: true,
        });
      assert.ok(
        inView,
        `the next actor, pitch and prompt are in view after continuing (${run.nodeId}: actor ${box.y}, prompt bottom ${prompt.y + prompt.height})`,
      );
    }
  }
  assert.equal(count, 4);
  await page.getByRole('heading', { name: 'You’re ready to play.' }).waitFor();
  await assertReadableButtons(
    page,
    '.first-match-actions',
    'friendly result actions',
  );
  assert.equal(
    await page.evaluate((key) => localStorage.getItem(key), FIRST_MATCH_KEY),
    'seen',
  );
  assert.equal(
    await page.evaluate((key) => localStorage.getItem(key), LEAGUE_KEY),
    season,
  );
  assert.equal(
    await page.evaluate((key) => localStorage.getItem(key), RECORDS_KEY),
    null,
  );
  await page
    .getByRole('button', { name: 'Play guide again', exact: true })
    .click();
  await page.locator('.first-question').waitFor();
  assert.equal(
    await page.locator('.first-match-nav .friendly-score').innerText(),
    '0–0',
  );
  assert.equal(await page.locator('.match-choice-list button').count(), 2);
  await page.getByRole('button', { name: 'Skip guide', exact: true }).click();
  await page.getByRole('heading', { name: 'Choose your opponent.' }).waitFor();
  await page.locator('.brand-link').click();
  await page.getByRole('link', { name: /^Competitions/ }).click();
  await page.getByRole('heading', { name: 'Choose your competition.' }).waitFor();
  await page.locator('.brand-link').click();
  await page.reload();
  await page
    .getByRole('link', { name: 'Replay the guided match', exact: true })
    .waitFor();
  await context.close();

  for (const width of [390, 1280]) {
    const { page, context } = await createPage({
      viewport: { width, height: 844 },
      reducedMotion: 'reduce',
    });
    await page.goto(`${origin}/#first-match`);
    await page.locator('.first-question').waitFor();
    await fits(page);
    await page.locator('.match-choice-list button').first().click();
    await page.waitForFunction(
      () => !document.querySelector('.first-feedback > button')?.disabled,
      null,
      { timeout: 1500 },
    );
    assert.equal(
      await page
        .getByRole('button', { name: 'Replay movement', exact: true })
        .count(),
      0,
    );
    await page.getByRole('button', { name: 'Skip guide', exact: true }).click();
    await page
      .getByRole('heading', { name: 'Choose your opponent.' })
      .waitFor();
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), FIRST_MATCH_KEY),
      'seen',
    );
    await context.close();
  }
  const blocked = await createPage({
    viewport: { width: 320, height: 568 },
    reducedMotion: 'reduce',
  });
  await blocked.context.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
    Storage.prototype.setItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
  });
  await blocked.page.goto(`${origin}/#first-match`);
  await blocked.page.locator('.first-question').waitFor();
  await blocked.page
    .getByRole('button', { name: 'Skip guide', exact: true })
    .click();
  await blocked.page
    .getByRole('heading', { name: 'Choose your opponent.' })
    .waitFor();
  await blocked.context.close();
  assert.deepEqual(errors, []);
  console.log(
    'PASS: guided entry, four decisions, animation/replay locking, score, possession, skip, preference, saved league isolation, keyboard and 320/390/1280 layouts.',
  );
} finally {
  await browser.close();
}
