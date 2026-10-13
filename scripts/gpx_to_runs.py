"""Ajoute ou remplace une course dans data/runs.json à partir d'un fichier GPX.

Usage :
    python scripts/gpx_to_runs.py <ligne> <fichier.gpx> [--strava URL]

Exemple :
    python scripts/gpx_to_runs.py 11 ~/Downloads/Ligne_11.gpx --strava https://www.strava.com/activities/123

Le GPX s'exporte depuis Strava (activité > « … » > Exporter le GPX) ou depuis
l'appli Coros. La trace est simplifiée à 4 m près : assez pour garder les
zigzags de la course, assez léger pour la page.
"""
import argparse
import json
import pathlib
import sys
import xml.etree.ElementTree as ET

from polyline import dist_km, encode

LINES = {"1", "2", "3", "3bis", "4", "5", "6", "7", "7bis", "8", "9", "10", "11", "12", "13", "14"}
RUNS = pathlib.Path(__file__).resolve().parent.parent / "data" / "runs.json"


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
    args = ap.parse_args()

    if args.ligne not in LINES:
        sys.exit(f"Ligne inconnue : {args.ligne}. Valeurs possibles : {', '.join(sorted(LINES))}")
    pts, date = read_gpx(args.gpx)
    if len(pts) < 2:
        sys.exit(f"Aucun point de trace dans {args.gpx}. Vérifiez que c'est bien un export GPX d'activité.")

    km = sum(dist_km(a, b) for a, b in zip(pts, pts[1:]))
    runs = json.loads(RUNS.read_text(encoding="utf-8"))
    runs[args.ligne] = {
        "date": date,
        "km": round(km, 2),
        "strava": args.strava,
        "trace": encode(simplify(pts)),
    }
    RUNS.write_text(json.dumps(runs, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Ligne {args.ligne} : {len(pts)} points, {km:.2f} km, {date or 'date inconnue'}.")


if __name__ == "__main__":
    main()
