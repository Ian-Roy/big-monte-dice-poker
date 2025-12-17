<template>
  <div
    class="dice-viewport"
    :class="{ 'dice-viewport--hidden': layerMode === 'hidden' }"
    :inert="layerMode === 'hidden'"
  >
    <div id="dice-box"></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  layerMode: 'visible' | 'hidden';
}>();
</script>

<style scoped>
.dice-viewport {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  overflow: hidden;
  z-index: 18;
  background: radial-gradient(circle at 30% 30%, rgba(54, 109, 146, 0.35), transparent 42%),
    radial-gradient(circle at 70% 20%, rgba(91, 166, 215, 0.28), transparent 38%),
    linear-gradient(145deg, rgba(5, 17, 31, 0.9), rgba(2, 6, 12, 0.95));
}

.dice-viewport--hidden {
  display: none;
}

#dice-box {
  position: absolute;
  inset: 0;
  pointer-events: auto;
}

:global(#dice-box canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  transform-origin: center top;
  pointer-events: auto;
}
</style>
