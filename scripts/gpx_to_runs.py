"""Ajoute ou remplace une course dans data/runs.json à partir d'un fichier GPX.

Usage :
    python scripts/gpx_to_runs.py <ligne> <fichier.gpx> [--strava URL] [--temps H:MM:SS]

Exemple :
    python scripts/gpx_to_runs.py 11 ~/Downloads/Ligne_11.gpx --strava https://www.strava.com/activities/123

Le GPX s'exporte depuis Strava (activité > « … » > Exporter le GPX) ou depuis
l'appli Coros. Le début et la fin de trace loin de la ligne sont coupés (pas
d'adresse perso en ligne), puis la trace est simplifiée à 4 m près.
"""
import argparse
import json
import math
import pathlib
import sys
import xml.etree.ElementTree as ET

from polyline import decode, dist_km, encode

LINES = {"1", "2", "3", "3bis", "4", "5", "6", "7", "7bis", "8", "9", "10", "11", "12", "13", "14"}
DATA = pathlib.Path(__file__).resolve().parent.parent / "data"
RUNS = DATA / "runs.json"


def _dist_to_segment_m(p, a, b):
    """Distance en mètres d'un point à un segment, en plan local (suffisant à l'échelle de Paris)."""
    kx = 111320 * math.cos(math.radians(p[1]))
    px, py = (p[0] - a[0]) * kx, (p[1] - a[1]) * 111320
    bx, by = (b[0] - a[0]) * kx, (b[1] - a[1]) * 111320
    t = max(0.0, min(1.0, (px * bx + py * by) / (bx * bx + by * by))) if bx or by else 0.0
    return math.hypot(px - t * bx, py - t * by)


def trim_to_line(pts, line, max_m=400):
    """Coupe début et fin de trace tant qu'ils sont à plus de max_m du tracé de la ligne.

    Un départ depuis chez soi ne doit jamais finir en ligne.
    """
    segs = [decode(s) for s in json.loads((DATA / "metro-lines.json").read_text(encoding="utf-8"))[line]["s"]]
    edges = [(s[i], s[i + 1]) for s in segs for i in range(len(s) - 1)]

    def near(p):
        return any(_dist_to_segment_m(p, a, b) <= max_m for a, b in edges)

    start = next((i for i, p in enumerate(pts) if near(p)), None)
    if start is None:
        return []
    end = next(i for i in range(len(pts) - 1, start - 1, -1) if near(pts[i]))
    return pts[start:end + 1]


def read_gpx(path):
    root = ET.parse(path).getroot()
    pts, date = [], None
    for el in root.iter():
        tag = el.tag.rsplit("}", 1)[-1]
        if tag == "trkpt":
            pts.append((float(el.get("lon")), float(el.get("lat"))))
        elif tag == "time" and date is None:
            date = (el.text or "")[:10] or None
    return pts, date


def simplify(pts, tol_m=4.0):
    """Douglas-Peucker itératif, distances en mètres (approximation locale)."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        s, e = stack.pop()
        (ax, ay), (bx, by) = pts[s], pts[e]
        dx, dy = (bx - ax) * 73000, (by - ay) * 111000
        norm = (dx * dx + dy * dy) ** 0.5
        best, idx = 0.0, -1
        for i in range(s + 1, e):
            px, py = (pts[i][0] - ax) * 73000, (pts[i][1] - ay) * 111000
            d = abs(px * dy - py * dx) / norm if norm > 1e-6 else (px * px + py * py) ** 0.5
            if d > best:
                best, idx = d, i
        if best > tol_m:
            keep[idx] = True
            stack += [(s, idx), (idx, e)]
    return [p for p, k in zip(pts, keep) if k]


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("ligne", help="numéro de ligne : 1 à 14, 3bis ou 7bis")
    ap.add_argument("gpx", type=pathlib.Path)
    ap.add_argument("--strava", help="lien de l'activité Strava (optionnel)")
    ap.add_argument("--temps", help="temps de déplacement, ex. 1:39:58 (optionnel, sert à l'allure)")
    args = ap.parse_args()

    if args.ligne not in LINES:
        sys.exit(f"Ligne inconnue : {args.ligne}. Valeurs possibles : {', '.join(sorted(LINES))}")
    pts, date = read_gpx(args.gpx)
    if len(pts) < 2:
        sys.exit(f"Aucun point de trace dans {args.gpx}. Vérifiez que c'est bien un export GPX d'activité.")

    km = sum(dist_km(a, b) for a, b in zip(pts, pts[1:]))
    pts = trim_to_line(pts, args.ligne)
    if len(pts) < 2:
        sys.exit(f"La trace ne passe jamais à moins de 400 m de la ligne {args.ligne}. Mauvais fichier ou mauvaise ligne ?")
    runs = json.loads(RUNS.read_text(encoding="utf-8"))
    runs[args.ligne] = {
        "date": date,
        "km": round(km, 2),
        "strava": args.strava,
        "trace": encode(simplify(pts)),
    }
    if args.temps:
        h, m, sec = ([0, 0] + [int(x) for x in args.temps.split(":")])[-3:]
        runs[args.ligne]["time"] = h * 3600 + m * 60 + sec
    RUNS.write_text(json.dumps(runs, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Ligne {args.ligne} : {len(pts)} points, {km:.2f} km, {date or 'date inconnue'}.")


if __name__ == "__main__":
    main()
