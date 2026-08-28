# Météo parapente

Application 100 % front — Vite + React + TypeScript. Profil AROME 0.025°
(Météo-France) via l'API publique Open-Meteo, appelée directement depuis le
navigateur. Cache des points dans le `localStorage` (slot 3 h).

Windgram T/Td + vent, sondage Stüve, recherche de lieu, carte, favoris.

## Dev

```text
cd frontend
npm install
npm run dev
```

http://127.0.0.1:5173/?lat=45.945&lon=6.71

## Build statique

```text
cd frontend
npm run build
npm run preview
```

Aucun backend : le dossier `dist/` est déployable sur n'importe quel
hébergement statique. Données : Météo-France AROME via Open-Meteo (CC BY 4.0),
quota Open-Meteo consommé par visiteur (par IP).
