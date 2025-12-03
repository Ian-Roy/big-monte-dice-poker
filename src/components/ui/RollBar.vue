<template>
  <div class="roll-bar">
    <div class="roll-bar__highlight">
      <span class="round">
        Round {{ state.currentRound }}/{{ state.maxRounds }}
      </span>
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
const state = computed(() => store.engineState);
const totals = computed(() => store.totals);
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
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 15px;
  font-weight: 600;
  color: #cde6ff;
}

.roll-bar__highlight .round {
  color: #8bd0ff;
}

.roll-bar__highlight .total strong {
  color: #ffc857;
  font-size: 20px;
  font-weight: 700;
  margin-left: 6px;
}

@media (max-width: 720px) {
  .roll-bar__highlight {
    justify-content: center;
  }
}
</style>
