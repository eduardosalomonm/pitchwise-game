import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validatePlaytestEvent,
  summarizePlaytestEvents,
  MAX_PLAYTEST_ACTIVE_MS,
  MAX_PLAYTEST_RESPONSE_MS,
} from '../lib/playtest-events.ts';

const sessionId = 'a8b04a21-a19c-4b77-9a5c-01f4acdb24ed';
const secondSession = '063b0209-1042-4563-a87b-2e6347b81050';
const event = (index, payload, extra = {}) => ({
  schemaVersion: 1,
  eventId: `093b0209-1042-4563-a87b-${index.toString().padStart(12, '0')}`,
  sessionId,
  occurredAt: 1_790_900_000_000 + index * 1_000,
  ...payload,
  ...extra,
});
const valid = [
  event(1, { type: 'visit', entrySource: 'shared_link' }),
  event(2, {
    type: 'activity_start',
    activity: 'course',
    courseId: 'full-back',
  }),
  event(3, {
    type: 'course_answer',
    courseId: 'full-back',
    nodeId: 'full-back-1',
    choiceId: 'overlap',
    correct: true,
    responseMs: 2_500,
  }),
  event(4, {
    type: 'course_complete',
    courseId: 'full-back',
    correct: 3,
    total: 5,
  }),
  event(5, {
    type: 'activity_start',
    activity: 'match',
    fixtureId: 'original',
  }),
  event(6, {
    type: 'match_decision',
    fixtureId: 'original',
    nodeId: 'm1-gk',
    choiceId: 'right-cb',
    verdict: 'positive',
    responseMs: 1_500,
  }),
  event(7, {
    type: 'match_complete',
    fixtureId: 'original',
    homeGoals: 2,
    awayGoals: 1,
    decisions: 13,
    goodDecisions: 8,
  }),
  event(8, { type: 'activity_start', activity: 'tournament' }),
  event(9, {
    type: 'tournament_complete',
    result: 'champion',
    stage: 'final',
    matchesPlayed: 7,
  }),
];

test('allows the bounded game events and normalises an optional nickname without mutating input', () => {
  for (const input of valid)
    assert.equal(validatePlaytestEvent(input).ok, true, input.type);
  const input = {
    ...valid[0],
    alias: '  Edu ⚽  ',
    eventId: valid[0].eventId.toUpperCase(),
  };
  const before = JSON.stringify(input);
  const result = validatePlaytestEvent(input);
  assert.equal(result.ok, true);
  assert.equal(result.event.alias, 'Edu ⚽');
  assert.equal(result.event.eventId, valid[0].eventId);
  assert.equal(JSON.stringify(input), before);
});

test('rejects extra identity and arbitrary metadata fields on every event type', () => {
  for (const input of valid)
    for (const key of [
      'ip',
      'email',
      'name',
      'userAgent',
      'referrer',
      'recipient',
      'metadata',
      'consent',
    ])
      assert.equal(
        validatePlaytestEvent({ ...input, [key]: 'unexpected' }).ok,
        false,
        `${input.type}/${key}`,
      );
  assert.equal(
    validatePlaytestEvent({ ...valid[0], ['__proto__']: {} }).ok,
    false,
  );
});

test('requires UUIDs and identifier tokens rather than arbitrary content strings', () => {
  for (const field of ['sessionId', 'eventId']) {
    assert.equal(
      validatePlaytestEvent({ ...valid[0], [field]: 'not-an-id' }).ok,
      false,
    );
    assert.equal(
      validatePlaytestEvent({
        ...valid[0],
        [field]: '00000000-0000-0000-0000-000000000000',
      }).ok,
      false,
    );
  }
  for (const value of [
    'someone@example.com',
    '192.168.1.1',
    'https://site.test',
    'a'.repeat(81),
    'a b',
  ])
    assert.equal(
      validatePlaytestEvent({ ...valid[2], nodeId: value }).ok,
      false,
      value,
    );
});

test('limits timing values and nickname fields; non-finite and fractional numbers fail', () => {
  for (const value of [-1, NaN, Infinity, 0.5, MAX_PLAYTEST_ACTIVE_MS + 1])
    assert.equal(
      validatePlaytestEvent({ ...valid[0], activeMs: value }).ok,
      false,
    );
  for (const value of [-1, Infinity, 0.5, MAX_PLAYTEST_RESPONSE_MS + 1])
    assert.equal(
      validatePlaytestEvent({ ...valid[2], responseMs: value }).ok,
      false,
    );
  for (const value of [-1, Infinity, 4_102_444_800_001])
    assert.equal(
      validatePlaytestEvent({ ...valid[0], occurredAt: value }).ok,
      false,
    );
  for (const alias of [
    '',
    '  ',
    'a'.repeat(25),
    'Edu\nTest',
    'person@example.com',
    '192.168.1.1',
    '2001:db8::1',
  ])
    assert.equal(
      validatePlaytestEvent({ ...valid[0], alias }).ok,
      false,
      alias,
    );
  assert.equal(
    validatePlaytestEvent({ ...valid[0], activeMs: 0, alias: 'é'.repeat(24) })
      .ok,
    true,
  );
});

test('checks activity IDs and completion totals against their associated activity', () => {
  assert.equal(
    validatePlaytestEvent({ ...valid[1], fixtureId: 'original' }).ok,
    false,
  );
  assert.equal(
    validatePlaytestEvent({ ...valid[7], courseId: 'full-back' }).ok,
    false,
  );
  assert.equal(
    validatePlaytestEvent({ ...valid[1], courseId: undefined }).ok,
    false,
  );
  assert.equal(validatePlaytestEvent({ ...valid[3], correct: 6 }).ok, false);
  assert.equal(
    validatePlaytestEvent({ ...valid[6], goodDecisions: 14 }).ok,
    false,
  );
  assert.equal(
    validatePlaytestEvent({ ...valid[8], stage: 'semifinal', matchesPlayed: 6 })
      .ok,
    false,
  );
  assert.equal(
    validatePlaytestEvent({
      ...valid[8],
      result: 'eliminated',
      stage: 'group',
      matchesPlayed: 3,
    }).ok,
    true,
  );
  assert.equal(
    validatePlaytestEvent({
      ...valid[8],
      result: 'eliminated',
      stage: 'group',
      matchesPlayed: 7,
    }).ok,
    false,
  );
});

test('rejects arrays, foreign prototypes, getters and symbol fields without running getters', () => {
  for (const value of [
    null,
    [],
    'event',
    new Date(),
    Object.create({ type: 'visit' }),
  ])
    assert.equal(validatePlaytestEvent(value).ok, false);
  let called = false;
  const getter = { ...valid[0] };
  Object.defineProperty(getter, 'alias', {
    enumerable: true,
    get() {
      called = true;
      return 'Edu';
    },
  });
  assert.equal(validatePlaytestEvent(getter).ok, false);
  assert.equal(called, false);
  assert.equal(
    validatePlaytestEvent({ ...valid[0], [Symbol('secret')]: 'extra' }).ok,
    false,
  );
});

test('deduplicates retries, counts shared sessions once and uses cumulative active time rather than adding it', () => {
  const first = valid.map((e, i) => ({
    ...e,
    activeMs: i * 10_000,
    ...(i === 0 ? { alias: 'Edu' } : {}),
  }));
  const anotherVisit = event(
    10,
    { type: 'visit', entrySource: 'shared_link' },
    { activeMs: 90_000 },
  );
  const second = event(
    11,
    { type: 'visit', entrySource: 'direct' },
    { sessionId: secondSession },
  );
  const bad = { ...valid[0], eventId: 'invalid' };
  const inputs = [
    ...first,
    { ...first[2] },
    anotherVisit,
    second,
    bad,
  ].reverse();
  const before = JSON.stringify(inputs);
  const summary = summarizePlaytestEvents(inputs);
  assert.equal(summary.uniqueEvents, 11);
  assert.equal(summary.duplicateEvents, 1);
  assert.equal(summary.invalidEvents, 1);
  assert.equal(summary.visits, 3);
  assert.equal(summary.uniqueSessions, 2);
  assert.equal(summary.sharedSessions, 1);
  assert.deepEqual(summary.starts, { courses: 1, matches: 1, tournaments: 1 });
  assert.deepEqual(summary.completions, {
    courses: 1,
    matches: 1,
    tournaments: 1,
  });
  const session = summary.sessions.find((s) => s.sessionId === sessionId);
  assert.equal(session.alias, 'Edu');
  assert.equal(session.visits, 2);
  assert.equal(session.activeMs, 90_000);
  assert.equal(session.firstSeenAt, first[0].occurredAt);
  assert.equal(session.lastSeenAt, anotherVisit.occurredAt);
  assert.deepEqual(
    session.choices.map((c) => [c.activity, c.nodeId, c.choiceId, c.verdict]),
    [
      ['course', 'full-back-1', 'overlap', 'positive'],
      ['match', 'm1-gk', 'right-cb', 'positive'],
    ],
  );
  assert.equal(session.completions[1].homeGoals, 2);
  assert.equal(JSON.stringify(inputs), before);
});

test('summaries retain anonymous sessions and distinguish a visitor from someone who started or finished', () => {
  const summary = summarizePlaytestEvents([valid[0]]);
  assert.equal(summary.sessions[0].alias, undefined);
  assert.equal(summary.sessions[0].activeMs, 0);
  assert.deepEqual(summary.starts, { courses: 0, matches: 0, tournaments: 0 });
  assert.deepEqual(summary.completions, {
    courses: 0,
    matches: 0,
    tournaments: 0,
  });
  assert.deepEqual(summarizePlaytestEvents([]).sessions, []);
});
