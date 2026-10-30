import assert from 'node:assert/strict';
import { courses } from '../lib/scenarios.ts';
import { matchFixtures } from '../lib/match-fixtures.ts';
import {
  isolateGameTelemetry,
  previewOrigin,
  checkOptionalReading,
} from './browser-test-support.mjs';

const { chromium, webkit } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const origin = previewOrigin();
const results = [];
for (const [engine, name] of [
  [chromium, 'chromium'],
  [webkit, 'webkit'],
]) {
  const browser = await engine.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 375, height: 667 },
      reducedMotion: 'reduce',
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await isolateGameTelemetry(page);
    async function measure(selector, label) {
      const geometry = await page.locator(selector).evaluateAll((buttons) => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        buttons: buttons.map((button) => {
          const r = button.getBoundingClientRect();
          return {
            top: r.top + scrollY,
            bottom: r.bottom + scrollY,
            height: r.height,
            font: parseFloat(getComputedStyle(button).fontSize),
          };
        }),
      }));
      assert.equal(geometry.overflow, false, label);
      assert.ok(geometry.buttons.length, label);
      assert.ok(
        geometry.buttons.every((b) => b.height >= 44 && b.font >= 16),
        label + ': readable touch options',
      );
      results.push({
        engine: name,
        label,
        first: Math.round(geometry.buttons[0].top),
        last: Math.round(geometry.buttons.at(-1).bottom),
      });
      if (page.viewportSize().width <= 390) {
        assert.ok(
          geometry.buttons[0].top < 700,
          label + ': first choice near opening viewport',
        );
        assert.ok(
          geometry.buttons.at(-1).bottom < 1000,
          label + ': no multi-screen decision stack',
        );
        assert.equal(
          await page.locator('main > header').isVisible(),
          false,
          label + ': no duplicate brand header',
        );
      }
    }
    for (const width of [320, 375, 390, 1280]) {
      await page.setViewportSize({ width, height: width > 779 ? 900 : 667 });
      await page.goto(`${origin}/#match/original/play`);
      await page.locator('.match-choice-list').waitFor();
      await measure('.match-choice-list button', `match-${width}`);
      await checkOptionalReading(page);
      if (width === 375) {
        await page.evaluate(async () => {
          document.documentElement.style.fontSize = '200%';
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
        });
        const enlarged = await page
          .locator('.play-hud > *')
          .evaluateAll((elements) =>
            elements.map((el) => {
              const r = el.getBoundingClientRect();
              return (
                r.left >= 0 &&
                r.right <= innerWidth &&
                el.scrollWidth <= el.clientWidth + 1
              );
            }),
          );
        assert.ok(
          enlarged.every(Boolean),
          '200% text: every score/header item fits, not just the clipped page',
        );
        await page.evaluate(async () => {
          document.documentElement.style.fontSize = '';
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
        });
      }
      if (width === 375)
        await page.screenshot({
          path: `/private/tmp/pitchwise-a-${name}-match.png`,
          fullPage: true,
        });
      await page.locator('.match-choice-list button').first().click();
      await page.waitForFunction(
        () => !document.querySelector('.match-consequence > button')?.disabled,
      );
      assert.equal(await page.locator('.match-choice-list').isVisible(), false);
      const details = page.locator('.match-consequence details');
      assert.equal(await details.getAttribute('open'), null);
      assert.equal(
        await page
          .locator('.match-consequence')
          .evaluate((el) =>
            el
              .querySelector('button')
              .compareDocumentPosition(el.querySelector('details')) &
            Node.DOCUMENT_POSITION_FOLLOWING
              ? true
              : false,
          ),
        true,
        'continue precedes optional art',
      );
      await details.locator('summary').focus();
      await page.keyboard.press('Enter');
      assert.notEqual(await details.getAttribute('open'), null);
      await page.keyboard.press('Enter');
      await page.locator('.match-consequence > button').click();
      await page.waitForFunction(() => scrollY === 0);
      assert.equal(
        await page.locator('.play-context').count(),
        1,
        'one context after a turnover or pass',
      );

      await page.goto(`${origin}/#training/defensive-midfielder`);
      await page.getByRole('button', { name: 'Start the lesson' }).click();
      await measure('.choice-list button', `training-${width}`);
      await page.locator('.choice-list button').first().click();
      const next = page.getByRole('button', {
        name: 'Next situation',
        exact: true,
      });
      await next.waitFor();
      assert.equal(
        await page.locator('.scenario-illustration').isVisible(),
        false,
      );
      if (width === 375)
        await page.screenshot({
          path: `/private/tmp/pitchwise-a-${name}-training-result.png`,
          fullPage: true,
        });
      await next.click();
      await page.waitForFunction(() => scrollY === 0);
      assert.equal(await page.locator('.play-details[open]').count(), 0);

      await page.goto(`${origin}/#first-match`);
      await page.locator('.match-choice-list').waitFor();
      await measure('.match-choice-list button', `guide-${width}`);
      await checkOptionalReading(page);
    }
    if (name === 'chromium') {
      await page.setViewportSize({ width: 375, height: 667 });
      for (const fixture of matchFixtures) {
        await page.goto(`${origin}/#match/${fixture.id}/play`);
        await page.locator('.match-choice-list').waitFor();
        await measure('.match-choice-list button', fixture.id);
      }
      for (const course of courses) {
        await page.goto(`${origin}/#training/${course.id}`);
        await page.getByRole('button', { name: 'Start the lesson' }).click();
        for (const scenario of course.scenarios) {
          await measure('.choice-list button', scenario.id);
          await page.locator('.choice-list button').first().click();
          await page
            .getByRole('button', { name: /Next situation|See your recap/ })
            .click();
        }
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}
console.log(JSON.stringify(results));
console.log(
  'PASS: compact A layout, 15 matches / 55 lessons, guided match, 320/375/390/1280, Chromium + WebKit, optional detail, keyboard, next-step scroll.',
);
