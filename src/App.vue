<template>
  <div id="app-shell" ref="shellEl">
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
          :class="{ active: diceVisibility === 'visible' }"
          aria-pressed="diceVisibility === 'visible'"
          @click="toggleDiceVisibility"
        >
          Dice layer
        </button>
        <button
          type="button"
          class="layer-control"
          :class="{ active: activePane === 'score' }"
          aria-pressed="activePane === 'score'"
          @click="activePane = 'score'"
        >
          Score card
        </button>
        <button
          type="button"
          class="layer-control"
          :class="{ active: activePane === 'summary' }"
          aria-pressed="activePane === 'summary'"
          @click="activePane = 'summary'"
        >
          Game summary
        </button>
      </div>
    </div>
    <main class="layout">
      <section class="pane score-card">
        <ScoreTable v-if="activePane === 'score'" @select="handleSelect" />
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

const shellEl = ref<HTMLElement | null>(null);
const controlsEl = ref<HTMLElement | null>(null);
const diceLayerBounds = ref<DiceLayerBounds | null>(null);
const diceVisibility = ref<'visible' | 'hidden'>('visible');
const activePane = ref<'score' | 'summary'>('score');
const lastDiceBounds = ref<DiceLayerBounds | null>(null);
const handleWindowResize = () => updateDiceLayerBounds(true);

const pendingCategory = ref<CategoryKey | null>(null);
const toasts = ref<string[]>([]);
let resizeObserver: ResizeObserver | null = null;

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

function toggleDiceVisibility() {
  diceVisibility.value = diceVisibility.value === 'visible' ? 'hidden' : 'visible';
  nextTick(() => updateDiceLayerBounds());
}

function showDice() {
  diceVisibility.value = 'visible';
  nextTick(() => updateDiceLayerBounds());
}

function updateDiceLayerBounds(triggeredByResize = false) {
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

onMounted(() => {
  nextTick(() => {
    updateDiceLayerBounds();
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateDiceLayerBounds());
      if (shellEl.value) resizeObserver.observe(shellEl.value);
      if (controlsEl.value) resizeObserver.observe(controlsEl.value);
    }
  });
  window.addEventListener('resize', handleWindowResize);
  window.addEventListener('scroll', updateDiceLayerBounds, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize);
  window.removeEventListener('scroll', updateDiceLayerBounds);
  resizeObserver?.disconnect();
  resizeObserver = null;
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
