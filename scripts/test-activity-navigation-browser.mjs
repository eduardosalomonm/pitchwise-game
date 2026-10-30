import assert from 'node:assert/strict';
import {
  activityChunkMatcher,
  isolateGameTelemetry,
  previewOrigin,
} from './browser-test-support.mjs';
import { courses } from '../lib/scenarios.ts';
import { PROGRESS_KEY } from '../lib/course-progress.ts';
import { createLeague, LEAGUE_KEY, serializeLeague } from '../lib/league.ts';
import {
  createMyCup,
  MY_CUP_STORAGE_KEY,
  serializeMyCup,
} from '../lib/my-tournament.ts';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const browser = await chromium.launch({ headless: true });
const origin = previewOrigin();
const errors = [];
async function assertNativeModifiers(link, page) {
  for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
    const before = page.url();
    const prevented = await link.evaluate((anchor, modifier) => {
      let appPrevented;
      window.addEventListener(
        'click',
        (event) => {
          appPrevented = event.defaultPrevented;
          event.preventDefault(); // stop native navigation only after React handles it
        },
        { once: true },
      );
      anchor.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          button: 0,
          [modifier]: true,
        }),
      );
      return appPrevented;
    }, modifier);
    assert.equal(
      prevented,
      false,
      `${modifier}: preserve native link behavior`,
    );
    assert.equal(
      page.url(),
      before,
      'modified click leaves the current screen intact',
    );
  }
}
try {
  // The first click must preserve its destination even before client activation.
  const cold = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 750 },
  });
  const page = await cold.newPage();
  await page.goto(origin);
  await page
    .locator('.play-options')
    .getByRole('link', { name: /^Match Day/ })
    .click();
  assert.equal(
    new URL(page.url()).hash,
    '#match/original',
    'the cold first click must navigate',
  );
  const ready = await browser.newPage();
  ready.on('pageerror', (error) => errors.push(error.message));
  ready.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await isolateGameTelemetry(ready);
  await ready.goto(page.url());
  await ready
    .getByRole('heading', { name: 'Choose your opponent.', exact: true })
    .waitFor();
  await page.goto(origin);
  await page
    .locator('.play-options')
    .getByRole('link', { name: /^Competitions/ })
    .click();
  assert.equal(new URL(page.url()).hash, '#tournaments');
  await ready.goto(page.url());
  await ready
    .getByRole('heading', { name: 'Choose your competition.', exact: true })
    .waitFor();
  await assertNativeModifiers(ready.locator('.back-link'), ready);
  assert.equal(
    await ready.locator('.play-options a').count(),
    3,
    'choose a league or either cup after entering Tournaments',
  );
  await ready
    .locator('.play-options')
    .getByRole('link', { name: /^The Readers’ Cup/ })
    .click();
  await ready
    .getByRole('heading', { name: 'The Readers’ Cup', exact: true })
    .waitFor();
  assert.equal(
    new URL(ready.url()).hash,
    '#tournament',
    'existing Readers’ Cup deep link is unchanged',
  );
  await ready
    .getByRole('link', { name: /^Competitions/ })
    .click();
  await ready
    .locator('.play-options')
    .getByRole('link', { name: /^My Tournament/ })
    .click();
  await ready
    .getByRole('heading', { name: 'Create your club.', exact: true })
    .waitFor();
  assert.equal(new URL(ready.url()).hash, '#my-tournament');

  const course = courses.find((c) => c.id === 'full-back');
  const saved = {
    [LEAGUE_KEY]: serializeLeague(
      createLeague(2026, {
        name: 'Real Barrio',
        kitId: 'forest',
        size: 6,
        legs: 1,
      }),
    ),
    [PROGRESS_KEY]: JSON.stringify({ [course.id]: [course.scenarios[0].id] }),
    'pitchwise-cup-v1': JSON.stringify({ v: 1, seed: 2026, results: [] }),
    [MY_CUP_STORAGE_KEY]: serializeMyCup(
      createMyCup(2026, {
        name: 'Real Barrio',
        kitId: 'forest',
        difficulty: 'easy',
        length: 'short',
        size: 8,
      }),
    ),
  };
  await ready.evaluate((values) => {
    for (const [key, value] of Object.entries(values))
      localStorage.setItem(key, value);
  }, saved);
  await ready.goto(origin);
  assert.equal(
    await ready.locator('.play-options a').count(),
    2,
    'only matches and cups are primary',
  );
  assert.equal(
    await ready.locator('.position-menu').count(),
    0,
    'the formation is not on the homepage',
  );
  const training = ready.locator('.training-entry');
  await assertNativeModifiers(training, ready);
  for (const width of [320, 1280]) {
    await ready.setViewportSize({ width, height: 800 });
    assert.equal(
      await ready.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `home fits ${width}px`,
    );
    for (const link of await ready
      .locator('.play-options a,.training-entry')
      .all())
      assert.ok((await link.boundingBox()).height >= 44);
    await ready.waitForFunction(() =>
      [...document.querySelectorAll('.play-options img')].every(
        (img) => img.complete && img.naturalWidth > 0,
      ),
    );
  }
  await ready.setViewportSize({ width: 320, height: 800 });
  await training.focus();
  await ready.keyboard.press('Enter');
  await ready
    .getByRole('heading', { name: 'Training Ground', exact: true })
    .waitFor();
  assert.equal(new URL(ready.url()).hash, '#training');
  assert.equal(await ready.locator('.position-menu').count(), 1);
  assert.equal(
    await ready
      .getByRole('button', {
        name: 'Start Left-back course. 1 of 5 correct answers.',
        exact: true,
      })
      .count(),
    1,
    'saved stars remain visible',
  );
  await ready
    .getByRole('link', { name: /^Competitions/ })
    .click();
  await ready
    .getByRole('heading', { name: 'Choose your competition.', exact: true })
    .waitFor();
  await ready.waitForFunction(() =>
    [...document.querySelectorAll('.play-options img')].every(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
  await ready
    .locator('.play-options')
    .getByRole('link', { name: /^My Tournament/ })
    .click();
  await ready.locator('.cup-next').waitFor();
  assert.match(
    await ready.locator('.cup-next').innerText(),
    /Real Barrio/,
    'the saved custom club resumes',
  );
  await ready
    .getByRole('link', { name: /^Competitions/ })
    .click();
  await ready
    .locator('.play-options')
    .getByRole('link', { name: /^The Readers’ Cup/ })
    .click();
  await ready.locator('.cup-next').waitFor();
  for (const [key, value] of Object.entries(saved))
    assert.deepEqual(
      await ready.evaluate((key) => JSON.parse(localStorage.getItem(key)), key),
      JSON.parse(value),
      `${key}: navigation must not reset saved progress`,
    );
  await page.goto(origin);
  await page.locator('.training-entry').click();
  assert.equal(
    new URL(page.url()).hash,
    '#training',
    'training cold click also preserves its destination',
  );
  assert.deepEqual(errors, []);

  // A failed lazy activity must leave a usable menu and retry without losing saves.
  for (const [hash, module, readySelector] of [
    ['#match/original/play', 'match-day-loader', '.match-choice-list'],
    ['#tournament', 'tournament', '.cup-next'],
    ['#my-tournament', 'my-tournament', '.cup-next'],
    ['#league', 'league', '.cup-next'],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 320, height: 750 },
    });
    try {
      const failed = await context.newPage();
      await isolateGameTelemetry(failed);
      await failed.goto(origin);
      await failed.locator('.play-options').waitFor();
      await failed.evaluate((values) => {
        for (const [key, value] of Object.entries(values))
          localStorage.setItem(key, value);
      }, saved);
      const chunk = activityChunkMatcher(origin, module);
      let blocked = 0;
      await failed.route(chunk, (route) => {
        blocked++;
        return route.abort();
      });
      await failed.goto(`${origin}/${hash}`);
      await failed
        .getByRole('heading', { name: 'The game couldn’t load.', exact: true })
        .waitFor();
      // vinext's development-only diagnostic overlay also observes caught errors.
      const dismissDiagnostic = failed.getByTestId('vinext-dev-error-close');
      if (await dismissDiagnostic.isVisible()) await dismissDiagnostic.click();
      assert.ok(
        blocked > 0,
        `${hash}: deliberately failed the lazy module download`,
      );
      for (const label of ['Reload game', 'Back to home'])
        assert.ok(
          (
            await failed
              .getByRole('button', { name: label, exact: true })
              .boundingBox()
          ).height >= 44,
        );
      assert.equal(
        await failed.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await failed
        .getByRole('button', { name: 'Back to home', exact: true })
        .click();
      await failed.locator('.play-options').waitFor();
      await failed.evaluate((hash) => {
        window.location.hash = hash;
      }, hash);
      await failed
        .getByRole('heading', { name: 'The game couldn’t load.', exact: true })
        .waitFor();
      if (await dismissDiagnostic.isVisible()) await dismissDiagnostic.click();
      await failed.unroute(chunk);
      await failed
        .getByRole('button', { name: 'Reload game', exact: true })
        .click();
      await failed.locator(readySelector).waitFor();
      for (const [key, value] of Object.entries(saved))
        assert.deepEqual(
          await failed.evaluate(
            (key) => JSON.parse(localStorage.getItem(key)),
            key,
          ),
          JSON.parse(value),
          `${hash}: retry preserves ${key}`,
        );
    } finally {
      await context.close();
    }
  }
  console.log(
    'PASS: navigation, 320/1280 layouts, preserved saves and recoverable lazy downloads for matches, both cups and league.',
  );
} finally {
  await browser.close();
}
