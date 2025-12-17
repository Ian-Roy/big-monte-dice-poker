<template>
  <button
    class="score-row"
    :class="{ scored: category.scored, inactive: isInactive }"
    type="button"
    :disabled="category.scored || isInactive"
    :aria-disabled="category.scored || isInactive ? 'true' : 'false'"
    @click="onScore"
  >
    <span class="label">{{ category.label }}</span>
    <div class="details">
      <span class="value">
        <template v-if="category.scored">
          {{ category.score ?? 0 }}
        </template>
        <template v-else-if="category.interactive === false">
          —
        </template>
        <template v-else-if="preview !== null">
          +{{ preview }}
        </template>
        <template v-else>
          Tap to score
        </template>
      </span>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { CategoryKey, ScoreCategoryState } from '../../game/engine';
import { useGameStore } from '../../stores/gameStore';

const props = defineProps<{
  category: ScoreCategoryState;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [CategoryKey];
}>();

const store = useGameStore();
const isDisabled = computed(() => props.disabled === true);
const isInactive = computed(() => isDisabled.value || props.category.interactive === false);

const preview = computed(() => {
  if (isDisabled.value || props.category.scored || props.category.interactive === false) return null;
  try {
    return store.engineState.dice.every((v) => typeof v === 'number')
      ? store.previewCategory?.(props.category.key) ?? null
      : null;
  } catch {
    return null;
  }
});

function onScore() {
  if (isDisabled.value || props.category.scored || props.category.interactive === false) return;
  emit('select', props.category.key);
}

</script>

<style scoped>
.score-row {
  width: 100%;
  text-align: left;
  background: rgba(5, 22, 34, 0.9);
  color: #e7edf2;
  border: 1px solid rgba(122, 211, 255, 0.4);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
}

.score-row.scored {
  background: rgba(26, 43, 59, 0.9);
  border-color: #ffc857;
}

.score-row.inactive {
  border-style: dashed;
  cursor: default;
}

.score-row:disabled {
  opacity: 0.75;
}

.label {
  font-weight: 700;
  font-size: 15px;
}

.details {
  display: flex;
  align-items: center;
  gap: 8px;
}

.value {
  font-size: 15px;
  color: #b7e2ff;
}

.score-row.scored .value {
  color: #ffc857;
}

</style>
