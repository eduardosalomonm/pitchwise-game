import type { ModelContext } from './model-context';
import { courses, type CourseId } from './scenarios.ts';

// Registration is independent of React state; callers supply the visible lesson actions.
export function registerCourseTools(
  modelContext: ModelContext,
  answerScenario: (courseId: CourseId, scenarioId: string, choiceId: string) => unknown,
  restartCourse: (courseId: CourseId) => unknown,
): () => void {
  const lifecycle = new AbortController();
  const reportError = () => undefined;
  const registerLegacyCourse = (
    targetCourseId: CourseId,
    toolName: string,
    title: string,
  ) => {
    void Promise.resolve(
      modelContext.registerTool(
        {
          name: `answer_${toolName}_scenario`,
          title: `Answer a ${title} scenario`,
          description: `Choose an answer for one ${title} lesson scenario and reveal the same tactical explanation shown in the visible interface.`,
          inputSchema: {
            type: 'object',
            properties: {
              scenarioId: { type: 'string' },
              choiceId: { type: 'string' },
            },
            required: ['scenarioId', 'choiceId'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            if (!input || typeof input !== 'object')
              throw new Error('Expected scenarioId and choiceId.');
            const value = input as {
              scenarioId?: unknown;
              choiceId?: unknown;
            };
            if (
              typeof value.scenarioId !== 'string' ||
              typeof value.choiceId !== 'string'
            )
              throw new Error('scenarioId and choiceId must be strings.');
            return answerScenario(
              targetCourseId,
              value.scenarioId,
              value.choiceId,
            );
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(reportError);
    void Promise.resolve(
      modelContext.registerTool(
        {
          name: `restart_${toolName}_lesson`,
          title: `Restart the ${title} lesson`,
          description: `Clear the ${title} answers and return the visible interface to its first scenario.`,
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: () => restartCourse(targetCourseId),
        },
        { signal: lifecycle.signal },
      ),
    ).catch(reportError);
  };

  try {
    registerLegacyCourse('full-back', 'full_back', 'full-back');
    registerLegacyCourse(
      'defensive-midfielder',
      'defensive_midfielder',
      'defensive midfielder',
    );
    registerLegacyCourse('centre-back', 'centre_back', 'centre-back');
    void Promise.resolve(
      modelContext.registerTool(
        {
          name: 'answer_position_scenario',
          title: 'Answer any position scenario',
          description:
            'Choose an answer in any of the eleven position courses and reveal it in the visible lesson.',
          inputSchema: {
            type: 'object',
            properties: {
              courseId: { type: 'string' },
              scenarioId: { type: 'string' },
              choiceId: { type: 'string' },
            },
            required: ['courseId', 'scenarioId', 'choiceId'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            if (!input || typeof input !== 'object')
              throw new Error('Expected courseId, scenarioId and choiceId.');
            const value = input as {
              courseId?: unknown;
              scenarioId?: unknown;
              choiceId?: unknown;
            };
            if (
              typeof value.courseId !== 'string' ||
              typeof value.scenarioId !== 'string' ||
              typeof value.choiceId !== 'string'
            )
              throw new Error('All inputs must be strings.');
            if (!courses.some((item) => item.id === value.courseId))
              throw new Error(`Unknown course: ${value.courseId}`);
            return answerScenario(
              value.courseId as CourseId,
              value.scenarioId,
              value.choiceId,
            );
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(reportError);
    void Promise.resolve(
      modelContext.registerTool(
        {
          name: 'restart_position_lesson',
          title: 'Restart any position lesson',
          description:
            'Clear the current answers for one of the eleven position courses.',
          inputSchema: {
            type: 'object',
            properties: { courseId: { type: 'string' } },
            required: ['courseId'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            const courseId = (input as { courseId?: unknown })?.courseId;
            if (
              typeof courseId !== 'string' ||
              !courses.some((item) => item.id === courseId)
            )
              throw new Error(`Unknown course: ${String(courseId)}`);
            return restartCourse(courseId as CourseId);
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(reportError);
  } catch {
    reportError();
  }
  return () => lifecycle.abort();
}
