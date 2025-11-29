<template>
  <div class="score-table">
    <div class="section">
      <h3>Upper Section</h3>
      <div class="rows">
        <ScoreRow
          v-for="cat in upper"
          :key="cat.key"
          :category="cat"
          @select="onSelect"
        />
      </div>
    </div>
    <div class="section">
      <h3>Lower Section</h3>
      <div class="rows">
        <ScoreRow
          v-for="cat in lower"
          :key="cat.key"
          :category="cat"
          @select="onSelect"
        />
      </div>
    </div>
    <div class="totals">
      <div class="total-line">
        <span>Upper</span>
        <span>{{ totals.upper }}</span>
      </div>
      <div class="total-line">
        <span>Bonus</span>
        <span>{{ totals.bonus }}</span>
      </div>
      <div class="total-line">
        <span>Lower</span>
        <span>{{ totals.lower }}</span>
      </div>
      <div class="total-line grand">
        <span>Total</span>
        <span>{{ totals.grand }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useGameStore } from '../../stores/gameStore';
import ScoreRow from './ScoreTableRow.vue';

const store = useGameStore();
const categories = computed(() => store.categories);
const totals = computed(() => store.totals);

const upper = computed(() => categories.value.filter((c) => c.section === 'upper' || c.key === 'upper-bonus'));
const lower = computed(() => categories.value.filter((c) => c.section === 'lower'));

const emit = defineEmits<{
  select: [import('../../game/engine').CategoryKey];
}>();

function onSelect(key: import('../../game/engine').CategoryKey) {
  emit('select', key);
}
</script>

<style scoped>
.score-table {
  background: rgba(11, 26, 40, 0.9);
  border: 1px solid rgba(122, 211, 255, 0.35);
  border-radius: 14px;
  padding: 14px;
  color: #e7edf2;
  display: grid;
  gap: 12px;
}

.section h3 {
  margin: 0 0 8px;
  font-size: 15px;
  color: #9ad5ff;
}

.rows {
  display: grid;
  gap: 8px;
}

.totals {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 10px;
  display: grid;
  gap: 6px;
}

.total-line {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
}

.grand {
  font-weight: 700;
  color: #ffc857;
}
</style>
