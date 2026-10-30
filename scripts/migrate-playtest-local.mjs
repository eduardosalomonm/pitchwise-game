import { cp, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const config = resolve(root, 'dist/server/wrangler.json');
await access(config); // Build first; never silently create a remote configuration.
await cp(resolve(root, 'drizzle'), resolve(root, 'dist/server/drizzle'), {
  recursive: true,
});
const result = spawnSync(
  process.execPath,
  [
    resolve(root, 'node_modules/wrangler/bin/wrangler.js'),
    'd1',
    'migrations',
    'apply',
    'DB',
    '--local',
    '--config',
    config,
    '--persist-to',
    resolve(root, '.wrangler/state'),
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: 'false',
      WRANGLER_LOG_PATH: resolve(root, '.wrangler/logs'),
      WRANGLER_WRITE_LOGS: 'false',
    },
  },
);
process.exit(result.status ?? 1);
