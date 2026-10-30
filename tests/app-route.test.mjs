import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRoute, routeHash } from '../lib/app-route.ts';

const courses = ['goalkeeper', 'full-back'];
const fixtures = ['original', 'high-pressure'];

test('routes round-trip through the URL hash', () => {
  for (const route of [
    { view: 'menu' },
    { view: 'training' },
    { view: 'tournaments' },
    { view: 'tournament' },
    { view: 'my-tournament' },
    { view: 'league' },
    { view: 'first-match' },
    { view: 'course', courseId: 'goalkeeper' },
    { view: 'matches', fixtureId: 'high-pressure' },
    { view: 'match', fixtureId: 'original' },
  ])
    assert.deepEqual(parseRoute(routeHash(route), courses, fixtures), route);
});

test('unknown or malformed hashes fall back to the menu', () => {
  for (const hash of [
    '',
    '#',
    '#training/striker-x',
    '#match/nope/play',
    '#other/goalkeeper',
    '#match',
    '#tournaments/missing',
  ])
    assert.deepEqual(parseRoute(hash, courses, fixtures), { view: 'menu' });
  assert.deepEqual(parseRoute('#/match/original', courses, fixtures), {
    view: 'matches',
    fixtureId: 'original',
  });
});
