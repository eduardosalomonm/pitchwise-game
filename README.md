# Pitchwise

A mobile-first football decision game: tactical training, standalone matches, cups, custom tournaments, and leagues.

[Play the game](https://pitchwise.eilvi.com/) · [Case study](https://eduardosalomon.eilvi.com/projects/the-invisible-game) · [Portfolio](https://eduardosalomon.eilvi.com/)

> **Public source edition.** Pitchwise was developed in a private repository between September and October 2026 (39 commits). This repository is a curated snapshot of that work, without original working assets.

![Pitchwise gameplay screenshot](https://raw.githubusercontent.com/eduardosalomonm/eduardosalomonm/main/assets/pitchwise.webp)

## Engineering focus

- Tactical decision scenarios across eleven football positions and 55 lessons.
- Match graphs, single-award decisions, cups, custom tournaments, and leagues.
- Local progress with protection against competing tabs overwriting a session.
- Responsive match controls, guided explanations, and optional server-side playtest tools.

## Run locally

Use Node.js 22.13 or newer (Node 24 LTS recommended).

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Open the local URL printed by the development server. No production credentials are needed. Keep the server running while playing.

## Verification

```sh
npm run check
npm run lint
npm run build
```

Browser suites require Playwright and a running local preview. See the scripts in `package.json` for the available gameplay and integration checks.

## Project layout

- `app/` — interfaces, routes, and interaction.
- `lib/` — game rules, state, persistence, and supporting logic.
- `tests/` — domain checks and regression coverage.
- `public/` — bundled public assets.

## Scope

Gameplay works without an account. The optional collector and private reports are disabled by default; no live database, owner identity, or visitor records are included. Local integration scripts use isolated fixtures and databases.

This public source edition is based on the published v46 snapshot (`e8a67a9`). Deployment identity and internal handoff notes are excluded. Local Vite configuration uses generic bindings. This repository is independent of the hosted game's deployment.
