<template>
  <div id="app-root" :class="{ 'orientation-locked': orientationLocked }">
    <TitlePage
      v-if="currentPage === 'title'"
      :can-resume="canResumeGame"
      :summary="titleSummary"
      @resume="handleResumeGame"
      @start="handleStartGame"
      @settings="navigateTo('settings')"
    />
    <SettingsPage
      v-else-if="currentPage === 'settings'"
      @back="navigateTo('title')"
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
      />
      <DiceServiceBridge />
      <ConfirmDialog
        v-if="pendingCategory"
        :title="dialogTitle"
        :message="dialogMessage"
        @confirm="confirmScore"
        @cancel="clearDialog"
      />
      <ToastStack :toasts="toasts" />
    </div>
    <div v-if="orientationLocked" class="orientation-overlay">
      <div class="orientation-overlay__card">
        <h3>Rotate your device</h3>
        <p>Big Monte Dice Poker only plays in portrait on mobile. Turn your device upright to keep rolling.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import DiceServiceBridge from './components/DiceServiceBridge.vue';
import AppBottomPanel from './components/layout/AppBottomPanel.vue';
import AppTopControls from './components/layout/AppTopControls.vue';
import ConfirmDialog from './components/ui/ConfirmDialog.vue';
import ToastStack from './components/ui/ToastStack.vue';
import SettingsPage from './pages/SettingsPage.vue';
import TitlePage from './pages/TitlePage.vue';
import { useOrientationLock } from './composables/useOrientationLock';
import { useToasts } from './composables/useToasts';
import type { CategoryKey } from './game/engine';
import type { ActiveLayer } from './shared/appUi';
import { useGameStore } from './stores/gameStore';

// Initialize the store now so upcoming Vue components can subscribe to state.
const store = useGameStore();

const { orientationLocked } = useOrientationLock({ maxMobileWidth: 900 });
const currentPage = ref<'title' | 'settings' | 'game'>('title');
const activeLayer = ref<ActiveLayer>('dice');
const diceVisibility = computed<'visible' | 'hidden'>(() => {
  if (orientationLocked.value) return 'hidden';
  return activeLayer.value === 'dice' ? 'visible' : 'hidden';
});
const bodyScrollLocked = computed(() => currentPage.value === 'game' && !orientationLocked.value);

const pendingCategory = ref<CategoryKey | null>(null);
const { toasts, pushToast } = useToasts({ max: 3, durationMs: 1800 });

const dialogTitle = computed(() => {
  if (!pendingCategory.value) return '';
  const cat = store.categories.find((c) => c.key === pendingCategory.value);
  return cat ? `Score ${cat.label}?` : 'Score this category?';
});

const dialogMessage = computed(() => {
  if (!pendingCategory.value) return '';
  const cat = store.categories.find((c) => c.key === pendingCategory.value);
  if (!cat) return '';
  const preview =
    store.engineState.dice.every((v) => typeof v === 'number')
      ? store.previewCategory(cat.key)
      : null;
  const scoreText = typeof preview === 'number' ? preview : '0';
  return `This will add ${scoreText} point${scoreText === '1' ? '' : 's'} and end this round.`;
});

const scorableCategories = computed(() =>
  store.engineState.categories.filter((cat) => cat.interactive !== false)
);
const scoredCategoryCount = computed(() =>
  scorableCategories.value.filter((cat) => cat.scored).length
);
const canResumeGame = computed(() => {
  const state = store.engineState;
  return (
    state.completed ||
    scoredCategoryCount.value > 0 ||
    state.rollsThisRound > 0 ||
    state.currentRound > 1
  );
});
const titleSummary = computed(() => ({
  round: store.engineState.currentRound,
  maxRounds: store.engineState.maxRounds,
  scoredCount: scoredCategoryCount.value,
  totalScorable: scorableCategories.value.length,
  score: store.totals.grand ?? 0
}));

function navigateTo(page: typeof currentPage.value) {
  currentPage.value = page;
}

function handleSelect(key: CategoryKey) {
  pendingCategory.value = key;
}

function clearDialog() {
  pendingCategory.value = null;
}

function confirmScore() {
  if (!pendingCategory.value) return;
  const key = pendingCategory.value;
  try {
    store.scoreCategory(key);
    const cat = store.categories.find((c) => c.key === key);
    pushToast(cat ? `${cat.label} scored` : 'Scored');
  } catch (err) {
    pushToast((err as Error).message);
  } finally {
    pendingCategory.value = null;
  }
}

function setActiveLayer(layer: ActiveLayer) {
  activeLayer.value = layer;
}

function showDice() {
  setActiveLayer('dice');
}

function handleResumeGame() {
  currentPage.value = 'game';
  setActiveLayer(store.engineState.completed ? 'summary' : 'dice');
}

function handleStartGame() {
  store.resetGame();
  setActiveLayer('dice');
  currentPage.value = 'game';
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
  () => store.engineState.completed,
  (complete) => {
    if (!complete) return;
    if (currentPage.value !== 'game') return;
    setActiveLayer('summary');
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
