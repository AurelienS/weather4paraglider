# Frontend — Weather4Paragliding (w4p)

Vite + React 19 + TypeScript, no backend. See the root
[README](../README.md) for the project overview.

## Dev

```text
cd frontend
npm install
npm run dev
```

http://127.0.0.1:5173/?lat=45.945&lon=6.71

## Windgram grid

- X axis: Europe/Paris hours (one day at a time)
- Y axis: 250 m AMSL steps, interpolated between model levels (no extrapolation)
- Ground row: model 10 m wind; grey = below terrain
- H / M / L: high / mid / low cloud cover
- Arrow = direction the **flow** is going; thickness ~ speed

## Units

Wind and gusts in **km/h**. AGL Td above 2 m is not published by
Open-Meteo: it is only interpolated between levels that carry a Td.
