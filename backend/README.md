# Backend AROME parapente (V0)

Profil vertical **AROME 0.025°** pour **un point GPS** (Alpes), via **Open-Meteo**
(`models=arome_france` — pas de seamless, pas de HD, pas d’ARPEGE).

T, Td, vent : 2 m + hauteurs 20–200 m AGL + isobares 1000–500 hPa (~5.6 km).
JSON prêt pour un Stüve. Pas d’UI.

Données **Météo-France** via Open-Meteo, [CC BY 4.0](https://open-meteo.com/en/licence)
+ [Licence Ouverte 2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence/).

Le HD 0.01° n’a pas de sondage public (T 2 m, vent ≤ 100 m). Le Stüve utilise
donc le 0.025°.

## Install

```text
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
```

Pas de clé Météo-France. Quota Open-Meteo free : 10k appels/j, non-commercial.

## CLI (Windows, sans activer le venv)

Depuis `backend\` ou la racine du repo :

```text
.\arome.cmd --lat 45.945 --lon 6.71
```

## API

```text
.\serve.cmd
```

```text
http://127.0.0.1:8000/arome?lat=45.945&lon=6.71
http://127.0.0.1:8000/docs
```

`from` / `to` ISO 8601 optionnels. Défaut : J+0 07:00 → J+2 22:00 Europe/Paris.
Premier appel ~1 s ; cache 3 h ensuite.

## Profil

- `h2` : T, Td, HU, vent 10 m
- `h20`…`h200` : T et vent AGL (Td non publié → null)
- `p1000`…`p500` : T, Td, HU, vent, z géopotentiel AMSL
- Fusion : isobare sous le relief ou à < 80 m d’un niveau hauteur → on garde la hauteur
- `cloudBaseM` : premier niveau HU≥90 % ou cloud≥50 %, sinon null
