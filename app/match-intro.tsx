import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fixtureList, type FixtureSummary } from '@/lib/fixture-list';
import type { MatchRecords } from '@/lib/match-records';
import { FixtureCard } from '@/app/fixture-card';
import { MatchKits } from '@/app/team-kit';
import { ActivityNav } from '@/app/activity-nav';
import { HOME_TEAM, getTeam } from '@/lib/teams';
import { inFixtureOrder, ourSideForRound } from '@/lib/fixture-order';

export function MatchIntro({
  fixture,
  matchRecords,
  onSelectFixture,
  onKickOff,
  onTraining,
  onTournament,
}: {
  fixture: FixtureSummary;
  matchRecords: MatchRecords;
  onSelectFixture: (id: string) => void;
  onKickOff: () => void;
  onTraining: () => void;
  onTournament: () => void;
}) {
  const side = ourSideForRound(fixtureList.indexOf(fixture));
  const [left, right] = inFixtureOrder(HOME_TEAM.name, fixture.opponent!, side);
  return (
    <section className="match-intro mx-auto w-full max-w-6xl px-5 pb-20 pt-6 sm:px-8 sm:pt-12">
      <ActivityNav
        active="matches"
        onTraining={onTraining}
        onMatches={() => {}}
        onTournament={onTournament}
      />
      <div className="match-intro-grid">
        <div className="match-intro-copy">
          <p className="eyebrow">Match Day</p>
          <h1>Choose your opponent.</h1>
          <div className="fixture-list">
            {fixtureList.map((item, index) => (
              <FixtureCard
                key={item.id}
                fixture={item}
                number={index + 1}
                record={matchRecords[item.id]}
                selected={item.id === fixture.id}
                onSelect={() => onSelectFixture(item.id)}
              />
            ))}
          </div>
          <div className="kickoff-bar">
            <span>
              <small>Match Day {fixtureList.indexOf(fixture) + 1}</small>
              <strong>{fixture.opponent}</strong>
            </span>
            <Button
              className="h-12 rounded-full px-6 text-base"
              onClick={onKickOff}
            >
              Kick off <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="match-card-stack" aria-label="Selected opponent">
          <div className="match-ticket">
            <span>PITCHWISE</span>
            <strong>
              {left} <b>vs</b> {right}
            </strong>
            <MatchKits opponent={getTeam(fixture.opponent!)} ourSide={side} />
          </div>
        </div>
      </div>
    </section>
  );
}
