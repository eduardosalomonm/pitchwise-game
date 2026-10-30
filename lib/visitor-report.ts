import type { PlaytestEvent } from './playtest-events.ts';
import { DEVICE_CLASSES, type DeviceClass } from './visitor-policy.ts';

// Pure aggregation for the creator's visitor report. A "session" is one tab visit;
// a "visitor" is one browser (device-stored ID), optionally named by a personal link.
export type VisitorSessionRow = {
  id: string;
  visitorId: string;
  label: string | null;
  device: DeviceClass;
  language: string | null;
  referrer: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  createdAt: number;
  lastSeenAt: number;
};
export type VisitorEventRow = { sessionId: string; receivedAt: number; event: PlaytestEvent };
type Describe = (event: PlaytestEvent) => { activity: string; prompt: string; choice: string } | null;

const DAY = 86_400_000;
const dayKey = (time: number) => new Date(time).toISOString().slice(0, 10);
const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const minutes = (ms: number) => Math.round(ms / 6_000) / 10;
export const placeName = (s: Pick<VisitorSessionRow, 'city' | 'region' | 'country'>) =>
  [s.city, s.region, s.country].filter(Boolean).join(', ') || 'Unknown location';

type SessionStats = {
  row: VisitorSessionRow;
  activeMs: number;
  types: Set<string>;
  starts: Set<string>;
  cupRounds: Set<number>;
  shared: boolean;
  choices: number;
  good: number;
  matches: number;
  myMatches: number;
  leagueMatches: number;
  friendlyMatches: number;
  guideSkipped: boolean;
  courses: number;
  cupResult?: { result: string; stage: string; at: number };
  myResult?: { result: string; stage: string; at: number };
};

function sessionStats(sessions: VisitorSessionRow[], events: VisitorEventRow[]) {
  const stats = new Map<string, SessionStats>(
    sessions.map((row) => [row.id, { row, activeMs: 0, types: new Set(), starts: new Set(), cupRounds: new Set(), shared: false, choices: 0, good: 0, matches: 0, myMatches: 0, leagueMatches: 0, friendlyMatches: 0, guideSkipped: false, courses: 0 }]),
  );
  for (const { sessionId, event } of events) {
    const s = stats.get(sessionId);
    if (!s) continue;
    s.activeMs = Math.max(s.activeMs, event.activeMs ?? 0);
    s.types.add(event.type);
    if (event.type === 'visit' && event.entrySource === 'shared_link') s.shared = true;
    if (event.type === 'guide_skip') s.guideSkipped = true;
    // Match events keep their mode; league and guide play are not standalone Match Days.
    if (event.type === 'activity_start')
      s.starts.add(event.activity !== 'match' ? event.activity : event.fixtureId === 'league' ? 'league' : event.fixtureId === 'first-friendly' ? 'friendly' : event.fixtureId.startsWith('cup-') || event.fixtureId === 'my-cup' ? 'cup-match' : 'match');
    if (event.type === 'match_decision' || event.type === 'course_answer') {
      s.choices++;
      if (event.type === 'match_decision' ? event.verdict === 'positive' : event.correct) s.good++;
    }
    if (event.type === 'course_complete') s.courses++;
    if (event.type === 'match_complete') {
      const round = /^cup-(\d)$/.exec(event.fixtureId);
      if (round) s.cupRounds.add(Number(round[1]));
      else if (event.fixtureId === 'my-cup') s.myMatches++;
      else if (event.fixtureId === 'league') s.leagueMatches++;
      else if (event.fixtureId === 'first-friendly') s.friendlyMatches++;
      else s.matches++;
    }
    if (event.type === 'tournament_complete') {
      const result = { result: event.result, stage: event.stage, at: event.occurredAt };
      if (event.competition === 'my') {
        if (!s.myResult || result.at >= s.myResult.at) s.myResult = result;
      } else if (!s.cupResult || result.at >= s.cupResult.at) s.cupResult = result;
    }
  }
  return stats;
}

export function summarizeVisitors(
  sessions: VisitorSessionRow[],
  events: VisitorEventRow[],
  now: number,
  describe: Describe,
  days = 14,
) {
  const stats = sessionStats(sessions, events);
  const all = [...stats.values()];
  const count = (test: (s: SessionStats) => boolean) => all.filter(test).length;
  const visitors = new Map<string, SessionStats[]>();
  for (const s of all) visitors.set(s.row.visitorId, [...(visitors.get(s.row.visitorId) ?? []), s]);

  const tally = (key: (s: SessionStats[]) => string) => {
    const counts = new Map<string, number>();
    for (const list of visitors.values()) counts.set(key(list), (counts.get(key(list)) ?? 0) + 1);
    return [...counts.entries()].map(([name, n]) => ({ name, visitors: n })).sort((a, b) => b.visitors - a.visitors).slice(0, 12);
  };
  const latest = (list: SessionStats[]) => list.reduce((a, b) => (b.row.lastSeenAt > a.row.lastSeenAt ? b : a)).row;

  const decisions = new Map<string, { attempts: number; good: number; sample: PlaytestEvent }>();
  const courses = new Map<string, { answers: number; correct: number }>();
  for (const { event } of events) {
    if (event.type === 'match_decision') {
      const key = `${event.fixtureId}/${event.nodeId}`;
      const d = decisions.get(key) ?? { attempts: 0, good: 0, sample: event };
      d.attempts++;
      if (event.verdict === 'positive') d.good++;
      decisions.set(key, d);
    }
    if (event.type === 'course_answer') {
      const c = courses.get(event.courseId) ?? { answers: 0, correct: 0 };
      c.answers++;
      if (event.correct) c.correct++;
      courses.set(event.courseId, c);
    }
  }

  return {
    totals: {
      visitors: visitors.size,
      returning: [...visitors.values()].filter((list) => list.length > 1).length,
      sessions: all.length,
      played: count((s) => s.starts.size > 0),
      fromPersonalLinks: [...visitors.values()].filter((list) => list.some((s) => s.row.label)).length,
      medianActiveMinutes: minutes(median(all.filter((s) => s.activeMs > 0).map((s) => s.activeMs))),
    },
    devices: Object.fromEntries(DEVICE_CLASSES.map((d) => [d, count((s) => s.row.device === d)])) as Record<DeviceClass, number>,
    countries: tally((list) => latest(list).country ?? 'Unknown'),
    places: tally((list) => placeName(latest(list))),
    daily: Array.from({ length: days }, (_, i) => {
      const key = dayKey(now - (days - 1 - i) * DAY);
      return { day: key, sessions: count((s) => dayKey(s.row.createdAt) === key) };
    }),
    funnel: {
      sessions: all.length,
      training: count((s) => s.starts.has('course')),
      trainingCompleted: count((s) => s.courses > 0),
      match: count((s) => s.starts.has('match')),
      matchCompleted: count((s) => s.starts.has('match') && s.matches > 0),
      league: count((s) => s.starts.has('league')),
      leagueMatches: count((s) => s.leagueMatches > 0),
      friendly: count((s) => s.starts.has('friendly')),
      friendlyFinished: count((s) => s.friendlyMatches > 0),
      friendlySkipped: count((s) => s.guideSkipped),
      tournament: count((s) => s.starts.has('tournament')),
      tournamentFinished: count((s) => Boolean(s.cupResult)),
      myTournament: count((s) => s.starts.has('my_tournament')),
      myTournamentMatches: count((s) => s.myMatches > 0),
      myTournamentFinished: count((s) => Boolean(s.myResult)),
    },
    tournament: {
      reachedRound: Array.from({ length: 7 }, (_, round) => count((s) => s.cupRounds.has(round))),
      champions: count((s) => s.cupResult?.result === 'champion'),
    },
    hardestDecisions: [...decisions.values()]
      .filter((d) => d.attempts >= 3)
      .map((d) => {
        const text = describe(d.sample);
        return { attempts: d.attempts, goodRate: Math.round((d.good / d.attempts) * 100), activity: text?.activity ?? '', prompt: text?.prompt ?? '' };
      })
      .sort((a, b) => a.goodRate - b.goodRate || b.attempts - a.attempts)
      .slice(0, 8),
    courses: [...courses.entries()]
      .map(([courseId, c]) => ({ courseId, answers: c.answers, correctRate: Math.round((c.correct / c.answers) * 100) }))
      .sort((a, b) => a.correctRate - b.correctRate),
    visitors: [...visitors.entries()]
      .map(([visitorId, list]) => {
        const last = latest(list);
        const first = list.reduce((a, b) => (b.row.createdAt < a.row.createdAt ? b : a)).row;
        const choices = list.reduce((n, s) => n + s.choices, 0);
        const good = list.reduce((n, s) => n + s.good, 0);
        const rounds = list.flatMap((s) => [...s.cupRounds]);
        const cup = list.flatMap((s) => s.cupResult ? [s.cupResult] : []).sort((a, b) => b.at - a.at)[0];
        return {
          visitorId,
          label: list.map((s) => s.row.label).find(Boolean) ?? null,
          place: placeName(last),
          timezone: last.timezone,
          device: last.device,
          language: last.language,
          referrer: first.referrer,
          sessions: list.length,
          firstSeen: first.createdAt,
          lastSeen: last.lastSeenAt,
          activeMinutes: minutes(list.reduce((n, s) => n + s.activeMs, 0)),
          choices,
          goodRate: choices ? Math.round((good / choices) * 100) : null,
          coursesCompleted: list.reduce((n, s) => n + s.courses, 0),
          matchesCompleted: list.reduce((n, s) => n + s.matches, 0),
          leagueMatchesCompleted: list.reduce((n, s) => n + s.leagueMatches, 0),
          friendliesCompleted: list.reduce((n, s) => n + s.friendlyMatches, 0),
          cup: cup
            ? cup.result === 'champion'
              ? 'Champion'
              : `Out: ${cup.stage}`
            : rounds.length
              ? `Playing: ${Math.max(...rounds) + 1} of 7 played`
              : null,
          activities: [...new Set(list.flatMap((s) => [...s.starts]))],
        };
      })
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 200),
  };
}
export type VisitorSummary = ReturnType<typeof summarizeVisitors>;
