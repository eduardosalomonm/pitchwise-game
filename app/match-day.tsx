'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The interactive tactical SVG requires image semantics. */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  TriangleAlert,
  Check,
  Copy,
  LayoutGrid,
  Maximize2,
  RotateCcw,
  Share2,
  Star,
  Target,
  X,
  ZoomIn,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePlaytest } from '@/app/playtest-provider';
import type { MatchFixture } from '@/lib/match-fixtures';
import { completeTeamShape, teamMovements } from '@/lib/team-shape';
import { routeStyle, routePoints, movementWindow } from '@/lib/pitch-motion';
import {
  getMatchArt,
  hasPlayableMotion,
  visibleScore,
} from '@/lib/match-presentation';
import {
  choiceHandoff,
  visiblePossession,
  possessionNotice,
} from '@/lib/match-narrative';
import { orderedMatchChoices } from '@/lib/match-choice-order';
import { matchChoiceSignal } from '@/lib/match-feedback';
import {
  GoalMoment,
  MatchIllustration,
  ResultFeeling,
} from '@/app/match-reward';
import {
  ActivePlayerCue,
  BallMarker,
  PitchSurface,
  PitchOrientation,
  PossessionNotice,
} from '@/app/pitch-parts';
import { facingDescription, goalPath, playerFacing } from '@/lib/pitch-cues';
import { ReadThePlay } from '@/app/read-the-play';
import { readThePlay } from '@/lib/read-the-play';
import {
  leadInStart,
  LEAD_IN_DURATION,
  LEAD_IN_DELAY,
  type MatchLeadIn,
} from '@/lib/match-lead-ins';
import { useMatchLeadIn } from '@/app/use-match-lead-in';
import { matchBuildUp } from '@/lib/play-build-up';
import { BuildUpControls } from '@/app/build-up-controls';
import { getModelContext } from '@/lib/model-context';
import { rateMatch } from '@/lib/match-rating';
import { collectMatchStats, type MatchStats } from '@/lib/match-stats';
import { inFixtureOrder, type OurSide } from '@/lib/fixture-order';
import {
  HOME_TEAM,
  getTeam,
  kitDescription,
  matchKits,
  renameOpponentText,
  type TeamIdentity,
} from '@/lib/teams';
import { KitPattern, MatchKits } from '@/app/team-kit';
import { closingMoment, closingScore } from '@/lib/tournament-stories';
import { HomeTeamContext, useHomeTeam } from '@/app/home-team';
import { focusViewBox, FULL_PITCH, type ViewBox } from '@/lib/pitch-focus';
import {
  chooseMatchOption,
  continueMatch,
  createMatchRun,
  getDecisionNode,
  getMatchMoment,
  createMomentReview,
  type DecisionNode,
  type MatchChoice,
  type MatchMomentResult,
  type MatchRun,
} from '@/lib/match-day';

function DecisionSignal({
  node,
  choice,
}: {
  node: DecisionNode;
  choice: MatchChoice;
}) {
  const { tone, label } = matchChoiceSignal(node, choice);
  const Icon =
    tone === 'positive' ? Check : tone === 'neutral' ? Minus : TriangleAlert;
  return (
    <output className={`decision-signal is-${tone}`}>
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </output>
  );
}

export function MatchPitch({
  node,
  selected,
  animationKey,
  viewBox,
  opponent,
  autoScroll = true,
  showHelp = true,
  buildUp,
}: {
  node: DecisionNode;
  selected?: MatchChoice;
  animationKey: number;
  viewBox: ViewBox;
  opponent: TeamIdentity;
  autoScroll?: boolean;
  showHelp?: boolean;
  buildUp?: { clip: MatchLeadIn; replay: number; moving: boolean };
}) {
  const px = (value: number) => value * 10;
  const py = (value: number) => value * 7;
  const scene = buildUp ? leadInStart(node.scene, buildUp.clip) : node.scene;
  const players = completeTeamShape(
    scene.players,
    scene.ball,
    scene.unavailablePlayerIds,
  );
  const home = useHomeTeam();
  const kits = matchKits(opponent, home);
  const patternId = (side: string) => `match-kit-${node.id}-${side}`;
  const movements = selected
    ? teamMovements(
        players,
        selected.movement,
        node.scene.ball,
        selected.ballTo,
        node.phase !== 'Attacking',
      )
    : [];
  const regionRef = useRef<HTMLDivElement>(null);
  const renderedBallPath = goalPath(
    selected?.ballPath,
    selected?.outcome?.homeGoals,
    selected?.outcome?.awayGoals,
  );
  useEffect(() => {
    if (selected && autoScroll)
      regionRef.current?.scrollIntoView({
        block: 'start',
        behavior: 'instant',
      });
  }, [selected, animationKey, autoScroll]);
  return (
    <div className="match-pitch-shell" ref={regionRef}>
      {/* Inline SVG needs an image role so its title is announced. */}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <svg
        key={`${node.id}-${selected?.id ?? 'ready'}-${animationKey}-${buildUp ? `before-${buildUp.replay}` : 'decision'}`}
        className="match-pitch"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        role="img"
        aria-labelledby={`match-${node.id}-title match-${node.id}-desc`}
      >
        <title id={`match-${node.id}-title`}>{node.actor} decision</title>
        <desc id={`match-${node.id}-desc`}>
          {buildUp ? buildUp.clip.description : node.context} {home.name} wear:{' '}
          {kitDescription(home.kit).toLowerCase()}. {opponent.name} wear their
          club colours. The orange ring marks your {node.actor.toLowerCase()}.
          Our goal is on the left; we attack to the right.
          {!selected &&
            !buildUp &&
            node.scene.players
              .filter((p) => p.active)
              .map((p) => facingDescription(p, node.context, node.scene.ball))
              .join(' ')}
        </desc>
        <defs>
          <marker
            id={`match-arrow-${node.id}`}
            markerHeight="10"
            markerWidth="10"
            orient="auto"
            refX="8"
            refY="5"
          >
            <path className="arrow-head" d="M0,0 L10,5 L0,10 z" />
          </marker>
          {Object.entries(kits).map(([side, kit]) => (
            <KitPattern key={side} id={patternId(side)} kit={kit} />
          ))}
        </defs>
        <PitchSurface />
        {selected?.movement.map((movement) => {
          const player = node.scene.players.find(
            (item) => item.id === movement.playerId,
          );
          if (!player) return null;
          if (player.background && !player.active) return null;
          return (
            <g key={movement.playerId} className="match-movement-path">
              <polyline
                points={routePoints(player, [
                  ...(movement.via ?? []),
                  movement.to,
                ])}
                markerEnd={`url(#match-arrow-${node.id})`}
              />
            </g>
          );
        })}
        {[
          ...players.filter((p) => !p.active),
          ...players.filter((p) => p.active),
        ].map((player) => {
          const earlier = buildUp?.moving
            ? buildUp.clip.players.find((p) => p.id === player.id)
            : undefined;
          const movement = movements.find(
            (item) => item.playerId === player.id,
          );
          const side = `${player.team}${player.role === 'Goalkeeper' ? 'Keeper' : ''}`;
          const size = player.active ? 28 : player.background ? 18 : 23;
          const labelWidth = Math.max(
            16,
            player.label.length * (player.background ? 9 : 11),
          );
          return (
            <g
              key={player.id}
              data-player-id={player.id}
              data-team={player.team === 'home' ? home.id : opponent.id}
              className={`player-marker has-team-kit ${player.background && !player.active ? 'is-background' : ''} ${movement || earlier ? 'has-route' : ''} ${player.active ? 'is-active' : player.team === 'home' ? 'is-home' : 'is-away'}`}
              style={
                earlier
                  ? routeStyle(
                      player,
                      [...(earlier.via ?? []), earlier.end],
                      earlier.window ?? { start: 0, end: 1 },
                      LEAD_IN_DURATION,
                      LEAD_IN_DELAY,
                    )
                  : movement
                    ? routeStyle(
                        player,
                        [...(movement.via ?? []), movement.to],
                        movementWindow(
                          player,
                          movement,
                          node.scene.ball,
                          renderedBallPath ?? [],
                        ),
                      )
                    : undefined
              }
            >
              <title>
                {player.team === 'home' ? home.name : opponent.name} ·{' '}
                {player.role}
              </title>
              {player.active && (
                <ActivePlayerCue
                  player={player}
                  context={node.context}
                  ball={node.scene.ball}
                  revealed={Boolean(selected || buildUp)}
                />
              )}
              <circle
                className="player-disc"
                style={{ fill: `url(#${patternId(side)})` }}
                cx={px(player.x)}
                cy={py(player.y)}
                r={size}
              />
              <rect
                className="kit-role-label"
                x={px(player.x) - labelWidth / 2 - 3}
                y={py(player.y) - 10}
                width={labelWidth + 6}
                height={20}
                rx={5}
              />
              <text
                className="kit-role-text"
                textAnchor="middle"
                x={px(player.x)}
                y={py(player.y) + 6}
              >
                {player.label}
              </text>
            </g>
          );
        })}
        <BallMarker
          ball={scene.ball}
          path={
            buildUp
              ? buildUp.moving
                ? (buildUp.clip.ballPath ?? [buildUp.clip.ball.end])
                : undefined
              : renderedBallPath
          }
          steady
          duration={buildUp ? LEAD_IN_DURATION : undefined}
          delay={buildUp ? LEAD_IN_DELAY : undefined}
          trail={!buildUp}
        />
      </svg>
      <PitchOrientation
        facing={
          !selected &&
          !buildUp &&
          node.scene.players.some(
            (p) =>
              p.active &&
              Boolean(playerFacing(p, node.context, node.scene.ball)),
          )
        }
      />
      {!selected && !buildUp && showHelp && (
        <ReadThePlay
          key={node.id}
          reading={readThePlay({
            players,
            ball: node.scene.ball,
            phase: node.phase,
          })}
        />
      )}
      {selected && <DecisionSignal node={node} choice={selected} />}
    </div>
  );
}

function MatchRatingCard({ run }: { run: MatchRun }) {
  const rating = rateMatch(run);
  return (
    <div className="match-rating">
      <span
        className="match-rating-stars"
        aria-label={`${rating.stars} of 3 stars`}
      >
        {[0, 1, 2].map((index) => (
          <Star
            key={index}
            aria-hidden="true"
            className={index < rating.stars ? 'is-earned' : ''}
          />
        ))}
      </span>
      <strong>{rating.grade}</strong>
      <span>
        {rating.reads} of {rating.decisions} good reads · {rating.accuracy}%
      </span>
      {run.decisions
        .filter((d) => d.booking)
        .map((d, i) => (
          <span className="match-booking" key={`${d.nodeId}-${i}`}>
            {d.booking}
          </span>
        ))}
      {rating.standout && (
        <span>
          Player of the match: our {rating.standout.actor.toLowerCase()} (
          {rating.standout.reads} good{' '}
          {rating.standout.reads === 1 ? 'read' : 'reads'})
        </span>
      )}
    </div>
  );
}

function MatchHud({
  run,
  reviewing,
  includePending = false,
  showBuildUp = false,
  moments,
  opponent = HOME_TEAM.name,
  ourSide = 'home',
  onBack,
  backLabel,
}: {
  onBack?: () => void;
  backLabel?: string;
  run: MatchRun;
  reviewing: boolean;
  includePending?: boolean;
  showBuildUp?: boolean;
  opponent?: string;
  ourSide?: OurSide;
  moments: MatchFixture['moments'];
}) {
  const home = useHomeTeam();
  const moment = getMatchMoment(run.momentIndex, moments) ?? moments.at(-1)!;
  const score = visibleScore(run, includePending && !reviewing);
  const [left, right] = inFixtureOrder(home, getTeam(opponent), ourSide);
  const [leftScore, rightScore] = inFixtureOrder(
    score.home,
    score.away,
    ourSide,
  );
  const possession = visiblePossession(run, moments, includePending);
  return (
    <>
      <div
        className={`match-hud${onBack ? ' play-hud' : ''}`}
        aria-label="Match status"
      >
        {onBack && (
          <button className="play-back" onClick={onBack} aria-label={backLabel}>
            <ArrowLeft aria-hidden="true" />
          </button>
        )}
        <div>
          <span className="match-minute">
            {run.status === 'final' && !reviewing ? 'FT' : `${moment.minute}’`}
          </span>
          <span className="match-possession">
            {run.status === 'final' && !reviewing
              ? 'Full time'
              : showBuildUp
                ? 'Build-up'
                : possession === 'home'
                  ? 'Our ball'
                  : possession === 'away'
                    ? `${getTeam(opponent).code} ball`
                    : 'Ball loose'}
          </span>
        </div>
        <div
          className="scoreboard"
          aria-label={`${left.name} ${leftScore}, ${right.name} ${rightScore}`}
        >
          <span className="score-team-code">{left.code}</span>
          <strong
            key={`${score.home}-${score.away}`}
            className={includePending ? 'score-arrives' : ''}
          >
            {leftScore}–{rightScore}
          </strong>
          <span className="score-team-code">{right.code}</span>
        </div>
        <div className="match-moment-count">
          {reviewing
            ? 'Review'
            : `Moment ${Math.min(run.momentIndex + 1, moments.length)} of ${moments.length}`}
        </div>
      </div>
      {!onBack && <MatchKits opponent={getTeam(opponent)} ourSide={ourSide} />}
    </>
  );
}

function MatchTimeline({
  results,
  moments,
}: {
  results: MatchMomentResult[];
  moments: MatchFixture['moments'];
}) {
  return (
    <ol className="match-timeline" aria-label="Match timeline">
      {moments.map((moment) => {
        const result = results.find((item) => item.momentId === moment.id);
        return (
          <li
            key={moment.id}
            className={result ? `is-${result.outcome.tone}` : ''}
          >
            <span>{moment.minute}’</span>
            <div>
              <strong>{moment.name}</strong>
              <small>{result?.outcome.headline ?? 'Still to play'}</small>
            </div>
            {result?.outcome.homeGoals ? (
              <Target aria-label="Our goal" />
            ) : result?.outcome.awayGoals ? (
              <X aria-label="Rival goal" />
            ) : result ? (
              <Check aria-label="Complete" />
            ) : (
              <span className="timeline-dot" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function MatchDayScreen({
  onExit,
  onChooseMatch,
  onNextMatch,
  nextLabel = 'Next Match Day',
  onComplete,
  fixture,
  tournamentMode = false,
  competitionRoute = '#tournament',
  fullTimeCopy,
  competitionSummary,
  ourSide = 'home',
  initialRun,
  onProgress,
}: {
  onExit: () => void;
  onChooseMatch: () => void;
  onNextMatch?: () => void;
  nextLabel?: string;
  onComplete: (
    fixtureId: string,
    home: number,
    away: number,
    accuracy: number,
    standout?: string,
    stats?: MatchStats,
  ) => void;
  fixture: MatchFixture;
  tournamentMode?: boolean;
  competitionRoute?: '#tournament' | '#my-tournament' | '#league';
  initialRun?: MatchRun;
  onProgress?: (run: MatchRun) => void;
  ourSide?: OurSide;
  /** Post-match competition state and distinct next-match / full-overview actions. */
  competitionSummary?: (home: number, away: number) => ReactNode;
  /** Cup-specific full-time words; falls back to the standalone match copy. */
  fullTimeCopy?: (
    home: number,
    away: number,
  ) => { title: string; detail: string } | undefined;
}) {
  const home = useHomeTeam();
  const { track } = usePlaytest();
  const trackingId = competitionRoute === '#league' ? 'league' : fixture.id;
  const startedTracking = useRef(false);
  useEffect(() => {
    if (!startedTracking.current) {
      startedTracking.current = true;
      track({
        type: 'activity_start',
        activity: 'match',
        fixtureId: trackingId,
      });
    }
  }, [track, trackingId]);
  const [run, setRun] = useState<MatchRun>(
    () => initialRun ?? createMatchRun(fixture.moments),
  );
  const runRef = useRef(run);
  const [animationKey, setAnimationKey] = useState(0);
  const [readyChoice, setReadyChoice] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [fullPitch, setFullPitch] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<MatchMomentResult | null>(
    null,
  );
  const [completedRun, setCompletedRun] = useState<MatchRun | null>(null);
  useEffect(() => {
    if (!reviewing) onProgress?.(run);
  }, [run, reviewing, onProgress]);
  const decisionHeading = useRef<HTMLHeadingElement>(null);
  const closing = closingScore((completedRun ?? run).results);
  const opponent = getTeam(fixture.opponent!);
  const [leftTeam, rightTeam] = inFixtureOrder(home, opponent, ourSide);
  const [leftScore, rightScore] = inFixtureOrder(
    run.homeScore,
    run.awayScore,
    ourSide,
  );
  const moments = useMemo(() => {
    if (!tournamentMode || !fixture.moments.at(-1)!.id.endsWith('-clock'))
      return fixture.moments;
    const last = closingMoment(
      fixture.moments.at(-1)!.id,
      closing.home,
      closing.away,
    );
    const text = (value: string) =>
      renameOpponentText(value, undefined, fixture.opponent!, home);
    return [
      ...fixture.moments.slice(0, -1),
      {
        ...last,
        introduction: text(last.introduction),
        nodes: last.nodes.map((n) => ({
          ...n,
          context: text(n.context),
          choices: n.choices.map((c) => ({
            ...c,
            feedback: text(c.feedback),
            outcome: c.outcome
              ? {
                  ...c.outcome,
                  headline: text(c.outcome.headline),
                  recap: text(c.outcome.recap),
                }
              : undefined,
          })),
        })),
      },
    ];
  }, [
    fixture.moments,
    fixture.opponent,
    home,
    tournamentMode,
    closing.home,
    closing.away,
  ]);
  const [shareStatus, setShareStatus] = useState('');
  const moment = getMatchMoment(run.momentIndex, moments) ?? moments.at(-1)!;
  const node = getDecisionNode(moment, run.nodeId) ?? moment.nodes[0];
  const selected = run.pending
    ? node.choices.find((item) => item.id === run.pending?.choiceId)
    : undefined;
  const decisionNumber =
    run.decisions.filter((item) => item.momentId === moment.id).length +
    (run.pending ? 0 : 1);
  const pendingScore = visibleScore(run, true);
  const revealId = selected ? `${node.id}/${selected.id}` : null;
  const revealReady = revealId !== null && readyChoice === revealId;
  const goal = Boolean(
    selected?.outcome?.homeGoals || selected?.outcome?.awayGoals,
  );
  const art = selected ? getMatchArt(node, selected) : undefined;
  const signal = selected ? matchChoiceSignal(node, selected) : undefined;
  const handoff = selected ? choiceHandoff(moment, node, selected) : undefined;
  // Full pitch first; a focused view is an optional, explicit action.
  const focus = focusViewBox(node);
  const canZoom = narrow && focus !== FULL_PITCH;
  const viewBox = canZoom && !fullPitch ? focus : FULL_PITCH;
  const leadIn = matchBuildUp(node, moment, run);
  const buildUp = useMatchLeadIn(
    `${moment.id}/${node.id}/${reviewing}`,
    Boolean(leadIn && !selected && run.status !== 'final' && !reviewResult),
    reducedMotion,
  );
  const { isBlocked: buildUpBlocked, reset: resetBuildUp } = buildUp;
  const pitchColumn = useRef<HTMLDivElement>(null);
  const buildUpHeading = useRef<HTMLDivElement>(null);

  // Wait for the new layout, then reset instantly: old illustration height and
  // a browser's pending smooth scroll must not strand the next play off-screen.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [node.id, run.momentIndex]);

  useEffect(() => {
    if (run.status !== 'final' && !reviewResult)
      decisionHeading.current?.focus({ preventScroll: true });
  }, [node.id, run.status, reviewResult]);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 779px)');
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const page = document.getElementById('top');
    page?.classList.toggle(
      'has-active-match',
      run.status !== 'final' || reviewing,
    );
    return () => page?.classList.remove('has-active-match');
  }, [run.status, reviewing]);
  useLayoutEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!revealId) return;
    const timer = window.setTimeout(
      () => setReadyChoice(revealId),
      reducedMotion ? 0 : 2700,
    );
    return () => window.clearTimeout(timer);
  }, [revealId, reducedMotion]);

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  // On one-column layouts the result sits below the pitch; bring it into view once the play has finished.
  const consequenceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (revealId) consequenceRef.current?.focus({ preventScroll: true });
  }, [revealId]);
  useEffect(() => {
    if (!revealReady || !window.matchMedia('(max-width: 779px)').matches)
      return;
    const timer = window.setTimeout(
      () => {
        const element = consequenceRef.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        if (rect.bottom <= window.innerHeight) return;
        const behavior = reducedMotion ? 'instant' : 'smooth';
        element.scrollIntoView({
          block: rect.height > window.innerHeight - 96 ? 'start' : 'end',
          behavior,
        });
      },
      goal && !reducedMotion ? 1400 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [revealReady, goal, reducedMotion]);

  const makeChoice = useCallback(
    (momentId: string, nodeId: string, choiceId: string) => {
      if (buildUpBlocked())
        throw new Error(
          'Wait for the build-up to pause, or skip to the decision.',
        );
      if (reviewResult)
        throw new Error(
          'Return to the final whistle before starting another review.',
        );
      const next = chooseMatchOption(
        runRef.current,
        momentId,
        nodeId,
        choiceId,
        moments,
      );
      runRef.current = next;
      setRun(next);
      setAnimationKey((value) => value + 1);
      const currentMoment = getMatchMoment(next.momentIndex, moments)!;
      const currentNode = getDecisionNode(currentMoment, nodeId)!;
      const picked = currentNode.choices.find((item) => item.id === choiceId)!;
      if (!reviewing)
        track({
          type: 'match_decision',
          fixtureId: trackingId,
          nodeId,
          choiceId,
          verdict: matchChoiceSignal(currentNode, picked).tone,
        });
      return {
        momentId,
        nodeId,
        choiceId,
        locked: true,
        feedback: picked.feedback,
        next: picked.nextNodeId ? 'decision' : 'outcome',
        outcome: picked.outcome?.headline ?? null,
      };
    },
    [moments, reviewResult, reviewing, track, trackingId, buildUpBlocked],
  );

  const resetMatch = useCallback(() => {
    if (tournamentMode)
      throw new Error(
        'Tournament results cannot be reset here. Return to the cup to start a new run.',
      );
    const next = createMatchRun(moments);
    runRef.current = next;
    setCompletedRun(null);
    setRun(next);
    setReviewing(false);
    setReviewResult(null);
    setReadyChoice(null);
    setShareStatus('');
    resetBuildUp();
    setAnimationKey((value) => value + 1);
    window.scrollTo({ top: 0, behavior: 'instant' });
    track({ type: 'activity_start', activity: 'match', fixtureId: trackingId });
    return { status: 'restarted', momentId: moments[0].id, score: '0–0' };
  }, [moments, tournamentMode, track, trackingId, resetBuildUp]);

  const continuePlay = useCallback(() => {
    const before = runRef.current;
    if (!before.pending) return;
    const terminal = Boolean(before.pending?.outcome);
    const next = continueMatch(before, moments);
    if (reviewing && terminal) {
      const result = next.results.at(-1)!;
      const finishedReview = {
        ...next,
        momentIndex: before.momentIndex,
        nodeId: before.nodeId,
      };
      setReviewResult(result);
      setRun(finishedReview);
      runRef.current = finishedReview;
      return;
    }
    runRef.current = next;
    setRun(next);
    if (next.status === 'final') {
      setCompletedRun(next);
      onComplete(
        fixture.id,
        next.homeScore,
        next.awayScore,
        rateMatch(next).accuracy,
        rateMatch(next).standout?.actor,
        collectMatchStats(next, moments),
      );
      if (!reviewing)
        track({
          type: 'match_complete',
          fixtureId: trackingId,
          homeGoals: next.homeScore,
          awayGoals: next.awayScore,
          decisions: next.decisions.length,
          goodDecisions: rateMatch(next).reads,
        });
    }
    setAnimationKey((value) => value + 1);
  }, [reviewing, moments, onComplete, fixture.id, trackingId, track]);

  function startReview(index: number) {
    const completed = completedRun ?? run;
    const review = createMomentReview(completed, index, moments);
    runRef.current = review;
    setRun(review);
    setReviewing(true);
    setReviewResult(null);
    setAnimationKey((value) => value + 1);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function returnToFinal() {
    const completed = completedRun;
    if (!completed) return;
    runRef.current = completed;
    setRun(completed);
    setReviewing(false);
    setReviewResult(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  useEffect(() => {
    const modelContext = getModelContext();
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const reportError = () => undefined;
    try {
      void Promise.resolve(
        modelContext.registerTool(
          {
            name: 'choose_match_option',
            title: 'Choose a Match Day option',
            description:
              'Lock a choice for the current visible Match Day decision and reveal its tactical consequence.',
            inputSchema: {
              type: 'object',
              properties: {
                momentId: { type: 'string' },
                nodeId: { type: 'string' },
                choiceId: { type: 'string' },
              },
              required: ['momentId', 'nodeId', 'choiceId'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute(input) {
              if (!input || typeof input !== 'object')
                throw new Error('Expected momentId, nodeId and choiceId.');
              const value = input as {
                momentId?: unknown;
                nodeId?: unknown;
                choiceId?: unknown;
              };
              if (
                typeof value.momentId !== 'string' ||
                typeof value.nodeId !== 'string' ||
                typeof value.choiceId !== 'string'
              )
                throw new Error('All inputs must be strings.');
              return makeChoice(value.momentId, value.nodeId, value.choiceId);
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(reportError);
      void Promise.resolve(
        modelContext.registerTool(
          {
            name: 'restart_final_match',
            title: 'Restart Match Day',
            description:
              'Reset the visible Match Day score and return to the first decision.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute: resetMatch,
          },
          { signal: lifecycle.signal },
        ),
      ).catch(reportError);
    } catch {
      reportError();
    }
    return () => lifecycle.abort();
  }, [makeChoice, resetMatch]);

  async function shareResult() {
    const url = `${window.location.origin}${window.location.pathname}${tournamentMode ? competitionRoute : `#match/${fixture.id}`}`;
    const text = `Full time in “${fixture.name}”: ${leftTeam.name} ${leftScore}–${rightScore} ${rightTeam.name}, with ${rateMatch(run).accuracy}% good reads. Can you read the game better?`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Pitchwise', text, url });
        setShareStatus('Shared.');
        return;
      }
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShareStatus('Result copied.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus('Copy the URL from your address bar.');
    }
  }

  const verdict = useMemo(
    () =>
      run.homeScore > run.awayScore
        ? 'Victory'
        : run.homeScore < run.awayScore
          ? 'Defeat'
          : 'Draw',
    [run.homeScore, run.awayScore],
  );

  if (reviewResult)
    return (
      <section className="match-day-wrap mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
        <MatchHud
          ourSide={ourSide}
          opponent={fixture.opponent}
          moments={moments}
          run={
            reviewing && completedRun
              ? {
                  ...run,
                  homeScore: completedRun.homeScore,
                  awayScore: completedRun.awayScore,
                }
              : run
          }
          reviewing
        />
        <div className={`review-result is-${reviewResult.outcome.tone}`}>
          <p className="eyebrow">Moment review complete</p>
          <h1>{reviewResult.outcome.headline}</h1>
          <p>{reviewResult.outcome.recap}</p>
          <Button className="h-12 rounded-full px-6" onClick={returnToFinal}>
            <ArrowLeft /> Back to final whistle
          </Button>
        </div>
      </section>
    );

  if (run.status === 'final' && !reviewing)
    return (
      <section className="match-day-wrap post-match mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
        <div className="final-whistle">
          <div className="final-score-card">
            <p className="eyebrow">Full time</p>
            <div className="final-score">
              <span>{leftTeam.name}</span>
              <strong>{leftScore}–{rightScore}</strong>
              <span>{rightTeam.name}</span>
            </div>
            <ResultFeeling
              won={verdict === 'Victory'}
              draw={verdict === 'Draw'}
              title={
                fullTimeCopy?.(run.homeScore, run.awayScore)?.title ??
                (verdict === 'Victory'
                  ? 'What a win.'
                  : verdict === 'Defeat'
                    ? 'A tough one.'
                    : 'Honours even.')
              }
              detail={
                fullTimeCopy?.(run.homeScore, run.awayScore)?.detail ??
                (verdict === 'Victory'
                  ? 'The final whistle. The points are yours.'
                  : verdict === 'Defeat'
                    ? 'Not our day. Another match, another chance.'
                    : 'Neither side could find the winner.')
              }
            >
            {competitionSummary ? competitionSummary(run.homeScore, run.awayScore) : <div className="match-result-actions">
              {onNextMatch && (
                <Button
                  className="h-12 rounded-full px-6"
                  onClick={onNextMatch}
                >
                  {nextLabel}
                  <ArrowRight />
                </Button>
              )}
              {/* Outline buttons sit on the dark card: give them dark text on their light fill. */}
              <Button
                className={`h-12 rounded-full px-6 ${tournamentMode ? '' : 'text-foreground'}`}
                variant={tournamentMode ? 'default' : 'outline'}
                onClick={onChooseMatch}
              >
                <LayoutGrid />
                {tournamentMode ? 'Continue' : 'All matches'}
              </Button>
              {!tournamentMode && (
                <Button
                  className="h-12 rounded-full px-6 text-foreground"
                  variant="outline"
                  onClick={onExit}
                >
                  <ArrowLeft />
                  Home
                </Button>
              )}
            </div>}
            </ResultFeeling>
            <details className="result-details">
              <summary>Your match rating</summary>
              <MatchRatingCard run={run} />
            </details>
          </div>
          <details className="result-details match-analysis">
            <summary>How the match unfolded</summary>
            <MatchTimeline moments={moments} results={run.results} />
          </details>
        </div>
        <details className="match-review result-details">
          <summary>Review one possession</summary>
          <div>
            {moments.map((item, index) => (
              <Button
                key={item.id}
                variant="outline"
                onClick={() => startReview(index)}
              >
                <span>{item.minute}’</span>
                {item.name}
              </Button>
            ))}
          </div>
        </details>
        <div className="match-final-actions">
          {!tournamentMode && (
            <Button
              className="h-12 rounded-full px-6"
              variant="outline"
              onClick={resetMatch}
            >
              <RotateCcw />
              Replay full match
            </Button>
          )}
          <Button
            className="h-12 rounded-full px-6"
            variant="outline"
            onClick={shareResult}
          >
            <Share2 />
            Share result
          </Button>
        </div>
        <p className="share-status" aria-live="polite">
          {shareStatus && (
            <>
              <Copy aria-hidden="true" />
              {shareStatus}
            </>
          )}
        </p>
      </section>
    );

  return (
    <section className="match-day-wrap is-playing play-layout mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
      <MatchHud
        onBack={reviewing ? returnToFinal : onChooseMatch}
        backLabel={
          reviewing
            ? 'Final whistle'
            : tournamentMode
              ? competitionRoute === '#league'
                ? 'League'
                : 'Tournament'
              : 'All matches'
        }
        ourSide={ourSide}
        opponent={fixture.opponent}
        moments={moments}
        run={
          reviewing && completedRun
            ? {
                ...run,
                homeScore: completedRun.homeScore,
                awayScore: completedRun.awayScore,
              }
            : run
        }
        reviewing={reviewing}
        includePending={revealReady}
        showBuildUp={buildUp.previewing}
      />
      <div className="match-heading" ref={buildUpHeading}>
        {fixture.redCard && run.momentIndex >= fixture.redCard.fromMoment && (
          <output className="match-discipline">
            <span aria-hidden="true">▮</span>
            {fixture.redCard.team === 'home'
              ? home.shortName
              : opponent.shortName}{' '}
            down to ten ·{' '}
            {inFixtureOrder(
              fixture.redCard.team === 'home' ? 10 : 11,
              fixture.redCard.team === 'away' ? 10 : 11,
              ourSide,
            ).join(' v ')}
          </output>
        )}
        <h1 className="sr-only">{moment.name}</h1>
        <p className="play-context" id={`match-${node.id}-context`}>
          {node.context}
        </p>
      </div>
      {fixture.redCard &&
        run.momentIndex === fixture.redCard.fromMoment &&
        node.id === moment.rootNodeId && (
          <section
            className="special-play-notice"
            aria-label="Special situation"
            aria-live="polite"
          >
            <strong>
              {fixture.redCard.team === 'home'
                ? 'Red card — we are down to ten.'
                : `Red card — ${opponent.shortName} are down to ten.`}
            </strong>
            <p>
              {fixture.redCard.team === 'home'
                ? 'A late challenge earns our left eight a second yellow. One fewer midfield outlet: protect the middle and pick your break.'
                : 'A late challenge earns their left eight a second yellow. An extra midfield lane opens: move their remaining cover before using it.'}
            </p>
          </section>
        )}
      <div
        className={`match-decision-grid${buildUp.previewing ? ' is-watching-build-up' : ''}`}
      >
        <div className="match-pitch-column" ref={pitchColumn}>
          <div className="match-actor-strip">
            <span className="actor-number">{node.actorLabel}</span>
            <span>
              <small>
                Decision {decisionNumber} ·{' '}
                <span
                  className={`decision-phase is-${node.phase.toLowerCase()}`}
                >
                  {node.phase}
                </span>
              </small>
              <strong>{node.actor}</strong>
            </span>
            {canZoom && !buildUp.previewing && (
              <Button
                variant="outline"
                className="pitch-view-toggle"
                aria-pressed={!fullPitch}
                aria-label={fullPitch ? 'Zoom on the play' : 'Full pitch'}
                title={fullPitch ? 'Zoom on the play' : 'Full pitch'}
                onClick={() => setFullPitch((value) => !value)}
              >
                {fullPitch ? (
                  <ZoomIn aria-hidden="true" />
                ) : (
                  <Maximize2 aria-hidden="true" />
                )}
              </Button>
            )}
          </div>
          <PossessionNotice text={possessionNotice(run, moment, revealReady)} />
          <MatchPitch
            opponent={opponent}
            node={node}
            selected={selected}
            animationKey={animationKey}
            viewBox={buildUp.previewing ? FULL_PITCH : viewBox}
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
          {!selected && leadIn && (
            <div className="play-tools">
              <BuildUpControls
                clip={leadIn}
                playback={buildUp}
                reducedMotion={reducedMotion}
                onReplay={() => {
                  buildUp.replay();
                  buildUpHeading.current?.scrollIntoView({
                    block: 'start',
                    behavior: 'instant',
                  });
                }}
                onFinish={() => {
                  buildUp.finish();
                  decisionHeading.current?.focus({ preventScroll: true });
                }}
              />
              {!buildUp.previewing && (
                <ReadThePlay
                  key={node.id}
                  compact
                  reading={readThePlay({
                    players: completeTeamShape(
                      node.scene.players,
                      node.scene.ball,
                      node.scene.unavailablePlayerIds,
                    ),
                    ball: node.scene.ball,
                    phase: node.phase,
                  })}
                />
              )}
            </div>
          )}
          {goal && revealReady && (
            <GoalMoment
              ourSide={ourSide}
              opponent={opponent.name}
              key={`${node.id}-${selected?.id}`}
              home={pendingScore.home}
              away={pendingScore.away}
              homeGoal={Boolean(selected?.outcome?.homeGoals)}
              reviewing={reviewing}
            />
          )}
          <div className="replay-toolbar">
            {selected &&
              !reducedMotion &&
              hasPlayableMotion(node, selected) && (
                <Button
                  variant="outline"
                  className="h-11 rounded-full"
                  onClick={() => setAnimationKey((value) => value + 1)}
                >
                  <RotateCcw aria-hidden="true" /> Replay movement
                </Button>
              )}
          </div>
        </div>
        <div className="match-choice-card">
          <h2
            className={selected ? 'sr-only' : undefined}
            ref={decisionHeading}
            tabIndex={-1}
            aria-describedby={`match-${node.id}-context`}
          >
            {node.prompt}
          </h2>
          <div
            className="match-choice-list"
            aria-label="Match choices"
            hidden={Boolean(selected)}
          >
            {orderedMatchChoices(node).map((item, index) => {
              const picked = selected?.id === item.id;
              return (
                <Button
                  key={item.id}
                  disabled={
                    buildUp.previewing || (Boolean(selected) && !picked)
                  }
                  aria-pressed={picked}
                  variant="outline"
                  className={picked ? `is-picked is-${signal?.tone}` : ''}
                  onClick={() => {
                    if (!selected) makeChoice(moment.id, node.id, item.id);
                  }}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  {item.label}
                  {picked && <Check aria-label="Locked choice" />}
                </Button>
              );
            })}
          </div>
          {selected && (
            <div
              ref={consequenceRef}
              tabIndex={-1}
              className={`match-consequence is-${signal?.tone}`}
              aria-live="polite"
            >
              {selected.booking && (
                <output className="match-booking">{selected.booking}</output>
              )}
              <p>
                <strong>{selected.outcome?.headline ?? signal?.label}</strong>
                {selected.feedback}
              </p>
              {handoff && (
                <output className="match-handoff">
                  <strong>
                    {renameOpponentText(
                      handoff.label,
                      undefined,
                      opponent.name,
                    )}
                  </strong>
                  {handoff.nextActor && (
                    <span>
                      Next decision: our {handoff.nextActor.toLowerCase()}.
                    </span>
                  )}
                </output>
              )}
              <Button
                disabled={!revealReady}
                className="h-12 rounded-full"
                onClick={continuePlay}
              >
                {!revealReady
                  ? 'Play unfolding…'
                  : selected.nextNodeId
                    ? 'Next decision'
                    : reviewing
                      ? 'Complete review'
                      : run.momentIndex === moments.length - 1
                        ? 'Final whistle'
                        : 'Next moment'}{' '}
                <ArrowRight />
              </Button>
              <details className="play-details" key={`${node.id}-details`}>
                <summary>Review this decision</summary>
                <p>
                  You chose: <strong>{selected.label}</strong>
                </p>
                {revealReady && art && (
                  <MatchIllustration
                    key={`${node.id}-${selected.id}`}
                    {...art}
                  />
                )}
              </details>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function MatchDay(props: Parameters<typeof MatchDayScreen>[0]) {
  const parent = useHomeTeam();
  return (
    <HomeTeamContext.Provider value={props.fixture.home ?? parent}>
      <MatchDayScreen {...props} />
    </HomeTeamContext.Provider>
  );
}
