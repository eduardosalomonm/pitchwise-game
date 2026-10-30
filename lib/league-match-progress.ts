import {
  chooseMatchOption,
  continueMatch,
  createMatchRun,
  type MatchRun,
  type MatchMoment,
} from './match-day.ts';

// Store choices, not trusted scores or copied graph scenes. Restore via the live engine.
export function serializeLeagueMatch(
  seed: number,
  gameId: string,
  run: MatchRun,
): string {
  return JSON.stringify({
    v: 1,
    seed,
    gameId,
    pending: Boolean(run.pending),
    choices: run.decisions.map((d) => [d.momentId, d.nodeId, d.choiceId]),
  });
}
export function parseLeagueMatch(
  value: string | null,
  seed: number,
  gameId: string,
  moments: MatchMoment[],
): MatchRun | undefined {
  if (!value) return undefined;
  try {
    const saved = JSON.parse(value);
    if (
      saved?.v !== 1 ||
      saved.seed !== seed ||
      saved.gameId !== gameId ||
      typeof saved.pending !== 'boolean' ||
      !Array.isArray(saved.choices) ||
      saved.choices.length > moments.reduce((n, m) => n + m.nodes.length, 0) ||
      (saved.pending && !saved.choices.length)
    )
      return undefined;
    let run = createMatchRun(moments);
    saved.choices.forEach((entry: unknown, i: number) => {
      if (
        !Array.isArray(entry) ||
        entry.length !== 3 ||
        !entry.every((x) => typeof x === 'string')
      )
        throw new Error('Invalid decision.');
      run = chooseMatchOption(run, entry[0], entry[1], entry[2], moments);
      if (i < saved.choices.length - 1 || !saved.pending)
        run = continueMatch(run, moments);
    });
    return run;
  } catch {
    return undefined;
  }
}
