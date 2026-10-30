'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Eye,
  RotateCcw,
  Share2,
  Star,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Course } from '@/lib/scenarios';
import {
  LessonIllustration,
  LessonPitch,
  TacticalPitch,
} from '@/app/lesson-pitch';

type Answers = Record<string, string>;

export function LessonIntro({
  course,
  onBack,
  onStart,
}: {
  course: Course;
  onBack: () => void;
  onStart: () => void;
}) {
  const scenarios = course.scenarios;
  return (
    <section className="intro-grid mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:px-8 lg:py-20">
      <div className="intro-copy">
        <button className="back-link" type="button" onClick={onBack}>
          <ArrowLeft aria-hidden="true" /> All courses
        </button>
        <p className="eyebrow">A five-minute tactical lesson</p>
        <h1>{course.headline}</h1>
        <p className="intro-deck">{course.deck}</p>
        <Button
          className="mt-8 h-12 rounded-full px-6 text-base"
          onClick={onStart}
          size="lg"
        >
          Start the lesson <ArrowRight aria-hidden="true" />
        </Button>
        <div className="intro-facts">
          <span>
            {scenarios.filter((item) => item.mode === 'Attacking').length}{' '}
            attacking decisions
          </span>
          <span>
            {scenarios.filter((item) => item.mode === 'Defending').length}{' '}
            defending decisions
          </span>
          <span>5 minutes</span>
        </div>
      </div>
      <div className="intro-pitch-wrap">
        <TacticalPitch
          scenario={scenarios[0]}
          revealed={false}
          replayKey={0}
          activeLabel={course.activeLabel}
        />
        <div className="intro-note">
          <span>Your eyes follow the ball.</span>
          <strong>Watch the orange player instead.</strong>
        </div>
      </div>
    </section>
  );
}

export function LessonScreen({
  course,
  scenarioIndex,
  answers,
  replayKey,
  streak,
  onBack,
  onChoose,
  onAdvance,
  onReplay,
  buildUp,
}: {
  course: Course;
  scenarioIndex: number;
  answers: Answers;
  replayKey: number;
  streak: number;
  onBack: () => void;
  onChoose: (choiceId: string) => void;
  onAdvance: () => void;
  onReplay: () => void;
  buildUp: import('@/app/lesson-pitch').LessonBuildUp;
}) {
  const scenarios = course.scenarios;
  const scenario = scenarios[scenarioIndex] ?? scenarios[0];
  const selectedChoiceId = answers[scenario.id];
  const selectedChoice = scenario.choices.find(
    (choice) => choice.id === selectedChoiceId,
  );
  const revealed = Boolean(selectedChoiceId);
  const isCorrect = selectedChoiceId === scenario.correctChoiceId;
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (revealed) resultRef.current?.focus({ preventScroll: true });
  }, [revealed, scenario.id]);
  return (
    <section className="lesson-wrap play-layout mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8">
      <div className="lesson-toolbar play-hud">
        <button
          className="play-back"
          type="button"
          onClick={onBack}
          aria-label="All courses"
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <strong>Training Ground</strong>
        <span>
          Situation {scenarioIndex + 1} of {scenarios.length}
        </span>
      </div>
      <h1 className="sr-only">{scenario.title}</h1>
      <p className="play-context">{scenario.context}</p>
      <div className="lesson-grid">
        <div className="lesson-pitch-column">
          <div className="lesson-actor">
            <strong>{course.activeLabel}</strong>
            <span
              className={`decision-phase is-${scenario.mode.toLowerCase()}`}
            >
              {scenario.mode}
            </span>
          </div>
          <LessonPitch
            key={scenario.id}
            scenario={scenario}
            revealed={revealed}
            replayKey={replayKey}
            activeLabel={course.activeLabel}
            isCorrect={isCorrect}
            onReplay={onReplay}
            buildUp={buildUp}
          />
        </div>
        <div className="lesson-copy" hidden={revealed}>
          <h2>{scenario.prompt}</h2>
          <div className="choice-list" aria-label="Answer choices">
            {scenario.choices.map((choice, index) => (
              <Button
                key={choice.id}
                aria-pressed={selectedChoiceId === choice.id}
                className="choice-button"
                disabled={buildUp.playback.previewing || revealed}
                onClick={() => onChoose(choice.id)}
                variant="outline"
              >
                <span className="choice-letter">
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{choice.label}</span>
              </Button>
            ))}
          </div>
        </div>
        {revealed && (
          <div className="lesson-reveal-column">
            <div
              ref={resultRef}
              tabIndex={-1}
              className={`reveal-panel ${isCorrect ? 'reveal-correct' : 'reveal-learning'}`}
              aria-live="polite"
            >
              <div className="reveal-heading">
                <span className="result-icon">
                  {isCorrect ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </span>
                <div>
                  <p>{isCorrect ? 'Good read · +1' : 'A different read'}</p>
                  <h2>{scenario.reveal.headline}</h2>
                </div>
              </div>
              <p className="choice-rationale">{selectedChoice?.rationale}</p>
              <div className="reveal-actions">
                <Button className="h-12 rounded-full" onClick={onAdvance}>
                  {scenarioIndex === scenarios.length - 1
                    ? 'See your recap'
                    : 'Next situation'}{' '}
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>
              <details className="play-details" key={scenario.id}>
                <summary>Why this works</summary>
                <p>
                  You chose: <strong>{selectedChoice?.label}</strong>
                </p>
                {!isCorrect && (
                  <p>
                    Best movement:{' '}
                    <strong>
                      {
                        scenario.choices.find(
                          (choice) => choice.id === scenario.correctChoiceId,
                        )?.label
                      }
                    </strong>
                  </p>
                )}
                {streak > 1 && <p>Vision streak ×{streak}</p>}
                <dl className="reveal-details">
                  <div>
                    <dt>The cue</dt>
                    <dd>{scenario.reveal.cue}</dd>
                  </div>
                  <div>
                    <dt>Who it helps</dt>
                    <dd>{scenario.reveal.helped}</dd>
                  </div>
                  <div>
                    <dt>Space and risk</dt>
                    <dd>
                      {scenario.reveal.space} {scenario.reveal.risk}
                    </dd>
                  </div>
                </dl>
                <div className="watch-cue">
                  <Eye aria-hidden="true" />
                  <span>
                    <strong>Watch for this:</strong> {scenario.reveal.watchFor}
                  </span>
                </div>
                <LessonIllustration
                  key={scenario.id}
                  scenario={scenario}
                  position={course.position}
                />
              </details>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function LessonComplete({
  course,
  score,
  visionLevel,
  positionComplete,
  shareStatus,
  onShare,
  onRestart,
  onMenu,
}: {
  course: Course;
  score: number;
  visionLevel: string;
  positionComplete: boolean;
  shareStatus: string;
  onShare: () => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const scenarios = course.scenarios;
  return (
    <section className="complete-wrap mx-auto w-full max-w-4xl px-5 pb-20 pt-10 text-center sm:px-8 sm:pt-20">
      <p className="eyebrow">{course.position} lesson complete</p>
      <div className="completion-badge">
        {positionComplete && (
          <Star
            className="unlocked-position-star"
            aria-label="Position complete"
          />
        )}
        <div
          className="vision-stamps"
          aria-label={`${scenarios.length} hidden jobs revealed`}
        >
          {scenarios.map((item, index) => (
            <span
              key={item.id}
              style={{ '--stamp-delay': `${index * 100}ms` } as CSSProperties}
              title={item.title}
            >
              <Check aria-hidden="true" />
              <span className="sr-only">{item.title}</span>
            </span>
          ))}
        </div>
        <strong>{course.position} vision unlocked</strong>
        <span>Five hidden jobs. A new way to watch.</span>
      </div>
      <div className="vision-rank">
        <span>Vision rank</span>
        <strong>{visionLevel}</strong>
      </div>
      <div
        className="score-ring"
        aria-label={`${score} out of ${scenarios.length} best choices`}
      >
        <strong>{score}</strong>
        <span>/ {scenarios.length}</span>
      </div>
      <h1>{course.completionHeadline}</h1>
      <p className="complete-deck">
        The score is only the start. During your next match, move your eyes away
        from the ball and ask these three questions.
      </p>
      <ol className="watch-list">
        {course.recapQuestions.map((item, index) => (
          <li key={item.question}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{item.question}</strong>
            <p>{item.explanation}</p>
          </li>
        ))}
      </ol>
      <div className="complete-actions">
        <Button className="h-12 rounded-full px-6" onClick={onShare}>
          <Share2 aria-hidden="true" /> Share this lesson
        </Button>
        <Button
          className="h-12 rounded-full px-6"
          onClick={onRestart}
          variant="outline"
        >
          <RotateCcw aria-hidden="true" /> Restart lesson
        </Button>
        <Button
          className="h-12 rounded-full px-6"
          onClick={onMenu}
          variant="outline"
        >
          <ArrowLeft aria-hidden="true" /> Choose another course
        </Button>
      </div>
      <p className="share-status" aria-live="polite">
        {shareStatus && (
          <>
            <Copy aria-hidden="true" /> {shareStatus}
          </>
        )}
      </p>
      <p className="tactics-note">
        In a real match, the best decision depends on the coach’s instructions,
        teammates, opponents, score, and game state. These simplified situations
        teach the cues—not a universal rulebook.
      </p>
    </section>
  );
}
