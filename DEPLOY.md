# Deploy Guide — jnjarcade.win

## One-time Setup

### 1. Create GitHub repo

```bash
# On github.com/jimjoeaipodcast → New repository
# Name: jnjarcade.win   Visibility: Public   No README

# Push this folder to it:
cd ~/jim-joe-ai/jnjarcade-games
git remote add origin https://github.com/jimjoeaipodcast/jnjarcade.win.git
git push -u origin main
```

### 2. Connect Cloudflare Pages

1. Log into [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Pages → Create a project → Connect to Git**
3. Select repo: `jimjoeaipodcast/jnjarcade.win`
4. Build settings:
   - **Build command**: *(leave blank — static files)*
   - **Output directory**: `/` *(root)*
5. Click **Save and Deploy**

### 3. Add custom domain

In Cloudflare Pages → your project → Custom domains:
- Add `jnjarcade.win`
- Add `www.jnjarcade.win` (redirect to apex)

Cloudflare will auto-provision SSL.

---

## Adding a New Game (Every Friday)

### Option A — Manual

```bash
# 1. Create game file
cp games/snake.html games/my-new-game.html
# (edit it to be the new game)

# 2. Update games.json — change the matching entry's status or edit releaseDate

# 3. Commit and push
git add games/my-new-game.html games.json
git commit -m "feat: unlock week N — My New Game"
git push
# Cloudflare auto-deploys in ~1 minute
```

### Option B — Via game-pipeline deploy.py

```bash
python3 ~/jim-joe-ai/tools/game-pipeline/deploy.py \
  /path/to/game-dir  \
  game-id            \
  "Display Name"     \
  --description "Short description" \
  --live
```

The deploy script uploads files to GitHub via API → Cloudflare deploys automatically.

---

## QR Codes → Game Pages

Each game page can have a QR code printed on episode merch or cipher cards.

Use the `jnjarcade.win/games/<id>.html` URL directly, or add Cloudflare redirect rules:

```
/qr/snake  →  /games/snake.html
/qr/week2  →  /games/prompt-panic.html
```

Add redirect rules in: Cloudflare Dashboard → your domain → Rules → Redirect Rules.

---

## Cipher integration

The `/mario` and `/tetris` paths need Cloudflare redirect rules pointing to the relevant game pages once they're built:

```
/mario  →  /games/neural-ninja.html   (or whichever game contains the Mario cipher)
/tetris →  /games/matrix-match.html
```

---

## Local preview

```bash
cd ~/jim-joe-ai/jnjarcade-games
npx serve .
# or
python3 -m http.server 8080
# Open: http://localhost:8080
```

> **Note:** `games.json` is fetched via `fetch()` so you need an HTTP server.
> Opening `index.html` as a `file://` URL will fail the JSON fetch.

---

## Release schedule

| Week | Game | Release Date |
|------|------|-------------|
| 1 | Snake.io | 2026-05-19 ✅ |
| 2 | Prompt Panic | 2026-05-22 |
| 3 | Token Rush | 2026-05-29 |
| 4 | Neural Ninja | 2026-06-05 |
| 5 | Vector Void | 2026-06-12 |
| 6 | Cipher Hunt | 2026-06-19 |
| 7 | Gradient Drop | 2026-06-26 |
| 8 | Matrix Match | 2026-07-03 |
| 9 | Attention Span | 2026-07-10 |
| 10 | Wrong Counter | 2026-07-17 |
| 11 | Hallucination | 2026-07-24 |
| 12 | Context Win | 2026-07-31 |
| 13 | Embed Race | 2026-08-07 |
| 14 | Param Panic | 2026-08-14 |
| 15 | Overfit Saga | 2026-08-21 |
| 16 | The Big Model | 2026-08-28 |
