'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Eye,
  Minus,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlaytest } from '@/app/playtest-provider';
import { MatchPitch } from '@/app/match-day';
import { ResultFeeling } from '@/app/match-reward';
import { firstMatchMoments } from '@/lib/first-match';
import {
  chooseMatchOption,
  continueMatch,
  createMatchRun,
} from '@/lib/match-day';
import { orderedMatchChoices } from '@/lib/match-choice-order';
import { matchChoiceSignal } from '@/lib/match-feedback';
import {
  choiceHandoff,
  visiblePossession,
  possessionNotice,
} from '@/lib/match-narrative';
import { PossessionNotice } from '@/app/pitch-parts';
import { FULL_PITCH } from '@/lib/pitch-focus';
import { getTeam } from '@/lib/teams';
import './first-match.css';
import { matchBuildUp } from '@/lib/play-build-up';
import { useMatchLeadIn } from '@/app/use-match-lead-in';
import { BuildUpControls } from '@/app/build-up-controls';
import { ReadThePlay } from '@/app/read-the-play';
import { readThePlay } from '@/lib/read-the-play';
import { completeTeamShape } from '@/lib/team-shape';

const opponent = getTeam('Eastgate Rovers');

export function FirstMatch({
  onDone,
  onMatches,
  onCompetitions,
  onSkip,
}: {
  onDone: () => void;
  onMatches: () => void;
  onCompetitions: () => void;
  onSkip: () => void;
}) {
  const { track } = usePlaytest();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    track({ type: 'activity_start', activity: 'match', fixtureId: 'first-friendly' });
  }, [track]);
  const [run, setRun] = useState(() => createMatchRun(firstMatchMoments));
  const current = useRef(run);
  const [readyId, setReadyId] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);
  const [replay, setReplay] = useState(0);
  const stepRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef<HTMLHeadingElement>(null);
  const moment = firstMatchMoments[run.momentIndex];
  const node = moment?.nodes.find((n) => n.id === run.nodeId);
  const selected = node?.choices.find((c) => c.id === run.pending?.choiceId);
  const leadIn = node ? matchBuildUp(node, moment, run) : undefined;
  const buildUp = useMatchLeadIn(
    run.nodeId,
    Boolean(leadIn && !selected && run.status !== 'final'),
    reduced,
  );
  const choiceKey = selected ? `${node!.id}/${selected.id}` : null;
  const ready = Boolean(choiceKey && readyId === choiceKey);
  const signal = node && selected ? matchChoiceSignal(node, selected) : null;
  const handoff =
    node && selected ? choiceHandoff(moment, node, selected) : null;
  const possession = visiblePossession(run, firstMatchMoments, ready);
  const goals = ready ? selected?.outcome : undefined;
  const homeScore = run.homeScore + (goals?.homeGoals ?? 0);
  const awayScore = run.awayScore + (goals?.awayGoals ?? 0);

  useLayoutEffect(() => {
    if (!current.current.decisions.length) return;
    stepRef.current?.focus({ preventScroll: true });
    stepRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [run.nodeId, run.momentIndex]);

  useLayoutEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!choiceKey) return;
    const timer = window.setTimeout(
      () => setReadyId(choiceKey),
      reduced ? 0 : 2700,
    );
    return () => window.clearTimeout(timer);
  }, [choiceKey, reduced]);
  useEffect(() => {
    if (!ready) return;
    feedbackRef.current?.focus({ preventScroll: true });
    const box = feedbackRef.current?.getBoundingClientRect();
    if (box && (box.bottom > innerHeight || box.top < 0))
      feedbackRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: reduced ? 'instant' : 'smooth',
      });
  }, [ready, reduced]);
  useEffect(() => {
    if (run.status === 'final') {
      onDone();
      finishRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [run.status, onDone]);

  function choose(id: string) {
    if (buildUp.isBlocked()) return;
    if (current.current.pending || current.current.status === 'final' || !node)
      return;
    const next = chooseMatchOption(
      current.current,
      moment.id,
      node.id,
      id,
      firstMatchMoments,
    );
    current.current = next;
    setRun(next);
    track({ type: 'match_decision', fixtureId: 'first-friendly', nodeId: node.id, choiceId: id, verdict: matchChoiceSignal(node, node.choices.find((c) => c.id === id)!).tone });
    stepRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function advance() {
    if (!ready || !current.current.pending) return;
    const next = continueMatch(current.current, firstMatchMoments);
    current.current = next;
    setReadyId(null);
    setRun(next);
    if (next.status === 'final') track({ type: 'match_complete', fixtureId: 'first-friendly', homeGoals: next.homeScore, awayGoals: next.awayScore, decisions: next.decisions.length, goodDecisions: next.decisions.filter((d) => d.tone === 'positive').length });
  }
  function restart() {
    const next = createMatchRun(firstMatchMoments);
    current.current = next;
    setRun(next);
    setReadyId(null);
    setReplay(0);
    buildUp.reset();
    track({ type: 'activity_start', activity: 'match', fixtureId: 'first-friendly' });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  if (run.status === 'final')
    return (
      <section className="first-match first-match-finished">
        <h1 ref={finishRef} tabIndex={-1}>
          You’re ready to play.
        </h1>
        <p>
          You’ve chosen actions, followed the movement and switched between
          attack and defence.
        </p>
        <ResultFeeling
          won={run.homeScore > run.awayScore}
          draw={run.homeScore === run.awayScore}
          title={
            run.homeScore > run.awayScore
              ? 'Your first win.'
              : run.homeScore < run.awayScore
                ? 'The next match is yours to read.'
                : 'A first game under your belt.'
          }
          detail={`Friendly · Pitchwise FC ${run.homeScore}–${run.awayScore} ${opponent.name}`}
        />
        <div className="first-match-actions">
          <Button onClick={onMatches}>
            Choose a match <ArrowRight aria-hidden="true" />
          </Button>
          <Button variant="outline" onClick={onCompetitions}>
            Explore competitions
          </Button>
          <Button variant="ghost" onClick={restart}>
            <RotateCcw aria-hidden="true" /> Play guide again
          </Button>
        </div>
      </section>
    );
  if (!node) return null;
  const tip = selected
    ? ready
      ? handoff?.nextActor
        ? `Next, you decide for our ${handoff.nextActor.toLowerCase()}.`
        : 'This situation is over. Continue when you’re ready.'
      : 'Watch how your choice changes the play.'
    : run.momentIndex === 0
      ? node.id === moment.rootNodeId
        ? 'The orange ring marks your player. Choose an action below.'
        : 'You now control the receiver. Read the new space.'
      : node.phase === 'Defending'
        ? 'Now we defend. Protect the goal on the left.'
        : 'Ball won. We’re attacking again.';
  const SignalIcon =
    signal?.tone === 'positive'
      ? Check
      : signal?.tone === 'negative'
        ? TriangleAlert
        : Minus;
  return (
    <section className="first-match play-layout">
      <div className="first-match-nav">
        <span>Friendly · {run.momentIndex + 1}/2</span>
        <strong
          aria-label={`Pitchwise FC ${homeScore}, ${opponent.name} ${awayScore}`}
        >
          PWF{' '}
          <span className="friendly-score">
            {homeScore}–{awayScore}
          </span>{' '}
          {opponent.code}
        </strong>
        <Button variant="ghost" onClick={() => { track({ type: 'guide_skip' }); onSkip(); }}>
          Skip guide
        </Button>
      </div>
      <h1 className="sr-only">Your first match</h1>
      <div
        ref={stepRef}
        tabIndex={-1}
        className={`first-step${buildUp.previewing ? ' is-watching-build-up' : ''}`}
        aria-label={`${node.actor}. ${node.phase}`}
      >
        <p className="play-context">{node.context}</p>
        <div className="first-actor">
          <strong>{node.actor}</strong>
          <span>{node.phase}</span>
        </div>
        <p className="first-tip">
          <Eye aria-hidden="true" />
          {tip}
        </p>
        <PossessionNotice text={possessionNotice(run, moment, ready)} />
        <MatchPitch
          node={node}
          selected={selected}
          opponent={opponent}
          animationKey={replay}
          viewBox={FULL_PITCH}
          autoScroll={false}
          showHelp={false}
          buildUp={
            buildUp.previewing && leadIn
              ? {
                  clip: leadIn,
                  replay: buildUp.replayKey,
                  moving: buildUp.playing,
                }
              : undefined
          }
        />
        {!selected && (
          <div className="play-tools">
            {leadIn && (
              <BuildUpControls
                clip={leadIn}
                playback={buildUp}
                reducedMotion={reduced}
                onReplay={() => {
                  buildUp.replay();
                  stepRef.current?.scrollIntoView({
                    block: 'start',
                    behavior: 'instant',
                  });
                }}
                onFinish={() => {
                  buildUp.finish();
                  stepRef.current?.focus({ preventScroll: true });
                }}
              />
            )}
            {!buildUp.previewing && (
              <ReadThePlay
                compact
                reading={readThePlay({
                  players: completeTeamShape(
                    node.scene.players,
                    node.scene.ball,
                  ),
                  ball: node.scene.ball,
                  phase: node.phase,
                })}
              />
            )}
          </div>
        )}
        <p className="first-possession sr-only">
          {buildUp.previewing
            ? 'Build-up'
            : possession === 'home'
              ? 'Our ball'
              : possession === 'away'
                ? `${opponent.shortName} ball`
                : 'Ball loose'}
        </p>
        {!selected ? (
          <div className="first-question">
            <h2>What do you do?</h2>
            <div className="match-choice-list">
              {orderedMatchChoices(node).map((choice, index) => (
                <Button
                  key={choice.id}
                  variant="outline"
                  disabled={buildUp.previewing}
                  onClick={() => choose(choice.id)}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  {choice.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div
            ref={feedbackRef}
            tabIndex={-1}
            className={`first-feedback is-${signal?.tone}`}
            aria-label="Your decision result"
          >
            <div aria-live="polite">
              <strong>
                <SignalIcon aria-hidden="true" />
                {ready
                  ? selected.outcome?.homeGoals
                    ? 'Goal for Pitchwise FC!'
                    : selected.outcome?.awayGoals
                      ? `Goal for ${opponent.shortName}`
                      : signal?.label
                  : 'Play unfolding…'}
              </strong>
              {ready && (
                <>
                  <small>You chose: {selected.label}</small>
                  <p>{selected.feedback}</p>
                </>
              )}
            </div>
            <Button disabled={!ready} onClick={advance}>
              {!ready
                ? 'Play unfolding…'
                : selected.nextNodeId
                  ? 'Next decision'
                  : run.momentIndex === 0
                    ? 'Next situation'
                    : 'Finish friendly'}
              <ArrowRight aria-hidden="true" />
            </Button>
            {ready && !reduced && (
              <button
                className="first-replay"
                onClick={() => {
                  setReplay((n) => n + 1);
                  stepRef.current?.scrollIntoView({
                    block: 'start',
                    behavior: 'instant',
                  });
                }}
              >
                Replay movement
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
