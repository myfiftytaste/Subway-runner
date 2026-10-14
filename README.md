# Métrava

Tobias et moi courons les 16 lignes du métro parisien, d'un terminus à
l'autre. Ce site montre où on en est : nos traces GPS en orange Strava, les
lignes restantes en pointillés. En survolant une ligne, sa trace apparaît
seule avec le tracé officiel dessous, et la fiche de la course (distance,
allure, temps).

Site statique, sans framework ni dépendance : `index.html`, `style.css`,
`app.js` et trois fichiers de données. La carte est dessinée en SVG à la main
(projection, recollage des tronçons, animation du tracé).

## Données

| Fichier | Contenu | Source |
|---|---|---|
| `data/metro-lines.json` | tracés des 16 lignes, en polylines encodées | Île-de-France Mobilités, jeu « Tracés du réseau ferré IDF » |
| `data/paris-fond.json` | arrondissements et voies d'eau | Ville de Paris, open data |
| `data/runs.json` | nos courses : date, km, temps, lien Strava, trace GPS | Strava, synchronisé toutes les heures |

Les traces sont simplifiées à 4 m près : les zigzags de la course restent,
la page reste légère (environ 40 Ko de données en tout).

## Synchro Strava

`.github/workflows/strava.yml` lance `scripts/strava_sync.py` toutes les
heures : toute activité nommée « Ligne N » (« Ligne 3 bis » aussi) devient la
course de la ligne N, et le commit qui en résulte redéploie le site. Le début
et la fin de chaque trace sont coupés s'ils s'éloignent de plus de 400 m de la
ligne, pour ne jamais publier un départ depuis chez soi.

Mise en place, une seule fois :

1. Créer une appli sur https://www.strava.com/settings/api (« Site web » et
   « Domaine du rappel d'autorisation » : `localhost`).
2. Ouvrir, en remplaçant `CLIENT_ID` :
   `https://www.strava.com/oauth/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http://localhost&approval_prompt=force&scope=activity:read_all`
   puis copier le `code=` de l'adresse où l'on atterrit.
3. Échanger ce code contre un refresh token :

   ```bash
   curl -X POST https://www.strava.com/oauth/token -d client_id=CLIENT_ID -d client_secret=CLIENT_SECRET -d code=CODE -d grant_type=authorization_code
   ```

4. Dans le dépôt GitHub, Settings > Secrets and variables > Actions, créer
   `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` et `STRAVA_REFRESH_TOKEN`.
5. Lancer le workflow une fois à la main (onglet Actions > Synchro Strava > Run workflow).

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

`python scripts/build_preview.py` produit aussi `dist/metrava.html`, une
version tout-en-un (données incluses) qui s'ouvre sans serveur.
