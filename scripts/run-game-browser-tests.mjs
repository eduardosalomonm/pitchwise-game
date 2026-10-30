import { spawn } from 'node:child_process';
import { previewOrigin, runBrowserTasks } from './browser-test-support.mjs';

// Keep E2E separate from the fast unit suite. Every gameplay script blocks telemetry.
previewOrigin();
const scripts = [
  'test-activity-navigation-browser',
  'test-match-browser',
  'test-my-tournament-browser',
  'test-tournament-browser',
  'test-training-browser',
  'test-visitor-browser',
  'test-my-shootout-browser',
  'test-league-browser',
  'test-first-match-browser',
  'test-match-lead-ins-browser',
  'test-compact-play-browser',
  'test-compact-menus-browser',
  'test-post-match-browser',
  'test-audit-regressions-browser',
];
const jobs = Number(process.env.BROWSER_TEST_JOBS ?? 3);
const started = performance.now();
const results = await runBrowserTasks(
  scripts,
  (name) =>
    new Promise((resolve, reject) => {
      const started = performance.now();
      const child = spawn(
        process.execPath,
        ['--experimental-strip-types', `scripts/${name}.mjs`],
        { stdio: 'inherit', env: process.env },
      );
      child.on('error', reject);
      child.on('exit', (code, signal) => {
        const seconds = ((performance.now() - started) / 1000).toFixed(1);
        console.log(`${name}: ${code === 0 ? 'PASS' : 'FAIL'} (${seconds}s)`);
        resolve({ name, code, signal });
      });
    }),
  jobs,
);
const failed = results.filter((r) => r.code !== 0);
if (failed.length) {
  console.error('Failed browser checks:', failed);
  process.exitCode = 1;
} else
  console.log(
    `PASS: all ${scripts.length} isolated browser suites (${jobs} jobs, ${((performance.now() - started) / 1000).toFixed(1)}s total).`,
  );
