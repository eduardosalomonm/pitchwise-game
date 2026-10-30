import app from 'vinext/server/fetch-handler';
import { purgeExpiredPlaytests } from './db/index';

const worker = {
  ...app,
  async scheduled(_controller: ScheduledController, bindings: Cloudflare.Env) {
    if (!bindings.DB)
      throw new Error('Playtest cleanup requires the DB binding.');
    try {
      await purgeExpiredPlaytests(bindings.DB);
    } catch (cause) {
      // Cleanup only executes constant expiry queries, never visitor payloads.
      console.error(
        'Playtest cleanup failed',
        cause instanceof Error ? cause.message : 'Storage unavailable',
      );
      throw cause;
    }
  },
};
export default worker;
