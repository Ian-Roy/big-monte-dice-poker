<template>
  <div id="app-root" :class="{ 'orientation-locked': orientationLocked }">
    <template v-if="currentPage === 'title'">
      <TitlePage
        :saves="savedGames"
        :active-save-id="store.activeSaveId"
        :max-saves="store.maxSaveSlots"
        :high-score="leaderboard.topScore"
        :has-high-score="leaderboard.entries.length > 0"
        @resume="handleResumeGame"
        @create-game="openNewGameDialog"
        @delete="handleDeleteSavedGame"
        @settings="navigateTo('settings')"
        @leaderboard="openLeaderboard"
      />
      <NewGameDialog
        v-if="newGameDialogOpen"
        @cancel="closeNewGameDialog"
        @create="handleCreateGame"
      />
    </template>
    <SettingsPage
      v-else-if="currentPage === 'settings'"
      @back="navigateTo('title')"
    />
    <LeaderboardPage
      v-else-if="currentPage === 'leaderboard'"
      @back="navigateTo('title')"
      @open-summary="openLeaderboardSummary"
    />
    <LeaderboardSummaryPage
      v-else-if="currentPage === 'leaderboard-summary'"
      :entry-id="leaderboardEntryId"
      @back="navigateTo('leaderboard')"
    />
    <div v-else id="app-shell">
      <AppTopControls
        :active-layer="activeLayer"
        :on-show-dice="showDice"
        @change-layer="setActiveLayer"
      />
      <AppBottomPanel
        :active-layer="activeLayer"
        :dice-layer-mode="diceVisibility"
        @select="handleSelect"
        @back-to-title="handleBackToTitle"
        @quit-game="handleQuitGameRequest"
      />
      <DiceServiceBridge />
      <ConfirmDialog
        v-if="confirmDialog"
        :title="dialogTitle"
        :message="dialogMessage"
        @confirm="confirmDialogConfirm"
        @cancel="clearDialog"
      />
      <ToastStack :toasts="toasts" />
    </div>
    <TurnHandoffOverlay
      v-if="turnOverlayVisible"
      :player-name="turnOverlayPlayerName"
      :dice-color-hex="turnOverlayDiceColorHex"
      :kicker="turnOverlayKicker"
      :hint="turnOverlayHint"
      :button-label="turnOverlayButtonLabel"
      @primary="handleTurnOverlayPrimary"
    />
    <HighScoreNameDialog
      v-if="highScorePrompt"
      :score="highScorePrompt.score"
      :initial-name="highScorePrompt.leaderName"
      @save="handleHighScoreNameSave"
    />
    <div v-if="orientationLocked" class="orientation-overlay">
      <div class="orientation-overlay__card">
        <h3>Rotate your device</h3>
        <p>Big Monte Dice Poker only plays in portrait on mobile. Turn your device upright to keep rolling.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import DiceServiceBridge from './components/DiceServiceBridge.vue';
import AppBottomPanel from './components/layout/AppBottomPanel.vue';
import AppTopControls from './components/layout/AppTopControls.vue';
import ConfirmDialog from './components/ui/ConfirmDialog.vue';
import HighScoreNameDialog from './components/ui/HighScoreNameDialog.vue';
import NewGameDialog from './components/ui/NewGameDialog.vue';
import TurnHandoffOverlay from './components/ui/TurnHandoffOverlay.vue';
import ToastStack from './components/ui/ToastStack.vue';
import SettingsPage from './pages/SettingsPage.vue';
import LeaderboardPage from './pages/LeaderboardPage.vue';
import LeaderboardSummaryPage from './pages/LeaderboardSummaryPage.vue';
import TitlePage from './pages/TitlePage.vue';
import { useOrientationLock } from './composables/useOrientationLock';
import { useToasts } from './composables/useToasts';
import type { CategoryKey } from './game/engine';
import type { ActiveLayer } from './shared/appUi';
import { isSessionCompleted } from './shared/gameSession';
import { useGameStore, type NewGameSetup } from './stores/gameStore';
import { useLeaderboardStore } from './stores/leaderboardStore';

// Initialize the store now so upcoming Vue components can subscribe to state.
const store = useGameStore();
const leaderboard = useLeaderboardStore();

function recordFinishedSaves() {
  store.saveSlots.forEach((slot) => {
    if (!isSessionCompleted(slot.state)) return;
    try {
      leaderboard.recordCompletedSession({ id: slot.id, session: slot.state });
    } catch (err) {
      console.warn('[App] failed to record finished save to leaderboard', err);
    }
  });
}

recordFinishedSaves();
store.cleanupFinishedSaves();

const { orientationLocked } = useOrientationLock({ maxMobileWidth: 900 });
const currentPage = ref<'title' | 'settings' | 'leaderboard' | 'leaderboard-summary' | 'game'>('title');
const activeLayer = ref<ActiveLayer>('dice');
const newGameDialogOpen = ref(false);
const turnOverlay = ref<null | { mode: 'current' | 'next' }>(null);
const highScorePrompt = ref<null | { entryId: string; leaderPlayerId: string; score: number; leaderName: string }>(null);
const leaderboardEntryId = ref<string | null>(null);
const diceVisibility = computed<'visible' | 'hidden'>(() => {
  if (orientationLocked.value) return 'hidden';
  return activeLayer.value === 'dice' ? 'visible' : 'hidden';
});
const bodyScrollLocked = computed(() => currentPage.value === 'game' && !orientationLocked.value);

const turnOverlayPlayer = computed(() => {
  if (!turnOverlay.value) return null;
  return turnOverlay.value.mode === 'next' ? store.nextPlayer : store.activePlayer;
});

const turnOverlayVisible = computed(
  () => currentPage.value === 'game' && !!turnOverlay.value && !!turnOverlayPlayer.value
);

const turnOverlayPlayerName = computed(() => turnOverlayPlayer.value?.name ?? '');

const turnOverlayDiceColorHex = computed(() => {
  const player = turnOverlayPlayer.value;
  if (!player) return store.activeDiceColorHex;
  return store.diceColorHexForKey(player.appearance.diceColor);
});

const turnOverlayKicker = computed(() => {
  const overlay = turnOverlay.value;
  if (!overlay) return '';
  return overlay.mode === 'next' ? 'Next player' : 'Your turn';
});

const turnOverlayHint = computed(() => {
  const overlay = turnOverlay.value;
  if (!overlay) return '';
  if (overlay.mode === 'next') return 'Pass the phone, then tap roll when you are ready.';
  return store.rollsThisRound > 0 ? 'Tap continue to return to your turn.' : 'Tap roll to start your turn.';
});

const turnOverlayButtonLabel = computed(() => {
  const overlay = turnOverlay.value;
  if (!overlay) return 'Roll';
  if (overlay.mode === 'next') return 'Roll';
  return store.rollsThisRound > 0 ? 'Continue' : 'Roll';
});

type ConfirmDialogState =
  | { type: 'score'; category: CategoryKey }
  | { type: 'quit' }
  | null;

const confirmDialog = ref<ConfirmDialogState>(null);
const { toasts, pushToast } = useToasts({ max: 3, durationMs: 1800 });

const dialogTitle = computed(() => {
  const dialog = confirmDialog.value;
  if (!dialog) return '';
  if (dialog.type === 'quit') return 'Quit game?';
  const cat = store.categories.find((c) => c.key === dialog.category);
  return cat ? `Score ${cat.label}?` : 'Score this category?';
});

const dialogMessage = computed(() => {
  const dialog = confirmDialog.value;
  if (!dialog) return '';
  if (dialog.type === 'quit') {
    return 'This will discard your current progress and remove this save slot. This cannot be undone.';
  }
  const cat = store.categories.find((c) => c.key === dialog.category);
  if (!cat) return '';
  const preview =
    store.engineState.dice.every((v) => typeof v === 'number') ? store.previewCategory(cat.key) : null;
  const scoreText = typeof preview === 'number' ? preview : '0';
  return `This will add ${scoreText} point${scoreText === '1' ? '' : 's'} and end this round.`;
});

const savedGames = computed(() =>
  store.saveSlots.map((slot) => {
    const session = slot.state;
    const players = Array.isArray(session.players) ? session.players : [];
    const activeIdx = typeof session.activePlayerIndex === 'number' ? session.activePlayerIndex : 0;
    const activePlayer = players[activeIdx] ?? players[0] ?? null;
    const activeState = activePlayer?.state;

    const scorable = Array.isArray(activeState?.categories)
      ? activeState.categories.filter((cat) => cat.interactive !== false)
      : [];
    const scoredCount = scorable.filter((cat) => cat.scored).length;

    const leader = players.reduce((best, candidate) => {
      const bestScore = best?.state?.totals?.grand ?? 0;
      const nextScore = candidate?.state?.totals?.grand ?? 0;
      return nextScore > bestScore ? candidate : best;
    }, players[0] ?? null);

    return {
      id: slot.id,
      playersCount: players.length || 1,
      leaderName: leader?.name ?? '—',
      activePlayerName: activePlayer?.name ?? '—',
      round: activeState?.currentRound ?? 1,
      maxRounds: activeState?.maxRounds ?? 0,
      scoredCount,
      totalScorable: scorable.length,
      score: leader?.state?.totals?.grand ?? 0
    };
  })
);

function navigateTo(page: typeof currentPage.value) {
  if (page === 'title') {
    recordFinishedSaves();
    store.cleanupFinishedSaves();
    newGameDialogOpen.value = false;
    turnOverlay.value = null;
    highScorePrompt.value = null;
  }
  currentPage.value = page;
}

function openNewGameDialog() {
  newGameDialogOpen.value = true;
}

function closeNewGameDialog() {
  newGameDialogOpen.value = false;
}

function handleCreateGame(setup: NewGameSetup) {
  store.cleanupFinishedSaves();
  const result = store.createNewSessionSlot(setup);
  if (!result.ok) {
    pushToast('You already have 4 saved games. Delete or finish one to create another.');
    return;
  }
  closeNewGameDialog();
  setActiveLayer('dice');
  currentPage.value = 'game';
  if (store.isMultiplayer && !store.sessionCompleted) {
    turnOverlay.value = { mode: 'current' };
  }
}

function handleSelect(key: CategoryKey) {
  confirmDialog.value = { type: 'score', category: key };
}

function clearDialog() {
  confirmDialog.value = null;
}

function confirmDialogConfirm() {
  const dialog = confirmDialog.value;
  if (!dialog) return;
  if (dialog.type === 'quit') {
    const ok = store.quitActiveGame();
    if (ok) pushToast('Game quit');
    confirmDialog.value = null;
    navigateTo('title');
    return;
  }

  store.scoreCategory(dialog.category);
  if (store.lastError) {
    confirmDialog.value = null;
    return;
  }
  const cat = store.categories.find((c) => c.key === dialog.category);
  pushToast(cat ? `${cat.label} scored` : 'Scored');
  confirmDialog.value = null;

  if (store.isMultiplayer && !store.sessionCompleted && store.nextPlayer) {
    setActiveLayer('dice');
    turnOverlay.value = { mode: 'next' };
  }
}

function setActiveLayer(layer: ActiveLayer) {
  activeLayer.value = layer;
}

function showDice() {
  setActiveLayer('dice');
}

function handleResumeGame(id: string) {
  const ok = store.loadGameSlot(id);
  if (!ok) {
    pushToast('Could not load that saved game.');
    return;
  }
  currentPage.value = 'game';
  setActiveLayer(store.sessionCompleted ? 'summary' : 'dice');
  if (store.isMultiplayer && !store.sessionCompleted) {
    turnOverlay.value = { mode: 'current' };
  }
}

function handleDeleteSavedGame(id: string) {
  store.deleteGameSlot(id);
}

function openLeaderboard() {
  leaderboardEntryId.value = null;
  navigateTo('leaderboard');
}

function openLeaderboardSummary(entryId: string) {
  leaderboardEntryId.value = entryId;
  navigateTo('leaderboard-summary');
}

function handleBackToTitle() {
  navigateTo('title');
}

function handleQuitGameRequest() {
  if (store.sessionCompleted) return;
  confirmDialog.value = { type: 'quit' };
}

function handleHighScoreNameSave(nextName: string) {
  const prompt = highScorePrompt.value;
  if (!prompt) return;
  const trimmed = nextName.trim();
  if (!trimmed) return;
  leaderboard.renameLeader(prompt.entryId, trimmed);
  store.renamePlayer(prompt.leaderPlayerId, trimmed);
  highScorePrompt.value = null;
}

async function handleTurnOverlayPrimary() {
  const overlay = turnOverlay.value;
  if (!overlay) return;

  const switchedPlayer = overlay.mode === 'next';
  if (overlay.mode === 'next') {
    const result = store.advanceToNextPlayer();
    if (!result.ok) {
      pushToast('Could not advance to the next player.');
      turnOverlay.value = null;
      return;
    }
  }

  turnOverlay.value = null;
  showDice();

  if (store.rollsThisRound === 0) {
    if (switchedPlayer) {
      await nextTick();
      if (typeof window !== 'undefined') {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
    }
    await store.rollAll();
  }
}

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.body.classList.remove('dice-layer-locked');
  }
});

watch(
  () => store.lastError,
  (val) => {
    if (typeof val === 'string' && val) pushToast(val);
  }
);

watch(
  () => store.serviceError,
  (val) => {
    if (typeof val === 'string' && val) pushToast(val);
  }
);

watch(
  bodyScrollLocked,
  (locked) => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (!body) return;
    if (locked) {
      body.classList.add('dice-layer-locked');
    } else {
      body.classList.remove('dice-layer-locked');
    }
  },
  { immediate: true }
);

watch(
  () => store.sessionCompleted,
  (complete) => {
    if (!complete) return;
    if (currentPage.value !== 'game') return;
    turnOverlay.value = null;
    setActiveLayer('summary');

    const session = store.session;
    const slot = store.activeSlot;
    if (!session || !slot) return;
    const previousHigh = leaderboard.topScore;
    let recorded: ReturnType<typeof leaderboard.recordCompletedSession>;
    try {
      recorded = leaderboard.recordCompletedSession({ id: slot.id, session });
    } catch (err) {
      console.warn('[App] failed to record completed session to leaderboard', err);
      pushToast('Could not record high score.');
      return;
    }
    if (!recorded.ok) return;
    if (!recorded.isNew) return;
    if (recorded.entry.leaderScore <= previousHigh) return;
    highScorePrompt.value = {
      entryId: recorded.entry.id,
      leaderPlayerId: recorded.entry.leaderPlayerId,
      score: recorded.entry.leaderScore,
      leaderName: recorded.entry.leaderName
    };
  }
);
</script>

<style scoped>
#app-root {
  position: relative;
  width: 100%;
  height: var(--app-height, 100vh);
  min-height: var(--app-height, 100vh);
  overflow: hidden;
}

#app-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  height: var(--app-height, 100vh);
  margin: 0 auto;
  padding: calc(6px + env(safe-area-inset-top)) calc(6px + env(safe-area-inset-right))
    calc(40px + env(safe-area-inset-bottom)) calc(6px + env(safe-area-inset-left));
  color: #e7edf2;
  min-height: var(--app-height, 100vh);
  box-sizing: border-box;
  overflow: hidden;
}

#app-root.orientation-locked > :not(.orientation-overlay) {
  visibility: hidden;
  pointer-events: none;
}

.orientation-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(3, 6, 12, 0.96);
  z-index: 10000;
  text-align: center;
}

.orientation-overlay__card {
  max-width: 380px;
  width: 100%;
  background: rgba(10, 20, 35, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 16px;
  padding: 22px;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.55);
}

.orientation-overlay__card h3 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #f0f9ff;
}

.orientation-overlay__card p {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.4;
}

</style>
