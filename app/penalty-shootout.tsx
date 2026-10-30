'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG needs image semantics for its accessible description. */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { ArrowRight, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHomeTeam } from '@/app/home-team';
import { inFixtureOrder, type OurSide } from '@/lib/fixture-order';
import {
  createShootout,
  penaltyCue,
  penaltyScores,
  penaltyAttempt,
  PENALTY_ZONES,
  rivalPenaltyCue,
  takePenalty,
  type Shootout,
} from '@/lib/tournament';
import { ResultFeeling } from '@/app/match-reward';
import { ReadThePlay } from '@/app/read-the-play';
import { readPenalty } from '@/lib/read-the-play';

// Each pair: aim our kick, watch it, then read their kicker and choose our keeper's dive.
type Phase = 'aim' | 'ours' | 'dive' | 'rival' | 'result';
export function PenaltyShootout({
  gameId,
  seed,
  opponent,
  fullTime,
  onFinish,
  onResolved,
  canContinue,
  resultCopy,
  ourSide = 'home',
}: {
  gameId: string;
  seed: number;
  opponent: string;
  fullTime: string;
  onFinish: (score: [number, number], next: boolean) => void;
  onResolved?: (score: [number, number]) => void;
  canContinue: (score: [number, number]) => boolean;
  resultCopy?: (won: boolean) => { title: string; detail: string };
  ourSide?: OurSide;
}) {
  const club = useHomeTeam();
  const [shootout, setShootout] = useState<Shootout>(createShootout);
  const [phase, setPhase] = useState<Phase>('aim');
  const [shot, setShot] = useState<number | null>(null);
  const firstDive = useRef<HTMLButtonElement>(null);
  const locked = useRef(false);
  const diveLocked = useRef(false);
  const reported = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const screen = useRef<HTMLElement>(null);
  const firstOption = useRef<HTMLButtonElement>(null);
  const nextKick = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    screen.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, []);
  useEffect(() => {
    if (phase !== 'ours' && phase !== 'rival') return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const timer = window.setTimeout(
      () => setPhase(phase === 'ours' ? 'dive' : 'result'),
      reduce ? 0 : 950,
    );
    return () => window.clearTimeout(timer);
  }, [phase]);
  const history = shootout.history ?? [];
  const pair = history.at(-1);
  const live = phase === 'ours' || phase === 'rival';
  const rivalTurn = phase === 'rival';
  const finished = shootout.finished && phase === 'result';
  useEffect(() => {
    if (!shootout.finished || reported.current) return;
    reported.current = true;
    onResolved?.([shootout.us, shootout.them]);
  }, [shootout.finished, shootout.us, shootout.them, onResolved]);
  const cue = penaltyCue(gameId, shootout.kicks, seed);
  const tell = rivalPenaltyCue(gameId, shootout.kicks, seed);
  // Before their reply, our kick exists only as the pending shot.
  const pending = shot !== null && (phase === 'ours' || phase === 'dive');
  const ourScored = pending && penaltyScores(shootout, shot, gameId, seed);
  const attempt = pending ? penaltyAttempt(shootout, shot, gameId, seed) : undefined;
  const direction = rivalTurn
    ? (pair?.rivalDirection ?? 2)
    : pending
      ? shot
      : (pair?.direction ?? 1);
  const keeperSide = rivalTurn
    ? (pair?.rivalKeeperSide ?? 1)
    : pending
      ? attempt!.keeperSide
      : (pair?.keeperSide ?? 4);
  const scored = rivalTurn ? pair?.rivalScored : pending ? ourScored : pair?.scored;
  const us = shootout.us + Number(ourScored);
  const them = shootout.them;
  const [left, right] = inFixtureOrder(club.shortName, opponent, ourSide);
  const [leftScore, rightScore] = inFixtureOrder(us, them, ourSide);
  useEffect(() => {
    if (phase === 'aim' && shootout.kicks > 0) {
      firstOption.current?.focus({ preventScroll: true });
      firstOption.current?.closest('.cup-penalty-options')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
    if (phase === 'result' && !shootout.finished)
      nextKick.current?.focus({ preventScroll: true });
    if (phase === 'dive') {
      firstDive.current?.focus({ preventScroll: true });
      firstDive.current?.closest('.cup-penalty-options')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }, [phase, shootout.kicks, shootout.finished]);
  function choose(choice: number) {
    if (locked.current || phase !== 'aim' || shootout.finished) return;
    locked.current = true;
    setShot(choice);
    setPhase('ours');
  }
  function dive(side: number) {
    if (diveLocked.current || phase !== 'dive' || shot === null) return;
    diveLocked.current = true;
    setShootout((current) => takePenalty(current, shot, gameId, seed, side));
    setShot(null);
    setPhase('rival');
  }
  return (
    <section
      className="penalty-screen"
      aria-labelledby="penalty-heading"
      ref={screen}
    >
      <p className="eyebrow">Full time {fullTime} · Knockout</p>
      <h2 id="penalty-heading" tabIndex={-1} ref={heading}>
        The penalty shootout
      </h2>
      <p className="penalty-hint-note">Pick a side and height. Body language can deceive.</p>
      <output className="cup-penalty-score" aria-live="polite">
        <span>{left}</span>
        <strong>
          {leftScore}–{rightScore}
        </strong>
        <span>{right}</span>
      </output>
      <div className="penalty-records" aria-label="Penalty results">
        {inFixtureOrder(false, true, ourSide).map((rival) => (
          <div key={String(rival)}>
            <span>{rival ? opponent : club.shortName}</span>
            <ol>
              {Array.from({ length: Math.max(5, history.length + 1) }, (_, i) => {
                const entry = history[i];
                const pendingKick = !rival && pending && i === history.length;
                const revealed = Boolean(entry) || pendingKick;
                const goal = pendingKick
                  ? ourScored
                  : revealed && (rival ? entry.rivalScored : entry.scored);
                return (
                  <li
                    key={i}
                    className={
                      !revealed
                        ? 'penalty-empty'
                        : goal
                          ? 'penalty-scored'
                          : 'penalty-missed'
                    }
                    aria-label={`Kick ${i + 1}: ${!revealed ? 'to come' : goal ? 'goal' : 'miss'}`}
                  >
                    {revealed ? (
                      goal ? (
                        <Check aria-hidden="true" />
                      ) : (
                        <X aria-hidden="true" />
                      )
                    ) : (
                      <span aria-hidden="true">·</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
      {finished ? (
        <>
          <ResultFeeling
            won={shootout.us > shootout.them}
            title={
              resultCopy?.(shootout.us > shootout.them).title ??
              (shootout.us > shootout.them ? 'Nerves of steel.' : 'A tough exit.')
            }
            detail={
              resultCopy?.(shootout.us > shootout.them).detail ??
              (shootout.us > shootout.them
                ? 'You win on penalties.'
                : 'The shootout goes their way.')
            }
          />
          <div className="cup-result-actions">
            {canContinue([shootout.us, shootout.them]) && (
              <Button
                onClick={() => onFinish([shootout.us, shootout.them], true)}
              >
                Next fixture <ArrowRight />
              </Button>
            )}
            <Button
              variant={
                canContinue([shootout.us, shootout.them])
                  ? 'outline'
                  : 'default'
              }
              onClick={() => onFinish([shootout.us, shootout.them], false)}
            >
              {shootout.us > shootout.them
                ? 'View tournament'
                : 'See the final bracket'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div
            className={`penalty-arena ${live ? 'is-taking' : phase === 'result' ? 'is-resolved' : ''} ${phase === 'dive' ? 'is-diving' : ''}`}
            key={`${shootout.kicks}-${phase}`}
            style={
              {
                '--shot-x': `${PENALTY_ZONES[direction].x}px`,
                '--shot-y': `${PENALTY_ZONES[direction].y}px`,
                '--save-x': `${PENALTY_ZONES[keeperSide].x}px`,
                '--save-y': `${PENALTY_ZONES[keeperSide].y}px`,
              } as CSSProperties
            }
          >
            <div className="penalty-reading-header"><span className="penalty-turn">
              {phase === 'aim'
                ? `Your kick · ${shootout.kicks < 5 ? `${shootout.kicks + 1} of 5` : 'Sudden death'}`
                : phase === 'dive'
                  ? `Your keeper · read their kicker`
                  : rivalTurn
                  ? `${opponent} reply`
                  : phase === 'result'
                    ? 'Kick complete'
                    : `${club.shortName} kick`}
            </span>
            {(phase === 'aim' || phase === 'dive') && <ReadThePlay key={`reading-${shootout.kicks}-${phase}`} compact reading={readPenalty(phase === 'dive')} />}
            </div>
            <p className="penalty-goal-owner" role="status">{phase === 'result' ? 'Our goal · rival kick complete' : phase === 'dive' || rivalTurn ? 'Our goal · you control the keeper' : 'Rival goal · you take the shot'}</p>
            {/* Functional goal diagram, not an illustration of a real player. */}
            {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
            <svg
              viewBox="0 0 300 190"
              role="img"
              aria-label={
                phase === 'dive'
                  ? tell.text
                  : phase === 'aim'
                  ? cue.text
                  : `${rivalTurn ? opponent : club.shortName}: ${scored ? 'goal' : 'saved'}`
              }
            >
              <path
                d="M0 147H300M35 30H265V100H35Z"
                className="penalty-lines"
              />
              <path
                d="M35 44H265M35 58H265M35 72H265M35 86H265M58 30V100M81 30V100M104 30V100M127 30V100M150 30V100M173 30V100M196 30V100M219 30V100M242 30V100"
                className="penalty-net"
              />
              <path d="M35 100V30H265V100" className="penalty-goal-frame" />
              <path d="M20 147V185H280V147" className="penalty-lines" />
              {PENALTY_ZONES.map((zone, side) => (
                <circle
                  key={side}
                  cx={zone.x}
                  cy={zone.y}
                  r={13}
                  className="penalty-target"
                />
              ))}
              <g
                className="penalty-keeper"
                style={
                  {
                    '--keeper-from': '150px',
                  } as CSSProperties
                }
              >
                <circle cx="0" cy="0" r="13" />
                <text x="0" y="4" textAnchor="middle">
                  GK
                </text>
              </g>
              <circle
                className={`penalty-ball ${live ? 'ball-in-flight' : ''}`}
                cx="0"
                cy="0"
                r="5"
              />
            </svg>
            <output
              className={`penalty-reaction ${live && scored ? 'is-goal' : ''}`}
              aria-live="polite"
            >
              {phase === 'aim'
                ? cue.text
                : phase === 'dive'
                  ? `${ourScored ? 'You score!' : 'Saved by their keeper.'} ${tell.text}`
                  : live
                  ? scored
                    ? 'GOAL!'
                    : rivalTurn
                      ? 'Saved!'
                      : 'Denied by the keeper.'
                  : `${pair?.scored ? 'You score.' : 'Your shot is saved.'} ${pair?.rivalScored ? 'They score.' : pair?.dive !== undefined ? 'Our keeper saves it!' : 'We save their reply.'}`}
            </output>
          </div>
          {phase === 'aim' ? (
            <div className="cup-penalty-options">
              {PENALTY_ZONES.map((zone, i) => (
                <Button
                  key={zone.label}
                  aria-label={`Shoot ${zone.label}`}
                  ref={i === 0 ? firstOption : undefined}
                  variant="outline"
                  onClick={() => choose(i)}
                >
                  {zone.label}
                </Button>
              ))}
            </div>
          ) : phase === 'dive' ? (
            <div className="cup-penalty-options" aria-label="Choose where our keeper dives">
              {PENALTY_ZONES.map((zone, i) => (
                <Button
                  key={zone.label}
                  aria-label={`Save ${zone.label}`}
                  ref={i === 0 ? firstDive : undefined}
                  variant="outline"
                  onClick={() => dive(i)}
                >
                  {zone.label}
                </Button>
              ))}
            </div>
          ) : live ? (
            <p className="penalty-playing" aria-live="polite">
              {phase === 'ours' ? 'Your shot…' : 'Their reply…'}
            </p>
          ) : (
            <>
              <Button
                className="penalty-next"
                ref={nextKick}
                onClick={() => {
                  locked.current = false;
                  diveLocked.current = false;
                  setPhase('aim');
                  screen.current?.scrollIntoView({
                    block: 'start',
                    behavior: 'instant',
                  });
                }}
              >
                Next kick <ArrowRight />
              </Button>
              {pair?.scored && (
                <Image
                  unoptimized
                  className="penalty-story-art"
                  src="/illustrations/competition/penalty-goal.webp"
                  width={1152}
                  height={768}
                  alt="A penalty reaches the side net under the floodlights."
                />
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
