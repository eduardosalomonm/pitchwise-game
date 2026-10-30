# Technical notes

Pitchwise separates tactical content and game rules (`lib/`) from React interfaces (`app/`). Both cups and league content are loaded on demand.

## Local verification

Run `npm run check`, `npm run lint`, and `npm run build`. For browser checks, install Playwright separately, start the preview, and set `PLAYWRIGHT_MODULE` if it is not on the normal module resolution path.

Optional local integration checks are `npm run test:d1`, `npm run test:http`, and `npm run test:cleanup`. They exercise fixtures and isolated local storage. Do not use production credentials or databases for these checks.

## Optional reports

Collectors are off by default. `.dev.vars.example` contains placeholder configuration only. The game does not need reports enabled to run. Source includes the collector and cleanup logic for review; activating a production collector requires separately configuring storage, authentication, privacy disclosures, and a verified retention schedule.

See [league.md](league.md) for the league model and [the main README](../README.md) for scope and setup.
