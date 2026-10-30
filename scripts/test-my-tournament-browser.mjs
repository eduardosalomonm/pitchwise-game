import assert from 'node:assert/strict';
import { checkOptionalReading, checkBuildUp } from './browser-test-support.mjs';
import { assertReadableButtons, isolateGameTelemetry, previewOrigin, checkCupOverview } from './browser-test-support.mjs';
import { createMyCup, currentMyGame, finishMyGame } from '../lib/my-tournament.ts';
import { myCupFixture } from '../lib/my-tournament-matches.ts';
import { getTeam } from '../lib/teams.ts';
import { closingMoment, closingScore } from '../lib/tournament-stories.ts';
import { chooseMatchOption, continueMatch, createMatchRun } from '../lib/match-day.ts';

// Exercise the visible setup: defaults, advanced settings, a five-match cup and
// restoration at full time. Read the generated seed, never bypass the form.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = previewOrigin();
const team = { name: 'Real Barrio', kitId: 'forest', difficulty: 'easy', length: 'short', size: 8 };
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 320, height: 750 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
try {
  await isolateGameTelemetry(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data) => { window.__sharedResult = data; },
    });
  });
  await page.goto(origin);
  await page.evaluate(() => {
    localStorage.removeItem('pitchwise-my-cup-v1');
    localStorage.removeItem('pitchwise-my-cup-honours-v2');
  });
  await page.goto(`${origin}/#my-tournament`);
  await page.getByRole('heading', { name: 'Create your club.' }).waitFor();
  assert.equal(await page.locator('.my-kits label').count(), 8);
  assert.equal(await overflow(), false, 'setup fits 320px');
  // Default setup is simple; the Advanced tournament box reveals difficulty, length and size.
  assert.equal(await page.locator('.my-advanced').count(), 0);
  assert.match(await page.locator('.my-advanced-toggle').innerText(), /Intermediate · Standard matches · 16 teams/);
  await page.getByLabel('Club name', { exact: true }).fill(team.name);
  await page.locator('.club-kit-picker summary').click();
  await page.locator('.my-kits label').filter({ has: page.locator('input[value="forest"]') }).click();
  assert.equal(await page.locator('.my-kits input[value="forest"]').isChecked(), true);
  await page.getByRole('button', { name: 'Start My Tournament' }).click();
  await page.locator('.cup-next').waitFor();
  const defaults = await page.evaluate(() => JSON.parse(localStorage.getItem('pitchwise-my-cup-v1')));
  assert.deepEqual(defaults.team, { name: team.name, kitId: team.kitId, difficulty: 'intermediate', length: 'standard', size: 16 });
  // A fresh device starts a second cup through the advanced form.
  await page.evaluate(() => localStorage.removeItem('pitchwise-my-cup-v1'));
  await page.reload();
  await page.getByLabel('Club name', { exact: true }).fill(team.name);
  await page.locator('.club-kit-picker summary').click();
  await page.locator('.my-kits label').filter({ has: page.locator('input[value="forest"]') }).click();
  await page.locator('.my-advanced-toggle').click();
  assert.deepEqual(await page.locator('.my-advanced legend').allInnerTexts(), ['Difficulty', 'Match length', 'Tournament size']);
  assert.equal(await page.locator('.my-advanced label').count(), 9);
  assert.equal(await overflow(), false, 'advanced settings fit 320px');
  for (const [name, value] of [['difficulty', 'easy'], ['length', 'short'], ['size', '8']]) {
    const input = page.locator(`.my-advanced input[name="${name}"][value="${value}"]`);
    await page.locator('.my-advanced label').filter({ has: page.locator(`input[name="${name}"][value="${value}"]`) }).click();
    assert.equal(await input.isChecked(), true);
  }
  // Collapsing a disclosure must not discard the settings its summary still shows.
  await page.locator('.my-advanced-toggle').click();
  assert.equal(await page.locator('.my-advanced').count(), 0);
  assert.match(await page.locator('.my-advanced-toggle').innerText(), /Easy · Short matches · 8 teams/);
  await page.getByRole('button', { name: 'Start My Tournament' }).click();
  await page.locator('.cup-next').waitFor();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pitchwise-my-cup-v1')));
  assert.deepEqual(saved.team, team);
  let cup = createMyCup(saved.seed, team);
  await page.locator('.cup-fixtures > summary').click();
  for (let index = 0; index < 3; index++) {
    const row = page.locator('.cup-fixtures .our-fixture').nth(index);
    const names = await row.locator('.team-name > span').allInnerTexts();
    assert.equal(names[index % 2 ? 1 : 0], team.name, 'upcoming fixtures alternate home and away');
  }
  // The shortest branches still need a whole match's worth of reads. Test this
  // before the ideal cup, then restore the untouched full-time save boundary.
  const firstFixture = myCupFixture(cup, 0);
  await page.getByRole('button', { name: 'Kick off', exact: true }).click();
  await checkOptionalReading(page);
  await checkBuildUp(page);
  let fastRun = createMatchRun(firstFixture.moments);
  let fastDecisions = 0;
  while (fastRun.status !== 'final') {
    assert.ok(++fastDecisions <= firstFixture.moments.reduce((n, m) => n + m.nodes.length, 0));
    const m = firstFixture.moments[fastRun.momentIndex];
    const n = m.nodes.find((x) => x.id === fastRun.nodeId);
    const choice = n.choices.find((c) => c.outcome && c.tone !== 'positive') ?? n.choices.find((c) => c.outcome) ?? n.choices[0];
    await page.locator('.match-choice-list button').filter({ hasText: choice.label.replaceAll('Pitchwise FC', team.name) }).click();
    await page.locator('.match-consequence button').click();
    fastRun = continueMatch(chooseMatchOption(fastRun, m.id, n.id, choice.id, firstFixture.moments), firstFixture.moments);
    if (fastDecisions < 4) assert.equal(await page.locator('.final-whistle').count(), 0, 'two short branches cannot end the game');
  }
  await page.locator('.final-whistle').waitFor();
  assert.ok(fastDecisions >= 4, 'Short Easy matches need at least four decisions, even with early endings');
  await page.evaluate((original) => {
    localStorage.setItem('pitchwise-my-cup-v1', JSON.stringify(original));
    localStorage.removeItem('pitchwise-my-cup-reads-v1');
  }, saved);
  await page.reload();
  await page.locator('.cup-next').waitFor();
  for (let round = 0; round < 5; round++) {
    const fixture = myCupFixture(cup, round);
    if (await page.locator('.cup-next').isVisible()) {
      const preview = (await page.locator('.cup-next h2').innerText()).replace(/\s+/g, ' ');
      assert.equal(preview, round % 2 ? `${fixture.opponent} vs ${team.name}` : `${team.name} vs ${fixture.opponent}`, 'preview has the same venue as the match');
    }
    if (round === 0 || !(await page.locator('.match-choice-list').isVisible()))
      await page.getByRole('button', { name: 'Kick off', exact: true }).click();
    let run = createMatchRun(fixture.moments);
    const clock = fixture.moments.at(-1).id.endsWith('-clock');
    let decisions = 0;
    while (run.status !== 'final') {
      assert.ok(++decisions <= fixture.moments.reduce((count, m) => count + m.nodes.length, 0), 'the match reaches full time without a cycle');
      const score = closingScore(run.results);
      const moments = clock ? [...fixture.moments.slice(0, -1), closingMoment(fixture.moments.at(-1).id, score.home, score.away)] : fixture.moments;
      const m = moments[run.momentIndex];
      const n = m.nodes.find((x) => x.id === run.nodeId);
      const choice = n.choices.find((c) => c.tone === 'positive');
      const label = choice.label.replaceAll('Pitchwise FC', team.name);
      const button = page.locator('.match-choice-list button').filter({ hasText: label });
      assert.equal(await button.count(), 1, `${n.id}: unambiguous full option label`);
      await button.click();
      await page.locator('.match-consequence button').click();
      run = continueMatch(chooseMatchOption(run, m.id, n.id, choice.id, moments), moments);
    }
    await page.locator('.final-whistle').waitFor();
    assert.ok(decisions >= 4 + Number(round >= 3) + Number(round === 4), 'each visible match meets the minimum pace');
    assert.equal(await page.locator('.final-score strong').innerText(), round % 2 ? `${run.awayScore}–${run.homeScore}` : `${run.homeScore}–${run.awayScore}`);
    assert.ok(run.homeScore > run.awayScore);
    assert.equal(await page.locator('.final-score > span').first().innerText(), round % 2 ? getTeam(fixture.opponent).name : team.name);
    const atFullTime = await page.evaluate(() => JSON.parse(localStorage.getItem('pitchwise-my-cup-v1')));
    assert.equal(atFullTime.results.length, round + 1, 'a finished match is saved before Continue');
    assert.deepEqual(atFullTime.results.at(-1).slice(1, 3), [run.homeScore, run.awayScore]);
    if (round === 0) {
      await page.getByRole('button', { name: 'Share result', exact: true }).click();
      const shared = await page.evaluate(() => window.__sharedResult);
      assert.equal(new URL(shared.url).hash, '#my-tournament', 'sharing returns friends to the activity actually played');
      assert.ok(shared.text.includes(`${team.name} ${run.homeScore}–${run.awayScore}`), 'share uses the visible result');
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: async (text) => { window.__copiedResult = text; } },
        });
      });
      await page.getByRole('button', { name: 'Share result', exact: true }).click();
      await page.getByText('Result copied.', { exact: true }).waitFor();
      assert.ok((await page.evaluate(() => window.__copiedResult)).endsWith(`${origin}/#my-tournament`), 'clipboard fallback shares the same activity');
      // Refresh at the result, before Continue: this was the missing save boundary.
      await page.reload();
      await page.locator('.cup-next').waitFor();
      assert.match(await page.locator('.cup-next .eyebrow').innerText(), /Group game 2/i);
    } else {
      await assertReadableButtons(page, '.cup-result-actions', 'full-time actions');
      await page.locator('.round-report').waitFor();
      assert.equal(await page.getByRole('region', { name: 'Tournament summary' }).count(), 1);
      assert.equal(await page.getByText('Around the cup', { exact: true }).count(), 0);
      assert.equal(await overflow(), false, 'the personal cup report fits 320px');
      if (round === 2) {
        // The most common phone width as well as the narrowest one.
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(await overflow(), false, 'the cup report fits 390px');
        await page.setViewportSize({ width: 320, height: 750 });
      }
      if (round < 3) assert.match(await page.locator('.recap-stats').innerText(), /Group position[\s\S]*Points/);
      else assert.ok((await page.locator('.round-headlines li').count()) > 0, 'knockout report has headlines');
      await page.getByRole('button', { name: round < 4 ? 'Play next match' : 'View full tournament', exact: true }).click();
    }
    cup = finishMyGame(cup, currentMyGame(cup).id, run.homeScore, run.awayScore);
    console.log(`Round ${round + 1}: ${run.homeScore}–${run.awayScore} (${fixture.moments.length} plays)`);
  }
  await page.getByRole('heading', { name: `${team.name} are champions!` }).waitFor();
  assert.equal(await page.locator('.cup-celebration.is-champion .cup-path li').count(), 5);
  assert.equal(await page.locator('.cup-fixtures').getAttribute('open'), '', 'full overview opens the fixture history');
  for (let index = 0; index < 5; index++) {
    const round = 4 - index;
    const row = page.locator('.cup-fixtures .our-fixture').nth(index);
    const names = await row.locator('.team-name > span').allInnerTexts();
    assert.equal(names[round % 2 ? 1 : 0], team.name, 'played fixtures keep their original venue');
    const result = cup.games[round].find((g) => g.home === team.name || g.away === team.name);
    const us = result.home === team.name ? result.homeGoals : result.awayGoals;
    const them = result.home === team.name ? result.awayGoals : result.homeGoals;
    assert.equal(await row.locator('strong').innerText(), round % 2 ? `${them}–${us}` : `${us}–${them}`, 'played score follows its team');
    assert.ok(names.includes(result.home === team.name ? result.away : result.home), 'latest opponent appears first');
    const path = page.locator('.cup-path li').nth(index);
    assert.equal(await path.locator('.cup-path-venue').innerText(), round % 2 ? 'Away' : 'Home');
    assert.ok((await path.locator('strong').innerText()).startsWith(round % 2 ? `${them}–${us}` : `${us}–${them}`), 'the cup road uses fixture score order too');
  }
  assert.match(await page.locator('.cup-honours').first().innerText(), /Titles 1/);
  assert.equal(await overflow(), false, 'champion screen fits 320px');
  await checkCupOverview(page, { rounds: ['Final', 'Semi-final'], matches: 5, readsKey: 'pitchwise-my-cup-reads-v1' });
  assert.equal(await page.locator('text=Pitchwise FC').count(), 0, 'our club name replaces Pitchwise FC');
  await page.reload();
  await page.getByRole('heading', { name: `${team.name} are champions!` }).waitFor();
  assert.match(await page.locator('.cup-honours').first().innerText(), /Titles 1/, 'refresh does not recount the title');
  await checkCupOverview(page, { rounds: ['Final', 'Semi-final'], matches: 5, readsKey: 'pitchwise-my-cup-reads-v1' });
  assert.deepEqual(errors, []);
  console.log('PASS: actual default/advanced setup, five ideal matches, full-time saving, champion honours, readable full-time actions, 320/390px, no browser errors.');
} finally {
  await browser.close();
}
