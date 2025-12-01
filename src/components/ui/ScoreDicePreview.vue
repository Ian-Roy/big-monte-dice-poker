<template>
  <div class="score-dice-preview" aria-label="Current dice roll">
    <canvas ref="canvasEl" class="score-dice-canvas" role="img" />
    <div class="label">Current roll</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';

import { useGameStore } from '../../stores/gameStore';

const canvasEl = ref<HTMLCanvasElement | null>(null);
const store = useGameStore();
const diceValues = computed(() => store.diceSnapshot.values);
const holds = computed(() => store.diceSnapshot.locks);

const diffuseUrl = new URL('../../assets/dice-box/diffuse-light.png', import.meta.url).href;
const DIE_SIZE = 48;
const DIE_SPACING = 10;
const DIE_PADDING = 12;
const DIE_COUNT = 5;

const textureImage = new Image();
textureImage.src = diffuseUrl;

function drawDice() {
  if (typeof window === 'undefined') return;
  const canvas = canvasEl.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const devicePixelRatio = window.devicePixelRatio || 1;
  const previewWidth = DIE_COUNT * DIE_SIZE + (DIE_COUNT - 1) * DIE_SPACING + DIE_PADDING * 2;
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

    ctx.fillStyle = isHeld ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = isHeld ? '#22c55e' : 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, x, baseY, DIE_SIZE, DIE_SIZE, 12, ctx.fillStyle, ctx.strokeStyle);

    if (textureImage.complete) {
      const pattern = ctx.createPattern(textureImage, 'repeat');
      if (pattern) {
        ctx.save();
        ctx.translate(x + 2, baseY + 2);
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, DIE_SIZE - 4, DIE_SIZE - 4);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(x + 2, baseY + 2, DIE_SIZE - 4, DIE_SIZE - 4);
    }

    ctx.fillStyle = isHeld ? '#dfffe7' : '#f6fbff';
    ctx.font = '600 24px "JetBrains Mono", "DM Mono", "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typeof value === 'number' ? `${value}` : '?', x + DIE_SIZE / 2, baseY + DIE_SIZE / 2);
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
    if (typeof window !== 'undefined') {
      cancelAnimationFrame(animationFrame);
    }
    animationFrame = null;
  }
  if (typeof window === 'undefined') {
    drawDice();
    return;
  }
  animationFrame = window.requestAnimationFrame(drawDice);
}

onMounted(() => {
  textureImage.onload = () => scheduleDraw();
  textureImage.onerror = () => scheduleDraw();
  scheduleDraw();
  window.addEventListener('resize', scheduleDraw);
});

onBeforeUnmount(() => {
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  window.removeEventListener('resize', scheduleDraw);
});

watch([diceValues, holds], scheduleDraw, { immediate: true });
</script>

<style scoped>
.score-dice-preview {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.score-dice-canvas {
  width: 320px;
  height: 76px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(3, 14, 27, 0.75);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
}

.score-dice-preview .label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.85);
}
</style>
