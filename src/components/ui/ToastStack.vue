<template>
  <div class="toast-stack">
    <div v-for="toast in toasts" :key="toast.id" class="toast">
      {{ toast.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Toast } from '../../composables/useToasts';

defineProps<{
  toasts: Toast[];
}>();
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: 16px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 9500;
  gap: 8px;
  flex-direction: column;
  align-items: center;
}
.toast {
  background: rgba(20, 24, 40, 0.94);
  color: #e7edf2;
  padding: 10px 14px;
  border-radius: 10px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(122, 211, 255, 0.4);
}
</style>
