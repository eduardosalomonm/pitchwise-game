// Pure validation and reporting. Collection is separately opt-in.
export const MAX_PLAYTEST_ACTIVE_MS = 24 * 60 * 60 * 1_000;
export const MAX_PLAYTEST_RESPONSE_MS = 30 * 60 * 1_000;

type PlaytestBase = {
  schemaVersion: 1;
  eventId: string;
  sessionId: string;
  occurredAt: number;
  alias?: string;
  // Cumulative active time in this session, excluding hidden/idle time.
  activeMs?: number;
};

export type PlaytestVisit = PlaytestBase & {
  type: 'visit';
  entrySource: 'direct' | 'shared_link';
};
export type PlaytestStart = PlaytestBase & { type: 'activity_start' } & (
    | { activity: 'course'; courseId: string }
    | { activity: 'match'; fixtureId: string }
    | { activity: 'tournament' }
    | { activity: 'my_tournament' }
  );
export type PlaytestCourseAnswer = PlaytestBase & {
  type: 'course_answer';
  courseId: string;
  nodeId: string;
  choiceId: string;
  correct: boolean;
  responseMs?: number;
};
export type PlaytestCourseComplete = PlaytestBase & {
  type: 'course_complete';
  courseId: string;
  correct: number;
  total: number;
};
export type PlaytestMatchDecision = PlaytestBase & {
  type: 'match_decision';
  fixtureId: string;
  nodeId: string;
  choiceId: string;
  verdict: 'positive' | 'neutral' | 'negative';
  responseMs?: number;
};
export type PlaytestMatchComplete = PlaytestBase & {
  type: 'match_complete';
  fixtureId: string;
  homeGoals: number;
  awayGoals: number;
  decisions: number;
  goodDecisions: number;
};
export type PlaytestTournamentComplete = PlaytestBase & {
  type: 'tournament_complete';
  result: 'champion' | 'eliminated';
  stage: 'group' | 'round16' | 'quarterfinal' | 'semifinal' | 'final';
  matchesPlayed: number;
  /** 'my' for My Tournament (16 teams, no round of 16); absent for The Readers' Cup. */
  competition?: 'my';
};
export type PlaytestEvent =
  | (PlaytestBase & { type: 'session_activity' })
  | (PlaytestBase & { type: 'guide_skip' })
  | PlaytestVisit
  | PlaytestStart
  | PlaytestCourseAnswer
  | PlaytestCourseComplete
  | PlaytestMatchDecision
  | PlaytestMatchComplete
  | PlaytestTournamentComplete;
type PayloadOf<T> = T extends PlaytestBase
  ? Omit<T, keyof PlaytestBase>
  : never;
export type PlaytestPayload = PayloadOf<PlaytestEvent>;
export type PlaytestValidation =
  | { ok: true; event: PlaytestEvent }
  | { ok: false; error: string };

const baseKeys = [
  'schemaVersion',
  'eventId',
  'sessionId',
  'occurredAt',
  'alias',
  'activeMs',
  'type',
];
const eventKeys: Record<PlaytestEvent['type'], readonly string[]> = {
  session_activity: [],
  guide_skip: [],
  visit: ['entrySource'],
  activity_start: ['activity', 'courseId', 'fixtureId'],
  course_answer: ['courseId', 'nodeId', 'choiceId', 'correct', 'responseMs'],
  course_complete: ['courseId', 'correct', 'total'],
  match_decision: ['fixtureId', 'nodeId', 'choiceId', 'verdict', 'responseMs'],
  match_complete: [
    'fixtureId',
    'homeGoals',
    'awayGoals',
    'decisions',
    'goodDecisions',
  ],
  tournament_complete: ['result', 'stage', 'matchesPlayed', 'competition'],
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' &&
  Number.isSafeInteger(value) &&
  value >= min &&
  value <= max;
const oneOf = (value: unknown, values: readonly string[]) =>
  typeof value === 'string' && values.includes(value);

export function validatePlaytestEvent(input: unknown): PlaytestValidation {
  const fail = (error: string): PlaytestValidation => ({ ok: false, error });
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return fail('Expected an event object.');
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null)
    return fail('Expected a plain event object.');
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (
    Reflect.ownKeys(input).some(
      (key) => typeof key !== 'string' || !('value' in descriptors[key]),
    )
  ) {
    return fail('Only plain JSON fields are allowed.');
  }
  const raw = input as Record<string, unknown>;
  if (typeof raw.type !== 'string' || !Object.hasOwn(eventKeys, raw.type))
    return fail('Unknown event type.');
  const type = raw.type as PlaytestEvent['type'];
  const allowed = new Set([...baseKeys, ...eventKeys[type]]);
  if (Object.keys(raw).some((key) => !allowed.has(key)))
    return fail('Unexpected event field.');
  if (raw.schemaVersion !== 1) return fail('Unsupported event schema.');
  if (typeof raw.eventId !== 'string' || !uuid.test(raw.eventId))
    return fail('Invalid event ID.');
  if (typeof raw.sessionId !== 'string' || !uuid.test(raw.sessionId))
    return fail('Invalid session ID.');
  // Numeric Unix milliseconds, with a finite upper bound (1 January 2100).
  if (!integer(raw.occurredAt, 0, 4_102_444_800_000))
    return fail('Invalid event timestamp.');
  if (
    Object.hasOwn(raw, 'activeMs') &&
    !integer(raw.activeMs, 0, MAX_PLAYTEST_ACTIVE_MS)
  )
    return fail('Invalid active time.');
  if (
    Object.hasOwn(raw, 'responseMs') &&
    !integer(raw.responseMs, 0, MAX_PLAYTEST_RESPONSE_MS)
  )
    return fail('Invalid response time.');
  let alias: string | undefined;
  if (Object.hasOwn(raw, 'alias')) {
    if (typeof raw.alias !== 'string') return fail('Invalid alias.');
    alias = raw.alias.trim();
    if (
      !alias ||
      Array.from(alias).length > 24 ||
      /[\p{Cc}\p{Cf}]/u.test(alias)
    )
      return fail('Alias must contain 1–24 visible characters.');
    if (
      /[^\s@]+@[^\s@]+\.[^\s@]+/.test(alias) ||
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(alias) ||
      (/^[0-9a-f:]+$/i.test(alias) && alias.includes(':'))
    ) {
      return fail('Use a nickname rather than an email or IP address.');
    }
  }
  for (const key of ['courseId', 'fixtureId', 'nodeId', 'choiceId']) {
    if (
      Object.hasOwn(raw, key) &&
      (typeof raw[key] !== 'string' || !identifier.test(raw[key] as string))
    )
      return fail(`Invalid ${key}.`);
  }
  const requiredId = (...keys: string[]) =>
    keys.every(
      (key) =>
        typeof raw[key] === 'string' && identifier.test(raw[key] as string),
    );
  switch (type) {
    case 'visit':
      if (!oneOf(raw.entrySource, ['direct', 'shared_link']))
        return fail('Invalid entry source.');
      break;
    case 'activity_start':
      if (!oneOf(raw.activity, ['course', 'match', 'tournament', 'my_tournament']))
        return fail('Invalid activity.');
      if (
        raw.activity === 'course' &&
        (!requiredId('courseId') || Object.hasOwn(raw, 'fixtureId'))
      )
        return fail('A course start needs only its course ID.');
      if (
        raw.activity === 'match' &&
        (!requiredId('fixtureId') || Object.hasOwn(raw, 'courseId'))
      )
        return fail('A match start needs only its fixture ID.');
      if (
        (raw.activity === 'tournament' || raw.activity === 'my_tournament') &&
        (Object.hasOwn(raw, 'courseId') || Object.hasOwn(raw, 'fixtureId'))
      )
        return fail('A tournament start does not take content IDs.');
      break;
    case 'course_answer':
      if (
        !requiredId('courseId', 'nodeId', 'choiceId') ||
        typeof raw.correct !== 'boolean'
      )
        return fail('Invalid course answer.');
      break;
    case 'course_complete':
      if (
        !requiredId('courseId') ||
        !integer(raw.total, 1, 55) ||
        !integer(raw.correct, 0, raw.total)
      )
        return fail('Invalid course result.');
      break;
    case 'match_decision':
      if (
        !requiredId('fixtureId', 'nodeId', 'choiceId') ||
        !oneOf(raw.verdict, ['positive', 'neutral', 'negative'])
      )
        return fail('Invalid match decision.');
      break;
    case 'match_complete':
      if (
        !requiredId('fixtureId') ||
        !integer(raw.homeGoals, 0, 99) ||
        !integer(raw.awayGoals, 0, 99) ||
        !integer(raw.decisions, 1, 500) ||
        !integer(raw.goodDecisions, 0, raw.decisions)
      )
        return fail('Invalid match result.');
      break;
    case 'tournament_complete': {
      const stages = ['group', 'round16', 'quarterfinal', 'semifinal', 'final'];
      if (
        !oneOf(raw.result, ['champion', 'eliminated']) ||
        !oneOf(raw.stage, stages) ||
        !integer(raw.matchesPlayed, 3, 7) ||
        (raw.competition !== undefined && raw.competition !== 'my')
      )
        return fail('Invalid tournament result.');
      // My Tournament has 8, 16 or 32 teams, so a stage can be reached after a
      // different number of matches: it only needs to sit inside that range.
      const index = stages.indexOf(raw.stage as string);
      const expectedMatches =
        raw.competition === 'my'
          ? (index === 0 ? raw.matchesPlayed === 3 : (raw.matchesPlayed as number) >= (index === 4 ? 5 : 4))
            ? raw.matchesPlayed
            : -1
          : [3, 4, 5, 6, 7][index];
      if (
        raw.matchesPlayed !== expectedMatches ||
        (raw.result === 'champion' && raw.stage !== 'final')
      )
        return fail('Tournament result and stage disagree.');
      break;
    }
  }
  return {
    ok: true,
    event: {
      ...raw,
      eventId: raw.eventId.toLowerCase(),
      sessionId: raw.sessionId.toLowerCase(),
      ...(alias ? { alias } : {}),
    } as PlaytestEvent,
  };
}

export type PlaytestChoice = {
  eventId: string;
  occurredAt: number;
  activity: 'course' | 'match';
  courseId?: string;
  fixtureId?: string;
  nodeId: string;
  choiceId: string;
  verdict: 'positive' | 'neutral' | 'negative';
  responseMs?: number;
};
export type PlaytestSessionSummary = {
  sessionId: string;
  alias?: string;
  firstSeenAt: number;
  lastSeenAt: number;
  activeMs: number;
  visits: number;
  cameFromSharedLink: boolean;
  starts: PlaytestStart[];
  completions: (
    | PlaytestCourseComplete
    | PlaytestMatchComplete
    | PlaytestTournamentComplete
  )[];
  choices: PlaytestChoice[];
};
export type PlaytestSummary = {
  uniqueEvents: number;
  duplicateEvents: number;
  invalidEvents: number;
  visits: number;
  uniqueSessions: number;
  sharedSessions: number;
  starts: { courses: number; matches: number; tournaments: number };
  completions: { courses: number; matches: number; tournaments: number };
  sessions: PlaytestSessionSummary[];
};

// Deduplicate by event UUID before counting. activeMs is cumulative, so take the
// maximum rather than adding it; elapsed wall-clock time is not active usage.
export function summarizePlaytestEvents(
  inputs: readonly unknown[],
): PlaytestSummary {
  const events = new Map<string, PlaytestEvent>();
  let duplicateEvents = 0;
  let invalidEvents = 0;
  for (const input of inputs) {
    const parsed = validatePlaytestEvent(input);
    if (!parsed.ok) {
      invalidEvents++;
      continue;
    }
    if (events.has(parsed.event.eventId)) {
      duplicateEvents++;
      continue;
    }
    events.set(parsed.event.eventId, parsed.event);
  }
  const summary: PlaytestSummary = {
    uniqueEvents: events.size,
    duplicateEvents,
    invalidEvents,
    visits: 0,
    uniqueSessions: 0,
    sharedSessions: 0,
    starts: { courses: 0, matches: 0, tournaments: 0 },
    completions: { courses: 0, matches: 0, tournaments: 0 },
    sessions: [],
  };
  const sessions = new Map<string, PlaytestSessionSummary>();
  const ordered = [...events.values()].sort(
    (a, b) => a.occurredAt - b.occurredAt || a.eventId.localeCompare(b.eventId),
  );
  for (const event of ordered) {
    let session = sessions.get(event.sessionId);
    if (!session) {
      session = {
        sessionId: event.sessionId,
        firstSeenAt: event.occurredAt,
        lastSeenAt: event.occurredAt,
        activeMs: 0,
        visits: 0,
        cameFromSharedLink: false,
        starts: [],
        completions: [],
        choices: [],
      };
      sessions.set(event.sessionId, session);
    }
    session.lastSeenAt = event.occurredAt;
    session.activeMs = Math.max(session.activeMs, event.activeMs ?? 0);
    if (event.alias) session.alias = event.alias;
    switch (event.type) {
      case 'visit':
        summary.visits++;
        session.visits++;
        if (event.entrySource === 'shared_link')
          session.cameFromSharedLink = true;
        break;
      case 'activity_start':
        session.starts.push({ ...event });
        summary.starts[
          event.activity === 'course'
            ? 'courses'
            : event.activity === 'match'
              ? 'matches'
              : 'tournaments'
        ]++;
        break;
      case 'course_complete':
      case 'match_complete':
      case 'tournament_complete':
        session.completions.push({ ...event });
        summary.completions[
          event.type === 'course_complete'
            ? 'courses'
            : event.type === 'match_complete'
              ? 'matches'
              : 'tournaments'
        ]++;
        break;
      case 'course_answer':
      case 'match_decision':
        session.choices.push({
          eventId: event.eventId,
          occurredAt: event.occurredAt,
          activity: event.type === 'course_answer' ? 'course' : 'match',
          ...(event.type === 'course_answer'
            ? { courseId: event.courseId }
            : { fixtureId: event.fixtureId }),
          nodeId: event.nodeId,
          choiceId: event.choiceId,
          verdict:
            event.type === 'course_answer'
              ? event.correct
                ? 'positive'
                : 'negative'
              : event.verdict,
          ...(event.responseMs !== undefined
            ? { responseMs: event.responseMs }
            : {}),
        });
        break;
    }
  }
  summary.sessions = [...sessions.values()].sort(
    (a, b) =>
      b.lastSeenAt - a.lastSeenAt || a.sessionId.localeCompare(b.sessionId),
  );
  summary.uniqueSessions = sessions.size;
  summary.sharedSessions = summary.sessions.filter(
    (session) => session.cameFromSharedLink,
  ).length;
  return summary;
}
