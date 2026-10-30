declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    PLAYTEST_ENABLED?: string;
    VISITOR_TRACKING_ENABLED?: string;
    PLAYTEST_RETENTION_READY?: string;
    PLAYTEST_OWNER_EMAIL?: string;
    PLAYTEST_CONTACT?: string;
    // Enable only after verifying Sites forwards the real Cloudflare visitor IP.
    PLAYTEST_TRUST_CF_IP?: string;
  }
}
interface ImportMeta {
  readonly env: { readonly DEV: boolean };
}
