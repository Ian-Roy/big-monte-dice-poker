<template>
  <div id="app-shell">
    <header class="hero">
      <div class="title">
        <div class="eyebrow">Big Monte</div>
        <h1>Dice Poker</h1>
      </div>
    </header>
    <main class="layout">
      <section class="pane">
        <DiceViewport />
        <LockRow />
        <RollBar />
      </section>
      <section class="pane">
        <ScoreTable @select="handleSelect" />
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
import { computed, ref, watch } from 'vue';

import DiceServiceBridge from './components/DiceServiceBridge.vue';
import DiceViewport from './components/ui/DiceViewport.vue';
import LockRow from './components/ui/LockRow.vue';
import RollBar from './components/ui/RollBar.vue';
import ScoreTable from './components/ui/ScoreTable.vue';
import ConfirmDialog from './components/ui/ConfirmDialog.vue';
import ToastStack from './components/ui/ToastStack.vue';
import type { CategoryKey } from './game/engine';
import { useGameStore } from './stores/gameStore';

// Initialize the store now so upcoming Vue components can subscribe to state.
const store = useGameStore();

const pendingCategory = ref<CategoryKey | null>(null);
const toasts = ref<string[]>([]);

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
  max-width: 1100px;
  margin: 0 auto;
  padding: 12px 12px 40px;
  color: #e7edf2;
}

.hero {
  padding: 12px 6px;
}

.title .eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  color: #9ad5ff;
}

.title h1 {
  margin: 0;
  font-size: clamp(28px, 4vw, 38px);
  letter-spacing: 0.02em;
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
}
</style>
