"""Met à jour data/runs.json depuis Strava : toute activité nommée « Ligne N » devient la course de la ligne N.

Lancé toutes les heures par .github/workflows/strava.yml. Variables d'environnement :
STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN (portée activity:read_all).
"""
import json
import os
import re
import urllib.parse
import urllib.request

from gpx_to_runs import LINES, RUNS, simplify, trim_to_line
from polyline import encode

API = "https://www.strava.com/api/v3"
NAME = re.compile(r"^\s*ligne\s+(\d{1,2})\s*(bis)?\b", re.I)


def line_of(name):
    """« Ligne 3 ! » → "3", « ligne 7 bis » → "7bis", « Evening Run » → None."""
    m = NAME.match(name or "")
    lid = m and m.group(1) + (m.group(2) or "").lower()
    return lid if lid in LINES else None


def call(url, token=None, form=None):
    data = urllib.parse.urlencode(form).encode() if form else None
    req = urllib.request.Request(url, data=data)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def main():
    auth = call("https://www.strava.com/oauth/token", form={
        "client_id": os.environ["STRAVA_CLIENT_ID"],
        "client_secret": os.environ["STRAVA_CLIENT_SECRET"],
        "grant_type": "refresh_token",
        "refresh_token": os.environ["STRAVA_REFRESH_TOKEN"],
    })
    # shortcut: le refresh token est lu dans les secrets GitHub et jamais réécrit ; si Strava en renvoie un autre, mettre à jour le secret à la main
    if auth.get("refresh_token") not in (None, os.environ["STRAVA_REFRESH_TOKEN"]):
        print("::warning::Strava a renvoyé un nouveau refresh token : mettez à jour le secret STRAVA_REFRESH_TOKEN.")
    token = auth["access_token"]

    # La liste arrive de la plus récente à la plus ancienne : on garde la dernière course de chaque ligne
    latest, page = {}, 1
    while acts := call(f"{API}/athlete/activities?per_page=100&page={page}", token):
        for a in acts:
            lid = line_of(a["name"])
            if lid and a.get("sport_type", a.get("type")) in ("Run", "TrailRun") and lid not in latest:
                latest[lid] = a
        page += 1

    runs = json.loads(RUNS.read_text(encoding="utf-8"))
    changed = []
    for lid, a in sorted(latest.items()):
        url = f"https://www.strava.com/activities/{a['id']}"
        old = runs.get(lid, {})
        if old.get("strava") == url and old.get("time"):
            continue  # déjà à jour : pas d'appel de plus
        streams = call(f"{API}/activities/{a['id']}/streams?keys=latlng&key_by_type=true", token)
        pts = trim_to_line([(lng, lat) for lat, lng in streams.get("latlng", {}).get("data", [])], lid)
        if len(pts) < 2:
            print(f"Ligne {lid} : trace absente ou trop loin de la ligne, ignorée ({url}).")
            continue
        runs[lid] = {
            "date": a["start_date_local"][:10],
            "km": round(a["distance"] / 1000, 2),
            "time": a["moving_time"],
            "strava": url,
            "trace": encode(simplify(pts)),
        }
        changed.append(lid)

    if changed:
        RUNS.write_text(json.dumps(runs, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Lignes mises à jour : {', '.join(changed) or 'aucune'}.")


if __name__ == "__main__":
    main()
