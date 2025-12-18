<template>
  <div class="roll-bar">
    <div v-if="isMultiplayer" class="roll-bar__multi" aria-label="Your score and current leader score">
      <div class="metric">
        <span class="metric__label">You</span>
        <span class="metric__value">{{ totals.grand }}</span>
      </div>
      <div class="metric metric--leader">
        <span class="metric__label">Leader</span>
        <span class="metric__value">{{ leaderScore }}</span>
      </div>
    </div>
    <div v-else class="roll-bar__highlight">
      <span class="total">
        Total <strong>{{ totals.grand }}</strong>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useGameStore } from '../../stores/gameStore';

const store = useGameStore();
const totals = computed(() => store.totals);
const isMultiplayer = computed(() => store.isMultiplayer);
const leaderScore = computed(() => store.leaderPlayer?.state?.totals?.grand ?? totals.value.grand);
</script>

<style scoped>
.roll-bar {
  display: flex;
  align-items: center;
  background: rgba(7, 24, 38, 0.85);
  border: 1px solid rgba(124, 210, 255, 0.4);
  border-radius: 14px;
  padding: 10px 16px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
}

.roll-bar__highlight {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 600;
  color: #cde6ff;
  white-space: nowrap;
}

.roll-bar__highlight .total strong {
  color: #ffc857;
  font-size: 20px;
  font-weight: 700;
  margin-left: 6px;
}

.roll-bar__multi {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.metric__label {
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
}

.metric__value {
  font-weight: 800;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  color: rgba(235, 246, 255, 0.95);
}

.metric--leader .metric__value {
  color: #ffc857;
}
</style>
