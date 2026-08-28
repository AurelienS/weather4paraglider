# Météo parapente

Frontend-only app — Vite + React 19 + TypeScript. No backend.
AROME 0.025° data (Météo-France) is fetched directly from the browser through
the public Open-Meteo API; the point cache lives in each user's `localStorage`
(3 h slot). Deployable as static files (`frontend/dist/`).

Features: T/Td + wind windgram, Stüve sounding, place search, map picker,
favorites.

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
