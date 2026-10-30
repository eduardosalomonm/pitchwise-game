import assert from 'node:assert/strict';
import { checkOptionalReading, checkBuildUp } from './browser-test-support.mjs';
import {
  isolateGameTelemetry,
  previewOrigin,
  checkCupOverview,
} from './browser-test-support.mjs';
import {
  cupFixture,
  closingMoment,
  closingScore,
} from '../lib/tournament-stories.ts';
import {
  createMatchRun,
  chooseMatchOption,
  continueMatch,
} from '../lib/match-day.ts';
import {
  createTournament,
  currentTournamentGame,
  finishTournamentGame,
  OUR_TEAM,
  createShootout,
  PENALTY_ZONES,
} from '../lib/tournament.ts';
import { planPenaltyPair, playPenaltyPair } from './penalty-test-driver.mjs';
// Cups are drawn from a random seed and saved on the device. Pin a known seed through the
// saved-cup format so this script can predict opponents and plays.
const SEED = 2026;
const CUP_KEY = 'pitchwise-cup-v1';
const freshCup = JSON.stringify({ v: 1, seed: SEED, results: [] });
const withoutCup = (storage) => {
  const values = JSON.parse(storage);
  delete values[CUP_KEY];
  delete values['pitchwise-cup-honours-v1'];
  delete values['pitchwise-cup-reads-v1'];
  return JSON.stringify(values);
};
// After every cup match a round report sits between the result and the next step.
async function throughReport(page, next) {
  await page.locator('.round-report').waitFor();
  assert.ok((await page.locator('.round-report').innerText()).length > 0);
  await page
    .getByRole('button', {
      name: next ? 'Play next match' : 'View full tournament',
      exact: true,
    })
    .click();
}
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
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [CUP_KEY, freshCup],
  );
  await page.goto(`${origin}/#tournament`);
  await page
    .getByRole('heading', { name: 'The Readers’ Cup', exact: true })
    .waitFor();
  assert.equal(await page.locator('.competition-back').count(), 1);
  assert.equal(await page.locator('.activity-switch').count(), 0);
  assert.equal(await page.locator('.bracket-slot').count(), 15);
  await page.locator('.cup-fixtures > summary').click();
  for (let index = 0; index < 3; index++) {
    const names = await page
      .locator('.cup-fixtures .our-fixture')
      .nth(index)
      .locator('.team-name > span')
      .allInnerTexts();
    assert.equal(
      names[index % 2 ? 1 : 0],
      OUR_TEAM,
      'Readers’ Cup upcoming fixtures alternate home and away',
    );
  }
  assert.equal(
    await page
      .locator('.cup-next')
      .innerText()
      .then((text) =>
        /Five tactical|0–0|Easy|Hard|find the|attack the/i.test(text),
      ),
    false,
  );
  await page
    .getByText('Full knockout bracket', { exact: true })
    .click();
  assert.equal(
    new URL(page.url()).hash,
    '#tournament',
    'section navigation cannot leave or reset the cup',
  );
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `overflow at ${width}`,
    );
  }
  await page.setViewportSize({ width: 320, height: 750 });
  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  let tournament = createTournament(SEED);
  let alreadyPlaying = false;
  for (let round = 0; round < 7; round++) {
    const game = currentTournamentGame(tournament),
      opponent = game.home === OUR_TEAM ? game.away : game.home;
    const fixture = cupFixture(round, opponent);
    let run = createMatchRun(fixture.moments);
    if (!alreadyPlaying)
      await page.getByRole('button', { name: 'Kick off', exact: true }).click();
    alreadyPlaying = false;
    assert.equal(await page.locator('.match-training-stars').count(), 0);
    if (round === 2) {
      // Compact match Back and browser Back both ask before discarding an active cup match.
      const dialogs = [];
      const dismiss = (dialog) => {
        dialogs.push(dialog.message());
        dialog.dismiss();
      };
      page.on('dialog', dismiss);
      const logoDialog = page.waitForEvent('dialog');
      await page.locator('.play-back').click();
      await logoDialog;
      await page.locator('.match-choice-list').waitFor();
      await checkOptionalReading(page);
      await checkBuildUp(page);
      const backDialog = page.waitForEvent('dialog');
      await page.goBack();
      await backDialog;
      await page.locator('.match-choice-list').waitFor();
      page.off('dialog', dismiss);
      assert.equal(dialogs.length, 2, `exit warnings: ${dialogs.join(' | ')}`);
      assert.ok(
        dialogs.every((m) => /Completed cup results are saved/.test(m)),
      );
      assert.equal(new URL(page.url()).hash, '#tournament');
    }
    while (run.status !== 'final') {
      const score = closingScore(run.results),
        moments = [
          ...fixture.moments.slice(0, 4),
          closingMoment(fixture.moments[4].id, score.home, score.away),
        ];
      const moment = moments[run.momentIndex],
        node = moment.nodes.find((n) => n.id === run.nodeId);
      const choice = node.choices.find(
        (c) => c.tone === (round === 0 || round === 3 ? 'neutral' : 'positive'),
      );
      assert.ok(choice, node.id);
      await page
        .locator('.match-choice-list button')
        .filter({ hasText: choice.label })
        .click();
      await page.locator('.match-consequence button').click();
      run = continueMatch(
        chooseMatchOption(run, moment.id, node.id, choice.id, moments),
        moments,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `match overflow ${node.id}`,
      );
    }
    let penalties;
    if (round === 3) {
      await page
        .getByRole('heading', { name: 'The penalty shootout', exact: true })
        .waitFor();
      assert.equal(
        await page.locator('.final-whistle').count(),
        0,
        'knockout draws go straight to penalties',
      );
      assert.equal(
        await page
          .locator('#penalty-heading')
          .evaluate((el) => el === document.activeElement),
        true,
      );
      let shootout = createShootout();
      while (!shootout.finished) {
        const guard = shootout.kicks;
        const plan = planPenaltyPair(shootout, game.id, SEED, true, false);
        assert.equal(
          await page.getByRole('button', { name: /^Shoot / }).count(),
          6,
        );
        const control = await page
          .getByRole('button', { name: 'Shoot high left', exact: true })
          .boundingBox();
        if (control.y < 0 || control.y + control.height > 750)
          await page.screenshot({
            path: '/private/tmp/pitchwise-penalty-layout-failure.png',
            fullPage: true,
          });
        assert.ok(
          control.height >= 44 &&
            control.y >= 0 &&
            control.y + control.height <= 750,
          `penalty controls stay visible at 320px, kick ${guard}: ${JSON.stringify(control)}`,
        );
        if (guard === 0)
          await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page
          .getByRole('button', {
            name: `Shoot ${PENALTY_ZONES[plan.shot].label}`,
            exact: true,
          })
          .click();
        await page
          .getByRole('button', { name: 'Save high left', exact: true })
          .waitFor();
        assert.equal(
          await page.getByRole('button', { name: /^Shoot / }).count(),
          0,
          'our kick stays locked while we choose the dive',
        );
        assert.equal(
          await page.getByRole('button', { name: /^Save / }).count(),
          6,
        );
        await page
          .getByRole('button', {
            name: `Save ${PENALTY_ZONES[plan.dive].label}`,
            exact: true,
          })
          .click();
        if (guard === 0) {
          await page
            .locator('.penalty-turn')
            .filter({ hasText: `${opponent} reply` })
            .waitFor();
          assert.equal(
            await page
              .locator('.penalty-ball')
              .evaluate((el) => getComputedStyle(el).animationName),
            'penalty-strike',
          );
        }
        await page.locator('.penalty-next, .cup-result-actions').waitFor();
        shootout = plan.next;
        assert.equal(
          await page
            .locator(
              '.penalty-records .penalty-scored, .penalty-records .penalty-missed',
            )
            .count(),
          shootout.kicks * 2,
        );
        if (guard === 0) await page.emulateMedia({ reducedMotion: 'reduce' });
        if (shootout.finished) break;
        await page
          .getByRole('button', { name: 'Next kick', exact: true })
          .click();
      }
      const text = await page.locator('.cup-penalty-score').innerText();
      const scores = text.match(/(\d+)–(\d+)/);
      penalties =
        round % 2
          ? [Number(scores[2]), Number(scores[1])]
          : [Number(scores[1]), Number(scores[2])];
      assert.ok(penalties[0] > penalties[1]);
      const resolved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('pitchwise-cup-v1')),
      );
      assert.equal(
        resolved.results.length,
        round + 1,
        'completed penalties are saved before leaving their celebration',
      );
      assert.deepEqual(resolved.results.at(-1).slice(3), penalties);
      await page.reload();
      await page.locator('.cup-next').waitFor();
      assert.match(
        await page.locator('.cup-next .eyebrow').innerText(),
        /Quarter-final/i,
        'reload at a completed shootout restores the next round',
      );
    } else {
      await page.locator('.final-whistle').waitFor();
      const savedAtFullTime = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('pitchwise-cup-v1')),
      );
      assert.equal(
        savedAtFullTime.results.length,
        round + 1,
        'Readers’ Cup saves at full time, before Continue',
      );
      assert.deepEqual(savedAtFullTime.results.at(-1).slice(1, 3), [
        run.homeScore,
        run.awayScore,
      ]);
      assert.equal(
        await page.locator('.final-score strong').innerText(),
        round % 2
          ? `${run.awayScore}–${run.homeScore}`
          : `${run.homeScore}–${run.awayScore}`,
      );
      assert.equal(
        await page.locator('.penalty-screen').count(),
        0,
        'group draws and ordinary wins have no shootout',
      );
      if (round === 0) {
        assert.equal(
          await page.locator('.recap-stats > div').count(),
          3,
          'the report shows group position, points and movement',
        );
        await throughReport(page, true);
        await page.locator('.match-choice-list').waitFor();
        alreadyPlaying = true;
      } else await throughReport(page, false);
    }
    tournament = finishTournamentGame(
      tournament,
      game.id,
      run.homeScore,
      run.awayScore,
      penalties,
    );
    console.log(
      `Round ${round + 1}: ${run.homeScore}–${run.awayScore}${penalties ? ' (penalties ' + penalties.join('–') + ')' : ''}`,
    );
    if (round === 1) {
      // The cup is saved after every fixture: a refresh continues at the next game.
      await page.reload();
      await page.locator('.cup-next').waitFor();
      assert.match(
        await page.locator('.cup-next .eyebrow').innerText(),
        /Group game 3/i,
      );
      assert.ok(
        (await page.locator('.cup-stakes').innerText()).length > 0,
        'last group game explains the stakes',
      );
    }
  }
  await page
    .getByRole('heading', { name: 'You won the cup.', exact: true })
    .waitFor();
  assert.equal(tournament.status, 'champion');
  assert.equal(
    withoutCup(await page.evaluate(() => JSON.stringify(localStorage))),
    withoutCup(storage),
    'Cup must not change training stars or match records',
  );
  const honours = JSON.parse(
    await page.evaluate(() => localStorage.getItem('pitchwise-cup-honours-v1')),
  );
  assert.deepEqual(
    [honours.cups, honours.titles, honours.best],
    [1, 1, 7],
    'the title is added to the honours once',
  );
  assert.match(
    await page.locator('.cup-honours').first().innerText(),
    /Titles 1/,
  );
  assert.equal(
    await page.locator('.cup-celebration.is-champion .cup-path li').count(),
    7,
    'the champion screen shows the whole road',
  );
  assert.match(await page.locator('.cup-totals').innerText(), /Good reads/i);
  await checkCupOverview(page, {
    rounds: ['Final', 'Semi-final', 'Quarter-final', 'Round of 16'],
    matches: 7,
    readsKey: 'pitchwise-cup-reads-v1',
  });
  assert.deepEqual(errors, []);
  await page.goto(origin);
  await page
    .locator('.play-options')
    .getByRole('link', { name: /^Match Day/ })
    .click();
  await page
    .getByRole('heading', { name: 'Choose your opponent.', exact: true })
    .waitFor();
  assert.equal(await page.locator('.fixture-card').count(), 15);
  assert.equal(
    /Five tactical|Score starts|Easy|Intermediate|Hard/.test(
      await page.locator('.match-intro').innerText(),
    ),
    false,
    'pre-match copy never labels or spoils the challenge',
  );
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [CUP_KEY, freshCup],
  );
  await page
    .getByRole('link', { name: /^Competitions/ })
    .click();
  await page
    .getByRole('heading', { name: 'Choose your competition.', exact: true })
    .waitFor();
  await page
    .locator('.play-options')
    .getByRole('link', { name: /^The Readers’ Cup/ })
    .click();
  let losingCup = createTournament(SEED);
  for (let round = 0; round < 4; round++) {
    const game = currentTournamentGame(losingCup),
      opponent = game.home === OUR_TEAM ? game.away : game.home;
    const fixture = cupFixture(round, opponent);
    let run = createMatchRun(fixture.moments);
    await page.getByRole('button', { name: 'Kick off', exact: true }).click();
    while (run.status !== 'final') {
      const score = closingScore(run.results),
        moments = [
          ...fixture.moments.slice(0, 4),
          closingMoment(fixture.moments[4].id, score.home, score.away),
        ];
      const moment = moments[run.momentIndex],
        node = moment.nodes.find((node) => node.id === run.nodeId),
        choice = node.choices.find(
          (choice) => choice.tone === (round === 3 ? 'neutral' : 'positive'),
        );
      await page
        .locator('.match-choice-list button')
        .filter({ hasText: choice.label })
        .click();
      await page.locator('.match-consequence button').click();
      run = continueMatch(
        chooseMatchOption(run, moment.id, node.id, choice.id, moments),
        moments,
      );
    }
    if (round < 3) {
      await throughReport(page, false);
      losingCup = finishTournamentGame(
        losingCup,
        game.id,
        run.homeScore,
        run.awayScore,
      );
    } else {
      await page
        .getByRole('heading', { name: 'The penalty shootout', exact: true })
        .waitFor();
      let shootout = createShootout();
      while (!shootout.finished) {
        const plan = planPenaltyPair(shootout, game.id, SEED, false, true);
        await playPenaltyPair(page, plan);
        shootout = plan.next;
        if (shootout.finished) break;
        await page
          .getByRole('button', { name: 'Next kick', exact: true })
          .click();
      }
      await page
        .getByRole('heading', { name: 'A tough exit.', exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByRole('button', { name: 'Play next match', exact: true })
          .count(),
        0,
        'elimination never offers an impossible next fixture',
      );
      assert.equal(await page.locator('.result-loss img').count(), 1);
      const savedLoss = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('pitchwise-cup-v1')),
      );
      assert.equal(
        savedLoss.results.length,
        4,
        'a completed losing shootout is also saved',
      );
      assert.ok(savedLoss.results.at(-1)[3] < savedLoss.results.at(-1)[4]);
      await page
        .locator('.result-loss img')
        .evaluate((image) => image.decode());
      await page
        .getByRole('button', { name: 'See the final bracket', exact: true })
        .click();
      await throughReport(page, false);
      await page
        .getByRole('heading', { name: 'Your cup run ends here.', exact: true })
        .waitFor();
      const [ourPenalties, rivalPenalties] = savedLoss.results.at(-1).slice(3);
      assert.ok(
        (await page.locator('.bracket-us').innerText()).includes(
          `Pens ${rivalPenalties}–${ourPenalties}`,
        ),
        'away elimination pairs the penalty score with the displayed teams',
      );
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: all three modes, concise pre-match copy, group draw, immediate knockout penalties, visible 44px controls, animation locks, next-fixture/view-bracket actions, champion and penalty elimination, 320/1280 layouts, unchanged device progress, no browser errors.',
  );
} finally {
  await browser.close();
}
