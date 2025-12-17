import { ref } from 'vue';

export type Toast = {
  id: number;
  text: string;
};

type Options = {
  max?: number;
  durationMs?: number;
};

export function useToasts(options: Options = {}) {
  const max = options.max ?? 3;
  const durationMs = options.durationMs ?? 1800;

  const toasts = ref<Toast[]>([]);
  let nextId = 1;

  function pushToast(text: string) {
    const id = nextId;
    nextId += 1;
    toasts.value = [...toasts.value.slice(-(max - 1)), { id, text }];
    setTimeout(() => {
      toasts.value = toasts.value.filter((toast) => toast.id !== id);
    }, durationMs);
  }

  return { toasts, pushToast };
}

