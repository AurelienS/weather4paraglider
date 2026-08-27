# Météo parapente

- `backend/` — API FastAPI, profil AROME 0.025° (Open-Meteo)
- `frontend/` — Vite + React + TypeScript, sondage T/Td + vent

## Backend

```text
backend\serve.cmd
backend\arome.cmd --lat 45.945 --lon 6.71
```

http://127.0.0.1:8000/docs

## Frontend

```text
cd frontend
npm.cmd run dev
```

http://127.0.0.1:5173/?lat=45.945&lon=6.71

Le dev server proxifie `/arome` vers `:8000`.
