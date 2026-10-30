import assert from 'node:assert/strict';
import { isolateGameTelemetry, previewOrigin } from './browser-test-support.mjs';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = previewOrigin();
const errors = [];
async function painted(page) {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no page-level horizontal scroll');
}
async function touch(locator) {
  const box = await locator.boundingBox();
  assert.ok(box && box.height >= 44, 'interactive target remains at least 44px high');
}
for (const [engine, launcher] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await launcher.launch();
  try {
    for (const width of [320, 375, 390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: width < 640 ? 667 : 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      await isolateGameTelemetry(page);
      await page.goto(origin);
      await page.locator('.play-options').waitFor();
      await painted(page);
      assert.equal(await page.locator('.play-options a').count(), 2);
      if (width === 375) assert.ok((await page.locator('.play-card').last().boundingBox()).y < 500, 'both primary destinations appear early');
      await page.getByRole('link', { name: /^Competitions/ }).click();
      await page.locator('.tournament-menu').waitFor();
      await painted(page);
      assert.equal(await page.locator('.play-options a').count(), 3);
      if (width === 375) assert.ok((await page.locator('.play-card').last().boundingBox()).y < 550, 'third competition no longer starts below the fold');
      await page.getByRole('link', { name: /^My League/ }).click();
      await page.getByRole('heading', { name: 'Build your season.' }).waitFor();
      await painted(page);
      const club = page.getByLabel('Club name', { exact: true });
      assert.equal(await club.inputValue(), 'Pitchwise FC');
      assert.equal(await page.locator('.club-kit-picker').getAttribute('open'), null);
      await touch(page.locator('.club-kit-picker summary'));
      await touch(page.getByLabel('Teams, including yours'));
      for (const label of await page.locator('.compact-options label').all()) await touch(label);
      if (width === 375) assert.ok((await page.getByRole('button', { name: 'Start My League' }).boundingBox()).y < 850, 'setup is substantially shorter than the old 1300px');
      await club.fill('Club With A Long Name FC');
      await page.getByLabel('Teams, including yours').selectOption('12');
      await page.locator('.league-legs label').last().click();
      await page.locator('.club-kit-picker summary').focus();
      await page.keyboard.press('Enter');
      await page.locator('.my-kits label').filter({ has: page.locator('input[value="forest"]') }).click();
      await page.locator('.club-kit-picker summary').click();
      assert.match(await page.locator('.club-summary').innerText(), /Club With A Long Name FC[\s\S]*12 teams · Home & away · Intermediate[\s\S]*22 matches/);
      await painted(page);
      await club.fill('');
      assert.equal(await page.getByRole('button', { name: 'Start My League' }).isDisabled(), true);
      await club.fill('Mobile FC');
      await page.getByRole('button', { name: 'Start My League' }).click();
      await page.locator('.cup-next').waitFor();
      await painted(page);
      assert.equal(await page.locator('.cup-next .match-kit-lineup').count(), 0, 'no duplicated fixture names');
      assert.equal(await page.locator('.cup-next .kit-swatch').count(), 2);
      assert.equal(await page.locator('.league-standings tbody .is-us').count(), 1);
      const saved = await page.evaluate(() => localStorage.getItem('pitchwise-league-v1'));
      await page.getByRole('link', { name: 'Competitions', exact: true }).click();
      await page.getByText('Continue · Matchweek 1', { exact: true }).waitFor();
      await page.getByRole('link', { name: /^My League/ }).click();
      await page.locator('.cup-next').waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem('pitchwise-league-v1')), saved);
      await page.getByRole('link', { name: 'Competitions', exact: true }).click();
      await page.getByRole('link', { name: /^My Tournament/ }).click();
      await page.getByRole('heading', { name: 'Create your club.' }).waitFor();
      await painted(page);
      assert.equal(await club.inputValue(), 'Pitchwise FC');
      await page.getByRole('button', { name: 'Start My Tournament' }).click();
      await page.locator('.cup-next').waitFor();
      await page.reload();
      await page.locator('.cup-next').waitFor();
      assert.match(await page.locator('.cup-next h2').innerText(), /Pitchwise FC/);
      await painted(page);
      await page.getByRole('link', { name: 'Competitions', exact: true }).click();
      await page.getByRole('link', { name: /^The Readers’ Cup/ }).click();
      await page.locator('.cup-next').waitFor();
      await painted(page);
      assert.equal(await page.locator('.activity-switch,.competition-switch').count(), 0);
      await page.locator('.cup-fixtures > summary').click();
      assert.ok(await page.locator('.cup-fixtures .our-fixture').first().isVisible());
      await page.getByText('Full knockout bracket', { exact: true }).click();
      assert.ok(await page.locator('.bracket-slot').first().isVisible());
      await painted(page);
      if (width === 375) {
        // Larger system text must wrap without clipping controls or forcing sideways scroll.
        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        await painted(page);
        await page.getByRole('link', { name: 'Competitions', exact: true }).click();
        await page.locator('.tournament-menu').waitFor();
        await painted(page);
      }
      await context.close();
      console.log(`PASS compact menus: ${engine} ${width}px, defaults, kit disclosure, format summary, resume and navigation.`);
    }
  } finally { await browser.close(); }
}
assert.deepEqual(errors, []);
