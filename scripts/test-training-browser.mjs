import assert from 'node:assert/strict';
import {
  isolateGameTelemetry,
  previewOrigin,
  checkOptionalReading,
  checkBuildUp,
} from './browser-test-support.mjs';
import { courses } from '../lib/scenarios.ts';
import { PROGRESS_KEY } from '../lib/course-progress.ts';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 320, height: 750 },
  reducedMotion: 'reduce',
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
const origin = previewOrigin();
try {
  await isolateGameTelemetry(page);
  await page.goto(origin);
  await page.evaluate((key) => localStorage.removeItem(key), PROGRESS_KEY);
  for (const [courseIndex, course] of courses.entries()) {
    await page.goto(`${origin}/#training/${course.id}`);
    await page.getByRole('button', { name: 'Start the lesson' }).click();
    await checkOptionalReading(page);
    if (courseIndex === 0)
      await checkBuildUp(page, {
        choices: '.choice-list button',
        pitch: '.lesson-pitch-region .tactical-pitch',
      });
    for (const [index, scenario] of course.scenarios.entries()) {
      assert.equal(
        await page.locator('.build-up-controls').count(),
        1,
        `${scenario.id}: build-up available`,
      );
      await page
        .getByRole('button', { name: 'View before the play', exact: true })
        .click();
      assert.equal(
        await page.locator('.choice-list button').first().isDisabled(),
        true,
      );
      await page
        .getByRole('button', { name: 'Return to decision', exact: true })
        .click();
      assert.equal(
        await page.locator('.lesson-pitch-region .pitch-goal').count(),
        2,
      );
      assert.equal(
        await page.locator('.lesson-pitch-region .you-label').textContent(),
        'YOU',
      );
      const correct = scenario.choices.find(
        (choice) => choice.id === scenario.correctChoiceId,
      );
      const chosen =
        courseIndex === 0 && index === 0
          ? scenario.choices.find(
              (choice) => choice.id !== scenario.correctChoiceId,
            )
          : correct;
      await page
        .locator('.choice-list button')
        .filter({ hasText: chosen.label })
        .click();
      await page.locator('.reveal-panel').waitFor();
      if (courseIndex === 0 && index === 0) {
        // Locked answers leave the main flow; a stale click cannot change the score.
        await page
          .locator('.choice-list button')
          .filter({ hasText: correct.label })
          .evaluate((button) => button.click());
        assert.equal(
          await page
            .locator('.choice-list button[aria-pressed=true]')
            .innerText()
            .then((text) => text.includes(chosen.label)),
          true,
        );
      }
      assert.equal(await page.locator('.lesson-copy').isVisible(), false);
      const nextButton = page.getByRole('button', {
        name: /Next situation|See your recap/,
      });
      assert.equal(await nextButton.isEnabled(), true);
      assert.equal(
        await page.locator('.scenario-illustration').isVisible(),
        false,
        'art is optional',
      );
      await page.getByText('Why this works', { exact: true }).click();
      await page.locator('.scenario-illustration').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const img = document.querySelector('.scenario-illustration img');
        return img?.complete && img.naturalWidth > 0;
      });
      assert.equal(
        await page
          .locator('.scenario-illustration img')
          .evaluate((img) => img.complete && img.naturalWidth > 0),
        true,
        `${scenario.id}: image loads`,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${scenario.id}: 320px`,
      );
      if (
        index === 0 &&
        ['full-back', 'defensive-midfielder'].includes(course.id)
      ) {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        // Reloading the motion preference alone doesn't recreate the timeline; replay does.
        await page.getByText('Explore the movement', { exact: true }).click();
        await page
          .locator('.beat-buttons button')
          .filter({ hasText: 'Movement' })
          .click();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(
          await page
            .locator('.lesson-pitch-region')
            .getAttribute('data-playback'),
          'movement',
        );
      }
      await page
        .getByRole('button', { name: /Next situation|See your recap/ })
        .click();
    }
    await page.locator('.complete-wrap').waitFor();
    assert.equal(
      await page.locator('.score-ring strong').innerText(),
      courseIndex === 0 ? '4' : '5',
    );
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)),
      PROGRESS_KEY,
    );
    assert.equal(saved[course.id].length, courseIndex === 0 ? 4 : 5);
  }
  // A new non-reduced lesson tests actual repeated replay and off-screen return.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`${origin}/#training/full-back`);
  await page.getByRole('button', { name: 'Start the lesson' }).click();
  const first = courses.find((c) => c.id === 'full-back').scenarios[0];
  await page
    .locator('.choice-list button')
    .filter({
      hasText: first.choices.find((c) => c.id === first.correctChoiceId).label,
    })
    .click();
  const starsBefore = await page.evaluate(
    (key) => localStorage.getItem(key),
    PROGRESS_KEY,
  );
  const replay = page.getByRole('button', { name: 'Replay movement' });
  await replay.waitFor();
  const initialReplay = Number(
    await page.locator('.lesson-pitch-region').getAttribute('data-replay'),
  );
  await page.getByText('Why this works', { exact: true }).click();
  for (let i = 0; i < 3; i++) {
    await page.locator('.scenario-illustration').scrollIntoViewIfNeeded();
    await replay.click();
    await page.waitForFunction(
      (value) =>
        document.querySelector('.lesson-pitch-region')?.dataset.replay ===
        String(value),
      initialReplay + i + 1,
    );
    await page.waitForFunction(() => {
      const svg = document.querySelector('.lesson-pitch-region svg');
      const rect = svg.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= innerHeight;
    });
  }
  await page.waitForFunction(
    () =>
      document.querySelector('.lesson-pitch-region')?.dataset.playback ===
      'movement',
  );
  assert.equal(
    await page.evaluate((key) => localStorage.getItem(key), PROGRESS_KEY),
    starsBefore,
    'replay never awards more stars',
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: all 55 training reveals, illustrations, locked wrong answers, correct-only stars, 320px and repeated animated replay.',
  );
} finally {
  await browser.close();
}
