<template>
  <div class="overlay">
    <div class="card">
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <div class="actions">
        <button type="button" class="confirm" @click="$emit('confirm')">Confirm</button>
        <button type="button" class="cancel" @click="$emit('cancel')">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  message: string;
}>();
defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: grid;
  place-items: center;
  z-index: 9000;
  padding: 16px;
}
.card {
  background: rgba(11, 26, 40, 0.95);
  color: #e7edf2;
  border: 1px solid rgba(122, 211, 255, 0.5);
  border-radius: 12px;
  padding: 18px;
  max-width: 420px;
  width: min(420px, 100%);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
}
.card h3 {
  margin: 0 0 8px;
}
.card p {
  margin: 0 0 16px;
  line-height: 1.4;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
button {
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 700;
}
.confirm {
  background: linear-gradient(120deg, #1f7bb6, #25a4e0);
  color: #fff;
}
.cancel {
  background: rgba(255, 255, 255, 0.06);
  color: #e7edf2;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
</style>
