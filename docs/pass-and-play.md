# Pass-and-Play Multiplayer (1–4 Players)

This app supports local “pass the phone” multiplayer: multiple players take turns on the same device, each with their own scorecard.

## How it works
- A saved game is a **session** containing 1–4 player sheets.
- Only one player is “active” at a time; the UI (dice + scorecard) always reflects the active player.
- When a player scores a category, the app shows a full-screen prompt for the next player to take the phone and start their turn.

## Key files
- Session state + persistence: `src/stores/gameStore.ts`
- New game setup modal: `src/components/ui/NewGameDialog.vue`
- Turn handoff overlay: `src/components/ui/TurnHandoffOverlay.vue`
- Multiplayer summary (collapsible scorecards): `src/components/ui/EndGameSummary.vue`

## Dice colors
- Settings “Dice Appearance” remains the **house default**.
- Each player can override dice + held colors for that session.
