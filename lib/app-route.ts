// Shareable locations: #training/<course>, #match/<fixture> (selected) and #match/<fixture>/play.
export type AppRoute =
  | { view: 'menu' }
  | { view: 'training' }
  | { view: 'tournaments' }
  | { view: 'tournament' }
  | { view: 'my-tournament' }
  | { view: 'league' }
  | { view: 'first-match' }
  | { view: 'course'; courseId: string }
  | { view: 'matches'; fixtureId: string }
  | { view: 'match'; fixtureId: string };

export function parseRoute(
  hash: string,
  courseIds: readonly string[],
  fixtureIds: readonly string[],
): AppRoute {
  const [section, id, action] = hash.replace(/^#\/?/, '').split('/');
  if (section === 'tournaments' && !id) return { view: 'tournaments' };
  if (section === 'training' && !id) return { view: 'training' };
  if (section === 'first-match' && !id) return { view: 'first-match' };
  if (section === 'tournament') return { view: 'tournament' };
  if (section === 'my-tournament') return { view: 'my-tournament' };
  if (section === 'league') return { view: 'league' };
  if (section === 'training' && courseIds.includes(id))
    return { view: 'course', courseId: id };
  if (section === 'match' && fixtureIds.includes(id))
    return action === 'play'
      ? { view: 'match', fixtureId: id }
      : { view: 'matches', fixtureId: id };
  return { view: 'menu' };
}

export function routeHash(route: AppRoute): string {
  if (route.view === 'training') return '#training';
  if (route.view === 'tournaments') return '#tournaments';
  if (route.view === 'tournament') return '#tournament';
  if (route.view === 'my-tournament') return '#my-tournament';
  if (route.view === 'league') return '#league';
  if (route.view === 'first-match') return '#first-match';
  if (route.view === 'course') return `#training/${route.courseId}`;
  if (route.view === 'matches') return `#match/${route.fixtureId}`;
  if (route.view === 'match') return `#match/${route.fixtureId}/play`;
  return '';
}
