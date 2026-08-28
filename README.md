# Weather4Paragliding (w4p)

Frontend-only app — Vite + React 19 + TypeScript. No backend.
Weather model data (Météo-France AROME/ARPEGE, MeteoSwiss ICON-CH1, DWD
ICON-D2, DMI HARMONIE) is fetched directly from the browser through the
public Open-Meteo API (`/v1/meteofrance` and `/v1/forecast`); the point cache
lives in each user's `localStorage` (3 h slot, 1 h for the 15-min nowcast).
Models differ in resolution and forecast window (2–5 days, displayed
07:00–22:00) — the catalog is `MODELS` in `frontend/src/api/models.ts`.
Several models only cover part of Europe: when Open-Meteo has no data for a
point, the user gets an explicit "no data for this location — pick another
model" message. Deployable as static files (`frontend/dist/`).

Features: T/Td + wind windgram, Stüve sounding, place search, map picker,
favorites, model selection.

## Development

```text
cd frontend
npm install
npm run dev
```

http://127.0.0.1:5173/?lat=45.945&lon=6.71

## Static build

```text
cd frontend
npm run build
npm run preview
```

## E2E tests (Playwright)

Open-Meteo and geocoding are mocked: tests are deterministic and need no
network access (OSM tiles blocked).

```text
cd frontend
npm run e2e
```

No backend: the `dist/` folder can be hosted on any static hosting.
Data: Météo-France AROME via Open-Meteo (CC BY 4.0); the Open-Meteo quota is
consumed per visitor (per IP).
