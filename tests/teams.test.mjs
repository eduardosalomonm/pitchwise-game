import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  teams,
  HOME_TEAM,
  getTeam,
  fixtureTeam,
  matchKits,
  renameOpponentText,
} from '../lib/teams.ts';
import { matchFixtures } from '../lib/match-fixtures.ts';
import { GROUPS, OUR_TEAM } from '../lib/tournament.ts';
import { cupFixture } from '../lib/tournament-stories.ts';

test('32 fictional clubs have distinct identities and readable kit patterns', () => {
  assert.equal(teams.length, 32);
  for (const field of ['id', 'name', 'code'])
    assert.equal(new Set(teams.map((team) => team[field])).size, 32, field);
  for (const team of teams) {
    assert.equal(getTeam(team.id), team);
    assert.equal(
      getTeam(team.legacy),
      team,
      'legacy aliases keep old data compatible',
    );
    assert.doesNotMatch(team.name, /\bXI\b/);
    assert.match(team.code, /^[A-Z]{3}$/);
    assert.ok(
      ['solid', 'stripes', 'hoops', 'sash', 'halves'].includes(
        team.kit.pattern,
      ),
    );
    for (const colour of [team.kit.primary, team.kit.secondary])
      assert.match(colour, /^#[a-f\d]{6}$/i);
    assert.notEqual(team.kit.primary, team.kit.secondary);
  }
  assert.equal(OUR_TEAM, HOME_TEAM.name);
  assert.equal(new Set(GROUPS.flat()).size, 32);
  for (const name of GROUPS.flat()) assert.equal(getTeam(name).name, name);
});

test('all fifteen fixtures resolve to clubs without changing stable fixture IDs', () => {
  for (const fixture of matchFixtures) {
    assert.equal(fixtureTeam(fixture.id).name, fixture.opponent);
    assert.equal(getTeam(fixture.opponent).name, fixture.opponent);
    assert.doesNotMatch(
      JSON.stringify(fixture),
      /\b(?:Rival|Our|Harbour|Narrow|Arrow|Runners|Weavers|Towers|Banks|Bait|Breakers|Compass) XI\b/,
    );
  }
});

test('a cream opponent uses a change strip and keepers remain distinct from both outfield kits', () => {
  const creamOpponent = getTeam('pine');
  const kits = matchKits(creamOpponent);
  assert.equal(kits.away.primary, creamOpponent.kit.secondary);
  assert.equal(
    creamOpponent.kit.primary,
    '#efe5cd',
    'do not mutate the club home kit',
  );
  for (const team of teams.filter((team) => team !== HOME_TEAM)) {
    const actual = matchKits(team);
    assert.equal(
      new Set([
        actual.home.primary,
        actual.away.primary,
        actual.homeKeeper.primary,
        actual.awayKeeper.primary,
      ]).size,
      4,
      team.name,
    );
  }
});

test('curated cup copy names the actual opponent, including short source references', () => {
  for (let round = 0; round < 7; round++) {
    const opponent = getTeam('pine').name;
    const fixture = cupFixture(round, opponent);
    assert.equal(fixture.opponent, opponent);
    const copy = [
      fixture.description,
      ...fixture.moments.flatMap((moment) => [
        moment.name,
        moment.introduction,
        ...moment.nodes.flatMap((node) => [
          node.context,
          node.prompt,
          ...node.choices.flatMap((choice) => [
            choice.label,
            choice.feedback,
            choice.outcome?.recap ?? '',
          ]),
        ]),
      ]),
    ].join('\n');
    assert.doesNotMatch(
      copy,
      /\b(?:Rival XI|Our XI|Harbour|Bait|Runners|Weavers|Banks|Breakers|Compass)\b/,
    );
  }
  assert.equal(
    renameOpponentText(
      'Harbour have the ball. Harbour XI score; Our XI restart.',
      'Harbour XI',
      'Port Meridian',
    ),
    'Port Meridian have the ball. Port Meridian score; Pitchwise FC restart.',
  );
  assert.equal(
    renameOpponentText(
      'The harbour is outside the story.',
      'Harbour XI',
      'Port Meridian',
    ),
    'The harbour is outside the story.',
  );
});
