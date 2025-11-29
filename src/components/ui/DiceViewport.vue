<template>
  <div
    class="dice-viewport"
    :class="{
      'dice-viewport--under': layerMode === 'under',
      'dice-viewport--hidden': layerMode === 'under'
    }"
    :style="layerStyle"
    aria-hidden="true"
  >
    <div id="dice-box"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Bounds = {
  width: number;
  height: number;
  left: number;
  top: number;
};

const props = defineProps<{
  bounds: Bounds | null;
  layerMode: 'over' | 'under';
}>();

const layerStyle = computed(() => {
  const b = props.bounds;
  if (!b || !b.width || !b.height) {
    return {
      width: '100vw',
      height: '100vh',
      left: '0px',
      top: '0px'
    };
  }
  return {
    width: `${b.width}px`,
    height: `${b.height}px`,
    left: `${b.left}px`,
    top: `${b.top}px`
  };
});
</script>

<style scoped>
.dice-viewport {
  position: fixed;
  pointer-events: none;
  overflow: hidden;
  z-index: 18;
  background: radial-gradient(circle at 30% 30%, rgba(54, 109, 146, 0.14), transparent 36%),
    radial-gradient(circle at 70% 20%, rgba(91, 166, 215, 0.12), transparent 32%),
    linear-gradient(145deg, rgba(7, 21, 35, 0.9), rgba(5, 15, 28, 0.92));
}

.dice-viewport--under {
  z-index: 1;
}

.dice-viewport--hidden #dice-box canvas {
  opacity: 0;
  visibility: hidden;
}

#dice-box {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

:global(#dice-box canvas) {
  width: 100% !important;
  height: 110% !important;
  display: block;
  position: absolute;
  top: -5%;
  left: 0;
  right: 0;
  transform-origin: center top;
}
</style>
