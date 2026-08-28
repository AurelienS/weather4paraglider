# AGENTS.md — Météo parapente

Frontend-only app: Vite + React 19 + TypeScript. No backend.
AROME 0.025° data (Météo-France) is fetched directly from the browser through
the public Open-Meteo API; the point cache lives in each user's `localStorage`
(3 h slot). Deployable as static files (`frontend/dist/`).

## Commands

```text
cd frontend
npm run dev       # dev server on http://127.0.0.1:5173
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npm run e2e       # build + Playwright tests (headless, no real network)
```

## Rule: every feature must be tested

Work is not done until it is covered by tests.
Never commit with failing `npm run lint`, `npm run build` or `npm run e2e`.

### E2E (mandatory for any user-visible feature)

- Location: `frontend/e2e/*.spec.ts`, config `frontend/playwright.config.ts`.
- Runner: `@playwright/test`, with a `vite preview` server started
  automatically by the config (production build, not the dev server).
- Any feature touching the UI (place form, map, favorites, weather display,
  error handling, cache…) must have at least one e2e test asserting the
  **user-visible behavior**: URL updates, displayed texts, rendered elements,
  keyboard/mouse interactions.
- Network: **never depend on a real service in tests.** Use the helpers from
  `frontend/e2e/mock.ts`:
  - `mockOpenMeteo(page)` — AROME payload generated dynamically (72 h from
    today's date in Europe/Paris), so it stays deterministic all year;
    `status` option to simulate 429/5xx.
  - `mockPhoton(page)` — geocoding / reverse geocoding.
  - `blockTiles(page)` — call it in `beforeEach` (OSM tiles blocked).
- Count calls (`const om = await mockOpenMeteo(page)` then `om.calls()`) to
  test caching and forcing.
- Each test starts with a fresh context (empty localStorage): do not rely on
  another test's state.

### Unit tests (pure logic)

- Non-trivial pure logic (parsing, math, profile fusion, time-window
  handling…) must live in testable functions (`src/lib/`, `src/api/`) and be
  covered by unit tests (framework: Vitest — install with
  `npm i -D vitest` if absent).
- React components stay covered by e2e; do not unit-test them unless they
  contain complex internal logic.

## Project conventions

- Everything in English: UI, error messages, tests, commits, docs. French
  place names stay French ("Chamonix-Mont-Blanc", "Puy de Dôme"…).
- Error messages must be understandable by non-technical users
  (`friendlyMessage` in `frontend/src/api/client.ts`), explaining how things
  work (per-user Open-Meteo quota, local cache, etc.).
- `localStorage` keys prefixed `w4p.` (e.g. `w4p.favorites.v1`,
  `w4p.arome.cache.v1`) with a version suffix.
- AROME domain constants: lat 37.5–55.4, lon −12→16
  (`AROME_DOMAIN` in `frontend/src/lib/geocode.ts`).
- Times are stored with the Europe/Paris offset
  (`2026-08-28T07:00:00+02:00`); all Paris wall-clock handling lives in
  `frontend/src/api/pipeline.ts`.
- After changing data shapes: bump the cache-key version if the format
  changes.

## Layout

```text
frontend/
  src/api/        Open-Meteo client, pipeline (Stüve profile port), localStorage cache
  src/components/ SiteForm, PlaceSearch, MapPicker, FavoritesMenu, Windgram, Sounding…
  src/lib/        display/format helpers, geocoding, favorites
  e2e/            Playwright specs + mock helpers
```
