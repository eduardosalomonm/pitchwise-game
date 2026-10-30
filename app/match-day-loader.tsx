import { matchFixtures } from '@/lib/match-fixtures';
import { MatchDay } from '@/app/match-day';
import type { ComponentProps } from 'react';

// Loaded on demand from the home page, so the fifteen match graphs stay out of the first visit.
export function StandaloneMatch({ fixtureId, ...props }: Omit<ComponentProps<typeof MatchDay>, 'fixture'> & { fixtureId: string }) {
  return <MatchDay {...props} fixture={matchFixtures.find((item) => item.id === fixtureId)!} />;
}
