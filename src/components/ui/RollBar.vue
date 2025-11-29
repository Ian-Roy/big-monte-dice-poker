<template>
  <div class="roll-bar">
    <div class="info">
      <div class="line">
        Round {{ state.currentRound }}/{{ state.maxRounds }}
      </div>
      <div class="line">Total: {{ totals.grand }}</div>
    </div>
    <button
      class="roll-btn"
      :disabled="disabled"
      type="button"
      @click="handleRoll"
    >
      <span v-if="isRolling">Rolling...</span>
      <span v-else-if="rollsLeft > 0">Roll ({{ rollsLeft }})</span>
      <span v-else>No rolls left</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useGameStore } from '../../stores/gameStore';

const store = useGameStore();
const state = computed(() => store.engineState);
const totals = computed(() => store.totals);
const rollsLeft = computed(() => Math.max(0, (store.rollLimit ?? 0) - (store.rollsThisRound ?? 0)));
const isRolling = computed(() => store.isRolling);
const serviceReady = computed(() => store.serviceReady);

const disabled = computed(() => {
  if (!serviceReady.value) return true;
  if (store.isRolling) return true;
  if (state.value.completed) return true;
  if (rollsLeft.value <= 0) return true;
  return false;
});

async function handleRoll() {
  if (rollsLeft.value === (store.rollLimit ?? 0)) {
    await store.rollAll();
  } else {
    await store.rerollUnheld();
  }
}
</script>

<style scoped>
.roll-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(4, 25, 39, 0.82);
  border: 1px solid rgba(122, 211, 255, 0.3);
  border-radius: 12px;
  padding: 12px 14px;
  color: #e7edf2;
  gap: 12px;
  flex-wrap: wrap;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14px;
}

.roll-btn {
  background: linear-gradient(120deg, #1f7bb6, #25a4e0);
  border: none;
  color: #fff;
  font-weight: 700;
  padding: 12px 16px;
  border-radius: 10px;
  cursor: pointer;
  min-width: 140px;
  transition: opacity 120ms ease, transform 120ms ease;
}

.roll-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.roll-btn:not(:disabled):active {
  transform: translateY(1px);
}
</style>
