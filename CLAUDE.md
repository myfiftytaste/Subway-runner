# Métrava : consignes pour Claude

- Pour toute modification de code, applique le skill `ponytail` (niveau full) : le plus petit changement complet, réutiliser l'existant avant d'écrire du neuf.
- Avant un commit ou sur demande de relecture, lance `ponytail-review` sur le diff.
- Réponds en français.
- Site 100 % statique, sans dépendance ni build : ne pas ajouter de framework ou de bundler.
- Ne jamais publier de trace dont le départ ou l'arrivée tombe loin de la ligne (adresse perso possible) : `trim_to_line` dans `scripts/gpx_to_runs.py` s'en charge, toute nouvelle source de traces doit passer par là.
- Les secrets Strava (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN) vivent uniquement dans les secrets GitHub Actions.
