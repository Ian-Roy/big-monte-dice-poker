<template>
  <div id="app-shell" ref="shellEl">
    <DiceViewport :bounds="diceLayerBounds" :layer-mode="diceVisibility" />

    <div ref="controlsEl" class="top-controls">
      <RollActionButton :on-force-show="showDice" />
      <div class="score-total" aria-live="polite">
        <span class="label">Total</span>
        <strong class="value">{{ totals.grand }}</strong>
      </div>
      <button type="button" class="dice-toggle" @click="toggleDiceVisibility">
        {{ diceVisibility === 'visible' ? 'Hide dice' : 'Show dice' }}
      </button>
    </div>
    <ScoreDicePreview class="top-dice-preview" />
    <main class="layout">
      <section class="pane">
        <DiceFacesRow />
        <RollBar />
      </section>
      <section class="pane">
        <ScoreTable :disabled="scoreUiDisabled" @select="handleSelect" />
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
import DiceFacesRow from './components/ui/DiceFacesRow.vue';
import RollActionButton from './components/ui/RollActionButton.vue';
import RollBar from './components/ui/RollBar.vue';
import ScoreTable from './components/ui/ScoreTable.vue';
import ConfirmDialog from './components/ui/ConfirmDialog.vue';
import ToastStack from './components/ui/ToastStack.vue';
import ScoreDicePreview from './components/ui/ScoreDicePreview.vue';
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
const lastDiceBounds = ref<DiceLayerBounds | null>(null);
const totals = computed(() => store.totals);
const scoreUiDisabled = computed(() => diceVisibility.value === 'visible');
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
}

function showDice() {
  diceVisibility.value = 'visible';
}

function updateDiceLayerBounds(triggeredByResize = false) {
  const shell = shellEl.value;
  if (!shell) return;
  const rect = shell.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const controlsHeight = controlsEl.value?.getBoundingClientRect().height ?? 0;
  const safeTop = controlsHeight + 8;
  const isMobile = window.innerWidth <= 900;

  let nextBounds: DiceLayerBounds;

  if (isMobile) {
    const width = window.innerWidth;
    const top = safeTop;
    const height = Math.max(window.innerHeight - safeTop, 360);
    nextBounds = {
      width,
      height,
      left: 0,
      top
    };
  } else {
    const targetWidth = Math.min(window.innerWidth, rect.width);
    const left =
      targetWidth < window.innerWidth ? rect.left + (rect.width - targetWidth) / 2 : 0;
    const top = Math.max(rect.top, 0) + safeTop;
    const availableHeight = Math.max(rect.height - safeTop, 0);
    const viewportHeight = Math.max(window.innerHeight - Math.max(rect.top, 0) - safeTop, 0);
    const targetHeight = Math.max(Math.min(availableHeight, viewportHeight), 420);
    nextBounds = {
      width: targetWidth,
      height: targetHeight,
      left: Math.max(left, 0),
      top
    };
  }

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
  max-width: 1100px;
  margin: 0 auto;
  padding: 12px 12px 40px;
  color: #e7edf2;
  min-height: 100vh;
}

.top-controls {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 6px 0 10px;
  backdrop-filter: blur(6px);
}

.dice-toggle {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(122, 211, 255, 0.5);
  color: #e7edf2;
  border-radius: 12px;
  padding: 10px 12px;
  font-weight: 700;
  cursor: pointer;
  min-width: 150px;
  transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
}

.dice-toggle:hover {
  border-color: rgba(146, 227, 255, 0.8);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}

.dice-toggle:active {
  transform: translateY(1px);
}

.top-dice-preview {
  margin: 6px 0 12px;
  justify-content: center;
  display: flex;
}

.score-total {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  min-width: 120px;
  color: #9ad5ff;
}

.score-total .value {
  font-size: 20px;
  color: #ffc857;
}

.layout {
  display: grid;
  gap: 14px;
}

.pane {
  background: linear-gradient(135deg, rgba(2, 37, 52, 0.8), rgba(3, 23, 40, 0.92));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 6;
}
</style>
