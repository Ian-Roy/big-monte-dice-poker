<template>
  <div class="overlay" role="dialog" aria-modal="true" aria-label="New high score">
    <form class="card" @submit.prevent="submit">
      <p class="kicker">New high score</p>
      <h3 class="score">{{ score }}</h3>
      <p class="message">Want your name on the leaderboard?</p>

      <label class="field">
        <span class="field__label">Player name</span>
        <input
          v-model="name"
          class="field__input"
          type="text"
          inputmode="text"
          autocomplete="nickname"
          maxlength="24"
        />
      </label>

      <div class="actions">
        <button type="submit" class="confirm" :disabled="!name.trim()">Save</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  score: number;
  initialName: string;
}>();

const emit = defineEmits<{
  (event: 'save', name: string): void;
}>();

const name = ref(props.initialName);

watch(
  () => props.initialName,
  (val) => {
    name.value = val;
  }
);

function submit() {
  emit('save', name.value);
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.62);
  z-index: 9700;
  padding: 18px;
}

.card {
  width: min(520px, 100%);
  border-radius: 18px;
  padding: 20px;
  background: rgba(4, 10, 22, 0.96);
  border: 1px solid rgba(146, 227, 255, 0.28);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
  color: #e7edf2;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(146, 227, 255, 0.85);
}

.score {
  margin: 0;
  font-size: clamp(34px, 5vw, 46px);
  letter-spacing: -0.02em;
  color: #ffc857;
  font-variant-numeric: tabular-nums;
}

.message {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.field__label {
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
}

.field__input {
  width: 100%;
  padding: 12px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.92);
  font-size: 15px;
  font-weight: 700;
  outline: none;
}

.field__input:focus-visible {
  border-color: rgba(146, 227, 255, 0.85);
  box-shadow: 0 0 0 2px rgba(146, 227, 255, 0.4);
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 6px;
}

button {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
}

.confirm {
  background: linear-gradient(120deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.34));
  color: rgba(223, 255, 231, 0.96);
  border-color: rgba(34, 197, 94, 0.5);
}

.confirm:hover,
.confirm:focus-visible {
  border-color: rgba(34, 197, 94, 0.85);
  background: linear-gradient(120deg, rgba(34, 197, 94, 0.28), rgba(34, 197, 94, 0.42));
  outline: none;
}

.confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
