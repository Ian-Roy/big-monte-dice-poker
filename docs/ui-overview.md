# UI Overview (Beginner Guide)

This project is a Vue 3 + Vite PWA for a dice‑poker style game. The UI is intentionally split into **two sections**:

- **Top controls (always visible)**: roll button, totals, and layer tabs
- **Bottom panel (changes by layer)**: 3D dice viewport *or* scorecard *or* summary

If you’re new to the codebase, start here to understand how the screen is composed and where to make changes safely.

---

## Mental model: “Top + Bottom”

The app is driven by a single piece of UI state: `activeLayer` (`'dice' | 'score' | 'summary'`).

- When `activeLayer === 'dice'`:
  - Bottom panel shows the 3D dice viewport
- When `activeLayer !== 'dice'`:
  - Bottom panel shows the scorecard or summary
  - Bottom panel becomes scrollable (if content exceeds the available height)

Note: the app generally keeps **body scrolling locked** and relies on internal scroll containers (like the bottom panel) for overflow. This avoids mobile “bounce” and keeps the viewport stable around the 3D canvas.

On small screens, the app **locks to portrait**. In landscape on mobile widths, an overlay is shown to tell the player to rotate back.

---

## Key files (UI)

### Shell + orchestration

- `src/App.vue`
  - Glues together the top/bottom layout, dialogs, overlays, title screen, and toast stack.
  - Keeps orchestration logic (state selection, store calls, and UI side effects) without owning lots of markup/CSS.

### Top controls (always visible)

- `src/components/layout/AppTopControls.vue`
  - Roll action button + roll totals bar
  - Dice preview strip (tap-to-hold UX)
  - The “layer” buttons that swap the bottom panel

### Bottom panel (layer switcher)

- `src/components/layout/AppBottomPanel.vue`
  - Always renders `DiceViewport` (hidden when not active)
  - Renders `ScoreTable` or `EndGameSummary` when `activeLayer !== 'dice'`

### Overlays & UI utilities

- `src/components/ui/TitleScreen.vue` (start/resume)
- `src/components/ui/ConfirmDialog.vue` (confirm scoring)
- `src/components/ui/ToastStack.vue` (ephemeral notifications)

---

## Dice rendering: how the 3D viewport works

The 3D dice are rendered by Dice Box inside a fixed container:

- `src/components/ui/DiceViewport.vue`
  - Owns the `#dice-box` container element (this is what Dice Box mounts into)
  - Uses CSS to fill the **bottom panel** (`position: absolute; inset: 0`)

Dice Box is wrapped by a service + bridge:

- `src/shared/DiceService.ts`
  - Wrapper around `@3d-dice/dice-box` (custom fork in `vendor/`)
  - Handles rolling/rerolling, “held” visuals, and resize behavior
- `src/components/DiceServiceBridge.vue`
  - Initializes the DiceService and attaches it to the store
  - Handles “context lost” recovery

More details:
- `docs/working-with-dice-box.md`
- `docs/dice-box-fork.md`

---

## State flow (Pinia store)

- `src/stores/gameStore.ts`
  - Single store for game engine state, dice snapshot, and persistence (localStorage)
  - UI calls actions like `rollAll`, `rerollUnheld`, `toggleHold`, `scoreCategory`

The store is the “source of truth” for:
- Current dice values + held flags (via dice service snapshot)
- Game progress + scoring (via `GameEngine`)
- UI enabling/disabling (e.g. “can score”, “service ready”, “rolling”)

---

## Responsiveness & viewport strategy (important)

Mobile browsers (especially iOS Safari) can report unstable heights due to the URL bar and toolbars. Avoid relying on `100vh` alone.

This app uses a **visualViewport-backed CSS variable**:

- `src/shared/viewport.ts` updates CSS custom properties:
  - `--app-height`
  - `--app-width`
- `src/App.vue` uses `height: var(--app-height, 100vh)`
- `src/App.vue` pads for notches/home indicators via:
  - `env(safe-area-inset-top/right/bottom/left)`

### Best practice: fix overflow at the source

If you see “cut off on the right” issues, don’t add more `overflow-x: hidden`.
Instead, identify the element that is wider than the viewport:

1. Check if overflow exists:
   - `document.documentElement.scrollWidth > document.documentElement.clientWidth`
2. Find the culprit:
   - `([...document.querySelectorAll('*')].find(el => el.scrollWidth > el.clientWidth))`

Common CSS causes:
- Flex/grid children missing `min-width: 0`
- Fixed pixel widths inside narrow containers
- “100vw” including scrollbars/safe-area quirks on mobile

---

## General UI best practices for this project

### Keep the mental model visible in code

- “Top controls” and “Bottom panel” should remain separate components.
- Avoid pushing large layout rules back into `App.vue`.

### Prefer CSS layout over JS layout

- Use flex/grid with `min-height: 0` for scroll containers.
- Avoid JS measuring unless absolutely necessary for canvas/WebGL.

### Treat mobile rotation as a state transition

- Ensure transitions between portrait/landscape don’t leave the UI in a broken intermediate layout.
- When adding new layout constraints, test:
  - portrait ↔ landscape ↔ portrait
  - PWA standalone mode (if you use it)

### Gate noisy logs

- Keep `console.warn` for real issues.
- Make `console.info/debug` dev-only (already done for DiceService) to keep production logs clean.

---

## Local development (quick)

From repo root:

- Dev server: `yarn dev`
- Unit tests: `yarn test:run`
- Production build: `yarn build:ci`

---

## Where to start when changing UI

- **Layout/spacing issues**: start with `src/components/layout/*` and `src/App.vue` shell padding.
- **Dice viewport sizing/interaction**: `src/components/ui/DiceViewport.vue` + `src/shared/DiceService.ts`.
- **Score table UI**: `src/components/ui/ScoreTable.vue` + `src/components/ui/ScoreTableRow.vue`.

If you’re unsure where a piece of UI comes from, search for the component name in `src/` and work outward from there.
