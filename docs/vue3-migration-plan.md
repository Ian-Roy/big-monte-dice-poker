# Vue 3 Migration Plan (Dice Poker)

Formal plan to migrate the legacy HUD to Vue 3 while preserving gameplay, PWA, and Dice-Box integration. This migration also unifies dice visuals: the lock row and score rows will render using the same Dice-Box assets (no re-implementing 2D faces).

## Goals & Guardrails
- Replace the old HUD/UI with Vue 3 (Composition API) while keeping Dice-Box for 3D rolls (legacy canvas layer fully removed).
- Extract a headless game engine (rules, scoring, rounds, holds) suitable for unit testing and future custom rulesets.
- Maintain offline-first PWA behavior, mobile-first/touch-first UX, and current game flow (3 rolls, holds, scoring confirmation).
- Dice visual parity: lock row icons and score-row dice use Dice-Box theme assets, not bespoke 2D drawings.
- Minimize regression risk via incremental migration and tests before removing legacy code.

## Scope
- In-scope: UI rebuild in Vue, headless rules/score engine, Vue store/composables, Dice-Box integration, CSS/layout, tests, PWA alignment.
- Out-of-scope (for this pass): new rule types, new dice counts, new hands, multiplayer. These should be enabled by the new engine but not implemented yet.

## Constraints & Assumptions
- PWA base path stays driven by `REPO_BASE` (GitHub Pages friendly).
- Network-restricted/offline mode must still render Dice-Box (ensure `.wasm` and textures are precached).
- Touchscreen-first layouts; avoid hover-only affordances; large tap targets.
- Keep Dice-Box as authoritative for dice visuals; Vue controls interactions/overlay.

## Current State Snapshot (pre-migration)
- Legacy scene mixed UI layout, dice locks, roll flow, scoring, and confirmation UI.
- `src/shared/DiceService.ts` already wraps Dice-Box in the DOM container `#dice-box`; the overlay handled HUD/lock row.
- Dice faces for the lock row were generated procedurally and independent from Dice-Box textures.
- No unit tests; scoring/round logic lived in scene methods.

## Target Architecture (Vue)
- **Headless engine**: `src/game/engine.ts` (new) exports pure TS for rounds, rolls, holds, scoring (current Yahtzee rules) plus extensibility hooks for custom rulesets. Fully unit-tested.
- **State/store (Pinia)**: Pinia store managing `dice`, `locks`, `rollsThisRound`, `isRolling`, `categories`, `totals`, and actions (`rollAll`, `rerollUnheld`, `toggleHold`, `scoreCategory`, `startNewRound`). No alternative store.
- **Dice integration**: Keep `DiceService` (or thin wrapper) to own Dice-Box lifecycle and emit snapshots into Vue refs. Asset path derived from `import.meta.env.BASE_URL`.
- **UI components**: `DiceViewport` (hosts `#dice-box`), `LockRow`, `RollBar`, `ScoreTable`, `ConfirmDialog`, `ToastStack`, `PWAUpdatePrompt`, `InstallPrompt`. All responsive with keyboard/touch support.
- **Styles**: CSS variables for theme; responsive grid/stack for phone-first; avoid canvas text for HUD.

## Dice Visual Parity Plan (Reuse Dice-Box Assets)
- **Goal**: Lock row and score-row dice should visually match the 3D dice, without hand-drawn 2D faces.
- **Approach (fixed)**: Pre-bake a sprite sheet during build using Dice-Box theme assets and ship as `assets/dice-box/faces.png` (or data URLs JSON). A build tool in `tools/` runs headless Dice-Box/Three to render faces 1–6 with the active theme. No runtime capture fallback.
- **Why**: Avoid reimplementing 2D pips, keep brand consistency, simplify Vue rendering to standard `<img>` tags, and ensure offline availability.
- **Usage**: Lock row uses these sprites for values/held states; score rows show scored dice using the same sprites. Update Workbox glob to precache the generated sprite.

## Phased Plan
1) **Baseline + Tests**
   - Add Vitest + @vue/test-utils.
   - Extract scoring/round logic from `MainScene` into `src/game/engine.ts` with unit tests mirroring current rules (upper/lower scores, bonus, full house, straights, roll limits, holds).
   - Add tests for Dice-Box snapshot mapping (`DiceService` → values/locks).

2) **Add Vue Scaffold + Pinia**
   - Add `vue`, `@vitejs/plugin-vue`, and `pinia`; wire `main.ts` to mount `App.vue` with Pinia.
   - Keep Dice-Box container in DOM; remove any unused legacy rendering paths.
   - Ensure PWA config still builds; adjust `vite.config.ts` only if needed for Vue plugin.

3) **Dice-Box Asset Parity (Build-Time)**
   - Implement build-time sprite generation using Dice-Box theme assets (tool under `tools/`, outputs `public/assets/dice-box/faces.png` + metadata).
   - Replace procedural dice-face generation with these sprites in a Vue helper (`useDiceSprites`).
   - Update Workbox patterns to precache the generated sprite; verify offline availability of textures/wasm/sprites.

4) **Vue UI Parity**
   - Build components: `LockRow` (tap to hold), `RollBar` (roll button + status), `ScoreTable` (section headers, rows, preview, confirm dialog), `ToastStack`, `ConfirmDialog`.
   - Wire to Pinia store + engine; ensure flows match the legacy game (3 rolls, confirmation, auto upper bonus, game complete).
   - Port accessibility/touch handling from `bindPress` to pointer events; add focus/keyboard affordances where possible.

5) **Remove Legacy Canvas + Cleanup**
- Delete legacy scenes/config and related assets once Vue UI reaches parity; remove unused deps from `package.json`.
- Keep Dice-Box container in DOM; ensure z-index/pointer-events remain correct.
- Update `style.css` (or new Vue SFC styles) for responsive layout; validate `#dice-box` sizing/alignment on phones.

6) **QA & Acceptance**
   - Manual pass: roll → hold → reroll → score → bonus → finish game. Mobile/touch first.
   - Offline/PWA: `yarn build && yarn preview` with network disabled to confirm Dice-Box + sprite caching.
   - Base path: test with `REPO_BASE` set to repo name.
- Verify visual parity: lock row and scored dice use Dice-Box-based sprites; no legacy-generated faces remain.

## Risks & Mitigations
- **Sprite generation complexity**: capturing Dice-Box faces may be finicky; mitigate with build-time pre-bake script using the same theme assets.
- **Gesture regressions**: legacy tap handling replaced by Vue; use pointer events and generous hit areas; test on mobile.
- **State drift**: ensure single source of truth in the store + engine; Dice-Box only feeds dice values/held.
- **Offline Dice-Box**: `.wasm`/textures/sprites must be precached; update Workbox if new assets are added.
- **Timeline creep**: enforce phased removal of legacy code only after Vue parity tests pass.

## Acceptance Criteria
- All UI rendered in Vue; legacy canvas layer removed from runtime.
- Dice-Box remains the 3D renderer; lock row and score rows use Dice-Box-derived sprites.
- Headless engine with tests covers current Yahtzee rules and is ready for future custom rulesets.
- PWA build passes; offline play works (including Dice-Box); responsive UX validated on phones.
