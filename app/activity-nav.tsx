import { Eye, Swords, Trophy } from 'lucide-react';
import Link from 'next/link';
import { openOnPlainClick } from '@/lib/link-navigation';

export type Activity = 'training' | 'matches' | 'tournament';

export function ActivityNav({
  active,
  onTraining,
  onMatches,
  onTournament,
}: {
  active: Activity;
  onTraining: () => void;
  onMatches: () => void;
  onTournament: () => void;
}) {
  const items = [
    {
      id: 'matches',
      title: 'Match Day',
      subtitle: 'Play one match',
      Icon: Swords,
      href: '/#match/original',
      action: onMatches,
    },
    {
      id: 'tournament',
      title: 'Competitions',
      subtitle: 'Choose a cup or league',
      Icon: Trophy,
      href: '/#tournaments',
      action: onTournament,
    },
  ] as const;
  return (
    <nav
      className="activity-nav"
      aria-label="Choose an activity"
    >
      <div className="activity-switch">
        {items.map(({ id, title, subtitle, Icon, action, href }) => (
        <Link
          prefetch={false}
          key={id}
          href={href}
          className={active === id ? 'is-active' : ''}
          aria-current={active === id ? 'page' : undefined}
          onClick={(event) => openOnPlainClick(event, action)}
        >
          <Icon aria-hidden="true" />
          <span>
            <strong>{title}</strong>
            <small>{subtitle}</small>
          </span>
        </Link>
        ))}
      </div>
      <Link prefetch={false} className={`activity-training ${active === 'training' ? 'is-active' : ''}`} aria-current={active === 'training' ? 'page' : undefined} href="/#training" onClick={(event) => openOnPlainClick(event, onTraining)}>
        <Eye aria-hidden="true" /> Training Ground
      </Link>
    </nav>
  );
}
