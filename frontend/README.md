# Frontend — windgram AROME

Vite + React 19 + TypeScript. Tableau **heure × altitude** (style Météo-Parapente) :
flèche (flux) + force km/h, couleur vert → violet.

Le sondage T/Td reste en onglet secondaire.

## Dev

Le backend doit écouter sur `127.0.0.1:8000`. Vite proxifie `/arome` et `/health`.

```text
cd frontend
npm.cmd run dev
```

http://127.0.0.1:5173/?lat=45.945&lon=6.71

## Grille

- Abscisse : heures Europe/Paris (un jour à la fois)
- Ordonnée : 250 m AMSL, interpolé entre les niveaux AROME (pas d’extrapolation)
- Sol : vent 10 m du modèle ; gris = sous le relief
- H / M / B : nébulosité haut / moyen / bas
- Flèche = direction du **flux** (où ça va). Épaisseur ~ force.

## Unités

Vent et rafales en **km/h**. Td AGL 20–200 m non publié : interpolé seulement
entre niveaux qui ont une Td.
