import assert from 'node:assert/strict';
import {
  isolateGameTelemetry,
  previewOrigin,
} from './browser-test-support.mjs';
import {
  createMyCup,
  currentMyGame,
  finishMyGame,
  serializeMyCup,
  parseSavedMyCup,
} from '../lib/my-tournament.ts';
import { myCupFixture } from '../lib/my-tournament-matches.ts';
import { createShootout, PENALTY_ZONES } from '../lib/tournament.ts';
import { planPenaltyPair, playPenaltyPair } from './penalty-test-driver.mjs';
import { closingMoment, closingScore } from '../lib/tournament-stories.ts';
import {
  chooseMatchOption,
  continueMatch,
  createMatchRun,
} from '../lib/match-day.ts';

// Separate from the real setup E2E: restore a legitimate saved knockout to exercise
// both penalty outcomes and the full-time persistence boundary quickly.
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const browser = await chromium.launch({ headless: true });
const origin = previewOrigin();
const errors = [];
const team = {
  name: 'Real Barrio',
  kitId: 'forest',
  difficulty: 'easy',
  length: 'short',
  size: 8,
};
function goallessChoice(moment, id, ancestors = new Set()) {
  assert.ok(!ancestors.has(id), `${moment.id}/${id}: no cycle while finding a draw`);
  const node = moment.nodes.find((n) => n.id === id);
  assert.ok(node, `${moment.id}/${id}: transition exists`);
  const following = new Set([...ancestors, id]);
  return node.choices.find((choice) =>
    choice.outcome
      ? choice.outcome.homeGoals === 0 && choice.outcome.awayGoals === 0
      : goallessChoice(moment, choice.nextNodeId, following),
  );
}
try {
  for (const win of [true, false]) {
    const page = await browser.newPage({
      viewport: { width: 320, height: 750 },
      reducedMotion: 'reduce',
    });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await isolateGameTelemetry(page);
    let cup = createMyCup(2026, team);
    for (let i = 0; i < 3; i++)
      cup = finishMyGame(cup, currentMyGame(cup).id, 2, 0);
    const fixture = myCupFixture(cup, 3);
    await page.goto(origin);
    await page.evaluate(
      (save) => localStorage.setItem('pitchwise-my-cup-v1', save),
      serializeMyCup(cup),
    );
    await page.goto(`${origin}/#my-tournament`);
    await page.getByRole('button', { name: 'Kick off', exact: true }).click();
    let run = createMatchRun(fixture.moments);
    while (run.status !== 'final') {
      const score = closingScore(run.results);
      const moments = [
        ...fixture.moments.slice(0, -1),
        closingMoment(fixture.moments.at(-1).id, score.home, score.away),
      ];
      const moment = moments[run.momentIndex];
      const choice = goallessChoice(moment, run.nodeId);
      assert.ok(choice, `${moment.id}: a goalless path exists`);
      await page
        .locator('.match-choice-list button')
        .filter({ hasText: choice.label.replaceAll('Pitchwise FC', team.name) })
        .click();
      await page.locator('.match-consequence button').click();
      run = continueMatch(
        chooseMatchOption(run, moment.id, run.nodeId, choice.id, moments),
        moments,
      );
    }
    assert.deepEqual([run.homeScore, run.awayScore], [0, 0]);
    await page
      .getByRole('heading', { name: 'The penalty shootout', exact: true })
      .waitFor();
    assert.equal(
      await page.locator('.final-whistle').count(),
      0,
      'draw goes straight to penalties',
    );
    let shootout = createShootout();
    while (!shootout.finished) {
      assert.equal(await page.getByRole('button', { name: /^Shoot / }).count(), PENALTY_ZONES.length);
      const plan = planPenaltyPair(shootout, currentMyGame(cup).id, cup.seed, win, !win);
      await playPenaltyPair(page, plan);
      shootout = plan.next;
      assert.equal(await page.locator('.penalty-records .penalty-scored, .penalty-records .penalty-missed').count(), shootout.kicks * 2);
      if (shootout.finished) break;
      await page
        .getByRole('button', { name: 'Next kick', exact: true })
        .click();
    }
    await page.locator('.cup-result-actions').waitFor();
    const raw = await page.evaluate(() =>
      localStorage.getItem('pitchwise-my-cup-v1'),
    );
    const saved = JSON.parse(raw);
    assert.equal(
      saved.results.length,
      4,
      'penalties persist before celebration navigation',
    );
    assert.equal(saved.results.at(-1)[3] > saved.results.at(-1)[4], win);
    const restored = parseSavedMyCup(raw);
    assert.equal(restored.status, win ? 'playing' : 'eliminated');
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.reload();
    if (win) await page.locator('.cup-next').waitFor();
    else {
      await page.locator('.cup-celebration:not(.is-champion)').waitFor();
      assert.ok(
        await page
          .locator('.cup-path li')
          .first()
          .evaluate((el) => el.classList.contains('is-loss')),
        'a penalty defeat is a loss, not a drawn cup fixture',
      );
    }
    assert.equal(
      await page.evaluate(() => localStorage.getItem('pitchwise-my-cup-v1')),
      raw,
      'reload preserves penalties',
    );
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: My Tournament immediate penalties, win/loss, save before result navigation and reload restoration at 320px.',
  );
} finally {
  await browser.close();
}
