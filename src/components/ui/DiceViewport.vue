<template>
  <div class="dice-viewport">
    <div id="dice-box"></div>
  </div>
</template>

<script setup lang="ts">
// Dice-Box renders into #dice-box; layout handled by CSS below.
</script>

<style scoped>
.dice-viewport {
  position: relative;
  width: 100%;
  height: clamp(320px, 40vh, 520px);
}

.dice-viewport #dice-box {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.dice-viewport #dice-box canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}
</style>
