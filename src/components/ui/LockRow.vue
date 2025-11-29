<template>
  <div class="lock-row">
    <button
      v-for="(die, idx) in dice"
      :key="idx"
      class="lock-slot"
      :class="{ held: holds[idx] }"
      type="button"
      @click="onToggle(idx)"
    >
      <div v-if="die && spriteUrl(die)" class="die-face" :style="faceStyle(die)" />
      <span v-else class="die-placeholder">?</span>
      <span class="label">Die {{ idx + 1 }}</span>
      <span class="status">{{ holds[idx] ? 'Held' : 'Unlocked' }}</span>
    </button>
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

function onToggle(idx: number) {
  store.toggleHold(idx);
}

function spriteUrl(val: number) {
  return sprites.frames[val] ? sprites.url : null;
}

function faceStyle(val: number) {
  const frame = sprites.frames[val];
  if (!frame) return {};
  const { x, y, w, h } = frame;
  const bgSize = `${sprites.sheetSize.w}px ${sprites.sheetSize.h}px`;
  return {
    width: `${w}px`,
    height: `${h}px`,
    backgroundImage: `url(${sprites.url})`,
    backgroundSize: bgSize,
    backgroundPosition: `-${x}px -${y}px`,
    backgroundRepeat: 'no-repeat'
  };
}
</script>

<style scoped>
.lock-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
  padding: 10px 0;
}

.lock-slot {
  background: rgba(7, 28, 46, 0.9);
  border: 2px solid rgba(122, 211, 255, 0.7);
  border-radius: 12px;
  padding: 10px 8px;
  color: #e7edf2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
}

.lock-slot.held {
  border-color: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
}

.die-face,
.die-placeholder {
  display: inline-flex;
  width: 62px;
  height: 62px;
  border-radius: 10px;
  align-items: center;
  justify-content: center;
}

.die-face {
  image-rendering: pixelated;
}

.die-placeholder {
  border: 1px dashed rgba(255, 255, 255, 0.4);
  color: rgba(255, 255, 255, 0.6);
}

.label {
  font-size: 14px;
  opacity: 0.9;
}

.status {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

@media (max-width: 720px) {
  .lock-slot {
    padding: 8px 6px;
  }
  .die-face,
  .die-placeholder {
    width: 52px;
    height: 52px;
  }
}
</style>
