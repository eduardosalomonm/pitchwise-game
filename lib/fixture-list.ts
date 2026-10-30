import { fixtureTeam } from './teams.ts';

// The Match Day picker needs only names and covers. The play graphs load with the match itself.
export type FixtureSummary = { id: string; name: string; opponent: string; cover: string };

/** The square card thumbnail made from a cover by scripts/optimize-images.mjs. */
export const thumbnailPath = (cover: string) =>
  cover.replace('/illustrations/', '/illustrations/thumbs/').replace(/\/([^/]+)\/([^/]+)$/, '/$1-$2');

const entries: [id: string, name: string, cover: string][] = [
  ['original', 'Beat the Press', 'match-days/beat-the-press'],
  ['low-block', 'Break the Low Block', 'match-days/low-block'],
  ['second-ball', 'Win the Second Ball', 'match-days/second-ball'],
  ['high-pressure', 'Outthink the High Press', 'match-days/high-press'],
  ['changing-picture', 'Read the Changing Picture', 'match-days/changing-picture'],
  ['harbour-outlets', 'Find the Outlet', 'actions/goalkeeper-1'],
  ['narrow-width', 'Stretch the Pitch', 'actions/right-back-2'],
  ['arrow-middle', 'Guard the Middle', 'actions/right-centre-back-3'],
  ['runners-tracking', 'Follow the Runner', 'actions/left-winger-5'],
  ['weavers-press', 'Press as a Pair', 'actions/left-winger-4'],
  ['towers-rebounds', 'Own the Rebound', 'actions/match-duel'],
  ['banks-block', 'Move the Block', 'actions/left-midfielder-2'],
  ['bait-traps', 'Beat the Trap', 'actions/striker-4'],
  ['breakers-transition', 'Control the Transition', 'actions/right-back-3'],
  ['compass-rhythm', 'Change the Rhythm', 'actions/right-midfielder-2'],
];

export const fixtureList: FixtureSummary[] = entries.map(([id, name, cover]) => ({
  id,
  name,
  opponent: fixtureTeam(id).name,
  cover: `/illustrations/${cover}.webp`,
}));
