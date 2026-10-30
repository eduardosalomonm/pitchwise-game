import { env } from 'cloudflare:workers';
import { playtestEnabled, privateJson } from '@/lib/playtest-server';
import { CONSENT_VERSION, RETENTION_DAYS } from '@/lib/playtest-policy';
import { visitorTrackingEnabled } from '@/lib/visitor-server';
export const dynamic = 'force-dynamic';
export function GET() {
  return privateJson({
    enabled: playtestEnabled(),
    visitorTracking: visitorTrackingEnabled(),
    consentVersion: CONSENT_VERSION,
    retentionDays: RETENTION_DAYS,
    contact: env.PLAYTEST_CONTACT || 'Contact the person who shared this test.',
  });
}
