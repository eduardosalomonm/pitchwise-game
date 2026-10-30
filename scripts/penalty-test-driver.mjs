import { PENALTY_ZONES, takePenalty } from '../lib/tournament.ts';
import { checkOptionalReading } from './browser-test-support.mjs';

// Test-only search over the resolver. Never parse a tell as a guaranteed target.
export function planPenaltyPair(state, gameId, seed, scored, rivalScored) {
  for (let shot = 0; shot < PENALTY_ZONES.length; shot++)
    for (let dive = 0; dive < PENALTY_ZONES.length; dive++) {
      const next = takePenalty(state, shot, gameId, seed, dive);
      const kick = next.history.at(-1);
      if (next !== state && kick.scored === scored && kick.rivalScored === rivalScored)
        return { shot, dive, next };
    }
  throw new Error(`No matching penalty pair for ${gameId}/${state.kicks}`);
}

export async function playPenaltyPair(page, plan) {
  if (plan.next.kicks === 1) await checkOptionalReading(page);
  await page.getByRole('button', { name: `Shoot ${PENALTY_ZONES[plan.shot].label}`, exact: true }).click();
  await page.getByRole('button', { name: `Save ${PENALTY_ZONES[plan.dive].label}`, exact: true }).waitFor();
  if (plan.next.kicks === 1) await checkOptionalReading(page);
  await page.getByRole('button', { name: `Save ${PENALTY_ZONES[plan.dive].label}`, exact: true }).click();
  await page.locator('.penalty-next, .cup-result-actions').waitFor();
}
