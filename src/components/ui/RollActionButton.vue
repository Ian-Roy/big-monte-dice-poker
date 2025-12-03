<template>
  <button
    class="roll-action"
    :disabled="disabled"
    type="button"
    @click="handleRoll"
  >
    <span v-if="isRolling">Rolling...</span>
    <span v-else-if="rollsLeft > 0">
      Roll · {{ rollButtonLabel }}
    </span>
    <span v-else>No rolls left</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useGameStore } from '../../stores/gameStore';

const props = defineProps<{
  onForceShow?: () => void;
}>();

const store = useGameStore();
const state = computed(() => store.engineState);
const rollsLeft = computed(() =>
  Math.max(0, (store.rollLimit ?? 0) - (store.rollsThisRound ?? 0))
);
const isRolling = computed(() => store.isRolling);
const serviceReady = computed(() => store.serviceReady);

const rollButtonLabel = computed(() => {
  const rolls = rollsLeft.value;
  if (rolls <= 1) {
    return rolls === 1 ? "1 roll left" : "No rolls left";
  }
  return `${rolls} rolls left`;
});

const disabled = computed(() => {
  if (!serviceReady.value) return true;
  if (store.isRolling) return true;
  if (state.value.completed) return true;
  if (rollsLeft.value <= 0) return true;
  return false;
});

async function handleRoll() {
  props.onForceShow?.();
  if (rollsLeft.value === (store.rollLimit ?? 0)) {
    await store.rollAll();
  } else {
    await store.rerollUnheld();
  }
}
</script>

<style scoped>
.roll-action {
  background: linear-gradient(120deg, #1f7bb6, #25a4e0);
  border: none;
  color: #fff;
  font-weight: 700;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  min-width: 150px;
  transition: opacity 120ms ease, transform 120ms ease, box-shadow 120ms ease;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
}

.roll-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.roll-action:not(:disabled):active {
  transform: translateY(1px);
}

</style>
