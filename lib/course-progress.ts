import type { CourseId } from './scenarios';

export type CourseProgress = Partial<Record<CourseId, string[]>>;
// v2 intentionally starts clean: v1 recorded attempts, so its stars cannot be
// distinguished from genuinely correct answers during migration.
export const PROGRESS_KEY = 'the-invisible-game-progress-v2';

export function recordSituation(progress: CourseProgress, courseId: CourseId, scenarioId: string, correct: boolean): CourseProgress {
  if (!correct) return progress;
  const completed = progress[courseId] ?? [];
  if (completed.includes(scenarioId)) return progress;
  return { ...progress, [courseId]: [...completed, scenarioId] };
}

export function parseProgress(value: string | null): CourseProgress {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, ids]) => Array.isArray(ids)).map(([id, ids]) => [id, [...new Set((ids as unknown[]).filter((value): value is string => typeof value === 'string'))]])) as CourseProgress;
  } catch { return {}; }
}
