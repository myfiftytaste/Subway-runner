# Stravatp

Je cours les 16 lignes du métro parisien, d'un terminus à l'autre. Ce site
montre où j'en suis : mes traces GPS en orange Strava, posées sur les tracés
officiels des lignes pour comparer les deux, et les lignes restantes en
pointillés.

Site statique, sans framework ni dépendance : `index.html`, `style.css`,
`app.js` et trois fichiers de données. La carte est dessinée en SVG à la main
(projection, recollage des tronçons, animation du tracé).

## Données

| Fichier | Contenu | Source |
|---|---|---|
| `data/metro-lines.json` | tracés des 16 lignes, en polylines encodées | Île-de-France Mobilités, jeu « Tracés du réseau ferré IDF » |
| `data/paris-fond.json` | arrondissements et voies d'eau | Ville de Paris, open data |
| `data/runs.json` | mes courses : date, km, lien Strava, trace GPS | Strava |

Les traces sont simplifiées à 4 m près : les zigzags de la course restent,
la page reste légère (environ 40 Ko de données en tout).

## Ajouter une ligne courue

1. Exporter le GPX de l'activité (Strava : « … » > Exporter le GPX ; ou l'appli Coros).
2. Lancer :

   ```bash
   python scripts/gpx_to_runs.py 11 Ligne_11.gpx --strava https://www.strava.com/activities/…
   ```

3. Committer `data/runs.json` et pousser : le site se met à jour tout seul.

## Voir en local

```bash
python -m http.server
```

puis ouvrir http://localhost:8000.

`python scripts/build_preview.py` produit aussi `dist/stravatp.html`, une
version tout-en-un (données incluses) qui s'ouvre sans serveur.
