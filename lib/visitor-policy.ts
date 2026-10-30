import { validAlias } from './playtest-policy.ts';

// Friends-only test phase: identified tracking of invited visitors. Keep data bounded.
export const VISITOR_RETENTION_DAYS = 90;
export const VISITOR_REPORT_DAYS = 30;
export const VISITOR_MAX_EVENTS_PER_SESSION = 1_000;
export const VISITOR_DAILY_SESSION_CAP = 3_000;
export const VISITOR_DAILY_EVENT_CAP = 60_000;
export const DEVICE_CLASSES = ['mobile', 'tablet', 'desktop'] as const;
export type DeviceClass = (typeof DEVICE_CLASSES)[number];

type TrackingConfig = {
  VISITOR_TRACKING_ENABLED?: string;
  PLAYTEST_RETENTION_READY?: string;
  PLAYTEST_OWNER_EMAIL?: string;
  PLAYTEST_CONTACT?: string;
  DB?: unknown;
};
// Recording cannot bypass the cleanup/readiness safeguards just because the
// optional consented playtest is switched off.
export function visitorTrackingReady(config: TrackingConfig): boolean {
  return config.VISITOR_TRACKING_ENABLED === 'true' && config.PLAYTEST_RETENTION_READY === 'true' &&
    Boolean(config.DB && config.PLAYTEST_OWNER_EMAIL?.trim() && config.PLAYTEST_CONTACT?.trim());
}

export const deviceClass = (width: number): DeviceClass =>
  width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

/** The name in a personal link such as ?from=Juan — same rules as playtest nicknames. */
export const cleanLabel = (value: unknown): string | null =>
  typeof value === 'string' && validAlias(value.trim()) ? value.trim() : null;
export const cleanLanguage = (value: unknown): string | null =>
  typeof value === 'string' && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2}$/.test(value) ? value : null;
export const cleanReferrer = (value: unknown): string | null =>
  typeof value === 'string' && value.length <= 100 && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)
    ? value.toLowerCase()
    : null;

// Coarse location that Cloudflare attaches to the request. The IP itself is never stored.
export function cleanGeo(cf: unknown) {
  const field = (key: string) => {
    const value = cf && typeof cf === 'object' ? (cf as Record<string, unknown>)[key] : undefined;
    if (typeof value !== 'string') return null;
    const text = value.replace(/[\p{Cc}\p{Cf}]/gu, '').trim().slice(0, 64);
    return text || null;
  };
  return { country: field('country'), region: field('region'), city: field('city'), timezone: field('timezone') };
}
