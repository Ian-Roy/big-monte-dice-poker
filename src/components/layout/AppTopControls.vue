<template>
  <div class="top-controls">
    <div class="header-panel">
      <div class="header-row">
        <RollActionButton :on-force-show="onShowDice" />
        <RollBar />
      </div>
      <ScoreDicePreview class="top-dice-preview" />
    </div>
    <div class="layer-control-row">
      <button
        type="button"
        class="layer-control"
        :class="{ active: activeLayer === 'dice' }"
        :aria-pressed="activeLayer === 'dice'"
        @click="emit('change-layer', 'dice')"
      >
        Dice layer
      </button>
      <button
        type="button"
        class="layer-control"
        :class="{ active: activeLayer === 'score' }"
        :aria-pressed="activeLayer === 'score'"
        @click="emit('change-layer', 'score')"
      >
        Score card
      </button>
      <button
        type="button"
        class="layer-control"
        :class="{ active: activeLayer === 'summary' }"
        :aria-pressed="activeLayer === 'summary'"
        @click="emit('change-layer', 'summary')"
      >
        Game summary
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import RollActionButton from '../ui/RollActionButton.vue';
import RollBar from '../ui/RollBar.vue';
import ScoreDicePreview from '../ui/ScoreDicePreview.vue';
import type { ActiveLayer } from '../../shared/appUi';

defineProps<{
  activeLayer: ActiveLayer;
  onShowDice?: () => void;
}>();

const emit = defineEmits<{
  (event: 'change-layer', layer: ActiveLayer): void;
}>();
</script>

<style scoped>
.top-controls {
  position: relative;
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
