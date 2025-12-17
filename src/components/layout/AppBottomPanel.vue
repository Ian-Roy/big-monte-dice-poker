<template>
  <div class="bottom-panel">
    <DiceViewport :layer-mode="diceLayerMode" />
    <main v-if="activeLayer !== 'dice'" class="layout">
      <section class="pane score-card">
        <ScoreTable v-if="activeLayer === 'score'" @select="emit('select', $event)" />
        <EndGameSummary
          v-else
          @back-to-title="emit('back-to-title')"
          @quit-game="emit('quit-game')"
        />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import DiceViewport from '../ui/DiceViewport.vue';
import EndGameSummary from '../ui/EndGameSummary.vue';
import ScoreTable from '../ui/ScoreTable.vue';
import type { CategoryKey } from '../../game/engine';
import type { ActiveLayer } from '../../shared/appUi';

defineProps<{
  activeLayer: ActiveLayer;
  diceLayerMode: 'visible' | 'hidden';
}>();

const emit = defineEmits<{
  (event: 'select', key: CategoryKey): void;
  (event: 'back-to-title'): void;
  (event: 'quit-game'): void;
}>();
</script>

<style scoped>
.bottom-panel {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.score-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-height: 0;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  width: 100%;
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  min-height: 0;
  overflow-x: hidden;
}

.pane {
  background: linear-gradient(135deg, rgba(5, 16, 30, 0.95), rgba(2, 8, 18, 0.97));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 10px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  min-width: 0;
  position: relative;
  z-index: 6;
}
</style>
