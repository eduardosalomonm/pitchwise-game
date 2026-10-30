import assert from 'node:assert/strict';

// Gameplay checks must never populate the owner's visitor/playtest reports.
export function previewOrigin(
  value = process.env.PREVIEW_URL || 'http://localhost:3000',
  { localOnly = false } = {},
) {
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error(
      'PREVIEW_URL must be an HTTP(S) origin without credentials, path or query.',
    );
  if (localOnly && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error(
      'Data-writing integration tests only run on a loopback preview, never the public site.',
    );
  return url.origin;
}

/** Match the actual lazy entry in dev and built previews; never a similarly named activity. */
export function activityChunkMatcher(origin, module) {
  if (
    !['match-day-loader', 'tournament', 'my-tournament', 'league'].includes(
      module,
    )
  )
    throw new Error('Unknown lazy activity');
  const basename = new RegExp(
    `(?:^|/)${module}(?:\\.tsx|(?:-[A-Za-z0-9_-]+)?\\.js)$`,
  );
  return (url) => url.origin === origin && basename.test(url.pathname);
}

export async function isolateGameTelemetry(page) {
  await page.route('**/api/playtest/**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.abort();
      throw new Error('Unexpected playtest mutation during a gameplay test.');
    }
    await route.fulfill({
      json: {
        enabled: false,
        visitorTracking: false,
        contact: '',
        retentionDays: 30,
      },
    });
  });
  // Match query strings too; no gameplay check may leak into a real report.
  await page.route(/\/api\/visits(?:\?.*)?$/, (route) =>
    route.fulfill({ json: { accepted: 0 } }),
  );
}

/** Bound browser processes independently of the machine's available CPUs. */
export async function runBrowserTasks(tasks, run, concurrency = 3) {
  if (!Number.isInteger(concurrency) || concurrency < 1)
    throw new Error('BROWSER_TEST_JOBS must be a positive integer.');
  const results = Array.from({ length: tasks.length });
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
      while (next < tasks.length) {
        const index = next++;
        results[index] = await run(tasks[index]);
      }
    }),
  );
  return results;
}

export async function checkCupOverview(page, { rounds, matches, readsKey }) {
  assert.deepEqual(
    await page.locator('.cup-knockout-history h3').allInnerTexts(),
    rounds,
  );
  assert.equal(
    await page.locator('.cup-knockout-history').evaluate((el) => {
      const group = [...document.querySelectorAll('section')].find((s) =>
        /^Groups|Group stage$/.test(s.querySelector('h2')?.textContent ?? ''),
      );
      return Boolean(
        group &&
        el.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
    true,
    'newest knockout rounds precede group history',
  );
  const toggle = page.getByRole('button', {
    name: 'Tournament statistics',
    exact: true,
  });
  const box = await toggle.boundingBox();
  assert.ok(box.height >= 44);
  await toggle.click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Hide statistics', exact: true })
      .getAttribute('aria-expanded'),
    'true',
  );
  assert.match(
    await page.locator('.cup-stat-details').innerText(),
    new RegExp(`Detailed reads cover ${matches} of ${matches} matches`),
  );
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    readsKey,
  );
  const details = Object.values(stored.details);
  assert.equal(details.length, matches);
  const row = (label) =>
    page
      .locator('.cup-stat-details dl > div')
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator('dd');
  for (const phase of ['attacking', 'defending']) {
    const correct = details.reduce((n, s) => n + s[phase].correct, 0),
      total = details.reduce((n, s) => n + s[phase].total, 0);
    assert.equal(
      await row(
        `${phase === 'attacking' ? 'Attacking' : 'Defending'} good reads`,
      ).innerText(),
      `${correct} / ${total}`,
    );
  }
  for (const tone of ['positive', 'neutral', 'negative'])
    assert.equal(
      Number(
        await row(
          `${tone[0].toUpperCase() + tone.slice(1)} outcomes`,
        ).innerText(),
      ),
      details.reduce((n, s) => n + s.plays[tone], 0),
    );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    'expanded statistics fit mobile',
  );
  assert.equal(
    await page
      .locator('.cup-totals dd')
      .first()
      .evaluate((el) => getComputedStyle(el).color),
    'rgb(18, 62, 43)',
    'final totals use the dark foreground on their pale card',
  );
  await page
    .getByRole('button', { name: 'Hide statistics', exact: true })
    .click();
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('.cup-stat-details').count(), 0);

  // Old saves retain their true match record but must not fabricate read counts.
  const original = JSON.stringify(stored),
    legacy = { ...stored };
  delete legacy.details;
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [readsKey, JSON.stringify(legacy)],
  );
  await page.reload();
  await toggle.click();
  assert.match(
    await page.locator('.cup-stat-details').innerText(),
    /Detailed reads will be recorded in your next matches/,
  );
  assert.equal(await row('Attacking good reads').count(), 0);
  assert.equal(Number(await row('Matches').innerText()), matches);
  const [id, stats] = Object.entries(stored.details)[0];
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [readsKey, JSON.stringify({ ...legacy, details: { [id]: stats } })],
  );
  await page.reload();
  await toggle.click();
  assert.match(
    await page.locator('.cup-stat-details').innerText(),
    new RegExp(`Detailed reads cover 1 of ${matches} matches`),
  );
  assert.equal(
    await row('Attacking good reads').innerText(),
    `${stats.attacking.correct} / ${stats.attacking.total}`,
  );
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [readsKey, original],
  );
  await page.reload();
  await toggle.waitFor();
}

/** Optional board reading stays short, collapsible and operable with a keyboard. */
export async function checkOptionalReading(page) {
  const help = page.locator('.read-the-play');
  await help.waitFor();
  if ((await help.getAttribute('open')) !== null)
    throw new Error('Reading must start collapsed');
  const summary = help.locator('summary');
  const box = await summary.boundingBox();
  if (box.height < 44) throw new Error('Reading needs a 44px touch target');
  await summary.focus();
  await page.keyboard.press('Enter');
  if ((await help.getAttribute('open')) === null)
    throw new Error('Keyboard must open reading');
  const paragraphs = await help.locator('p').allTextContents();
  if (paragraphs.length !== 2 || paragraphs.join(' ').split(/\s+/).length > 55)
    throw new Error('Reading must stay short');
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw new Error('Reading overflows mobile');
  await page.keyboard.press('Enter');
  if ((await help.getAttribute('open')) !== null)
    throw new Error('Reading must close with keyboard');
}

/** Exercise the shared pre-decision controls once per activity, without answering. */
export async function checkBuildUp(
  page,
  { choices = '.match-choice-list button', pitch = '.match-pitch' } = {},
) {
  const controls = page.locator('.build-up-controls');
  await controls.waitFor();
  await page.waitForFunction(() =>
    document
      .querySelector('.build-up-controls')
      ?.textContent.includes('Paused · your move'),
  );
  const board = () =>
    page
      .locator(pitch)
      .evaluate((el) =>
        Array.from(el.querySelectorAll('.player-disc')).map((p) => [
          p.getAttribute('cx'),
          p.getAttribute('cy'),
        ]),
      );
  const end = await board();
  const score = await page
    .locator('.scoreboard, .first-score, .progress-label')
    .allTextContents();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const replay = page.getByRole('button', {
    name: 'Replay build-up',
    exact: true,
  });
  await replay.click();
  await replay.click();
  assert.equal(
    await page.locator(choices).first().isDisabled(),
    true,
    'no early answer during repeated replay',
  );
  assert.equal(
    await page.locator('.read-the-play').count(),
    0,
    'no future snapshot help during history',
  );
  assert.ok(
    (await page.locator(`${pitch} .has-route`).count()) > 0,
    'sequence moves, not just a timer',
  );
  for (const button of await controls.locator('button').all())
    assert.ok((await button.boundingBox()).height >= 44);
  await page
    .getByRole('button', { name: 'Skip build-up', exact: true })
    .click();
  assert.deepEqual(await board(), end);
  assert.equal(await page.locator(choices).first().isEnabled(), true);
  await replay.click();
  await page.waitForFunction(() =>
    document
      .querySelector('.build-up-controls')
      ?.textContent.includes('Paused · your move'),
  );
  assert.deepEqual(
    await board(),
    end,
    'autoplay ends exactly at the decision board',
  );
  assert.equal(await page.locator(`${pitch} .has-route`).count(), 0);
  assert.deepEqual(
    await page
      .locator('.scoreboard, .first-score, .progress-label')
      .allTextContents(),
    score,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .getByRole('button', { name: 'View before the play', exact: true })
    .click();
  assert.equal(
    await page.locator(`${pitch} .has-route`).count(),
    0,
    'reduced motion uses a still frame',
  );
  assert.equal(await page.locator(choices).first().isDisabled(), true);
  await page
    .getByRole('button', { name: 'Return to decision', exact: true })
    .click();
  assert.deepEqual(await board(), end);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
}

/** Every visible button in `selector` has WCAG AA text contrast against what is painted behind it. */
export async function assertReadableButtons(page, selector, label) {
  const results = await page
    .locator(`${selector} button:visible, ${selector} a.button:visible`)
    .evaluateAll((buttons) => {
      // Tailwind colours are oklch(); let the canvas convert any CSS colour to RGBA.
      const context = document
        .createElement('canvas')
        .getContext('2d', { willReadFrequently: true });
      const rgba = (value) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
        return [r, g, b, a / 255];
      };
      const luminance = ([r, g, b]) => {
        const [R, G, B] = [r, g, b].map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * R + 0.7152 * G + 0.0722 * B;
      };
      const background = (element) => {
        for (let node = element; node; node = node.parentElement) {
          const [r, g, b, a = 1] = rgba(getComputedStyle(node).backgroundColor);
          if (a > 0.5) return [r, g, b];
        }
        return [255, 255, 255];
      };
      return buttons.map((button) => {
        const text = luminance(rgba(getComputedStyle(button).color));
        const back = luminance(background(button));
        return {
          name: button.innerText.trim(),
          ratio: (Math.max(text, back) + 0.05) / (Math.min(text, back) + 0.05),
        };
      });
    });
  if (!results.length) throw new Error(`${label}: no visible buttons to check`);
  for (const { name, ratio } of results)
    if (ratio < 4.5)
      throw new Error(
        `${label}: "${name}" contrast ${ratio.toFixed(2)}:1 is below 4.5:1`,
      );
}
