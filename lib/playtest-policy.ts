export const CONSENT_VERSION = '2026-10-02-v1';
export const RETENTION_DAYS = 30;
export const MAX_EVENTS_PER_SESSION = 1_000;
export const MAX_BATCH_EVENTS = 20;
export const MAX_BODY_BYTES = 32_768;

export function validAlias(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value === value.trim() &&
    Array.from(value).length >= 1 &&
    Array.from(value).length <= 24 &&
    !/[\p{Cc}\p{Cf}@]/u.test(value) &&
    !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) &&
    !(value.includes(':') && /^[0-9a-f:]+$/i.test(value))
  );
}
export function isPlaytestOwner(
  email: string | null,
  allowed: string | undefined,
): boolean {
  return Boolean(
    email &&
    allowed?.trim() &&
    email.trim().toLowerCase() === allowed.trim().toLowerCase(),
  );
}
export function randomAlias() {
  const adjectives = ['Calm', 'Clever', 'Quick', 'Curious', 'Bright', 'Bold'];
  const roles = ['Winger', 'Keeper', 'Captain', 'Scout', 'Playmaker', 'Reader'];
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  return `${adjectives[bytes[0] % adjectives.length]} ${roles[bytes[1] % roles.length]} ${10 + (bytes[2] % 90)}`;
}
// The collector calls this only with Cloudflare request metadata AND a verified
// deployment flag. No X-Forwarded-For, browser-submitted IP or localhost guess.
export function trustedVisitorIp(
  headers: Headers,
  trusted: boolean,
): string | null {
  if (!trusted || headers.has('cf-worker')) return null;
  // Do not accept a supplementary IPv6 header without an independently
  // verified Pseudo IPv4 edge contract. The primary header supports IPv6 too.
  const value = headers.get('cf-connecting-ip');
  if (!value || value === '2a06:98c0:3600::103') return null;
  const v4 =
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) &&
    value.split('.').every((part) => Number(part) <= 255);
  let v6 = false;
  try {
    v6 =
      value.includes(':') &&
      new URL(`http://[${value}]/`).hostname.startsWith('[');
  } catch {
    /* Invalid address. */
  }
  if (v4 && Number(value.split('.')[0]) >= 240) return null; // Pseudo IPv4 is not a visitor address.
  return v4 || v6 ? value : null;
}
export async function hashToken(token: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
