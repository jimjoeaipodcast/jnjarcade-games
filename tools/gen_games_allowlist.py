#!/usr/bin/env python3
"""Regenerate functions/_lib/games.js from games/*.html (+ EXTRA aliases). Run before deploy when a game is added."""
import glob, os, json
EXTRA = ["candy-tris","dead-air","face-lab","doom-mario","cipher-hunt","token-rush"]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
slugs = {os.path.basename(f)[:-5] for f in glob.glob(os.path.join(root, "games/*.html"))} - {"_template"}
allg = sorted(slugs | set(EXTRA))
path = os.path.join(root, "functions/_lib/games.js")
open(path, "w").write(open(path).read().split("export const GAMES")[0] + f"export const GAMES = new Set({json.dumps(allg)});\n")
print(len(allg), "games ->", path)
