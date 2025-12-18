<template>
  <div class="score-dice-preview" aria-label="Current dice roll; tap a die to lock or unlock it">
    <div class="score-dice-canvas-wrap" :class="{ disabled: !canToggleHolds }">
      <canvas
        ref="canvasEl"
        class="score-dice-canvas"
        role="img"
        @pointerdown="handleScoreDicePointerDown"
      />
      <div v-if="canvasOverlayText" class="score-dice-overlay">
        <span>{{ canvasOverlayText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";

import { useGameStore } from "../../stores/gameStore";
import { rgba } from "../../shared/color";

const canvasEl = ref<HTMLCanvasElement | null>(null);
const store = useGameStore();
const diceValues = computed(() => store.diceSnapshot.values);
const holds = computed(() => store.diceSnapshot.locks);
const isRolling = computed(() => store.isRolling);
const rollsThisRound = computed(() => store.rollsThisRound ?? 0);
const serviceReady = computed(() => store.serviceReady);
const canToggleHolds = computed(
  () => serviceReady.value && !isRolling.value && rollsThisRound.value > 0
);
const canvasOverlayText = computed(() => {
  if (!serviceReady.value) return "Loading dice...";
  if (isRolling.value) return "Rolling...";
  if (rollsThisRound.value === 0) return "Roll first";
  return "";
});

const DIE_SIZE = 40;
const DIE_SPACING = 8;
const DIE_PADDING = 10;
const DIE_COUNT = 5;
const DIE_TOGGLE_TOLERANCE = 8;
const previewColors = computed(() => {
  const base = store.activeDiceColorHex;
  const held = store.activeHeldColorHex;
  return {
    default: {
      fill: rgba(base, 0.18),
      stroke: rgba(base, 0.7),
      text: "#dbeaee"
    },
    held: {
      fill: rgba(held, 0.26),
      stroke: held,
      text: "#f1fff6"
    }
  };
});

function drawDice() {
  if (typeof window === "undefined") return;
  const canvas = canvasEl.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const devicePixelRatio = window.devicePixelRatio || 1;
  const previewWidth =
    DIE_COUNT * DIE_SIZE + (DIE_COUNT - 1) * DIE_SPACING + DIE_PADDING * 2;
  const previewHeight = DIE_SIZE + DIE_PADDING * 2;
  canvas.width = previewWidth * devicePixelRatio;
  canvas.height = previewHeight * devicePixelRatio;
  canvas.style.width = `${previewWidth}px`;
  canvas.style.height = `${previewHeight}px`;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, previewWidth, previewHeight);

  const baseY = DIE_PADDING;
  diceValues.value.slice(0, DIE_COUNT).forEach((value, idx) => {
    const isHeld = !!holds.value[idx];
    const x = DIE_PADDING + idx * (DIE_SIZE + DIE_SPACING);
    const palette = isHeld ? previewColors.value.held : previewColors.value.default;

    ctx.fillStyle = palette.fill;
    ctx.strokeStyle = palette.stroke;
    ctx.lineWidth = 1.5;
    drawRoundedRect(
      ctx,
      x,
      baseY,
      DIE_SIZE,
      DIE_SIZE,
      12,
      ctx.fillStyle,
      ctx.strokeStyle
    );

    ctx.fillStyle = palette.fill;
    ctx.fillRect(x + 2, baseY + 2, DIE_SIZE - 4, DIE_SIZE - 4);

    ctx.fillStyle = palette.text;
    ctx.font = '600 20px "JetBrains Mono", "DM Mono", "Fira Code", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      typeof value === "number" ? `${value}` : "?",
      x + DIE_SIZE / 2,
      baseY + DIE_SIZE / 2
    );
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke: string
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.fill();
  ctx.stroke();
}

let animationFrame: number | null = null;
function scheduleDraw() {
  if (animationFrame !== null) {
    if (typeof window !== "undefined") {
      cancelAnimationFrame(animationFrame);
    }
    animationFrame = null;
  }
  if (typeof window === "undefined") {
    drawDice();
    return;
  }
  animationFrame = window.requestAnimationFrame(drawDice);
}

function getDieIndexFromPreviewPointer(event: PointerEvent) {
  const canvas = canvasEl.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  const hitYStart = DIE_PADDING - DIE_TOGGLE_TOLERANCE;
  const hitYEnd = DIE_PADDING + DIE_SIZE + DIE_TOGGLE_TOLERANCE;
  if (localY < hitYStart || localY > hitYEnd) return null;

  for (let idx = 0; idx < DIE_COUNT; idx += 1) {
    const dieStart = DIE_PADDING + idx * (DIE_SIZE + DIE_SPACING);
    const dieEnd = dieStart + DIE_SIZE;
    if (localX >= dieStart - DIE_TOGGLE_TOLERANCE && localX <= dieEnd + DIE_TOGGLE_TOLERANCE) {
      return idx;
    }
  }
  return null;
}

function handleScoreDicePointerDown(event: PointerEvent) {
  if (!canToggleHolds.value) return;
  const dieIndex = getDieIndexFromPreviewPointer(event);
  if (dieIndex === null) return;
  const dieValue = diceValues.value[dieIndex];
  if (typeof dieValue !== "number") return;
  store.toggleHold(dieIndex);
  event.preventDefault();
  event.stopPropagation();
}

onMounted(() => {
  scheduleDraw();
  window.addEventListener("resize", scheduleDraw);
});

onBeforeUnmount(() => {
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  window.removeEventListener("resize", scheduleDraw);
});

watch([diceValues, holds], scheduleDraw, { immediate: true });
watch([() => store.activeDiceColorHex, () => store.activeHeldColorHex], scheduleDraw);
</script>

<style scoped>
.score-dice-preview {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

.score-dice-canvas-wrap {
  position: relative;
  display: inline-flex;
}

.score-dice-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  color: rgba(223, 233, 255, 0.92);
  background: linear-gradient(180deg, rgba(5, 13, 24, 0.82), rgba(5, 13, 24, 0.75));
  border-radius: 14px;
  pointer-events: none;
  letter-spacing: 0.04em;
}

.score-dice-canvas {
  width: 252px;
  height: 60px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(3, 14, 27, 0.75);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  touch-action: manipulation;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.score-dice-canvas-wrap.disabled .score-dice-canvas {
  cursor: not-allowed;
  opacity: 0.82;
}

.score-dice-canvas:focus-visible {
  outline: none;
}

</style>
