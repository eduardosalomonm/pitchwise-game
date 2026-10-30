import Image from 'next/image';
import { thumbnailPath, type FixtureSummary } from '@/lib/fixture-list';
import { recordVerdict, type MatchRecord } from '@/lib/match-records';
import { TeamName } from '@/app/team-kit';
import { inFixtureOrder, ourSideForRound } from '@/lib/fixture-order';

export function FixtureCard({
  fixture,
  number,
  record,
  selected,
  onSelect,
}: {
  fixture: FixtureSummary;
  number: number;
  record?: MatchRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  const side = ourSideForRound(number - 1);
  const score = record ? inFixtureOrder(record.home, record.away, side).join('–') : '';
  return (
    <button
      type="button"
      className={`fixture-card${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="fixture-card-heading">
        <small>Match Day {number}</small>
        <small className="fixture-venue">{side === 'home' ? 'Home' : 'Away'}</small>
      </span>
      <strong className="fixture-card-title">
        <TeamName name={fixture.opponent} />
      </strong>
      <Image
        unoptimized
        className="fixture-card-cover"
        src={thumbnailPath(fixture.cover)}
        alt=""
        width={256}
        height={256}
        loading="lazy"
      />
      <span className="fixture-card-record">
        {record
          ? `Best: ${score} ${recordVerdict(record).toLowerCase()} · played ${record.plays}×`
          : 'Not played yet'}
      </span>
    </button>
  );
}
