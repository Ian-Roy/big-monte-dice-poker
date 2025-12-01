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
        <template v-else-if="preview !== null">
          +{{ preview }}
        </template>
        <template v-else>
          Tap to score
        </template>
      </span>
      <div class="dice" v-if="scoredDice.length">
        <span v-for="(die, idx) in scoredDice" :key="idx" class="die">
          <span v-if="die.style" class="die-sprite" :style="die.style" />
          <span v-else class="die-fallback">{{ die.value }}</span>
        </span>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { CategoryKey, ScoreCategoryState } from '../../game/engine';
import type { DiceFaceFrame } from '../../composables/useDiceSprites';
import { useDiceSprites } from '../../composables/useDiceSprites';
import { useGameStore } from '../../stores/gameStore';

const props = defineProps<{
  category: ScoreCategoryState;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [CategoryKey];
}>();

const store = useGameStore();
const sprites = useDiceSprites();
const SPRITE_SCALE = 0.44;
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

const scoredDice = computed(() => {
  if (!props.category.scoredDice) return [];
  return [...props.category.scoredDice]
    .sort((a, b) => a - b)
    .map((value) => ({
      value,
      style: faceStyle(value)
    }));
});

function onScore() {
  if (isDisabled.value || props.category.scored || props.category.interactive === false) return;
  emit('select', props.category.key);
}

function faceStyle(val: number | null) {
  if (typeof val !== 'number') return null;
  const frame = sprites.frames[val] as DiceFaceFrame | undefined;
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

.dice {
  display: flex;
  align-items: center;
  gap: 6px;
}

.die {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.07);
  box-shadow: 0 8px 14px rgba(0, 0, 0, 0.2);
}

.die-sprite {
  image-rendering: pixelated;
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.35));
}

.die-fallback {
  font-size: 13px;
  color: #dbe9f2;
}
</style>
