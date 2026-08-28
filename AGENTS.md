# AGENTS.md — Météo parapente

Application 100 % front : Vite + React 19 + TypeScript. Aucun backend.
Les données AROME 0.025° (Météo-France) sont récupérées directement depuis le
navigateur via l'API publique Open-Meteo ; le cache des points vit dans le
`localStorage` de chaque utilisateur (slot 3 h). Déployable en statique
(`frontend/dist/`).

## Commandes

```text
cd frontend
npm run dev       # serveur de dev sur http://127.0.0.1:5173
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npm run e2e       # build + tests Playwright (headless, sans réseau réel)
```

## Règle : toute feature doit être testée

Un travail n'est pas terminé tant qu'il n'est pas couvert par des tests.
Aucun commit avec `npm run lint`, `npm run build` ou `npm run e2e` en échec.

### E2E (obligatoire pour toute feature visible par l'utilisateur)

- Localisation : `frontend/e2e/*.spec.ts`, config `frontend/playwright.config.ts`.
- Runner : `@playwright/test`, serveur `vite preview` démarré automatiquement
  par la config (build de production, pas le serveur de dev).
- Toute feature qui touche l'interface (formulaire de lieu, carte, favoris,
  affichage météo, gestion d'erreurs, cache…) doit avoir au moins un test e2e
  qui vérifie le comportement **vu par l'utilisateur** : URL mise à jour,
  textes affichés, éléments rendus, interactions clavier/souris.
- Réseau : **ne jamais dépendre d'un service réel dans les tests.**
  Utiliser les helpers de `frontend/e2e/mock.ts` :
  - `mockOpenMeteo(page)` — payload AROME généré dynamiquement (72 h depuis
    la date du jour en Europe/Paris), donc déterministe toute l'année ;
    options `status` pour simuler 429/5xx.
  - `mockPhoton(page)` — géocodage / reverse-geocoding.
  - `blockTiles(page)` — à appeler dans `beforeEach` (tuiles OSM bloquées).
- Compter les appels (`const om = await mockOpenMeteo(page)` puis `om.calls()`)
  pour tester le cache et le forçage.
- Chaque test démarre avec un contexte neuf (localStorage vide) : ne pas
  dépendre de l'état d'un autre test.

### Tests unitaires (logique pure)

- La logique non triviale et pure (parsing, maths, fusion de profil,
  gestion de fenêtre horaire…) doit vivre dans des fonctions testables
  (`src/lib/`, `src/api/`) et être couverte par des tests unitaires
  (framework : Vitest, à installer avec `npm i -D vitest` si absent).
- Les composants React restent couverts par les e2e ; ne pas chercher à
  les tester unitairement sauf logique interne complexe.

## Conventions du projet

- Tout en français : interface, messages d'erreur, tests, commits.
- Messages d'erreur : toujours compréhensibles par un utilisateur non
  technique (`friendlyMessage` dans `frontend/src/api/client.ts`), en
  expliquant le fonctionnement (quota Open-Meteo par utilisateur, cache
  local, etc.).
- Clés `localStorage` préfixées `w4p.` (ex. `w4p.favorites.v1`,
  `w4p.arome.cache.v1`) avec suffixe de version.
- Constantes du domaine AROME : lat 37.5–55.4, lon −12→16
  (`AROME_DOMAIN` dans `frontend/src/lib/geocode.ts`).
- Horaires : stockés avec offset Europe/Paris (`2026-08-28T07:00:00+02:00`) ;
  toute la gestion murale Paris est centralisée dans `frontend/src/api/pipeline.ts`.
- Après modification de données : bump la version des clés de cache si le
  format change.

## Structure

```text
frontend/
  src/api/        client Open-Meteo, pipeline (portage du profil Stüve), cache localStorage
  src/components/ SiteForm, PlaceSearch, MapPicker, FavoritesMenu, Windgram, Sounding…
  src/lib/        format/affichage, géocodage, favoris
  e2e/            specs Playwright + helpers de mock
```
