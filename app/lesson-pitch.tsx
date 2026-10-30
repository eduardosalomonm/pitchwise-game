'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, RotateCcw } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import type { Scenario } from '@/lib/scenarios';
import { startRevealPlayback, type RevealBeat } from '@/lib/lesson-playback';
import { completeTeamShape, teamMovements } from '@/lib/team-shape';
import { routePoints, routeStyle, movementWindow } from '@/lib/pitch-motion';
import {
  ActivePlayerCue,
  BallMarker,
  PitchSurface,
  PitchOrientation,
  PossessionNotice,
} from '@/app/pitch-parts';
import {
  facingDescription,
  playerFacing,
  trainingPossession,
} from '@/lib/pitch-cues';
import { ReadThePlay } from '@/app/read-the-play';
import { readThePlay } from '@/lib/read-the-play';
import {
  leadInStart,
  LEAD_IN_DURATION,
  LEAD_IN_DELAY,
  type MatchLeadIn,
} from '@/lib/match-lead-ins';
import { BuildUpControls } from '@/app/build-up-controls';
import type { useMatchLeadIn } from '@/app/use-match-lead-in';

export type LessonBuildUp = {
  clip: MatchLeadIn;
  playback: ReturnType<typeof useMatchLeadIn>;
  reducedMotion: boolean;
};

export function LessonIllustration({
  scenario,
  position,
}: {
  scenario: Scenario;
  position: string;
}) {
  const figureRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const figure = figureRef.current;
    if (!figure) return;
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(figure);
    return () => observer.disconnect();
  }, []);
  const illustration = scenario.illustration;
  if (!illustration) return null;
  return (
    <figure
      ref={figureRef}
      className={`scenario-illustration is-${illustration.orientation} ${inView && loaded ? 'illustration-entered' : ''}`}
    >
      <div className="illustration-frame">
        <Image
          src={illustration.src}
          alt={illustration.alt}
          width={illustration.orientation === 'portrait' ? 1024 : 1536}
          height={illustration.orientation === 'portrait' ? 1536 : 1024}
          onLoad={() => setLoaded(true)}
          unoptimized
        />
      </div>
      <figcaption>
        <span>{position}</span>
        {illustration.caption}
      </figcaption>
      <div className="touchline-note">
        <p>
          Touchline wisdom <span>Original game notes</span>
        </p>
        <blockquote>“{scenario.reveal.touchline}”</blockquote>
      </div>
    </figure>
  );
}

export function TacticalPitch({
  scenario,
  revealed,
  replayKey,
  activeLabel,
  compact = false,
  celebrate = false,
  animate = true,
  showSpace = revealed,
  orient = false,
  allowHelp = true,
  buildUp,
}: {
  scenario: Scenario;
  revealed: boolean;
  replayKey: number;
  activeLabel: string;
  compact?: boolean;
  celebrate?: boolean;
  animate?: boolean;
  showSpace?: boolean;
  orient?: boolean;
  allowHelp?: boolean;
  buildUp?: { clip: MatchLeadIn; replay: number; moving: boolean };
}) {
  const width = 1000;
  const height = 700;
  const px = (value: number) => value * 10;
  const py = (value: number) => value * 7;
  const finalPlayers = completeTeamShape(scenario.players, scenario.ball);
  const frame = buildUp
    ? leadInStart({ players: finalPlayers, ball: scenario.ball }, buildUp.clip)
    : { players: finalPlayers, ball: scenario.ball };
  const players = frame.players;
  const movements = teamMovements(
    players,
    scenario.reveal.movements,
    scenario.ball,
    scenario.reveal.ballTo,
    scenario.mode === 'Defending',
  );
  const after = trainingPossession(scenario, true);
  const possessionChanged =
    revealed &&
    after !== undefined &&
    after !== trainingPossession(scenario, false);

  return (
    <div
      className={`pitch-shell ${compact ? 'pitch-compact' : ''} ${celebrate ? 'pitch-celebrate' : ''}`}
    >
      {!compact && possessionChanged && (
        <PossessionNotice
          text={
            after === 'home'
              ? 'Ball won — we can attack.'
              : after === 'away'
                ? 'Ball lost — we defend now.'
                : 'Ball loose — possession is contested.'
          }
        />
      )}
      <svg
        key={`${scenario.id}-${revealed}-${replayKey}-${buildUp ? `before-${buildUp.replay}` : 'decision'}`}
        aria-hidden={compact || undefined}
        className={`tactical-pitch ${animate ? '' : 'pitch-static'} ${orient ? 'pitch-orientation' : ''}`}
        focusable="false"
        viewBox={`0 0 ${width} ${height}`}
        aria-labelledby={
          compact
            ? undefined
            : `pitch-${scenario.id}-title pitch-${scenario.id}-desc`
        }
      >
        {!compact && (
          <title
            id={`pitch-${scenario.id}-title`}
          >{`${scenario.title} tactical situation`}</title>
        )}
        {!compact && (
          <desc id={`pitch-${scenario.id}-desc`}>
            {buildUp ? buildUp.clip.description : scenario.context} The{' '}
            {activeLabel.toLowerCase()} is the orange marker labelled YOU. Our
            goal is on the left; the rival goal is on the right.{' '}
            {!revealed &&
              !buildUp &&
              players
                .filter((p) => p.active)
                .map((p) =>
                  facingDescription(p, scenario.context, scenario.ball),
                )
                .join(' ')}{' '}
            {revealed &&
              `Highlighted space: ${scenario.reveal.focus.label}. ${scenario.reveal.space}`}
          </desc>
        )}
        <defs>
          <marker
            id={`arrow-${scenario.id}`}
            markerHeight="10"
            markerWidth="10"
            orient="auto"
            refX="8"
            refY="5"
          >
            <path className="arrow-head" d="M0,0 L10,5 L0,10 z" />
          </marker>
        </defs>
        <PitchSurface />

        {showSpace && (
          <g className="space-spotlight" aria-hidden="true">
            <ellipse
              cx={px(scenario.reveal.focus.x)}
              cy={py(scenario.reveal.focus.y)}
              rx={px(scenario.reveal.focus.radiusX)}
              ry={py(scenario.reveal.focus.radiusY)}
            />
          </g>
        )}
        {showSpace && scenario.reveal.passingLane && (
          <g className="passing-option" aria-hidden="true">
            <line
              pathLength="1"
              x1={px(scenario.reveal.passingLane.from.x)}
              y1={py(scenario.reveal.passingLane.from.y)}
              x2={px(scenario.reveal.passingLane.to.x)}
              y2={py(scenario.reveal.passingLane.to.y)}
            />
          </g>
        )}

        {revealed &&
          scenario.reveal.movements.map((movement) => {
            const player = scenario.players.find(
              (item) => item.id === movement.playerId,
            );
            if (!player) return null;
            return (
              <g key={movement.playerId} className="movement-path">
                <polyline
                  points={routePoints(player, [
                    ...(movement.via ?? []),
                    movement.to,
                  ])}
                  markerEnd={`url(#arrow-${scenario.id})`}
                />
                {movement.label && (
                  <text
                    x={(px(player.x) + px(movement.to.x)) / 2}
                    y={(py(player.y) + py(movement.to.y)) / 2 - 13}
                  >
                    {movement.label}
                  </text>
                )}
              </g>
            );
          })}

        {[
          ...players.filter((p) => !p.active),
          ...players.filter((p) => p.active),
        ].map((player) => {
          const movement = revealed
            ? movements.find((item) => item.playerId === player.id)
            : undefined;
          const earlier = buildUp?.moving
            ? buildUp.clip.players.find((p) => p.id === player.id)
            : undefined;
          return (
            <g
              key={player.id}
              data-player-id={player.id}
              className={`player-marker ${player.background ? 'is-background' : ''} ${movement || earlier ? 'has-route' : ''} ${player.active ? 'is-active' : player.team === 'home' ? 'is-home' : 'is-away'} ${player.active && celebrate ? 'is-celebrating' : ''}`}
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
                          scenario.ball,
                          scenario.reveal.ballPath ??
                            (scenario.reveal.ballTo
                              ? [scenario.reveal.ballTo]
                              : []),
                        ),
                        1.3,
                        0.1,
                      )
                    : undefined
              }
              aria-label={`${player.role} at ${movement?.to.x ?? player.x}, ${movement?.to.y ?? player.y}`}
            >
              <title>
                {player.team === 'home' ? 'Our' : 'Opponent'} {player.role}
              </title>
              {player.active && celebrate && (
                <circle
                  className="vision-ring"
                  cx={px(player.x)}
                  cy={py(player.y)}
                  r="46"
                />
              )}
              {player.active && (
                <ActivePlayerCue
                  player={player}
                  context={scenario.context}
                  ball={scenario.ball}
                  revealed={revealed || Boolean(buildUp)}
                />
              )}
              <circle
                className="player-disc"
                cx={px(player.x)}
                cy={py(player.y)}
                r={player.active ? 28 : player.background ? 18 : 23}
              />
              <text textAnchor="middle" x={px(player.x)} y={py(player.y) + 6}>
                {player.label}
              </text>
            </g>
          );
        })}

        <BallMarker
          ball={frame.ball}
          path={
            buildUp
              ? buildUp.moving
                ? (buildUp.clip.ballPath ?? [buildUp.clip.ball.end])
                : undefined
              : revealed && scenario.reveal.ballTo
                ? (scenario.reveal.ballPath ?? [scenario.reveal.ballTo])
                : undefined
          }
          steady
          duration={buildUp ? LEAD_IN_DURATION : undefined}
          delay={buildUp ? LEAD_IN_DELAY : undefined}
          trail={!buildUp}
        />
      </svg>
      {!compact && (
        <PitchOrientation
          facing={
            !revealed &&
            !buildUp &&
            players.some(
              (p) =>
                p.active &&
                Boolean(playerFacing(p, scenario.context, scenario.ball)),
            )
          }
        />
      )}
      {!compact && !revealed && !buildUp && allowHelp && (
        <ReadThePlay
          key={scenario.id}
          reading={readThePlay({
            players,
            ball: scenario.ball,
            phase: scenario.mode,
          })}
        />
      )}
      {!compact && (
        <div className="pitch-legend" aria-hidden="true">
          <span>
            <i className="legend-dot active-dot" />
            {activeLabel}
          </span>
          <span>
            <i className="legend-dot home-dot" />
            Team in focus
          </span>
          <span>
            <i className="legend-dot away-dot" />
            Opponent
          </span>
        </div>
      )}
      {!compact && showSpace && (
        <p className="space-caption">
          <Eye aria-hidden="true" />
          <span>
            <strong>Spot the space</strong>
            {scenario.reveal.focus.label}
            {scenario.reveal.passingLane && (
              <small>White line = passing option, not a played pass</small>
            )}
          </span>
        </p>
      )}
    </div>
  );
}

export function LessonPitch({
  scenario,
  revealed,
  replayKey,
  activeLabel,
  isCorrect,
  onReplay,
  buildUp,
}: {
  scenario: Scenario;
  revealed: boolean;
  replayKey: number;
  activeLabel: string;
  isCorrect: boolean;
  onReplay: () => void;
  buildUp: LessonBuildUp;
}) {
  const regionRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<() => void>(() => undefined);
  const [beat, setBeat] = useState<RevealBeat>('cue');
  const [automatic, setAutomatic] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [loop, setLoop] = useState(0);
  const lastReplayRef = useRef(-1);

  useEffect(() => {
    if (!revealed) return;
    let cancelled = false;
    let nextFrame = 0;
    let stopTimeline: () => void = () => undefined;
    // Return to the pitch BEFORE committing the animation's starting frame.
    // A new request cancels both pending frames and completion from an older replay.
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      setBeat('cue');
      setAutomatic(false);
      const reduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      setReducedMotion(reduced);
      const region = regionRef.current;
      const shouldReturnToPitch = lastReplayRef.current !== replayKey;
      lastReplayRef.current = replayKey;
      if (region && shouldReturnToPitch) {
        const pitch = region.querySelector('svg');
        const rect =
          pitch?.getBoundingClientRect() ?? region.getBoundingClientRect();
        if (rect.top < 12 || rect.bottom > window.innerHeight - 12) {
          region.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
        region.focus({ preventScroll: true });
      }
      nextFrame = requestAnimationFrame(() => {
        if (cancelled) return;
        setAutomatic(!reduced);
        stopTimeline = startRevealPlayback({
          onBeat: setBeat,
          reducedMotion: reduced,
          onLoop: () => setLoop((value) => value + 1),
          schedule: (callback, delay) => window.setTimeout(callback, delay),
          clear: window.clearTimeout,
        });
      });
    });
    const cancel = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(nextFrame);
      stopTimeline();
    };
    cancelRef.current = cancel;
    return cancel;
  }, [revealed, replayKey, loop]);

  function showBeat(next: RevealBeat) {
    cancelRef.current();
    setAutomatic(false);
    setBeat(next);
  }

  const movement = scenario.choices.find(
    (choice) => choice.id === scenario.correctChoiceId,
  )!.label;
  const caption =
    beat === 'cue'
      ? scenario.reveal.cue
      : beat === 'movement'
        ? movement
        : scenario.reveal.space;
  return (
    <div
      className="lesson-pitch-region"
      ref={regionRef}
      tabIndex={-1}
      aria-label={`${activeLabel} movement replay`}
      data-playback={beat}
      data-replay={replayKey}
    >
      <div className="replay-toolbar">
        {revealed && !reducedMotion && (
          <Button
            variant="outline"
            className="h-11 rounded-full"
            onClick={onReplay}
          >
            <RotateCcw aria-hidden="true" /> Replay movement
          </Button>
        )}
      </div>
      <TacticalPitch
        scenario={scenario}
        revealed={revealed && beat !== 'cue'}
        showSpace={revealed && beat === 'space'}
        replayKey={replayKey + loop * 1000}
        activeLabel={activeLabel}
        orient={!revealed}
        allowHelp={false}
        celebrate={revealed && isCorrect}
        animate={
          !revealed || (automatic && !reducedMotion && beat === 'movement')
        }
        buildUp={
          !revealed && buildUp.playback.previewing
            ? {
                clip: buildUp.clip,
                replay: buildUp.playback.replayKey,
                moving: buildUp.playback.playing,
              }
            : undefined
        }
      />
      {!revealed && (
        <div className="play-tools">
          <BuildUpControls
            clip={buildUp.clip}
            playback={buildUp.playback}
            reducedMotion={buildUp.reducedMotion}
            onReplay={() => {
              buildUp.playback.replay();
              regionRef.current?.scrollIntoView({
                block: 'start',
                behavior: 'instant',
              });
            }}
            onFinish={() => {
              buildUp.playback.finish();
              regionRef.current?.focus({ preventScroll: true });
            }}
          />
          {!buildUp.playback.previewing && (
            <ReadThePlay
              key={scenario.id}
              compact
              reading={readThePlay({
                players: completeTeamShape(scenario.players, scenario.ball),
                ball: scenario.ball,
                phase: scenario.mode,
              })}
            />
          )}
        </div>
      )}
      {revealed && (
        <details className="play-details lesson-motion-details">
          <summary>Explore the movement</summary>
          <div className="story-controls">
            <div className="beat-buttons" aria-label="Reveal steps">
              {(['cue', 'movement', 'space'] as const).map((step, index) => (
                <Button
                  key={step}
                  variant="outline"
                  aria-pressed={beat === step}
                  onClick={() => showBeat(step)}
                >
                  <span>{index + 1}</span>
                  {step === 'cue'
                    ? 'The cue'
                    : step === 'movement'
                      ? 'Movement'
                      : 'The space'}
                </Button>
              ))}
            </div>
            <output className="beat-caption">
              <strong>
                {beat === 'cue'
                  ? 'What they noticed'
                  : beat === 'movement'
                    ? 'What they did'
                    : 'What it changes'}
              </strong>
              <span>{caption}</span>
            </output>
            <div className="frame-controls" aria-label="Compare the movement">
              {automatic && beat === 'cue' && (
                <Button variant="outline" onClick={() => showBeat('cue')}>
                  Pause on cue
                </Button>
              )}
              <span>← Our goal · Attack →</span>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
