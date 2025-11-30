<template>
  <div class="dice-faces-row">
    <div
      v-for="(value, idx) in dice"
      :key="idx"
      class="die-card"
      :class="{ empty: !hasFace(value), held: holds[idx] }"
    >
      <div class="die-visual">
        <div v-if="faceStyle(value)" class="die-face" :style="faceStyle(value)" />
        <div v-else class="die-placeholder">?</div>
      </div>
      <div class="die-meta">
        <span class="die-label">Die {{ idx + 1 }}</span>
        <span v-if="holds[idx]" class="die-status">Held</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useDiceSprites } from '../../composables/useDiceSprites';
import { useGameStore } from '../../stores/gameStore';

const store = useGameStore();
const sprites = useDiceSprites();

const dice = computed(() => store.diceSnapshot.values);
const holds = computed(() => store.diceSnapshot.locks);
const SPRITE_SCALE = 0.68;

function faceStyle(val: number | null) {
  const frame = typeof val === 'number' ? sprites.frames[val] : null;
  if (!frame) return null;
  const { x, y, w, h } = frame;
  const scale = SPRITE_SCALE;
  const bgSize = `${sprites.sheetSize.w * scale}px ${sprites.sheetSize.h * scale}px`;
  return {
    width: `${w * scale}px`,
    height: `${h * scale}px`,
    backgroundImage: `url(${sprites.url})`,
    backgroundSize: bgSize,
    backgroundPosition: `-${x * scale}px -${y * scale}px`,
    backgroundRepeat: 'no-repeat'
  };
}

function hasFace(val: number | null) {
  return typeof val === 'number' && !!sprites.frames[val];
}
</script>

<style scoped>
.dice-faces-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  padding: 10px 0;
}

.die-card {
  background: linear-gradient(145deg, rgba(7, 28, 46, 0.94), rgba(5, 20, 32, 0.88));
  border: 1px solid rgba(122, 211, 255, 0.55);
  border-radius: 12px;
  padding: 10px 8px;
  color: #e7edf2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-height: 112px;
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.25);
}

.die-card.held {
  border-color: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25), 0 10px 18px rgba(0, 0, 0, 0.25);
}

.die-card.empty {
  border-style: dashed;
  opacity: 0.82;
}

.die-visual {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  display: grid;
  place-items: center;
}

.die-face {
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.32));
}

.die-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.5);
  color: rgba(255, 255, 255, 0.7);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.die-label {
  font-size: 14px;
  opacity: 0.9;
}

.die-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.die-status {
  font-size: 12px;
  font-weight: 700;
  color: #a3e9b7;
  background: rgba(34, 197, 94, 0.18);
  border: 1px solid rgba(34, 197, 94, 0.4);
  padding: 3px 8px;
  border-radius: 999px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

@media (max-width: 720px) {
  .die-visual {
    width: 62px;
    height: 62px;
  }

  .die-placeholder {
    width: 52px;
    height: 52px;
  }
}
</style>
