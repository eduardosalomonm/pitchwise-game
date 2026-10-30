'use client';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import Image from 'next/image';
import { Trophy, Flag, Minus } from 'lucide-react';
import { goalFeeling } from '@/lib/match-presentation';
import { useHomeTeam } from '@/app/home-team';
import { inFixtureOrder, type OurSide } from '@/lib/fixture-order';

export function GoalMoment({
  home,
  away,
  homeGoal,
  reviewing,
  opponent,
  ourSide = 'home',
}: {
  home: number;
  away: number;
  homeGoal: boolean;
  reviewing: boolean;
  opponent: string;
  ourSide?: OurSide;
}) {
  const club = useHomeTeam();
  const feeling = goalFeeling(home, away, homeGoal);
  const [left, right] = inFixtureOrder(home, away, ourSide);
  const [leftTeam, rightTeam] = inFixtureOrder(club.name, opponent, ourSide);
  return (
    <output className={`goal-moment ${homeGoal ? 'is-ours' : 'is-rival'}`}>
      {homeGoal && (
        <div className="goal-sparks" aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => (
            <i
              key={i}
              style={
                {
                  '--spark-x': `${(i * 37) % 100}%`,
                  '--spark-delay': `${(i % 5) * 90}ms`,
                  '--spark-turn': `${i * 47}deg`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
      <span className="goal-team">
        {reviewing ? 'Moment replay' : homeGoal ? club.name : opponent}
      </span>
      <strong className="goal-word">
        {homeGoal ? feeling.title : `${opponent} score.`}
      </strong>
      {!reviewing && (
        <span
          className="goal-score"
          aria-label={`${leftTeam} ${left}, ${rightTeam} ${right}`}
        >
          {left}
          <span>–</span>
          {right}
        </span>
      )}
      <p>
        {reviewing ? 'The decision that made the difference.' : feeling.detail}
      </p>
    </output>
  );
}

export function MatchIllustration({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="match-action-art">
      <Image unoptimized src={src} width={1536} height={1024} alt={alt} />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export function ResultFeeling({
  won,
  draw = false,
  title,
  detail,
  children,
}: {
  won: boolean;
  draw?: boolean;
  title: string;
  detail: string;
  children?: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current
      ?.closest('.final-score-card, .cup-hero, .penalty-screen')
      ?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, []);
  const Icon = draw ? Minus : won ? Trophy : Flag;
  return (
    <div
      className={`result-feeling ${draw ? 'result-draw' : won ? 'result-win' : 'result-loss'}`}
    >
      {won && !draw && (
        <div className="goal-sparks" aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => (
            <i
              key={i}
              style={
                {
                  '--spark-x': `${(i * 37) % 100}%`,
                  '--spark-delay': `${(i % 5) * 90}ms`,
                  '--spark-turn': `${i * 47}deg`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
      <Icon aria-hidden="true" />
      <h1 tabIndex={-1} ref={heading}>
        {title}
      </h1>
      <p>{detail}</p>
      {children}
      {!draw && (
        <Image
          unoptimized
          loading="eager"
          src={
            won
              ? '/illustrations/actions/match-celebration.webp'
              : '/illustrations/competition/full-time-defeat.webp'
          }
          width={1536}
          height={1024}
          alt={
            won
              ? 'Teammates celebrate together at the final whistle.'
              : 'Two teammates share a quiet moment after defeat.'
          }
        />
      )}
    </div>
  );
}
