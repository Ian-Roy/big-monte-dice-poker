<template>
  <div
    class="handoff"
    :style="{ '--accent': diceColorHex, backgroundImage }"
    role="dialog"
    aria-modal="true"
    aria-label="Next player"
  >
    <div class="handoff__content">
      <p class="handoff__kicker">{{ kicker }}</p>
      <h2 class="handoff__name">{{ playerName }}</h2>
      <p class="handoff__hint">{{ hint }}</p>
      <button type="button" class="handoff__button" @click="emit('primary')">
        {{ buttonLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { rgba } from '../../shared/color';

const props = defineProps<{
  playerName: string;
  diceColorHex: string;
  kicker?: string;
  hint?: string;
  buttonLabel?: string;
}>();

const emit = defineEmits<{
  (event: 'primary'): void;
}>();

const kicker = props.kicker ?? 'Next player';
const hint = props.hint ?? 'When you have the phone, tap roll to start your turn.';
const buttonLabel = props.buttonLabel ?? 'Roll';

const backgroundImage = computed(() => {
  const accent = props.diceColorHex;
  return `radial-gradient(circle at top, ${rgba(accent, 0.22)}, rgba(3, 6, 14, 0.98))`;
});
</script>

<style scoped>
.handoff {
  position: fixed;
  inset: 0;
  z-index: 9600;
  display: grid;
  place-items: center;
  padding: 18px;
  box-sizing: border-box;
  background: rgba(3, 6, 14, 0.98);
}

.handoff__content {
  width: min(560px, 100%);
  border-radius: 26px;
  padding: 26px 22px;
  background: rgba(4, 10, 22, 0.94);
  border: 1px solid rgba(146, 227, 255, 0.28);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.72);
  color: #e7edf2;
  text-align: center;
}

.handoff__kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(146, 227, 255, 0.85);
}

.handoff__name {
  margin: 12px 0 8px;
  font-size: clamp(34px, 6vw, 54px);
  letter-spacing: -0.02em;
  color: rgba(255, 255, 255, 0.96);
  word-break: break-word;
}

.handoff__hint {
  margin: 0 0 18px;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.35;
}

.handoff__button {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: linear-gradient(120deg, rgba(59, 130, 246, 0.22), rgba(34, 197, 94, 0.24));
  color: rgba(255, 255, 255, 0.94);
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 14px 18px;
  cursor: pointer;
  width: min(320px, 100%);
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.45);
}

.handoff__button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(146, 227, 255, 0.6), 0 16px 30px rgba(0, 0, 0, 0.45);
}
</style>
