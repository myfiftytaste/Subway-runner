"""Assemble une version tout-en-un du site (données incluses) dans dist/metrun.html.

Sert d'aperçu partageable sans serveur. Le site déployé, lui, sert index.html tel quel.
"""
import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
body = re.search(r"<!--app:start-->(.*)<!--app:end-->", html, re.S).group(1)
fonts = re.search(r'<link rel="stylesheet" href="(https://fonts[^"]+)">', html).group(1)
data = {name: json.loads((root / "data" / f"{file}.json").read_text(encoding="utf-8"))
        for name, file in [("metro", "metro-lines"), ("fond", "paris-fond"), ("runs", "runs"), ("stations", "stations")]}

out = f"""<title>Métrun</title>
<link rel="stylesheet" href="{fonts}">
<style>
{(root / "style.css").read_text(encoding="utf-8")}
</style>
{body}
<script>window.__DATA = {json.dumps(data, ensure_ascii=False, separators=(",", ":"))};</script>
<script>
{(root / "app.js").read_text(encoding="utf-8")}
</script>
"""
(root / "dist").mkdir(exist_ok=True)
(root / "dist" / "metrun.html").write_text(out, encoding="utf-8")
print(f"dist/metrun.html ({len(out) // 1024} Ko)")
