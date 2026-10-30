import assert from 'node:assert/strict';
import { previewOrigin } from './browser-test-support.mjs';
import { PROGRESS_KEY } from '../lib/course-progress.ts';
import { courses } from '../lib/scenarios.ts';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const origin = previewOrigin();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 320, height: 750 } });
const requests = [];
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.route('**/api/playtest/**', (route) => {
    assert.equal(route.request().method(), 'GET');
    assert.equal(
      new URL(route.request().url()).pathname,
      '/api/playtest/config',
    );
    return route.fulfill({
      json: {
        enabled: false,
        visitorTracking: true,
        contact: 'Synthetic organiser',
        retentionDays: 30,
      },
    });
  });
  await page.route('**/api/visits', (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: { accepted: 1 } });
  });
  const firstVisit = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/visits',
  );
  await page.goto(origin);
  const notice = page.getByRole('complementary', { name: 'Visitor recording' });
  await notice.waitFor();
  assert.match(await notice.innerText(), /No IP address is stored/);
  await page.waitForFunction(
    () => localStorage.getItem('pitchwise-visitor-id') !== null,
  );
  await (await firstVisit).finished();
  assert.equal(requests.length, 1);
  const off = notice.getByRole('button', { name: 'Play without recording' });
  assert.ok((await off.boundingBox()).height >= 44);
  await off.focus();
  await page.keyboard.press('Enter');
  await notice.getByRole('button', { name: 'Share my visits' }).waitFor();
  const count = requests.length;
  await page.goto(`${origin}/#training/full-back`);
  await page.getByRole('button', { name: 'Start the lesson' }).click();
  await page.locator('.choice-list button').first().click();
  await page.locator('.reveal-panel').waitFor();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  assert.equal(requests.length, count, 'opt-out stops new game events');
  await page.reload();
  await notice.getByRole('button', { name: 'Share my visits' }).waitFor();
  assert.equal(
    requests.length,
    count,
    'saved opt-out blocks the next visit too',
  );
  const enabledVisit = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/visits',
  );
  await notice.getByRole('button', { name: 'Share my visits' }).click();
  await notice
    .getByRole('button', { name: 'Play without recording' })
    .waitFor();
  await (await enabledVisit).finished();
  assert.equal(requests.length, count + 1);
  assert.notEqual(requests.at(-1).sessionId, requests[0].sessionId);
  assert.equal(requests.at(-1).visitorId, requests[0].visitorId);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);

  // The optional provider must retain a failed batch and retry its original IDs.
  // All routes are mocks; this never starts a real playtest or touches owner data.
  const optional = await browser.newPage({
    viewport: { width: 320, height: 750 },
  });
  optional.on('pageerror', (error) => errors.push(error.message));
  const batches = [];
  let unavailable = true;
  await optional.route('**/api/visits', () => {
    throw new Error('Visitor recording is disabled in this test.');
  });
  await optional.route('**/api/playtest/**', (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/api/playtest/config' && request.method() === 'GET')
      return route.fulfill({
        json: {
          enabled: true,
          visitorTracking: false,
          contact: 'Synthetic organiser',
          retentionDays: 30,
        },
      });
    if (path === '/api/playtest/session' && request.method() === 'POST') {
      const data = request.postDataJSON();
      assert.equal(data.shareIp, false);
      return route.fulfill({
        status: 201,
        json: {
          sessionId: crypto.randomUUID(),
          token: 'synthetic-capability',
          alias: data.alias,
          ipStored: false,
        },
      });
    }
    if (path === '/api/playtest/session' && request.method() === 'DELETE') {
      assert.equal(
        request.headers().authorization,
        'Bearer synthetic-capability',
      );
      return route.fulfill({ status: 204 });
    }
    if (path === '/api/playtest/events' && request.method() === 'POST') {
      batches.push(request.postDataJSON().events);
      return route.fulfill({
        status: unavailable ? 503 : 200,
        json: unavailable
          ? { error: 'Temporary storage outage' }
          : { accepted: batches.at(-1).length },
      });
    }
    throw new Error(
      `Unexpected optional playtest request: ${request.method()} ${path}`,
    );
  });
  await optional.goto(origin);
  await optional
    .getByRole('button', { name: 'Play & share my playtest', exact: true })
    .waitFor();
  assert.equal(batches.length, 0, 'no optional recording before accepting');
  assert.equal(
    await optional.getByLabel('Also share my IP', { exact: false }).isChecked(),
    false,
    'IP remains opt-in',
  );
  const failedBatch = optional.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/playtest/events' &&
      response.status() === 503,
  );
  await optional
    .getByRole('button', { name: 'Play & share my playtest', exact: true })
    .click();
  await (await failedBatch).finished();
  await optional
    .locator('.playtest-active summary')
    .filter({ hasText: 'syncing' })
    .waitFor();
  assert.equal(batches.length, 1, 'transient failure does not spin');
  const firstId = batches[0][0].eventId;
  assert.equal(batches[0][0].type, 'visit');
  unavailable = false;
  const retry = optional.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/playtest/events' &&
      response.status() === 200,
  );
  await optional.evaluate(() => window.dispatchEvent(new Event('online')));
  await (await retry).finished();
  await optional
    .locator('.playtest-active summary')
    .filter({ hasText: 'sharing on' })
    .waitFor();
  assert.ok(
    batches[1].some((event) => event.eventId === firstId),
    'the retry preserves the unsaved visit ID',
  );
  assert.equal(
    await optional.locator('.playtest-active output').count(),
    0,
    'a recoverable outage does not permanently pause sharing',
  );
  await optional.goto(`${origin}/#training/full-back`);
  await optional
    .getByRole('button', { name: 'Start the lesson', exact: true })
    .click();
  const recordedAnswer = optional.waitForResponse((response) => {
    if (new URL(response.url()).pathname !== '/api/playtest/events')
      return false;
    return response
      .request()
      .postDataJSON()
      .events.some((event) => event.type === 'course_answer');
  });
  const scenario = courses.find((course) => course.id === 'full-back')
    .scenarios[0];
  const correct = scenario.choices.find(
    (choice) => choice.id === scenario.correctChoiceId,
  );
  await optional
    .locator('.choice-list button')
    .filter({ hasText: correct.label })
    .click();
  await (await recordedAnswer).finished();
  await optional
    .locator('.choice-list button[aria-pressed=true]')
    .evaluate((button) => button.click());
  await optional.locator('.reveal-panel').waitFor();
  const answers = batches
    .flat()
    .filter((event) => event.type === 'course_answer');
  assert.equal(answers.length, 1, 'repeated answer taps record one decision');
  assert.equal(answers[0].courseId, 'full-back');
  assert.equal(answers[0].correct, true);
  const progress = await optional.evaluate(
    (key) => localStorage.getItem(key),
    PROGRESS_KEY,
  );
  assert.ok(JSON.parse(progress)['full-back'].includes(scenario.id));
  await optional.locator('.playtest-active summary').click();
  await optional
    .getByRole('button', { name: 'Stop & delete my playtest', exact: true })
    .click();
  await optional
    .getByRole('button', { name: 'Play & share my playtest', exact: true })
    .waitFor();
  assert.equal(
    await optional.evaluate((key) => localStorage.getItem(key), PROGRESS_KEY),
    progress,
    'withdrawal does not erase training progress',
  );
  const afterWithdrawal = batches.length;
  await optional
    .getByRole('button', { name: 'Next situation', exact: true })
    .click();
  await optional.locator('.choice-list button').first().click();
  await optional.locator('.reveal-panel').waitFor();
  assert.equal(
    batches.length,
    afterWithdrawal,
    'withdrawal stops new optional events',
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: visitor notice, keyboard opt-out, persistent preference, fresh re-enable session and optional playtest retry with identical IDs; mocked collectors only.',
  );
} finally {
  await browser.close();
}
