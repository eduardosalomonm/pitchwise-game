'use client';

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Eye } from 'lucide-react';

import { courses, type CourseId } from '@/lib/scenarios';
import { trainingBuildUp } from '@/lib/training-build-ups';
import { useMatchLeadIn } from '@/app/use-match-lead-in';
import { useReducedMotion } from '@/app/use-reduced-motion';
import {
  parseProgress,
  PROGRESS_KEY,
  recordSituation,
  type CourseProgress,
} from '@/lib/course-progress';
import { fixtureList } from '@/lib/fixture-list';
import { ourSideForRound } from '@/lib/fixture-order';
import {
  parseRecords,
  RECORDS_KEY,
  recordMatch,
  type MatchRecords,
} from '@/lib/match-records';
import { MatchIntro } from '@/app/match-intro';
import {
  LessonComplete,
  LessonIntro,
  LessonScreen,
} from '@/app/lesson-screens';
import { getModelContext } from '@/lib/model-context';
import { registerCourseTools } from '@/lib/course-tools';
import { parseRoute, routeHash, type AppRoute } from '@/lib/app-route';
import { PositionMenu } from '@/app/position-menu';
// Both cups load on demand: their engines and play libraries stay out of the first visit.
const Tournament = lazy(() =>
  import('@/app/tournament').then((m) => ({ default: m.Tournament })),
);
const MyTournament = lazy(() =>
  import('@/app/my-tournament').then((m) => ({ default: m.MyTournament })),
);
const League = lazy(() =>
  import('@/app/league').then((m) => ({ default: m.LeagueGame })),
);
const StandaloneMatch = lazy(() =>
  import('@/app/match-day-loader').then((m) => ({
    default: m.StandaloneMatch,
  })),
);
import { confirmLeave } from '@/lib/navigation-guard';
import { PlaytestPanel } from '@/app/playtest-panel';
import { usePlaytest } from '@/app/playtest-provider';
import { ActivityNav } from '@/app/activity-nav';
import { PlayMenu, TournamentMenu } from '@/app/play-menu';
import './competition-shell.css';
import './post-match.css';
import { FIRST_MATCH_KEY } from '@/lib/first-match-progress';
const FirstMatch = lazy(() =>
  import('@/app/first-match').then((m) => ({ default: m.FirstMatch })),
);
import { ActivityBoundary } from '@/app/activity-boundary';

type Stage =
  | 'menu'
  | 'first-match'
  | 'training'
  | 'tournaments'
  | 'intro'
  | 'lesson'
  | 'complete'
  | 'match-intro'
  | 'match'
  | 'tournament'
  | 'my-tournament'
  | 'league';
type Answers = Record<string, string>;

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth',
  });
}

export default function Home() {
  const { track } = usePlaytest();
  const [fixtureId, setFixtureId] = useState('original');
  const fixture = fixtureList.find((item) => item.id === fixtureId)!;
  const [stage, setStage] = useState<Stage>('menu');
  const [courseId, setCourseId] = useState<CourseId>('full-back');
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const answersRef = useRef<Answers>({});
  const completionTracked = useRef(false);
  const [replayKey, setReplayKey] = useState(0);
  const [shareStatus, setShareStatus] = useState('');
  const [courseProgress, setCourseProgress] = useState<CourseProgress>({});
  const [matchRecords, setMatchRecords] = useState<MatchRecords>({});
  const [firstMatchSeen, setFirstMatchSeen] = useState(false);
  const course = courses.find((item) => item.id === courseId) ?? courses[0];
  const scenarios = course.scenarios;
  const scenario = scenarios[scenarioIndex] ?? scenarios[0];
  const selectedChoiceId = answers[scenario.id];
  const revealed = Boolean(selectedChoiceId);
  const reducedMotion = useReducedMotion();
  const trainingClip = trainingBuildUp(scenario);
  const trainingPlayback = useMatchLeadIn(
    `${stage}/${courseId}/${scenario.id}`,
    stage === 'lesson' && !revealed,
    reducedMotion,
  );
  const { isBlocked: trainingBlocked, reset: resetTrainingPlayback } = trainingPlayback;

  const score = scenarios.reduce(
    (total, item) =>
      total + (answers[item.id] === item.correctChoiceId ? 1 : 0),
    0,
  );
  const streak = scenarios
    .slice(0, scenarioIndex + 1)
    .reduce((current, item) => {
      const answer = answers[item.id];
      if (!answer) return current;
      return answer === item.correctChoiceId ? current + 1 : 0;
    }, 0);
  const visionLevel =
    score === scenarios.length
      ? 'Game reader'
      : score >= 3
        ? 'Pattern spotter'
        : 'Second-look scout';

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        setCourseProgress(parseProgress(localStorage.getItem(PROGRESS_KEY)));
      } catch {
        /* Storage may be disabled; the lesson still works for this visit. */
      }
      try {
        setMatchRecords(parseRecords(localStorage.getItem(RECORDS_KEY)));
      } catch {
        /* Records are optional; matches still play without them. */
      }
      try {
        setFirstMatchSeen(localStorage.getItem(FIRST_MATCH_KEY) === 'seen');
      } catch {
        /* The guide also works without storage. */
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const resetProgress = useCallback(() => {
    resetTrainingPlayback();
    completionTracked.current = false;
    answersRef.current = {};
    setAnswers({});
    setScenarioIndex(0);
    setReplayKey(0);
    setShareStatus('');
  }, [resetTrainingPlayback]);

  const selectCourse = useCallback(
    (nextCourseId: CourseId) => {
      setCourseId(nextCourseId);
      resetProgress();
      setStage('intro');
      scrollToTop();
    },
    [resetProgress],
  );

  const startLesson = useCallback(() => {
    resetProgress();
    setStage('lesson');
    track({ type: 'activity_start', activity: 'course', courseId });
  }, [resetProgress, courseId, track]);

  const returnToMenu = useCallback(() => {
    resetProgress();
    setStage('menu');
    scrollToTop();
  }, [resetProgress]);

  const openMatchDay = useCallback(() => {
    resetProgress();
    setStage('match-intro');
    scrollToTop();
  }, [resetProgress]);

  const openFirstMatch = useCallback(() => {
    resetProgress();
    setStage('first-match');
    scrollToTop();
  }, [resetProgress]);
  const rememberFirstMatch = useCallback(() => {
    setFirstMatchSeen(true);
    try {
      localStorage.setItem(FIRST_MATCH_KEY, 'seen');
    } catch {
      /* Keep the preference for this visit. */
    }
  }, []);

  const openTraining = useCallback(() => {
    resetProgress();
    setStage('training');
    scrollToTop();
  }, [resetProgress]);

  const openTournaments = useCallback(() => {
    resetProgress();
    setStage('tournaments');
    scrollToTop();
  }, [resetProgress]);

  // Keep the visible screen in the URL so links can be shared and the browser Back button works.
  const navRef = useRef({ stage, courseId });
  const routeReady = useRef(false);
  useEffect(() => {
    navRef.current = { stage, courseId };
  }, [stage, courseId]);

  const applyRoute = useCallback(
    (hash: string) => {
      const route = parseRoute(
        hash,
        courses.map((item) => item.id),
        fixtureList.map((item) => item.id),
      );
      const current = navRef.current;
      // Leaving a cup mid-match through Back or a hash link asks first; cancelling puts the URL back.
      const inCup =
        current.stage === 'tournament' ||
        current.stage === 'my-tournament' ||
        current.stage === 'league';
      if (inCup && route.view !== current.stage && !confirmLeave()) {
        window.history.pushState(null, '', `#${current.stage}`);
        return;
      }
      if (route.view === 'course') {
        const onCourse =
          ['intro', 'lesson', 'complete'].includes(current.stage) &&
          current.courseId === route.courseId;
        if (!onCourse) selectCourse(route.courseId as CourseId);
      } else if (route.view === 'matches') {
        setFixtureId(route.fixtureId);
        if (current.stage !== 'match-intro') openMatchDay();
      } else if (route.view === 'match') {
        setFixtureId(route.fixtureId);
        if (current.stage !== 'match') {
          resetProgress();
          setStage('match');
          scrollToTop();
        }
      } else if (
        route.view === 'tournament' ||
        route.view === 'my-tournament' ||
        route.view === 'league' ||
        route.view === 'first-match' ||
        route.view === 'tournaments' ||
        route.view === 'training'
      ) {
        resetProgress();
        setStage(route.view);
        scrollToTop();
      } else if (current.stage !== 'menu') returnToMenu();
    },
    [selectCourse, openMatchDay, resetProgress, returnToMenu],
  );

  useEffect(() => {
    const onNavigate = () => applyRoute(window.location.hash);
    queueMicrotask(() => {
      onNavigate();
      routeReady.current = true;
    });
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('hashchange', onNavigate);
    return () => {
      window.removeEventListener('popstate', onNavigate);
      window.removeEventListener('hashchange', onNavigate);
    };
  }, [applyRoute]);

  useEffect(() => {
    if (!routeReady.current) return;
    const route: AppRoute =
      stage === 'menu'
        ? { view: 'menu' }
        : stage === 'tournament' ||
            stage === 'my-tournament' ||
            stage === 'league' ||
            stage === 'first-match' ||
            stage === 'tournaments' ||
            stage === 'training'
          ? { view: stage }
          : stage === 'match-intro'
            ? { view: 'matches', fixtureId }
            : stage === 'match'
              ? { view: 'match', fixtureId }
              : { view: 'course', courseId };
    const hash = routeHash(route);
    if (window.location.hash === hash) return;
    const url = hash || `${window.location.pathname}${window.location.search}`;
    // Changing the selected fixture updates the link without adding a Back step.
    const reselect =
      stage === 'match-intro' && /^#match\/[^/]+$/.test(window.location.hash);
    if (reselect) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  }, [stage, courseId, fixtureId]);

  const completeMatch = useCallback(
    (
      completedFixtureId: string,
      home: number,
      away: number,
      accuracy: number,
    ) => {
      setMatchRecords((current) => {
        const next = recordMatch(
          current,
          completedFixtureId,
          home,
          away,
          accuracy,
        );
        try {
          localStorage.setItem(RECORDS_KEY, JSON.stringify(next));
        } catch {
          /* The record remains available for this visit. */
        }
        return next;
      });
    },
    [],
  );

  const answerScenario = useCallback(
    (targetCourseId: CourseId, scenarioId: string, choiceId: string) => {
      if (trainingBlocked())
        throw new Error(
          'Wait for the build-up to pause, or skip to the decision.',
        );
      const targetCourse = courses.find((item) => item.id === targetCourseId);
      if (!targetCourse) throw new Error(`Unknown course: ${targetCourseId}`);
      const index = targetCourse.scenarios.findIndex(
        (item) => item.id === scenarioId,
      );
      if (index < 0) throw new Error(`Unknown scenario: ${scenarioId}`);
      const item = targetCourse.scenarios[index];
      if (!item.choices.some((choice) => choice.id === choiceId))
        throw new Error(`Unknown choice: ${choiceId}`);
      setCourseId(targetCourseId);
      setScenarioIndex(index);
      setStage('lesson');
      setReplayKey((value) => value + 1);
      const firstAnswer = !answersRef.current[scenarioId];
      const lockedChoiceId = answersRef.current[scenarioId] ?? choiceId;
      answersRef.current = {
        ...answersRef.current,
        [scenarioId]: lockedChoiceId,
      };
      setAnswers(answersRef.current);
      setCourseProgress((current) => {
        const next = recordSituation(
          current,
          targetCourseId,
          scenarioId,
          lockedChoiceId === item.correctChoiceId,
        );
        if (next !== current) {
          try {
            localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
          } catch {
            /* Progress remains available for this visit. */
          }
        }
        return next;
      });
      const choice = item.choices.find(
        (candidate) => candidate.id === lockedChoiceId,
      )!;
      if (firstAnswer)
        track({
          type: 'course_answer',
          courseId: targetCourseId,
          nodeId: scenarioId,
          choiceId: lockedChoiceId,
          correct: lockedChoiceId === item.correctChoiceId,
        });
      return {
        courseId: targetCourseId,
        scenarioId,
        choiceId: lockedChoiceId,
        mode: item.mode,
        correct: lockedChoiceId === item.correctChoiceId,
        rationale: choice.rationale,
        explanation: item.reveal.headline,
      };
    },
    [track, trainingBlocked],
  );

  const restartCourse = useCallback(
    (targetCourseId: CourseId) => {
      setCourseId(targetCourseId);
      resetProgress();
      setStage('lesson');
      const targetCourse = courses.find((item) => item.id === targetCourseId)!;
      track({
        type: 'activity_start',
        activity: 'course',
        courseId: targetCourseId,
      });
      return {
        status: 'restarted',
        courseId: targetCourseId,
        scenarioId: targetCourse.scenarios[0].id,
      };
    },
    [resetProgress, track],
  );

  useEffect(() => {
    const modelContext = getModelContext();
    if (!modelContext?.registerTool) return;
    return registerCourseTools(modelContext, answerScenario, restartCourse);
  }, [answerScenario, restartCourse]);

  function choose(choiceId: string) {
    if (revealed) return;
    answerScenario(course.id, scenario.id, choiceId);
  }

  function advance() {
    if (!revealed) return;
    if (scenarioIndex === scenarios.length - 1) {
      if (!completionTracked.current) {
        completionTracked.current = true;
        track({
          type: 'course_complete',
          courseId,
          correct: score,
          total: scenarios.length,
        });
      }
      setStage('complete');
      scrollToTop();
      return;
    }
    setScenarioIndex((index) => index + 1);
    setReplayKey(0);
    scrollToTop();
  }

  async function shareLesson() {
    const data = {
      title: `Pitchwise: ${course.position}`,
      text: course.shareText,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        setShareStatus('Shared.');
        return;
      }
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus('Link copied.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus('Copy the URL from your address bar.');
    }
  }

  return (
    <main
      id="top"
      className={`min-h-screen overflow-x-clip${stage === 'lesson' || stage === 'first-match' ? ' has-compact-play' : ''}`}
    >
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <button
          className="brand-link"
          onClick={() => {
            if (confirmLeave()) returnToMenu();
          }}
          type="button"
        >
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <Eye className="size-4" aria-hidden="true" />
          </span>
          <span>Pitchwise</span>
        </button>
        <span className="lesson-label">
          {stage === 'tournament'
            ? 'The Readers’ Cup'
            : stage === 'my-tournament'
              ? 'My Tournament'
              : stage === 'league'
                ? 'My League'
                : stage === 'menu'
                  ? 'Football tactics'
                  : stage === 'first-match'
                    ? 'First friendly'
                    : stage === 'tournaments'
                      ? 'Competitions'
                      : stage === 'training'
                        ? 'Training Ground'
                        : stage.startsWith('match')
                          ? 'Match Day'
                          : `Lesson ${course.lessonNumber} · ${course.position}`}
        </span>
      </header>
      <PlaytestPanel />

      {stage === 'menu' && (
        <PlayMenu
          onMatches={openMatchDay}
          onTournaments={openTournaments}
          onTraining={openTraining}
          onFirstMatch={openFirstMatch}
          firstMatchSeen={
            firstMatchSeen || Object.keys(matchRecords).length > 0
          }
        />
      )}

      {stage === 'tournaments' && (
        <TournamentMenu
          onBack={returnToMenu}
          onReaders={() => {
            setStage('tournament');
            scrollToTop();
          }}
          onCustom={() => {
            setStage('my-tournament');
            scrollToTop();
          }}
          onLeague={() => {
            setStage('league');
            scrollToTop();
          }}
        />
      )}

      {stage === 'first-match' && (
        <ActivityBoundary onBack={returnToMenu}>
          <Suspense
            fallback={
              <output className="cup-loading">
                Getting the friendly ready…
              </output>
            }
          >
            <FirstMatch
              onDone={rememberFirstMatch}
              onMatches={openMatchDay}
              onCompetitions={openTournaments}
              onSkip={() => {
                rememberFirstMatch();
                openMatchDay();
              }}
            />
          </Suspense>
        </ActivityBoundary>
      )}

      {stage === 'training' && (
        <section className="course-menu mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-14">
          <ActivityNav
            active="training"
            onTraining={openTraining}
            onMatches={openMatchDay}
            onTournament={openTournaments}
          />
          <div className="course-menu-heading">
            <p className="eyebrow">Technique &amp; tactics</p>
            <h1>Training Ground</h1>
          </div>
          <PositionMenu onSelect={selectCourse} progress={courseProgress} />
        </section>
      )}

      {stage === 'match-intro' && (
        <MatchIntro
          fixture={fixture}
          matchRecords={matchRecords}
          onSelectFixture={setFixtureId}
          onKickOff={() => {
            setStage('match');
            scrollToTop();
          }}
          onTraining={openTraining}
          onTournament={openTournaments}
        />
      )}

      {stage === 'match' && (
        <ActivityBoundary key={fixture.id} onBack={returnToMenu}>
          <Suspense
            fallback={
              <output className="cup-loading">Loading the match…</output>
            }
          >
            <StandaloneMatch
              key={fixture.id}
              ourSide={ourSideForRound(fixtureList.indexOf(fixture))}
              fixtureId={fixture.id}
              onExit={returnToMenu}
              onChooseMatch={openMatchDay}
              onNextMatch={() => {
                setFixtureId(
                  fixtureList[
                    (fixtureList.indexOf(fixture) + 1) % fixtureList.length
                  ].id,
                );
                setStage('match-intro');
                scrollToTop();
              }}
              onComplete={completeMatch}
            />
          </Suspense>
        </ActivityBoundary>
      )}
      <ActivityBoundary key={stage} onBack={returnToMenu}>
        <Suspense
          fallback={
            <output className="cup-loading">Loading the tournament…</output>
          }
        >
          {stage === 'tournament' && (
            <Tournament
              onTournaments={openTournaments}
            />
          )}
          {stage === 'my-tournament' && (
            <MyTournament
              onTournaments={openTournaments}
            />
          )}
          {stage === 'league' && (
            <League onCompetitions={openTournaments} />
          )}
        </Suspense>
      </ActivityBoundary>

      {stage === 'intro' && (
        <LessonIntro
          course={course}
          onBack={openTraining}
          onStart={startLesson}
        />
      )}

      {stage === 'lesson' && (
        <LessonScreen
          course={course}
          scenarioIndex={scenarioIndex}
          answers={answers}
          replayKey={replayKey}
          streak={streak}
          buildUp={{
            clip: trainingClip,
            playback: trainingPlayback,
            reducedMotion,
          }}
          onBack={openTraining}
          onChoose={choose}
          onAdvance={advance}
          onReplay={() => setReplayKey((value) => value + 1)}
        />
      )}

      {stage === 'complete' && (
        <LessonComplete
          course={course}
          score={score}
          visionLevel={visionLevel}
          positionComplete={(courseProgress[course.id]?.length ?? 0) >= 5}
          shareStatus={shareStatus}
          onShare={shareLesson}
          onRestart={startLesson}
          onMenu={openTraining}
        />
      )}
    </main>
  );
}
