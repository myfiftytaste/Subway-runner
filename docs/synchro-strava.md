# Récupérer les courses automatiquement depuis Strava : est-ce faisable gratuitement ?

*Vérifié le 14 octobre 2026.*

## En bref

**Non, pas avec un compte Strava gratuit.** Depuis le 1er juin 2026, toute
application qui utilise l'API Strava (même un petit script perso qui ne lit
que vos propres courses) doit appartenir à un compte avec un abonnement
Strava actif. Pour les comptes déjà développeurs, l'obligation s'applique
depuis le 30 juin 2026. Aux États-Unis, l'abonnement coûte 11,99 $ par mois
ou 79,99 $ par an.

**Même en payant, la synchro automatique pose problème pour un site public.**
La politique de l'API Strava, en vigueur depuis le 1er juin 2026, contient deux règles qui
visent exactement ce que fait Métrun :

- section 2.3 : les données Strava d'un utilisateur ne peuvent être montrées
  dans l'application **qu'à cet utilisateur**. Un site ouvert aux recruteurs
  montre vos données à d'autres personnes ;
- section 6.2 : les données Strava ne doivent pas rester **plus de 7 jours**
  en cache. `data/runs.json` garde les traces indéfiniment.

**La voie propre et gratuite : l'export manuel.** Exporter le GPX de ses
propres activités depuis le site Strava ne passe pas par l'API. Ce sont vos
données, que vous publiez vous-même. C'est ce que fait déjà
`scripts/gpx_to_runs.py`. Comme une nouvelle ligne tombe au mieux une fois
par semaine, comptez deux minutes par course.

## Option 1 (recommandée, gratuite) : export GPX à chaque nouvelle ligne

1. Sur strava.com (l'export n'existe pas dans l'appli mobile), ouvrir
   l'activité « Ligne 11 ».
2. Cliquer sur « … » (à gauche de l'activité), puis « Exporter le GPX ».
3. Noter le temps de déplacement affiché sur l'activité (ex. 1:02:30).
4. Dans le dossier du projet :

   ```bash
   python scripts/gpx_to_runs.py 11 ~/Downloads/Ligne_11.gpx --temps 1:02:30 --strava https://www.strava.com/activities/…
   ```

   Le script coupe le début et la fin de la trace s'ils s'éloignent de plus
   de 400 m de la ligne (pas d'adresse perso en ligne), puis la simplifie.
5. Committer `data/runs.json` et pousser : Vercel redéploie le site.

Pour récupérer d'un coup les temps des lignes 1 à 8 : Paramètres > Mon compte
> « Télécharger ou supprimer votre compte » > « Demander une archive ». Strava
envoie par e-mail une archive avec `activities.csv` (temps de déplacement de
chaque activité) et les fichiers d'origine.

Une course enregistrée avec la Coros se traite pareil : export GPX depuis
l'appli Coros, même commande.

## Option 2 : synchro automatique hebdomadaire (abonnement payant)

Le dépôt contient déjà tout : `scripts/strava_sync.py` et
`.github/workflows/strava.yml`, programmé **chaque lundi à 6 h 17 UTC**
(8 h 17 à Paris en été). Avant de l'activer, relisez les sections 2.3 et 6.2
de la [politique de l'API](https://www.strava.com/legal/api_policy) : publier
les traces sur un site public semble les contredire, abonnement ou pas.

Si vous décidez d'y aller :

1. Avoir un abonnement Strava actif sur le compte qui crée l'application.
2. Créer l'application sur https://www.strava.com/settings/api
   (« Site web » et « Domaine du rappel d'autorisation » : `localhost`).
   Une nouvelle application est limitée à 1 athlète, ce qui suffit.
3. Ouvrir, en remplaçant `CLIENT_ID` :
   `https://www.strava.com/oauth/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http://localhost&approval_prompt=force&scope=activity:read_all`
   puis copier le `code=` de l'adresse où l'on atterrit (la page elle-même
   ne s'affiche pas, c'est normal).
4. Échanger ce code contre un refresh token :

   ```bash
   curl -X POST https://www.strava.com/oauth/token -d client_id=CLIENT_ID -d client_secret=CLIENT_SECRET -d code=CODE -d grant_type=authorization_code
   ```

5. Dans le dépôt GitHub : Settings > Secrets and variables > Actions, créer
   `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` et `STRAVA_REFRESH_TOKEN`.
6. Onglet Actions > « Synchro Strava » > « Run workflow » pour un premier essai.

Ce qu'il faut savoir :

- **Quotas** : 100 lectures par quart d'heure et 1 000 par jour. Une synchro
  consomme environ 6 appels, plus 1 par nouvelle course : très loin du plafond.
- **GitHub met en pause les tâches programmées** d'un dépôt public après
  60 jours sans activité. Si vous ne courez pas de ligne pendant deux mois,
  aucun commit n'a lieu et la synchro s'arrête. Il suffit de la réactiver
  dans l'onglet Actions.
- **Le refresh token** est lu depuis les secrets et jamais réécrit. Si Strava
  en renvoie un nouveau, le journal du workflow l'indique : mettre à jour le
  secret à la main.

## Le bouton « Flux live Strava »

Avec l'option 1, les données ne sont plus « live » : elles changent quand vous
poussez un export. Un intitulé fidèle évite une question gênante en entretien,
par exemple « Nos courses sur Strava » avec le voyant, et la date de dernière
course déjà affichée sous les chiffres.

## Sources

- [Strava, API Policy](https://www.strava.com/legal/api_policy) (en vigueur au 1er juin 2026)
- [Strava, Rate Limits](https://developers.strava.com/docs/rate-limits/)
- [heise : l'API Strava réservée aux abonnés](https://www.heise.de/en/news/Strava-API-access-only-with-paid-subscription-in-the-future-11315017.html)
- [Apps for Strava : prix et calendrier 2026](https://appsforstrava.com/blog/strava-developer-program-changes-2026)
- [GitHub Docs : tâches programmées désactivées après 60 jours](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows)
