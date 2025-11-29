<template>
  <div class="roll-bar">
    <div class="info">
      <div class="line">
        Round {{ state.currentRound }}/{{ state.maxRounds }}
      </div>
      <div class="line">Total: {{ totals.grand }}</div>
      <div class="line subtle">Rolls left: {{ rollsLeft }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useGameStore } from '../../stores/gameStore';

const store = useGameStore();
const state = computed(() => store.engineState);
const totals = computed(() => store.totals);
const rollsLeft = computed(() => Math.max(0, (store.rollLimit ?? 0) - (store.rollsThisRound ?? 0)));
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
  display: grid;
  gap: 4px;
  font-size: 14px;
}

.subtle {
  opacity: 0.8;
}
</style>
