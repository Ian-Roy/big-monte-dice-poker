# Monte's Delux Dice Poker

Offline-first Vue 3 + Dice-Box build that deploys to GitHub Pages. Uses vite-plugin-pwa (Workbox GenerateSW) with a user prompt when updates are available.

## Quick start

```bash
# install
yarn

# generate assets, build, and run dev server
yarn dev
```

- Dev server: http://localhost:5173
- First interaction enables audio (mobile policy).

## Build

```bash
# Generates icons, sprites, sfx, then builds
yarn build
```

Outputs to `dist/`.

## Deploy to GitHub Pages

1. Ensure `vite.config.ts` `REPO_BASE` matches your repository name, e.g. `/big-monte-dice-poker/`.
2. Enable Pages in GitHub (Settings → Pages → Source: GitHub Actions).
3. Push to `main`; CI will build and deploy automatically.

Local-only helpers:

- `yarn gen:assets` regenerates icons/sprite/sfx and updates `assets/manifest.json`.
- `yarn build:ci` builds without regenerating assets (mirrors CI). Use `yarn build` when you intend to regenerate and commit assets.

## PWA behavior

- First load online installs the Service Worker and precaches all app assets.
- When a new version is available, a toast appears with “Reload”.
- Everything is self-hosted; no external CDNs.

## Docs

- `docs/ui-overview.md` – UI mental model + layout/responsiveness notes (start here).
- `docs/pass-and-play.md` – Pass-the-phone multiplayer notes.
- `docs/working-with-dice-box.md` – Debugging and working with the 3D dice integration.
- `docs/dice-box-fork.md` – Notes about the local Dice Box fork.

## File map

- `src/components/` – Vue UI components + DiceService bridge.
- `src/game/` – Game engine logic and scoring rules.
- `src/stores/` – Pinia store (state + persistence).
- `src/shared/` – Dice service and shared utilities.
- `src/pwa/` – PWA install/update prompts.
- `tools/` – Asset generation scripts.

## License

GPL-3.0-only
