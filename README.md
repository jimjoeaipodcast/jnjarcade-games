# JnJ Arcade — jnjarcade.win

iPhone home screen web app. 4 social links + 16 weekly games, unlocking every Friday.

## Structure

```
jnjarcade-games/
├── index.html          # Phone interface (home screen)
├── style.css           # iPhone bezel, icons, animations
├── app.js              # Grid builder, unlock logic, interactions
├── games.json          # All game/social metadata
├── games/
│   ├── snake.html      # Week 1 — playable demo (Snake)
│   └── ...             # Future game HTML files
├── assets/             # Icons, images
├── DEPLOY.md           # Cloudflare Pages + GitHub setup
└── .gitignore
```

## Quick start

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

## Adding a game

1. Add HTML file to `games/`
2. Update `releaseDate` in `games.json` to today (or a past date to unlock it)
3. Push to GitHub → auto-deploys via Cloudflare Pages

## Game template

Every game page should:
- Have a `‹ Arcade` back link pointing to `../index.html`
- Show `Episode N: Game Name` in a header
- Work on mobile touch
- Store high score in `localStorage`

See `games/snake.html` as the reference implementation.
