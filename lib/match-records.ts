// Best full-time result per Match Day, stored only on this device.
export type MatchRecord = {
  home: number;
  away: number;
  plays: number;
  bestAccuracy?: number;
};
export type MatchRecords = Record<string, MatchRecord>;
export const RECORDS_KEY = 'read-the-game-match-records-v1';

const better = (a: MatchRecord, b: { home: number; away: number }) =>
  b.home - b.away > a.home - a.away ||
  (b.home - b.away === a.home - a.away && b.home > a.home);

export function recordMatch(
  records: MatchRecords,
  fixtureId: string,
  home: number,
  away: number,
  accuracy?: number,
): MatchRecords {
  const previous = records[fixtureId];
  const best =
    !previous || better(previous, { home, away })
      ? { home, away }
      : { home: previous.home, away: previous.away };
  const accuracies = [previous?.bestAccuracy, accuracy].filter(
    (value): value is number => value !== undefined,
  );
  return {
    ...records,
    [fixtureId]: {
      ...best,
      plays: (previous?.plays ?? 0) + 1,
      ...(accuracies.length ? { bestAccuracy: Math.max(...accuracies) } : {}),
    },
  };
}

export function parseRecords(value: string | null): MatchRecords {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return {};
    const valid = (n: unknown) =>
      typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 20;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, r]) =>
          r &&
          typeof r === 'object' &&
          valid((r as MatchRecord).home) &&
          valid((r as MatchRecord).away) &&
          (Number.isSafeInteger((r as MatchRecord).plays) && (r as MatchRecord).plays >= 0) &&
          ((r as MatchRecord).bestAccuracy === undefined ||
            (Number.isInteger((r as MatchRecord).bestAccuracy) &&
              (r as MatchRecord).bestAccuracy! >= 0 &&
              (r as MatchRecord).bestAccuracy! <= 100)),
      ),
    ) as MatchRecords;
  } catch {
    return {};
  }
}

export function recordVerdict(record: { home: number; away: number }) {
  return record.home > record.away
    ? 'Win'
    : record.home < record.away
      ? 'Loss'
      : 'Draw';
}
