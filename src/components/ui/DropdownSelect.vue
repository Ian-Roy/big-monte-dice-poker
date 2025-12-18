<template>
  <div ref="rootEl" class="dropdown-select">
    <button
      type="button"
      class="dropdown-select__button"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-label="ariaLabel"
      @click="toggle"
      @keydown="handleButtonKeydown"
    >
      <span class="dropdown-select__value">
        <span
          v-if="selected?.swatch"
          class="dropdown-select__swatch"
          :style="{ background: selected.swatch }"
          aria-hidden="true"
        />
        <span>{{ selected?.label ?? 'Select…' }}</span>
      </span>
      <span class="dropdown-select__chevron" aria-hidden="true">▾</span>
    </button>

    <div v-if="open" class="dropdown-select__menu" role="listbox">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="dropdown-select__option"
        :class="{ active: opt.value === modelValue }"
        role="option"
        :aria-selected="opt.value === modelValue ? 'true' : 'false'"
        @click="select(opt.value)"
      >
        <span
          v-if="opt.swatch"
          class="dropdown-select__swatch"
          :style="{ background: opt.swatch }"
          aria-hidden="true"
        />
        <span class="dropdown-select__option-label">{{ opt.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

export type DropdownOption = {
  value: string;
  label: string;
  swatch?: string;
};

const props = defineProps<{
  modelValue: string;
  options: DropdownOption[];
  ariaLabel?: string;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const open = ref(false);
const rootEl = ref<HTMLElement | null>(null);

const selected = computed(() => props.options.find((o) => o.value === props.modelValue) ?? props.options[0]);

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

function select(value: string) {
  emit('update:modelValue', value);
  close();
}

function handleOutsidePointerDown(event: PointerEvent) {
  if (!open.value) return;
  const root = rootEl.value;
  const target = event.target as Node | null;
  if (!root || !target) return;
  if (root.contains(target)) return;
  close();
}

function handleButtonKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close();
    return;
  }
  if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
    open.value = true;
    event.preventDefault();
  }
}

onMounted(() => {
  if (typeof document === 'undefined') return;
  document.addEventListener('pointerdown', handleOutsidePointerDown, { capture: true });
});

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return;
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
});
</script>

<style scoped>
.dropdown-select {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
}

.dropdown-select__button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.85);
  padding: 8px 10px;
  font-size: 14px;
  cursor: pointer;
  box-sizing: border-box;
}

.dropdown-select__button:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 2px rgba(146, 227, 255, 0.6);
}

.dropdown-select__value {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.dropdown-select__chevron {
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
}

.dropdown-select__menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  max-height: 240px;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: rgba(6, 14, 26, 0.98);
  border: 1px solid rgba(122, 211, 255, 0.28);
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
}

.dropdown-select__option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: rgba(255, 255, 255, 0.82);
  padding: 10px 10px;
  cursor: pointer;
  text-align: left;
}

.dropdown-select__option:hover,
.dropdown-select__option:focus-visible {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
  outline: none;
}

.dropdown-select__option.active {
  background: rgba(59, 130, 246, 0.16);
  border-color: rgba(146, 227, 255, 0.28);
  color: rgba(235, 246, 255, 0.95);
}

.dropdown-select__swatch {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);
  flex: 0 0 auto;
}

.dropdown-select__option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
