import assert from 'node:assert/strict';
import { checkOptionalReading } from './browser-test-support.mjs';
import {
  assertReadableButtons,
  isolateGameTelemetry,
  previewOrigin,
} from './browser-test-support.mjs';
import { matchFixtures } from '../lib/match-fixtures.ts';
import { fixtureTeam, HOME_TEAM } from '../lib/teams.ts';
import {
  createMatchRun,
  chooseMatchOption,
  continueMatch,
} from '../lib/match-day.ts';
import { matchChoiceTone } from '../lib/match-feedback.ts';
import { contactTimeline } from '../lib/pitch-motion.ts';
import { goalPath } from '../lib/pitch-cues.ts';

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
  for (const fixture of matchFixtures) {
    await page.goto(`${origin}/#match/${fixture.id}/play`);
    await page.locator('.match-choice-list').waitFor();
    await checkOptionalReading(page);
    const opponent = fixtureTeam(fixture.id);
    const atHome = matchFixtures.indexOf(fixture) % 2 === 0;
    assert.equal(
      await page.locator('.score-team-code').first().innerText(),
      atHome ? HOME_TEAM.code : opponent.code,
    );
    assert.equal(
      await page.locator('.match-pitch').getAttribute('viewBox'),
      '0 0 1000 700',
    );
    assert.equal(
      await page
        .locator(
          '.is-playing .match-timeline, .is-playing .phase-row, .cup-match-opponent',
        )
        .count(),
      0,
    );
    let run = createMatchRun(fixture.moments);
    while (run.status !== 'final') {
      const moment = fixture.moments[run.momentIndex];
      const node = moment.nodes.find((node) => node.id === run.nodeId);
      const choice = node.choices.find(
        (choice) => matchChoiceTone(node, choice) === 'positive',
      );
      assert.ok(choice, node.id);
      const teamsOnPitch = await page
        .locator('.match-pitch [data-team]')
        .evaluateAll((markers) => markers.map((marker) => marker.dataset.team));
      assert.equal(
        teamsOnPitch.filter((id) => id === HOME_TEAM.id).length,
        11,
        node.id,
      );
      assert.equal(
        teamsOnPitch.filter((id) => id === opponent.id).length,
        11,
        node.id,
      );
      assert.equal(
        await page
          .locator('.match-pitch .active-player-cue .active-halo')
          .count(),
        1,
        node.id,
      );
      assert.equal(
        await page.locator('.match-pitch .pitch-goal').count(),
        2,
        node.id,
      );
      assert.equal(
        await page.locator('.match-pitch .you-label').textContent(),
        'YOU',
        node.id,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        node.id,
      );
      await page
        .locator('.match-choice-list button')
        .filter({ hasText: choice.label })
        .click();
      assert.equal(
        await page.locator('.match-choice-list button:disabled').count(),
        node.choices.length - 1,
        'other answers lock immediately',
      );
      const lockedChoice = page.locator(
        '.match-choice-list button[aria-pressed="true"]',
      );
      assert.equal(
        await lockedChoice.count(),
        1,
        'one chosen answer remains marked',
      );
      assert.equal(
        await page.locator('.match-choice-list').isVisible(),
        false,
        'result replaces the choices',
      );
      await lockedChoice.evaluate((button) => button.click());
      assert.equal(
        await page.locator('.match-consequence').count(),
        1,
        'a repeated tap does not produce another consequence',
      );
      await page.locator('.match-consequence button').click();
      run = continueMatch(
        chooseMatchOption(run, moment.id, node.id, choice.id, fixture.moments),
        fixture.moments,
      );
      if (run.status !== 'final') {
        assert.equal(
          await page
            .locator('.match-choice-card h2')
            .evaluate((h) => h === document.activeElement),
          true,
          'the new decision receives keyboard focus without scrolling past its pitch',
        );
        assert.equal(
          await page.evaluate(() => scrollY),
          0,
          'next decision and next moment return to the whole situation immediately',
        );
      }
    }
    await page.locator('.final-whistle').waitFor();
    if (fixture === matchFixtures[0])
      await assertReadableButtons(
        page,
        '.match-result-actions',
        'full-time actions',
      );
    assert.equal(
      await page.locator('.final-score strong').innerText(),
      atHome
        ? `${run.homeScore}–${run.awayScore}`
        : `${run.awayScore}–${run.homeScore}`,
      fixture.id,
    );
    console.log(
      `${fixture.opponent}: ${run.homeScore}–${run.awayScore}; all ideal decisions playable at 320px`,
    );
  }
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`${origin}/#match/bait-traps/play`);
    await page.locator('.match-choice-list').waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `overflow at ${width}`,
    );
  }
  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [390, 744],
    [430, 832],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${origin}/#match/arrow-middle/play`);
    await page.locator('.match-choice-list').waitFor();
    assert.equal(
      await page.locator('.match-pitch').getAttribute('viewBox'),
      '0 0 1000 700',
    );
    assert.match(
      await page.locator('.match-actor-strip small').innerText(),
      /Decision 1 · Defending/i,
    );
    assert.ok(
      await page
        .locator('.score-team-code')
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 12),
      'mobile team codes stay readable',
    );
    const bounds = await page
      .locator('.match-choice-list button')
      .evaluateAll((buttons) =>
        buttons.map((b) => {
          const r = b.getBoundingClientRect();
          return {
            top: r.top,
            bottom: r.bottom,
            height: r.height,
            width: r.width,
            font: parseFloat(getComputedStyle(b).fontSize),
          };
        }),
      );
    assert.equal(bounds.length, 4);
    assert.ok(
      bounds.every((b) => b.height >= 44 && b.width >= 44 && b.font >= 16),
      'readable touch choices',
    );
    if (width >= 375)
      assert.ok(
        bounds[0].top < height,
        `${width}: first option appears on the opening screen`,
      );
    assert.ok(
      bounds.at(-1).bottom <= height * 2,
      `${width}: play and all options need less than one viewport of scrolling`,
    );
    const toggle = page.getByRole('button', {
      name: 'Zoom on the play',
      exact: true,
    });
    await toggle.waitFor();
    const toggleBox = await toggle.boundingBox();
    assert.ok(toggleBox.width >= 44 && toggleBox.height >= 44);
    await toggle.focus();
    await page.keyboard.press('Enter');
    assert.notEqual(
      await page.locator('.match-pitch').getAttribute('viewBox'),
      '0 0 1000 700',
    );
    await page.getByRole('button', { name: 'Full pitch', exact: true }).click();
    assert.equal(
      await page.locator('.match-pitch').getAttribute('viewBox'),
      '0 0 1000 700',
    );
  }
  await page.setViewportSize({ width: 375, height: 667 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    '200% text fits without horizontal overflow',
  );
  assert.ok(
    (
      await page
        .locator('.match-choice-list button')
        .evaluateAll((bs) => bs.map((b) => b.scrollHeight <= b.clientHeight))
    ).every(Boolean),
    'enlarged option text is not clipped',
  );
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });

  // Inspect actual CSS motion at the kick/receive instants, not just the final
  // SVG attributes. Gameplay runs above retain reduced motion for speed.
  for (const [fixtureId, targetId, optionId, contacts] of [
    ['low-block', 'block-switch-finish', 'read', ['h-lw', 'h-st']],
    ['high-pressure', 'advanced-far-side-1', 'option-4', ['a-lb', 'a-st']],
    ['second-ball', 'direct-layoff-finish', 'rush', ['h-r8', 'h-rw']],
    ['runners-tracking', 'runners-tracking-3-1', 'option-2', ['a-st', 'a-l8']],
    [
      'towers-rebounds',
      'towers-rebounds-5-1',
      'option-3',
      ['h-gk', 'a-st', 'h-gk'],
    ],
  ]) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const fixture = matchFixtures.find((f) => f.id === fixtureId);
    await page.goto(`${origin}/#match/${String(fixtureId)}/play`);
    await page.locator('.match-choice-list').waitFor();
    let run = createMatchRun(fixture.moments);
    while (run.nodeId !== targetId) {
      const moment = fixture.moments[run.momentIndex];
      const node = moment.nodes.find((n) => n.id === run.nodeId);
      const choice = node.choices.find(
        (c) => matchChoiceTone(node, c) === 'positive',
      );
      await page
        .locator('.match-choice-list button')
        .filter({ hasText: choice.label })
        .click();
      await page.locator('.match-consequence button').click();
      run = continueMatch(
        chooseMatchOption(run, moment.id, node.id, choice.id, fixture.moments),
        fixture.moments,
      );
      assert.notEqual(
        run.status,
        'final',
        `${String(targetId)} is reached through visible controls`,
      );
    }
    const moment = fixture.moments[run.momentIndex];
    const node = moment.nodes.find((n) => n.id === targetId);
    const choice = node.choices.find((c) => c.id === optionId);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page
      .locator('.match-choice-list button')
      .filter({ hasText: choice.label })
      .click();
    await page.locator('.match-consequence').waitFor();
    const times = contactTimeline(
      node.scene.ball,
      goalPath(
        choice.ballPath,
        choice.outcome?.homeGoals,
        choice.outcome?.awayGoals,
      ),
    );
    for (const [index, playerId] of contacts.entries()) {
      const actual = await page.locator('.match-pitch').evaluate(
        (svg, { time, playerId }) => {
          for (const animation of svg.getAnimations({ subtree: true })) {
            animation.pause();
            animation.currentTime = 350 + 2300 * time;
          }
          const inverse = svg.getScreenCTM().inverse();
          const center = (element) => {
            const rect = element.getBoundingClientRect();
            const p = new DOMPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
            ).matrixTransform(inverse);
            return { x: p.x / 10, y: p.y / 7 };
          };
          return {
            ball: center(svg.querySelector('.ball-marker circle')),
            player: center(
              svg.querySelector(`[data-player-id="${playerId}"] .player-disc`),
            ),
          };
        },
        { time: times[index], playerId },
      );
      for (const item of ['ball', 'player']) {
        assert.ok(
          Math.abs(actual[item].x - choice.ballPath[index].x) < 0.1 &&
            Math.abs(actual[item].y - choice.ballPath[index].y) < 0.1,
          `${String(targetId)}/${String(optionId)}: actual ${item} meets ${playerId} at contact ${index}`,
        );
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: all 15 fixtures, 22 correctly assigned kit markers, locked choices, score consistency, responsive layouts and no browser errors.',
  );
} finally {
  await browser.close();
}
