import { courses } from './scenarios.ts';
import { firstMatchMoments } from './first-match.ts';
import { matchFixtures } from './match-fixtures.ts';
import { closingMoment, cupFixture } from './tournament-stories.ts';
import { tournamentPlays } from './my-tournament-plays.ts';
import { leaguePlays } from './league-plays.ts';
import { redCardPlays } from './red-card-plays.ts';
import { easyLeaguePlays } from './league-easy-plays.ts';
import { intermediateLeaguePlays } from './league-intermediate-plays.ts';
import { hardLeaguePlays } from './league-hard-plays.ts';
import { matchChoiceTone } from './match-feedback.ts';
import type { PlaytestEvent } from './playtest-events.ts';

const fixtures = [
  ...matchFixtures,
  { ...matchFixtures[0], id: 'first-friendly', name: 'First friendly', moments: firstMatchMoments },
  ...Array.from({ length: 7 }, (_, i) => cupFixture(i, 'Harbour Athletic')),
];
export function knownFixture(id: string) {
  return id === 'league'
    ? leagueCatalog()
    : id === 'my-cup'
      ? myCupCatalog()
      : fixtures.find((item) => item.id === id);
}
let league: (typeof fixtures)[number] | undefined;
function leagueCatalog() {
  league ??= {
    ...matchFixtures[0],
    id: 'league',
    name: 'My League',
    moments: [
      ...matchFixtures.flatMap((f) => f.moments),
      ...tournamentPlays.map((p) => p.moment),
      ...leaguePlays.map((p) => p.moment),
      ...[
        ...easyLeaguePlays,
        ...intermediateLeaguePlays,
        ...hardLeaguePlays,
      ].map((p) => p.moment),
      ...redCardPlays.map((p) => p.moment),
    ],
  };
  return league;
}
// My Tournament assembles each match from any authored play plus the knockout clocks,
// so its decisions are checked against that whole library.
let myCup: (typeof fixtures)[number] | undefined;
function myCupCatalog() {
  myCup ??= {
    ...matchFixtures[0],
    id: 'my-cup',
    name: 'My Tournament',
    moments: [
      ...matchFixtures.flatMap((f) => f.moments),
      ...tournamentPlays.map((p) => p.moment),
      ...[3, 4, 5, 6].flatMap((r) => [
        closingMoment(`cup-${r}-clock`, 1, 0),
        closingMoment(`cup-${r}-clock`, 0, 1),
      ]),
    ],
  };
  return myCup;
}
export function catalogEvent(event: PlaytestEvent): PlaytestEvent | null {
  if (event.type === 'activity_start') {
    if (
      event.activity === 'course' &&
      !courses.some((c) => c.id === event.courseId)
    )
      return null;
    if (event.activity === 'match' && !knownFixture(event.fixtureId))
      return null;
  }
  if (event.type === 'course_answer' || event.type === 'course_complete') {
    const course = courses.find((c) => c.id === event.courseId);
    if (!course) return null;
    if (event.type === 'course_complete')
      return event.total === course.scenarios.length ? event : null;
    const node = course.scenarios.find((s) => s.id === event.nodeId);
    if (!node?.choices.some((c) => c.id === event.choiceId)) return null;
    return { ...event, correct: node.correctChoiceId === event.choiceId };
  }
  if (event.type === 'match_decision' || event.type === 'match_complete') {
    const fixture = knownFixture(event.fixtureId);
    if (!fixture) return null;
    if (event.type === 'match_decision') {
      const nodes = fixture.moments.flatMap((m) => m.nodes);
      // The cup's closing decision depends on the score. Allow only authored
      // versions, including the lead/trail variants, never arbitrary IDs/copy.
      if (/^cup-[0-6]$/.test(event.fixtureId)) {
        for (const [home, away] of [
          [1, 0],
          [0, 1],
        ])
          nodes.push(
            ...closingMoment(`${event.fixtureId}-clock`, home, away).nodes,
          );
      }
      const possibilities = nodes
        .filter((n) => n.id === event.nodeId)
        .flatMap((node) => {
          const choice = node.choices.find((c) => c.id === event.choiceId);
          return choice ? [matchChoiceTone(node, choice)] : [];
        });
      if (!possibilities.length) return null;
      const verdict = possibilities.includes(event.verdict)
        ? event.verdict
        : possibilities[0];
      return { ...event, verdict };
    }
  }
  return event;
}
export function describePlaytestChoice(event: PlaytestEvent) {
  if (event.type === 'course_answer') {
    const course = courses.find((c) => c.id === event.courseId);
    const scene = course?.scenarios.find((s) => s.id === event.nodeId);
    return {
      activity: course?.position ?? event.courseId,
      prompt: scene?.prompt ?? event.nodeId,
      choice:
        scene?.choices.find((c) => c.id === event.choiceId)?.label ??
        event.choiceId,
    };
  }
  if (event.type === 'match_decision') {
    const fixture = knownFixture(event.fixtureId);
    const node = fixture?.moments
      .flatMap((m) => m.nodes)
      .find((n) => n.id === event.nodeId);
    return {
      activity: fixture?.name ?? event.fixtureId,
      prompt: node?.prompt ?? event.nodeId,
      choice:
        node?.choices.find((c) => c.id === event.choiceId)?.label ??
        event.choiceId,
    };
  }
  return null;
}
