import { useId } from 'react';
import { useHomeTeam } from '@/app/home-team';
import { inFixtureOrder, type OurSide } from '@/lib/fixture-order';
import {
  getTeam,
  kitDescription,
  matchKits,
  type TeamKit,
  type TeamIdentity,
} from '@/lib/teams';

export function KitPattern({ id, kit }: { id: string; kit: TeamKit }) {
  return (
    <pattern
      id={id}
      width="1"
      height="1"
      patternContentUnits="objectBoundingBox"
    >
      <rect width="1" height="1" fill={kit.primary} />
      {kit.pattern === 'stripes' &&
        [0.12, 0.37, 0.62, 0.87].map((x) => (
          <rect key={x} x={x} width=".12" height="1" fill={kit.secondary} />
        ))}
      {kit.pattern === 'hoops' &&
        [0.13, 0.4, 0.67].map((y) => (
          <rect key={y} y={y} width="1" height=".13" fill={kit.secondary} />
        ))}
      {kit.pattern === 'sash' && (
        <path
          d="M-.2,0 H.1 L1,1 H.7 Z M.9,0 H1.2 L1,.3 Z"
          fill={kit.secondary}
        />
      )}
      {kit.pattern === 'halves' && (
        <rect x=".5" width=".5" height="1" fill={kit.secondary} />
      )}
      {kit.pattern === 'solid' && (
        <path d="M0,0 H1 V.12 H0 Z M0,.87 H1 V1 H0 Z" fill={kit.secondary} />
      )}
    </pattern>
  );
}

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Patterned inline SVG needs an image role. */
export function KitSwatch({
  team,
  kit,
  className = '',
}: {
  team: TeamIdentity;
  kit?: TeamKit;
  className?: string;
}) {
  const id = `kit-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  // Inline SVG retains its patterned fill and exposes the kit through an image role.
  return (
    <svg
      className={`kit-swatch ${className}`}
      viewBox="0 0 44 48"
      role="img"
      aria-label={`${team.name} kit: ${kitDescription(kit ?? team.kit)}`}
    >
      <defs>
        <KitPattern id={id} kit={kit ?? team.kit} />
      </defs>
      <path
        d="M14 5 L5 10 L1 20 L10 24 L12 19 V43 H32 V19 L34 24 L43 20 L39 10 L30 5 Q22 12 14 5 Z"
        fill={`url(#${id})`}
        stroke="#172d38"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M15 5 Q22 12 29 5"
        fill="none"
        stroke="#172d38"
        strokeWidth="2"
      />
    </svg>
  );
}
/* oxlint-enable jsx-a11y/prefer-tag-over-role */

export function TeamName({
  name,
  short = false,
}: {
  name: string;
  short?: boolean;
}) {
  const home = useHomeTeam();
  // The player's own club in My Tournament is not part of the fixed registry.
  const team = name === home.name ? home : getTeam(name);
  return (
    <span className="team-name">
      <KitSwatch team={team} />
      <span>{short ? team.shortName : team.name}</span>
    </span>
  );
}

export function MatchKits({ opponent, ourSide = 'home' }: { opponent: TeamIdentity; ourSide?: OurSide }) {
  const home = useHomeTeam();
  const kits = matchKits(opponent, home);
  const ordered = inFixtureOrder({ team: home, kit: kits.home }, { team: opponent, kit: kits.away }, ourSide);
  return (
    <div className="match-kit-lineup" aria-label="Match kits">
      {ordered.map(({ team, kit }) => <span key={team.id}><KitSwatch team={team} kit={kit} />{team.name}</span>)}
    </div>
  );
}

/** One matchup heading, with the same clash-safe kits used on the pitch. */
export function FixtureTeams({ opponent, ourSide = 'home' }: { opponent: TeamIdentity; ourSide?: OurSide }) {
  const home = useHomeTeam();
  const kits = matchKits(opponent, home);
  const [first, second] = inFixtureOrder({ team: home, kit: kits.home }, { team: opponent, kit: kits.away }, ourSide);
  return <>
    <span className="team-name"><KitSwatch team={first.team} kit={first.kit} /><span>{first.team.name}</span></span>
    {' '}<span className="fixture-vs">vs</span>{' '}
    <span className="team-name"><KitSwatch team={second.team} kit={second.kit} /><span>{second.team.name}</span></span>
  </>;
}
