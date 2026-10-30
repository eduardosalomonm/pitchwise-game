import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeamName } from '@/app/team-kit';
import { activeLeagueGame, leagueHeadline, leagueOpponent, leagueTable, type League } from '@/lib/league';

export function LeagueRecap({ before, after, onNext, onOverview }: {
  before: League; after: League; onNext: () => void; onOverview: () => void;
}) {
  const table = leagueTable(after), previous = leagueTable(before);
  const position = table.findIndex((row) => row.team === after.config.name);
  const oldPosition = previous.findIndex((row) => row.team === after.config.name);
  const row = table[position], moved = oldPosition - position;
  const next = activeLeagueGame(after), finished = after.status === 'finished';
  return <section className="competition-recap league-recap" aria-label="League summary">
    <dl className="recap-stats">
      <div><dt>League position</dt><dd>{position + 1} / {after.config.size}</dd></div>
      <div><dt>Points</dt><dd>{row.points}</dd></div>
      <div><dt>Movement</dt><dd>{moved > 0 ? `↑ ${moved}` : moved < 0 ? `↓ ${-moved}` : '—'}</dd></div>
    </dl>
    <p className="recap-status">{leagueHeadline(after)}</p>
    {!finished && <div className="round-next">
      <h2>Next up · Matchweek {after.round + 1}</h2>
      {next ? <TeamName name={leagueOpponent(after, next)} /> : <p>Our rest week. The other clubs play.</p>}
    </div>}
    <div className="cup-result-actions">
      {!finished && <Button className="cup-kickoff" onClick={onNext}>{next ? 'Play next match' : 'Advance rest week'} <ArrowRight /></Button>}
      <Button className="cup-kickoff" variant={finished ? 'default' : 'outline'} onClick={onOverview}>View full league</Button>
    </div>
  </section>;
}
