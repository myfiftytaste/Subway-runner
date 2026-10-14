# Métrun

En ligne : https://metrun.vercel.app

Tobias et moi courons les 16 lignes du métro parisien, d'un terminus à
l'autre. Ce site montre où on en est : nos traces GPS en orange Strava, les
lignes restantes en pointillés. En survolant une ligne, sa trace apparaît
seule avec le tracé officiel dessous, et la fiche de la course (distance,
allure, temps).

Site statique, sans framework ni dépendance : `index.html`, `style.css`,
`app.js` et trois fichiers de données. La carte est dessinée en SVG à la main
(projection, recollage des tronçons, animation du tracé). Les chiffres de la
section « En chiffres » sont recalculés au chargement depuis les traces : écart
au tracé officiel, traversées de la Seine (changement de rive d'après les
arrondissements), stations longées à moins de 350 m. Les temps de parcours en
métro viennent de Wikipédia et sont dans `LINES`, en tête de `app.js`.

Le site existe en français et en anglais (bouton FR/EN, ou `#en` dans l'adresse).

## Données

| Fichier | Contenu | Source |
|---|---|---|
| `data/metro-lines.json` | tracés des 16 lignes, en polylines encodées | Île-de-France Mobilités, jeu « Tracés du réseau ferré IDF » |
| `data/paris-fond.json` | arrondissements et voies d'eau | Ville de Paris, open data |
| `data/stations.json` | les 405 arrêts par ligne (nom, position) | Île-de-France Mobilités, jeu « Emplacement des gares IDF » |
| `data/runs.json` | nos courses : date, km, temps, lien Strava, trace GPS | Strava, synchronisé toutes les heures |

Les traces sont simplifiées à 4 m près : les zigzags de la course restent,
la page reste légère (environ 40 Ko de données en tout).

## Synchro Strava

Depuis juin 2026, l'API Strava demande un abonnement payant, et sa politique
limite l'affichage public des données. Le guide
[docs/synchro-strava.md](docs/synchro-strava.md) détaille les deux voies :
export GPX manuel (gratuit, recommandé) ou synchro hebdomadaire via
`.github/workflows/strava.yml` (abonnement requis).

## Ajouter une ligne à la main (GPX)

Utile pour une course enregistrée ailleurs que sur Strava (Coros, par exemple).

1. Exporter le GPX de l'activité (Strava : « … » > Exporter le GPX ; ou l'appli Coros).
2. Lancer :

   ```bash
   python scripts/gpx_to_runs.py 11 Ligne_11.gpx --temps 1:02:30 --strava https://www.strava.com/activities/…
   ```

3. Committer `data/runs.json` et pousser : le site se met à jour tout seul.

## Voir en local

```bash
python -m http.server
```

puis ouvrir http://localhost:8000.

`python scripts/build_preview.py` produit aussi `dist/metrun.html`, une
version tout-en-un (données incluses) qui s'ouvre sans serveur.
