<template>
  <div id="app-shell" ref="shellEl" :class="{ 'orientation-locked': orientationLocked }">
    <DiceViewport :bounds="diceLayerBounds" :layer-mode="diceVisibility" />

    <div ref="controlsEl" class="top-controls">
      <div class="header-panel">
        <div class="header-row">
          <RollActionButton :on-force-show="showDice" />
          <RollBar />
        </div>
        <ScoreDicePreview class="top-dice-preview" />
      </div>
      <div class="layer-control-row">
        <button
          type="button"
          class="layer-control"
          :class="{ active: activeLayer === 'dice' }"
          aria-pressed="activeLayer === 'dice'"
          @click="setActiveLayer('dice')"
        >
          Dice layer
        </button>
        <button
          type="button"
          class="layer-control"
          :class="{ active: activeLayer === 'score' }"
          aria-pressed="activeLayer === 'score'"
          @click="setActiveLayer('score')"
        >
          Score card
        </button>
        <button
          type="button"
          class="layer-control"
          :class="{ active: activeLayer === 'summary' }"
          aria-pressed="activeLayer === 'summary'"
          @click="setActiveLayer('summary')"
        >
          Game summary
        </button>
      </div>
    </div>
    <main v-if="activeLayer !== 'dice'" class="layout">
      <section class="pane score-card">
        <ScoreTable v-if="activeLayer === 'score'" @select="handleSelect" />
        <EndGameSummary v-else />
      </section>
    </main>
    <DiceServiceBridge />
    <ConfirmDialog
      v-if="pendingCategory"
      :title="dialogTitle"
      :message="dialogMessage"
      @confirm="confirmScore"
      @cancel="clearDialog"
    />
    <ToastStack :toasts="toasts" />
    <div v-if="orientationLocked" class="orientation-overlay">
      <div class="orientation-overlay__card">
        <h3>Rotate your device</h3>
        <p>Big Monte Dice Poker only plays in portrait on mobile. Turn your device upright to keep rolling.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import DiceServiceBridge from './components/DiceServiceBridge.vue';
import DiceViewport from './components/ui/DiceViewport.vue';
import RollActionButton from './components/ui/RollActionButton.vue';
import RollBar from './components/ui/RollBar.vue';
import ScoreTable from './components/ui/ScoreTable.vue';
import ConfirmDialog from './components/ui/ConfirmDialog.vue';
import ToastStack from './components/ui/ToastStack.vue';
import ScoreDicePreview from './components/ui/ScoreDicePreview.vue';
import EndGameSummary from './components/ui/EndGameSummary.vue';
import type { CategoryKey } from './game/engine';
import { useGameStore } from './stores/gameStore';

// Initialize the store now so upcoming Vue components can subscribe to state.
const store = useGameStore();

type DiceLayerBounds = {
  width: number;
  height: number;
  left: number;
  top: number;
};

type ActiveLayer = 'dice' | 'score' | 'summary';

const shellEl = ref<HTMLElement | null>(null);
const controlsEl = ref<HTMLElement | null>(null);
const diceLayerBounds = ref<DiceLayerBounds | null>(null);
const lastDiceBounds = ref<DiceLayerBounds | null>(null);
const orientationLocked = ref(false);
const activeLayer = ref<ActiveLayer>('dice');
const diceVisibility = computed<'visible' | 'hidden'>(() => {
  if (orientationLocked.value) return 'hidden';
  return activeLayer.value === 'dice' ? 'visible' : 'hidden';
});
const isPortrait = ref(true);
const handleWindowResize = () => {
  evaluateOrientationLock();
  updateDiceLayerBounds(true);
};

const pendingCategory = ref<CategoryKey | null>(null);
const toasts = ref<string[]>([]);
let resizeObserver: ResizeObserver | null = null;
let orientationMedia: MediaQueryList | null = null;
let orientationCleanup: (() => void) | null = null;

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

function pushToast(text: string) {
  toasts.value = [...toasts.value.slice(-2), text];
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t !== text);
  }, 1800);
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
  if (activeLayer.value === layer) {
    if (layer === 'dice' && !orientationLocked.value) {
      nextTick(() => updateDiceLayerBounds());
    }
    return;
  }
  activeLayer.value = layer;
  nextTick(() => updateDiceLayerBounds());
}

function showDice() {
  setActiveLayer('dice');
}

function updateDiceLayerBounds(triggeredByResize = false) {
  if (orientationLocked.value) return;
  const shell = shellEl.value;
  if (!shell) return;
  const rect = shell.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const controlsHeight = controlsEl.value?.getBoundingClientRect().height ?? 0;
  const safeTop = controlsHeight + 8;
  const minHeight = window.innerWidth <= 900 ? 360 : 420;
  const width = Math.min(window.innerWidth, rect.width);
  const left =
    width < window.innerWidth ? rect.left + (rect.width - width) / 2 : 0;
  const top = Math.max(rect.top, 0) + safeTop;
  const height = Math.max(window.innerHeight - safeTop, minHeight);
  const nextBounds: DiceLayerBounds = {
    width,
    height,
    left: Math.max(left, 0),
    top
  };

  const sizeChanged =
    !lastDiceBounds.value ||
    nextBounds.width !== lastDiceBounds.value.width ||
    nextBounds.height !== lastDiceBounds.value.height;

  diceLayerBounds.value = nextBounds;
  lastDiceBounds.value = nextBounds;

  if (sizeChanged && !triggeredByResize) {
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  if (sizeChanged) {
    const payload = {
      nextBounds,
      shell: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left)
      },
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      }
    };
    console.info('[DiceLayer] bounds change', payload);
    console.info(
      '[DiceLayer] bounds summary',
      `layer ${nextBounds.width}x${nextBounds.height} @ (${nextBounds.left},${nextBounds.top}) | shell ${payload.shell.width}x${payload.shell.height} @ (${payload.shell.left},${payload.shell.top}) | window ${payload.window.innerWidth}x${payload.window.innerHeight} dpr=${payload.window.devicePixelRatio}`
    );
  }
}

function evaluateOrientationLock() {
  if (typeof window === 'undefined') return;
  if (!orientationMedia) {
    orientationMedia = window.matchMedia('(orientation: portrait)');
  }
  const portrait = orientationMedia.matches;
  const mobileViewport = window.innerWidth <= 900;
  isPortrait.value = portrait;
  const shouldLock = mobileViewport && !portrait;
  if (orientationLocked.value !== shouldLock) {
    orientationLocked.value = shouldLock;
  }
}

onMounted(() => {
  nextTick(() => {
    updateDiceLayerBounds();
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateDiceLayerBounds());
      if (shellEl.value) resizeObserver.observe(shellEl.value);
      if (controlsEl.value) resizeObserver.observe(controlsEl.value);
    }
  });
  if (typeof window !== 'undefined') {
    orientationMedia = window.matchMedia('(orientation: portrait)');
    const listener = () => evaluateOrientationLock();
    if (typeof orientationMedia.addEventListener === 'function') {
      orientationMedia.addEventListener('change', listener);
      orientationCleanup = () => orientationMedia?.removeEventListener('change', listener);
    } else {
      orientationMedia.addListener(listener);
      orientationCleanup = () => orientationMedia?.removeListener(listener);
    }
    evaluateOrientationLock();
  }
  window.addEventListener('resize', handleWindowResize);
  window.addEventListener('scroll', updateDiceLayerBounds, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize);
  window.removeEventListener('scroll', updateDiceLayerBounds);
  resizeObserver?.disconnect();
  resizeObserver = null;
  orientationCleanup?.();
  orientationCleanup = null;
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

watch(orientationLocked, (locked) => {
  if (!locked) {
    nextTick(() => updateDiceLayerBounds());
  }
});
</script>

<style scoped>
#app-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  max-width: 100vw;
  height: 100vh;
  margin: 0 auto;
  padding: 6px 6px 40px;
  color: #e7edf2;
  min-height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
}

:global(html),
:global(body) {
  width: 100%;
  margin: 0;
  overflow-x: hidden;
}

.top-controls {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 2px 0 6px;
  backdrop-filter: blur(6px);
  width: 100%;
  box-sizing: border-box;
}

.header-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(5, 14, 28, 0.85);
  border: 1px solid rgba(122, 211, 255, 0.35);
  border-radius: 12px;
  padding: 10px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.42);
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.header-row .roll-bar {
  flex: 1;
  min-width: 120px;
  max-width: 300px;
}

.top-dice-preview {
  margin: 0;
  justify-content: center;
  display: flex;
}

.layer-control-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  justify-content: center;
}

.layer-control {
  border-radius: 999px;
  border: 1px solid transparent;
  background: rgba(7, 26, 44, 0.85);
  color: rgba(255, 255, 255, 0.65);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 5px 12px;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
  white-space: nowrap;
}

.layer-control.active {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(255, 255, 255, 0.35);
  color: #b7e2ff;
}

.layer-control:focus-visible {
  outline: none;
  border-color: rgba(146, 227, 255, 0.8);
}

.score-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-height: 0;
}

.layout {
  display: grid;
  gap: 8px;
  width: 100%;
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  min-height: 0;
  overflow-x: hidden;
}

.pane {
  background: linear-gradient(135deg, rgba(5, 16, 30, 0.95), rgba(2, 8, 18, 0.97));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 10px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  position: relative;
  z-index: 6;
}

#app-shell.orientation-locked > :not(.orientation-overlay) {
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

@media (max-width: 640px) {
  .header-row .roll-bar {
    max-width: none;
  }

  .layer-control-row {
    justify-content: flex-start;
  }

  .layer-control {
    flex: 1;
    min-width: 0;
    text-align: center;
  }
}
</style>
