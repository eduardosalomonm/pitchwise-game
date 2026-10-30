import {
  ArrowLeft,
  ArrowRight,
  Eye,
  Shield,
  Swords,
  Trophy,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { openOnPlainClick } from '@/lib/link-navigation';

function PlayCard({
  title,
  detail,
  image,
  href,
  action,
  onOpen,
  cup = false,
}: {
  title: string;
  detail: string;
  image: string;
  href: string;
  action: string;
  onOpen: () => void;
  cup?: boolean;
}) {
  return (
    <Link
      prefetch={false}
      className={`play-card ${cup ? 'play-card-cup' : ''}`}
      href={href}
      onClick={(event) => openOnPlainClick(event, onOpen)}
    >
      <div className="play-card-copy">
        {cup ? <Trophy aria-hidden="true" /> : <Swords aria-hidden="true" />}
        <h2>{title}</h2>
        <p>{detail}</p>
        <span className="play-card-action">
          {action} <ArrowRight aria-hidden="true" />
        </span>
      </div>
      <Image unoptimized src={image} width={1536} height={1024} alt="" />
    </Link>
  );
}

export function PlayMenu({
  onMatches,
  onTournaments,
  onTraining,
  onFirstMatch,
  firstMatchSeen,
}: {
  onMatches: () => void;
  onTournaments: () => void;
  onTraining: () => void;
  onFirstMatch: () => void;
  firstMatchSeen: boolean;
}) {
  return (
    <section className="play-menu mx-auto w-full max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-12">
      <div className="play-menu-heading">
        <h1>Decide the next move.</h1>
      </div>
      <div className={`first-entry ${firstMatchSeen ? 'is-returning' : ''}`}>
        {!firstMatchSeen && <p>A short friendly. Learn as you play.</p>}
        <Link
          prefetch={false}
          href="/#first-match"
          onClick={(event) => openOnPlainClick(event, onFirstMatch)}
        >
          <Eye aria-hidden="true" />{' '}
          {firstMatchSeen ? 'Replay the guided match' : 'Play your first match'}{' '}
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      <nav className="play-options" aria-label="Play football">
        <PlayCard
          title="Match Day"
          detail="One opponent. One match."
          image="/illustrations/actions/match-home-goal.webp"
          href="/#match/original"
          action="Choose opponent"
          onOpen={onMatches}
        />
        <PlayCard
          title="Competitions"
          detail="A cup run or a league season."
          image="/illustrations/match-days/high-press.webp"
          href="/#tournaments"
          action="Choose competition"
          onOpen={onTournaments}
          cup
        />
      </nav>
      <Link
        prefetch={false}
        className="training-entry"
        href="/#training"
        onClick={(event) => openOnPlainClick(event, onTraining)}
      >
        <Eye aria-hidden="true" />
        <span>
          <strong>Training Ground</strong>
          <small>Technique &amp; tactics · Learn the 11 positions</small>
        </span>
        <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}

export function TournamentMenu({
  onBack,
  onReaders,
  onCustom,
  onLeague,
}: {
  onBack: () => void;
  onReaders: () => void;
  onCustom: () => void;
  onLeague: () => void;
}) {
  const [actions, setActions] = useState({ league: 'Build a season', readers: 'Enter the cup', custom: 'Create a tournament' });
  useEffect(() => {
    let active = true;
    // Keep save reconstruction out of the initial home bundle.
    import('@/lib/competition-resume').then(({ competitionActions }) => {
      const next = competitionActions((key) => {
        try { return localStorage.getItem(key); } catch { return null; }
      });
      if (active) setActions(next);
    }).catch(() => { /* The destinations still restore progress themselves. */ });
    return () => { active = false; };
  }, []);
  return (
    <section className="play-menu tournament-menu mx-auto w-full max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-12">
      <Link
        prefetch={false}
        className="back-link"
        href="/"
        onClick={(event) => openOnPlainClick(event, onBack)}
      >
        <ArrowLeft aria-hidden="true" /> Home
      </Link>
      <div className="play-menu-heading">
        <h1>Choose your competition.</h1>
      </div>
      <nav className="play-options" aria-label="Choose a competition">
        <PlayCard
          title="My League"
          detail="4–12 clubs. Chase the top spot."
          image="/illustrations/actions/match-celebration.webp"
          href="/#league"
          action={actions.league}
          onOpen={onLeague}
          cup
        />
        <PlayCard
          title="The Readers’ Cup"
          detail="Pitchwise FC. A 32-team cup."
          image="/illustrations/actions/match-duel.webp"
          href="/#tournament"
          action={actions.readers}
          onOpen={onReaders}
          cup
        />
        <PlayCard
          title="My Tournament"
          detail="Your club. Your cup format."
          image="/illustrations/actions/striker-5.webp"
          href="/#my-tournament"
          action={actions.custom}
          onOpen={onCustom}
          cup
        />
      </nav>
      <p className="tournament-menu-note">
        <Shield aria-hidden="true" /> Your competition progress stays saved on
        this device.
      </p>
    </section>
  );
}
