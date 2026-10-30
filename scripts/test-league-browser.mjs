import assert from 'node:assert/strict';
import { checkOptionalReading, checkBuildUp } from './browser-test-support.mjs';
import {
  isolateGameTelemetry,
  previewOrigin,
  assertReadableButtons,
} from './browser-test-support.mjs';
import {
  parseLeague,
  activeLeagueGame,
  finishLeagueGame,
  advanceLeagueBye,
  leagueTable,
  LEAGUE_KEY,
  LEAGUE_MATCH_KEY,
  createLeague,
  LEAGUE_NAMES,
  serializeLeague,
  leagueIsOurs,
} from '../lib/league.ts';
import { leagueFixture } from '../lib/league-matches.ts';
import {
  serializeLeagueMatch,
  parseLeagueMatch,
} from '../lib/league-match-progress.ts';
import {
  chooseMatchOption,
  continueMatch,
  createMatchRun,
  createMomentReview,
} from '../lib/match-day.ts';
import { makeCustomTeam, getTeam } from '../lib/teams.ts';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const browser = await chromium.launch({ headless: true });
const origin = previewOrigin();
const page = await browser.newPage({
  viewport: { width: 320, height: 750 },
  reducedMotion: 'reduce',
});
const errors = [],
  dialogs = [];
function captureFailures(target) {
  target.on('pageerror', (error) => errors.push(error.message));
  target.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  target.on('dialog', async (dialog) => {
    dialogs.push(`${dialog.type()}: ${dialog.message()}`);
    await dialog.dismiss();
  });
}
captureFailures(page);
const stored = (key, target = page) =>
  target.evaluate((key) => localStorage.getItem(key), key);
const saved = () => stored(LEAGUE_KEY);
async function fits(target = page, label = 'league fits mobile') {
  // Viewport updates and font swaps settle asynchronously, especially in a compiled preview.
  // Inspect the painted layout, not a stale width from the preceding viewport.
  await target.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  assert.equal(
    await target.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    label,
  );
}
async function waitFlight(league, game, run) {
  const expected = serializeLeagueMatch(league.seed, game.id, run);
  await page.waitForFunction(
    ([key, expected]) => localStorage.getItem(key) === expected,
    [LEAGUE_MATCH_KEY, expected],
  );
  assert.deepEqual(
    parseLeagueMatch(
      await stored(LEAGUE_MATCH_KEY),
      league.seed,
      game.id,
      leagueFixture(league).moments,
    ),
    run,
    'the journal reconstructs the exact active match',
  );
}
async function assertStored(league, journal, label) {
  assert.equal(
    await saved(),
    serializeLeague(league),
    `${label}: completed results do not change`,
  );
  assert.equal(
    await stored(LEAGUE_MATCH_KEY),
    journal,
    `${label}: the choice journal does not change`,
  );
}
let checkedBuildUp = false;
async function assertMatch(league, fixture, run) {
  const game = activeLeagueGame(league),
    home = makeCustomTeam(league.config.name, league.config.kitId);
  const moment = fixture.moments[run.momentIndex],
    node = moment.nodes.find((n) => n.id === run.nodeId);
  await page
    .locator('.match-choice-list')
    .waitFor({ state: run.pending ? 'attached' : 'visible' });
  if (!run.pending) await checkOptionalReading(page);
  if (!run.pending && !checkedBuildUp) {
    await checkBuildUp(page);
    checkedBuildUp = true;
  }
  assert.equal(
    await page.locator('.match-choice-card h2').innerText(),
    node.prompt,
    'the saved decision is visible',
  );
  assert.equal(
    await page.locator('.score-team-code').first().innerText(),
    game.home === home.name ? home.code : getTeam(fixture.opponent).code,
  );
  assert.equal(
    (await page.locator('.match-moment-count').innerText()).toLowerCase(),
    `moment ${run.momentIndex + 1} of ${fixture.moments.length}`,
  );
  if (!run.pending) {
    const visible =
      game.home === home.name
        ? `${run.homeScore}–${run.awayScore}`
        : `${run.awayScore}–${run.homeScore}`;
    assert.equal(
      await page.locator('.scoreboard strong').innerText(),
      visible,
      'committed score survives navigation',
    );
  }
  assert.equal(
    await page.locator('.match-pitch [data-team]').count(),
    node.scene.players.length,
  );
  assert.equal(
    await page.locator('.match-choice-list button').count(),
    node.choices.length,
  );
  assert.equal(
    await page.locator('.match-pitch').getAttribute('viewBox'),
    '0 0 1000 700',
    'resume opens the whole pitch',
  );
  const cardActive = Boolean(
    fixture.redCard && run.momentIndex >= fixture.redCard.fromMoment,
  );
  const firstCardDecision =
    cardActive &&
    run.momentIndex === fixture.redCard.fromMoment &&
    node.id === moment.rootNodeId;
  assert.equal(
    await page.locator('.match-discipline').count(),
    Number(cardActive),
    'dismissal badge persists for the remaining match',
  );
  assert.equal(
    await page.locator('.special-play-notice').count(),
    Number(firstCardDecision),
    'the first special decision explains the dismissal',
  );
  if (cardActive) {
    const card = fixture.redCard;
    assert.equal(node.scene.players.length, 21);
    assert.equal(
      await page
        .locator(`.match-pitch [data-player-id="${card.player}"]`)
        .count(),
      0,
      'the dismissed player is absent',
    );
    assert.equal(
      await page.locator('.match-choice-list button').count(),
      card.team === 'home' ? 4 : 3,
      'the numerical advantage changes the choices',
    );
    assert.match(
      await page.locator('.match-discipline').innerText(),
      new RegExp(
        `down to ten.*${(card.team === 'home') === (game.home === home.name) ? '10 v 11' : '11 v 10'}`,
      ),
    );
    if (firstCardDecision)
      assert.match(
        await page.locator('.special-play-notice').innerText(),
        card.team === 'home'
          ? /one fewer midfield outlet/i
          : /extra midfield lane/i,
      );
  }
  await fits();
  const geometry = await page.evaluate(() => {
    const box = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        width: rect.width,
        // Tight editorial line boxes can have visible glyph overflow; only hidden
        // overflow can actually clip that text. Horizontal overflow is always a defect.
        clipped:
          element.scrollWidth > element.clientWidth + 1 ||
          (['hidden', 'clip'].includes(style.overflowY) &&
            element.scrollHeight > element.clientHeight + 1),
        font: parseFloat(style.fontSize),
      };
    };
    return {
      width: innerWidth,
      title: box('.match-heading .play-context'),
      pitch: box('.match-pitch'),
      badge: box('.match-discipline'),
      notice: box('.special-play-notice'),
      back: box('.match-hud .play-back'),
    };
  });
  for (const key of ['title', 'pitch', 'badge', 'notice']) {
    const box = geometry[key];
    if (!box) continue;
    assert.ok(
      box.left >= -1 && box.right <= geometry.width + 1 && box.height > 0,
      `${node.id}: ${key} fits 320px`,
    );
    if (key !== 'pitch')
      assert.equal(box.clipped, false, `${node.id}: ${key} is not clipped`);
  }
  assert.ok(
    geometry.title.bottom <= geometry.pitch.top + 1,
    `${node.id}: title does not overlap the pitch`,
  );
  assert.ok(
    geometry.back.height >= 44 && geometry.back.width >= 44,
    'League return has a usable touch target',
  );
  if (geometry.badge) {
    assert.ok(
      geometry.badge.bottom <= geometry.title.top + 1,
      `${node.id}: badge does not overlap the title`,
    );
    assert.ok(geometry.badge.font >= 12, 'dismissal badge remains readable');
  }
  if (geometry.notice)
    assert.ok(
      geometry.notice.bottom <= geometry.pitch.top + 1,
      `${node.id}: special notice does not overlap the pitch`,
    );
}
async function resume(league, fixture, run, keyboard = false) {
  await page.locator('.cup-next').waitFor();
  const button = page
    .locator('.cup-next')
    .getByRole('button', { name: 'Continue match', exact: true });
  if (keyboard) {
    await button.focus();
    await page.keyboard.press('Enter');
  } else await button.click();
  await assertMatch(league, fixture, run);
}
async function exerciseCommittedResume(league, fixture, run) {
  await waitFlight(league, activeLeagueGame(league), run);
  const journal = await stored(LEAGUE_MATCH_KEY);
  assert.equal(
    JSON.parse(journal).pending,
    false,
    'leave after a committed transition, not only during a reveal',
  );
  await page.getByRole('button', { name: 'League', exact: true }).click();
  await page.locator('.cup-next').waitFor();
  await assertStored(league, journal, 'visible League return');
  await resume(league, fixture, run, true);

  // The mobile header is intentionally replaced by match Back; desktop retains Home.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('.brand-link').click();
  await page.locator('.play-options').waitFor();
  await page.setViewportSize({ width: 320, height: 750 });
  await assertStored(league, journal, 'global Home return');
  const competitions = page
    .locator('.play-options')
    .getByRole('link', { name: /^Competitions/ });
  await competitions.focus();
  await page.keyboard.press('Enter');
  await page
    .getByRole('heading', { name: 'Choose your competition.', exact: true })
    .waitFor();
  const leagueLink = page
    .locator('.play-options')
    .getByRole('link', { name: /^My League/ });
  await leagueLink.focus();
  await page.keyboard.press('Enter');
  await page.locator('.cup-next').waitFor();
  assert.equal(new URL(page.url()).hash, '#league');
  await assertStored(league, journal, 'keyboard league entry');
  await resume(league, fixture, run);

  await page.evaluate(() => {
    window.location.hash = '#training';
  });
  await page
    .getByRole('heading', { name: 'Training Ground', exact: true })
    .waitFor();
  await assertStored(league, journal, 'hash-route leave');
  await page.evaluate(() => {
    window.location.hash = '#league';
  });
  await page.locator('.cup-next').waitFor();
  await assertStored(league, journal, 'hash-route return');
  await resume(league, fixture, run);
}
function nonScoringRoute(moment, nodeId = moment.rootNodeId) {
  const node = moment.nodes.find((n) => n.id === nodeId);
  const choices = [...node.choices].sort(
    (a, b) => Number(a.tone === 'positive') - Number(b.tone === 'positive'),
  );
  for (const choice of choices) {
    if (choice.outcome) {
      if (choice.outcome.homeGoals === 0 && choice.outcome.awayGoals === 0)
        return [choice.id];
    } else {
      const rest = nonScoringRoute(moment, choice.nextNodeId);
      if (rest) return [choice.id, ...rest];
    }
  }
  return undefined;
}
async function reviewWithoutScoring(next, fixture, completed) {
  const index = fixture.moments.findIndex((moment) => nonScoringRoute(moment));
  assert.ok(index >= 0, 'the fixture offers a non-scoring possession review');
  const moment = fixture.moments[index],
    path = nonScoringRoute(moment);
  const journal = await stored(LEAGUE_MATCH_KEY),
    score = await page.locator('.final-score strong').innerText();
  assert.equal(journal, null, 'the completed match has no in-flight journal');
  await page.locator('.match-review summary').click();
  await page.locator('.match-review button').nth(index).click();
  await page.locator('.match-choice-list').waitFor();
  assert.equal(
    (await page.locator('.match-moment-count').innerText()).toLowerCase(),
    'review',
  );
  let run = createMomentReview(completed, index, fixture.moments);
  for (const choiceId of path) {
    const node = moment.nodes.find((n) => n.id === run.nodeId),
      choice = node.choices.find((c) => c.id === choiceId);
    await page
      .locator('.match-choice-list button')
      .filter({ hasText: choice.label })
      .click();
    await page.locator('.match-consequence').waitFor();
    await assertStored(next, journal, 'review choice');
    assert.equal(
      await page.locator('.scoreboard strong').innerText(),
      score,
      'review keeps the full-time score visible',
    );
    await page.locator('.match-consequence button').click();
    run = continueMatch(
      chooseMatchOption(run, moment.id, node.id, choice.id, fixture.moments),
      fixture.moments,
    );
  }
  await page.locator('.review-result').waitFor();
  assert.equal(run.homeScore, 0);
  assert.equal(run.awayScore, 0);
  await assertStored(next, journal, 'completed non-scoring review');
  await page
    .getByRole('button', { name: 'Back to final whistle', exact: true })
    .click();
  await page.locator('.final-whistle').waitFor();
  assert.equal(await page.locator('.final-score strong').innerText(), score);
  await assertStored(next, journal, 'return from review');
}
async function assertTable(league) {
  assert.equal(
    await page.locator('.league-standings .is-us').count(),
    1,
    'our club is highlighted',
  );
  const ours = leagueTable(league).find(
    (row) => row.team === league.config.name,
  );
  assert.equal(
    await page.locator('.league-standings .is-us td').first().innerText(),
    String(ours.played),
  );
  const form = await page
    .locator('.league-standings .is-us .league-form > span')
    .allInnerTexts();
  assert.deepEqual(
    form,
    ours.form.length ? ours.form.slice(-5).map((entry) => entry.result) : ['—'],
    'last five form is oldest to newest',
  );
}
async function playFixture(
  league,
  {
    reloadReveal = false,
    committedResume = false,
    review = false,
    reloadFinal = false,
  } = {},
) {
  const game = activeLeagueGame(league),
    fixture = leagueFixture(league);
  await page
    .locator('.cup-next')
    .getByRole('button', { name: /Kick off|Continue match/ })
    .click();
  let run = createMatchRun(fixture.moments),
    reloaded = false,
    resumed = false;
  while (run.status !== 'final') {
    const moment = fixture.moments[run.momentIndex],
      node = moment.nodes.find((n) => n.id === run.nodeId),
      choice = node.choices.find((c) => c.tone === 'positive');
    await assertMatch(league, fixture, run);
    await page
      .locator('.match-choice-list button')
      .filter({ hasText: choice.label })
      .click();
    run = chooseMatchOption(
      run,
      moment.id,
      node.id,
      choice.id,
      fixture.moments,
    );
    if (reloadReveal && !reloaded) {
      await waitFlight(league, game, run);
      await page.reload();
      await resume(league, fixture, run);
      await page.locator('.match-consequence').waitFor();
      assert.equal(
        await page
          .locator('.match-choice-list button[aria-pressed="true"]')
          .count(),
        1,
        'chosen answer remains locked after reload',
      );
      assert.equal(
        await page.locator('.match-choice-list button:disabled').count(),
        node.choices.length - 1,
      );
      reloaded = true;
    }
    await page.locator('.match-consequence button').click();
    run = continueMatch(run, fixture.moments);
    if (run.status !== 'final') {
      await page.waitForFunction(() => scrollY === 0);
      if (committedResume && !resumed) {
        await exerciseCommittedResume(league, fixture, run);
        resumed = true;
      }
    }
  }
  await page.locator('.final-whistle').waitFor();
  const next = finishLeagueGame(league, game.id, run.homeScore, run.awayScore);
  await page.waitForFunction(
    ([key, expected]) => localStorage.getItem(key) === expected,
    [LEAGUE_KEY, serializeLeague(next)],
  );
  assert.deepEqual(
    parseLeague(await saved()),
    next,
    'full-time result is committed before Continue',
  );
  assert.equal(await stored(LEAGUE_MATCH_KEY), null);
  if (review) await reviewWithoutScoring(next, fixture, run);
  await assertReadableButtons(
    page,
    '.cup-result-actions',
    'league full-time actions',
  );
  if (reloadFinal) {
    await page.reload();
    await page
      .locator(next.status === 'finished' ? '.cup-hero' : '.cup-next')
      .waitFor();
    await assertStored(next, null, 'reload at full time before Continue');
    await assertTable(next);
    await page.locator('.league-calendar summary').click();
    const result = next.rounds[league.round].find((g) => g.id === game.id);
    const row = page
      .locator('.league-calendar > section')
      .nth(league.round)
      .locator('.our-fixture');
    await row.waitFor();
    assert.equal(
      await row.locator('strong').innerText(),
      `${result.homeGoals}–${result.awayGoals}`,
      'the just-completed result remains in its original venue after reload',
    );
    await page.locator('.league-calendar summary').click();
    await fits();
    return next;
  }
  await page.locator('.league-recap').waitFor();
  await fits();
  await page.getByRole('button', {name: 'View full league', exact: true}).click();
  await assertTable(next);
  return next;
}
async function installSeason(season) {
  await page.evaluate(
    ([key, value, flight]) => {
      localStorage.setItem(key, value);
      localStorage.removeItem(flight);
    },
    [LEAGUE_KEY, serializeLeague(season), LEAGUE_MATCH_KEY],
  );
  await page.reload();
}
async function blockedStorageWarning() {
  const context = await browser.newContext({
    viewport: { width: 320, height: 750 },
    reducedMotion: 'reduce',
  });
  try {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException(
            'Storage blocked by browser test.',
            'SecurityError',
          );
        },
      });
    });
    const blocked = await context.newPage();
    captureFailures(blocked);
    await isolateGameTelemetry(blocked);
    await blocked.goto(`${origin}/#league`);
    await blocked
      .getByRole('heading', { name: 'Build your season.', exact: true })
      .waitFor();
    await blocked.getByLabel('Teams, including yours').selectOption('4');
    await blocked
      .getByRole('button', { name: 'Start My League', exact: true })
      .click();
    await blocked.locator('.league-save-warning').waitFor();
    assert.equal(
      await blocked.locator('.league-save-warning').getAttribute('role'),
      'alert',
    );
    assert.match(
      await blocked.locator('.league-save-warning').innerText(),
      /Saving is unavailable.*leaving or reloading may lose this season/s,
    );
    await fits(blocked, 'storage warning fits 320px');
    await blocked
      .locator('.cup-next')
      .getByRole('button', { name: 'Kick off', exact: true })
      .click();
    await blocked.locator('.match-choice-list').waitFor();
    await blocked.locator('.match-choice-list button').first().click();
    await blocked.locator('.match-consequence').waitFor();
    assert.equal(
      await blocked
        .locator('.match-choice-list button[aria-pressed="true"]')
        .count(),
      1,
      'play remains available when storage is blocked',
    );
    assert.equal(
      await blocked.locator('.league-save-warning').isVisible(),
      true,
      'the save warning stays visible in the match',
    );
    await fits(blocked, 'blocked-storage match fits 320px');
  } finally {
    await context.close();
  }
}

async function difficultySetup() {
  for (const difficulty of ['easy', 'intermediate', 'hard']) {
    const context = await browser.newContext({
      viewport: { width: 320, height: 750 },
      reducedMotion: 'reduce',
    });
    try {
      const target = await context.newPage();
      captureFailures(target);
      await isolateGameTelemetry(target);
      await target.goto(`${origin}/#league`);
      const middle = target.locator(
        'input[name="league-difficulty"][value="intermediate"]',
      );
      await middle.waitFor();
      const clubName = target.getByLabel('Club name', { exact: true });
      assert.equal(await clubName.inputValue(), 'Pitchwise FC');
      assert.equal(
        await target.locator('.my-preview strong').innerText(),
        'Pitchwise FC',
      );
      assert.equal(await target.locator('.league-name-picks').count(), 0);
      assert.equal(
        await target.getByText('Club ideas', { exact: true }).count(),
        0,
      );
      const levels = target.locator('fieldset.my-difficulty').first();
      assert.deepEqual(
        (await levels.locator('label').allInnerTexts()).map((s) => s.trim()),
        ['Easy', 'Intermediate', 'Hard'],
        'difficulty labels have no descriptions',
      );
      const suggest = target.getByRole('button', {
        name: 'Suggest one',
        exact: true,
      });
      assert.ok((await suggest.boundingBox()).height >= 44);
      if (difficulty === 'easy') {
        await suggest.focus();
        await target.keyboard.press('Enter');
        assert.ok(LEAGUE_NAMES.includes(await clubName.inputValue()));
      }
      if (difficulty === 'hard') await clubName.fill('Friends FC');
      const chosenName = await clubName.inputValue();
      assert.equal(
        await target.locator('.my-preview strong').innerText(),
        chosenName,
      );
      assert.equal(
        await middle.isChecked(),
        true,
        'new seasons default to Intermediate',
      );
      await middle.focus();
      if (difficulty === 'easy') await target.keyboard.press('ArrowLeft');
      if (difficulty === 'hard') await target.keyboard.press('ArrowRight');
      assert.equal(
        await target
          .locator(`input[name="league-difficulty"][value="${difficulty}"]`)
          .isChecked(),
        true,
      );
      for (const label of await target
        .locator('fieldset.my-difficulty')
        .first()
        .locator('label')
        .all())
        assert.ok(
          (await label.boundingBox()).height >= 44,
          'level cards are touch-sized',
        );
      await fits(target, `${difficulty} selector fits320px`);
      await target.getByLabel('Teams, including yours').selectOption('4');
      await target
        .getByRole('button', { name: 'Start My League', exact: true })
        .click();
      await target.locator('.cup-next').waitFor();
      const savedSeason = parseLeague(await stored(LEAGUE_KEY, target));
      assert.equal(savedSeason.config.difficulty, difficulty);
      assert.equal(savedSeason.config.name, chosenName);
      await target.reload();
      await target.locator('.cup-next').waitFor();
      assert.deepEqual(
        parseLeague(await stored(LEAGUE_KEY, target)),
        savedSeason,
        'selected level survives reload',
      );
      await target
        .locator('.cup-next')
        .getByRole('button', { name: 'Kick off', exact: true })
        .click();
      await target.locator('.match-choice-list').waitFor();
      await target.locator('.match-choice-list button').first().click();
      await target.locator('.match-consequence').waitFor();
      await fits(target, `${difficulty} decision/reveal fits320px`);
    } finally {
      await context.close();
    }
  }
}

async function legacyUpgrade() {
  const value = JSON.stringify({
    v: 1,
    seed: 7,
    config: { name: 'Real Barrio', kitId: 'forest', size: 6, legs: 1 },
    results: [
      ['league-r0-1', 2, 1],
      ['league-r1-2', 2, 1],
    ],
  });
  const journal = JSON.stringify({
    v: 1,
    seed: 7,
    gameId: 'league-r2-2',
    pending: true,
    choices: [['lg-curl-to-volley', 'lg-curl-to-volley-1', 'option-1']],
  });
  await page.evaluate(
    ([key, value, flight, journal]) => {
      localStorage.setItem(key, value);
      localStorage.setItem(flight, journal);
    },
    [LEAGUE_KEY, value, LEAGUE_MATCH_KEY, journal],
  );
  await page.reload();
  const league = parseLeague(value),
    fixture = leagueFixture(league),
    run = parseLeagueMatch(journal, 7, 'league-r2-2', fixture.moments);
  await resume(league, fixture, run);
  await page.locator('.match-consequence').waitFor();
  assert.equal(
    await page
      .locator('.match-choice-list button[aria-pressed="true"]')
      .count(),
    1,
  );
  await assertStored(
    league,
    journal,
    'literalv35 locked reveal survives upgrade',
  );
  await page.locator('.match-consequence button').click();
  const next = continueMatch(run, fixture.moments);
  assert.equal(next.nodeId, 'lg-curl-to-volley-2');
  await waitFlight(league, activeLeagueGame(league), next);
  await assertMatch(league, fixture, next);
  await page.getByRole('button', { name: 'League', exact: true }).click();
}

try {
  await difficultySetup();
  await isolateGameTelemetry(page);
  // Enter through the visible competition menu using the keyboard, not only a deep link.
  await page.goto(origin);
  await page.locator('.play-options').waitFor();
  await page
    .locator('.play-options')
    .getByRole('link', { name: /^Competitions/ })
    .focus();
  await page.keyboard.press('Enter');
  await page
    .getByRole('heading', { name: 'Choose your competition.', exact: true })
    .waitFor();
  await page
    .locator('.play-options')
    .getByRole('link', { name: /^My League/ })
    .focus();
  await page.keyboard.press('Enter');
  await page
    .getByRole('heading', { name: 'Build your season.', exact: true })
    .waitFor();
  assert.equal(new URL(page.url()).hash, '#league');
  await fits();
  assert.equal(await page.locator('.my-kits label').count(), 8);
  await page.getByLabel('Club name', { exact: true }).fill('Union Halftime');
  await page.getByLabel('Teams, including yours').selectOption('4');
  await page
    .getByRole('button', { name: 'Start My League', exact: true })
    .click();
  await page.locator('.cup-next').waitFor();
  let league = parseLeague(await saved());
  assert.equal(league.config.size, 4);
  assert.equal(league.config.legs, 1);
  assert.equal(league.config.name, 'Union Halftime');
  assert.equal(league.config.difficulty, 'intermediate');
  while (league.status === 'playing') {
    const round = league.round;
    league = await playFixture(league, {
      reloadReveal: round === 0,
      committedResume: round === 0,
      reloadFinal: round === 0,
      review: round === 1,
    });
  }
  await page.locator('.cup-hero').waitFor();
  await page.reload();
  await page.locator('.cup-hero').waitFor();
  assert.equal(
    parseLeague(await saved()).status,
    'finished',
    'season survives reload',
  );
  await assertTable(league);

  await legacyUpgrade();

  // Both dismissals use actual seeded fixture data and every remaining decision is checked.
  for (const team of ['home', 'away']) {
    let season, round;
    outer: for (let seed = 1; seed < 100; seed++) {
      const candidate = createLeague(seed, {
        name: 'Real Barrio',
        kitId: 'forest',
        size: 4,
        legs: 1,
      });
      for (let r = 0; r < candidate.rounds.length; r++) {
        if (leagueFixture(candidate, r)?.redCard?.team === team) {
          season = candidate;
          round = r;
          break outer;
        }
      }
    }
    assert.ok(season, `find a ${team} dismissal fixture`);
    while (season.round < round) {
      const game = activeLeagueGame(season);
      season = finishLeagueGame(season, game.id, 0, 0);
    }
    await installSeason(season);
    await page.locator('.cup-next').waitFor();
    await playFixture(season);
  }

  let odd;
  for (let seed = 1; seed < 30; seed++) {
    const candidate = createLeague(seed, {
      name: 'Real Barrio',
      kitId: 'forest',
      size: 5,
      legs: 2,
    });
    if (!candidate.rounds[0].some((game) => leagueIsOurs(candidate, game))) {
      odd = candidate;
      break;
    }
  }
  assert.ok(odd, 'find a genuine opening rest week');
  await installSeason(odd);
  await page
    .getByRole('heading', { name: 'A breather this week.', exact: true })
    .waitFor();
  await page
    .getByRole('button', { name: 'See this week’s results', exact: true })
    .click();
  await page.locator('.league-round-report').waitFor();
  const afterBye = advanceLeagueBye(odd);
  assert.deepEqual(
    parseLeague(await saved()),
    afterBye,
    'a rest week simulates rival fixtures once',
  );
  await page
    .getByRole('button', { name: 'View full league', exact: true })
    .click();
  await page.reload();
  await page.locator('.league-standings').waitFor();
  assert.deepEqual(
    parseLeague(await saved()),
    afterBye,
    'reload does not advance or simulate the rest week again',
  );
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await fits(page, `league table fits ${width}px`);
  }
  // Five filled form marks and a full twelve-club table are denser than an opening week.
  let dense = createLeague(2026, {
    name: 'Deportivo Esquina',
    kitId: 'forest',
    size: 12,
    legs: 2,
  });
  while (dense.round < 7) {
    const game = activeLeagueGame(dense);
    dense = finishLeagueGame(
      dense,
      game.id,
      dense.round % 3,
      (dense.round + 1) % 3,
    );
  }
  await installSeason(dense);
  await page.locator('.league-standings').waitFor();
  await assertTable(dense);
  assert.equal(await page.locator('.league-standings tbody tr').count(), 12);
  assert.equal(
    await page.locator('.league-standings .is-us .league-form > span').count(),
    5,
  );
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await fits(page, `twelve clubs and last-five form fit ${width}px`);
    for (const mark of await page
      .locator('.league-standings .is-us .league-form > span')
      .all())
      assert.ok(
        (await mark.boundingBox()).width >= 12,
        'filled form markers remain legible',
      );
  }
  await blockedStorageWarning();
  assert.deepEqual(
    dialogs,
    [],
    'saved league navigation does not prompt to discard the match',
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: three keyboard-selectable levels, literalv35 journal upgrade, complete season, pending reload, committed League/global/hash resume, full-time reload, non-scoring review isolation, blocked-storage warning, both dismissals, 21-player boards, 320px geometry, byes and real venues.',
  );
} finally {
  await browser.close();
}
