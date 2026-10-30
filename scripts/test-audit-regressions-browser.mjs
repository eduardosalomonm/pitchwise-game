import assert from 'node:assert/strict';
import { isolateGameTelemetry, previewOrigin } from './browser-test-support.mjs';
import { createLeague, activeLeagueGame, serializeLeague, LEAGUE_KEY, LEAGUE_MATCH_KEY } from '../lib/league.ts';
import { leagueFixture } from '../lib/league-matches.ts';
import { serializeLeagueMatch } from '../lib/league-match-progress.ts';
import { createTournament, currentTournamentGame, finishTournamentGame } from '../lib/tournament.ts';
import { serializeCup, CUP_STORAGE_KEY } from '../lib/tournament-progress.ts';
import { createMyCup, currentMyGame, finishMyGame, serializeMyCup, MY_CUP_STORAGE_KEY } from '../lib/my-tournament.ts';
import { myCupFixture } from '../lib/my-tournament-matches.ts';
import { cupFixture } from '../lib/tournament-stories.ts';
import { createMatchRun, chooseMatchOption, continueMatch } from '../lib/match-day.ts';
import { matchChoiceTone } from '../lib/match-feedback.ts';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = previewOrigin();
const team = { name: 'Audit FC', kitId: 'forest', difficulty: 'easy', length: 'short', size: 8 };

async function captured(page) {
  const events = [];
  await isolateGameTelemetry(page);
  await page.route('**/api/playtest/config', async (route) => {
    await new Promise((r) => setTimeout(r, 150));
    return route.fulfill({ json: { enabled: false, visitorTracking: true, contact: 'Synthetic test', retentionDays: 30 } });
  });
  await page.route(/\/api\/visits(?:\?.*)?$/, (route) => {
    const batch = route.request().postDataJSON(); events.push(...batch.events);
    return route.fulfill({ json: { accepted: batch.events.length } });
  });
  return events;
}
async function until(test) {
  const deadline = Date.now() + 5000;
  while (!test()) { assert.ok(Date.now() < deadline, 'synthetic collector receives the expected events'); await new Promise((r) => setTimeout(r, 20)); }
}
async function fits(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
}
async function play(page, fixture, tone = 'negative') {
  let run = createMatchRun(fixture.moments);
  while (run.status !== 'final') {
    const moment = fixture.moments[run.momentIndex], node = moment.nodes.find((n) => n.id === run.nodeId);
    const choice = node.choices.find((c) => matchChoiceTone(node, c) === tone) ?? node.choices[0];
    await page.locator('.match-choice-list button').filter({ hasText: choice.label.replaceAll('Pitchwise FC', team.name) }).click();
    await page.locator('.match-consequence button').click();
    run = continueMatch(chooseMatchOption(run, moment.id, node.id, choice.id, fixture.moments), fixture.moments);
  }
  await page.locator('.final-whistle').waitFor(); return run;
}
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch();
  try {
    // A competing tab never mounts stale state. Closing the owner lets it load the latest save.
    for (const mode of ['league', 'tournament', 'my-tournament']) {
      const context = await browser.newContext({ viewport: { width: 320, height: 750 }, reducedMotion: 'reduce' });
      try {
        const a = await context.newPage(), b = await context.newPage();
        for (const page of [a, b]) await isolateGameTelemetry(page);
        await a.goto(origin);
        if (mode === 'league') {
          const season = createLeague(501, { name: team.name, kitId: 'forest', size: 4, legs: 1, difficulty: 'easy' });
          const fixture = leagueFixture(season), game = activeLeagueGame(season); let run = createMatchRun(fixture.moments);
          while (run.status !== 'final') {
            const m = fixture.moments[run.momentIndex], n = m.nodes.find((n) => n.id === run.nodeId), c = n.choices.find((c) => matchChoiceTone(n, c) === 'positive') ?? n.choices[0];
            run = chooseMatchOption(run, m.id, n.id, c.id, fixture.moments);
            if (continueMatch(run, fixture.moments).status === 'final') break;
            run = continueMatch(run, fixture.moments);
          }
          await a.evaluate(([key, save, journalKey, journal]) => { localStorage.setItem(key, save); localStorage.setItem(journalKey, journal); }, [LEAGUE_KEY, serializeLeague(season), LEAGUE_MATCH_KEY, serializeLeagueMatch(season.seed, game.id, run)]);
        } else if (mode === 'my-tournament') {
          await a.evaluate(([k, v]) => localStorage.setItem(k, v), [MY_CUP_STORAGE_KEY, serializeMyCup(createMyCup(2026, team))]);
        } else await a.evaluate(([k, v]) => localStorage.setItem(k, v), [CUP_STORAGE_KEY, serializeCup(createTournament(2026))]);
        await a.goto(`${origin}/#${mode}`); await a.locator('.cup-next').waitFor();
        await b.goto(`${origin}/#${mode}`);
        await b.getByRole('heading', { name: 'Your competition is open elsewhere.' }).waitFor();
        assert.equal(await b.locator('.cup-next, .match-choice-list').count(), 0);
        await fits(b);
        if (mode === 'league') {
          await a.getByRole('button', { name: 'Continue match', exact: true }).click();
          await a.locator('.match-consequence button').click();
          await a.locator('.league-recap').waitFor();
          assert.equal(await b.evaluate(() => JSON.parse(localStorage.getItem('pitchwise-league-v1')).results.length), 1);
        }
        await a.close();
        await b.getByRole('button', { name: 'Try again', exact: true }).click();
        await b.locator('.cup-next').waitFor();
        if (mode === 'league') assert.match(await b.locator('.cup-next .eyebrow').innerText(), /Matchweek 2/i);
        await b.reload(); await b.locator('.cup-next').waitFor(); await fits(b);
      } finally { await context.close(); }
    }
    const page = await browser.newPage({ viewport: { width: 375, height: 667 }, reducedMotion: 'reduce' });
    const events = await captured(page);
    await page.goto(`${origin}/#first-match`); await page.locator('.first-question').waitFor();
    while (!await page.locator('.first-match-finished').count()) {
      await page.locator('.first-question .match-choice-list button').first().click();
      await page.locator('.first-feedback > button').first().click();
    }
    await until(() => events.some((e) => e.type === 'match_complete' && e.fixtureId === 'first-friendly'));
    assert.ok(events.some((e) => e.type === 'activity_start' && e.fixtureId === 'first-friendly'), 'a direct guide entry is recorded even before configuration arrives');
    assert.ok(events.some((e) => e.type === 'match_decision' && e.fixtureId === 'first-friendly'));
    assert.equal(events.filter((e) => e.type === 'match_complete').length, 1);
    assert.equal(await page.evaluate(() => localStorage.getItem('read-the-game-match-records-v1')), null);
    await fits(page);
    await page.getByRole('button', { name: 'Play guide again' }).click();
    await page.getByRole('button', { name: 'Skip guide', exact: true }).click();
    await until(() => events.some((e) => e.type === 'guide_skip'));
    await page.close();

    // A final result is reported at the whistle, even if the next action is reload.
    for (const custom of [false, true]) {
      const p = await browser.newPage({ viewport: { width: 320, height: 750 }, reducedMotion: 'reduce' });
      const visits = await captured(p); let cup = custom ? createMyCup(2026, team) : createTournament(2026);
      for (let i = 0; i < 2; i++) cup = custom ? finishMyGame(cup, currentMyGame(cup).id, 0, 5) : finishTournamentGame(cup, currentTournamentGame(cup).id, 0, 5);
      await p.goto(origin);
      await p.evaluate(([k, v]) => localStorage.setItem(k, v), [custom ? MY_CUP_STORAGE_KEY : CUP_STORAGE_KEY, custom ? serializeMyCup(cup) : serializeCup(cup)]);
      await p.goto(`${origin}/#${custom ? 'my-tournament' : 'tournament'}`);
      await p.getByRole('button', { name: 'Kick off', exact: true }).click();
      const game = custom ? currentMyGame(cup) : currentTournamentGame(cup);
      const fixture = custom ? myCupFixture(cup, cup.round) : cupFixture(cup.round, game.home === 'Pitchwise FC' ? game.away : game.home);
      await play(p, fixture);
      await until(() => visits.some((e) => e.type === 'tournament_complete'));
      assert.equal(visits.filter((e) => e.type === 'tournament_complete').length, 1);
      await p.reload(); await p.locator('.cup-hero').waitFor(); await fits(p);
      assert.equal(visits.filter((e) => e.type === 'tournament_complete').length, 1);
      await p.close();
    }
    console.log(`PASS audit regressions: ${name}, three competition locks/reload, guide tracking/skip and both cups saved/reported before navigation, 320/375px.`);
  } finally { await browser.close(); }
}
