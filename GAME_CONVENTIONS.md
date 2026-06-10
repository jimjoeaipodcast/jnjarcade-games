# JnJ Arcade — Game Conventions

Locked-in parameters from the June 2026 revamp. Every new cabinet follows these.
Tested on iOS Safari + Android Chrome.

## Layout / shell

- `.game-shell`: flex column, `height: 100vh; height: 100dvh; width: 100%` — **no max-width cap**, game fills the screen.
- Safe-area insets on the shell padding: `env(safe-area-inset-*)` all four sides.
- Header strip (back link + title + score) and HUD bar are `flex-shrink: 0`; play area is `flex: 1`.
- Canvas wrap: `padding: 14px 6px`, `overflow: hidden`, centered canvas.
- **Canvas buffer**: subtract one grid cell from top AND bottom in `resize()` on top of the padding
  (`h = wrap.clientHeight - 28 - CELL * 2`). Mobile fullscreen clips the edges without it; this keeps
  the glowing border fully visible.

## Controls (mobile)

- **No on-screen D-pad, no fire button.** Swipe anywhere on the play area to steer.
- Swipe threshold: **18px** (below that it's a tap, ignore it — stops accidental turns).
- `touchmove` → `preventDefault()` while game running (kills Safari rubber-band scroll).
- Auto-fire where the game shoots; never make mobile players hold a button.
- Desktop: arrows/WASD + space. Keyboard starts the game too.

## Sizing / resize

- Call `resize()` inside `startGame()` before resetting state (viewport may have changed since load).
- Live-resize handler while running: recompute grid, clamp entities to new bounds, refill spawns
  (Safari toolbar collapse and fullscreen kick-in both fire `resize` mid-game).
- `tryFullscreen()` on INSERT COIN / retry click, plus a one-time `touchend` fallback.

## Flow

- Landing page INSERT COIN → `game.html?play=1` → game auto-starts, no intermediate screen.
- Game over with score > 0 → `ArcadeScores.show({ game, title, score, accent, onClose })`.
- Score board auto-returns to arcade after a 3-second countdown; touching the list resets it.

## Hi-score cabinet (arcade-scores.js)

- Marquee top padding: `calc(env(safe-area-inset-top, 0px) + 28px)` — clears notch/status bar.
- Bottom deck: single **BACK TO ARCADE** button (accent colour), no decorative joystick/buttons.
- Name input needs `-webkit-user-select: text; user-select: text; touch-action: auto`
  (games set `user-select: none` on body; iOS refuses focus without the opt-back-in).
- Name moderation runs client side (instant feedback) AND server side (`functions/api/scores.js`),
  leetspeak-normalised blocklist.
- `/api/scores` POST → global KV board; falls back to localStorage if API down.

## Visual language

- Fonts: Bungee (titles/marquee), Barlow Condensed (body/HUD).
- Per-game accent colour drives theme; pass it to ArcadeScores as `accent`.
- **Arcade pushbutton CSS pattern** (see `.coin-btn .dome` in style.css): coloured radial-gradient
  plunger + 7px near-black border (screw collar) + collar ring box-shadows + blurred white gloss
  `::before` + 4px translateY press. Reuse for any physical-button UI.
- Pulsing perimeter glow on the play field; level themes cycle per level.

## Cache / deploy (non-negotiable)

- Bump `?v=N` on EVERY CSS/JS change (`style.css?v=N`, `app.js?v=N`, `arcade-scores.js?v=N`).
  Currently at **v=8**.
- NO GitHub auto-deploy: `git push` then
  `npx wrangler pages deploy . --project-name jnjarcade-games --commit-dirty=true`
  (token in `~/.jnj-secrets/cloudflare.env`).
- KV binding: `PLAYS` namespace `11903ac73e9146b7b79ca26773efc54c` in wrangler.toml — powers
  `/api/plays` and `/api/scores`.
