import { computed, ref } from 'vue';

import { setupPWAUpdatePrompt, requestServiceWorkerRefresh } from './ServiceWorkerManager';

let initialized = false;

const deferredInstallPrompt = ref<BeforeInstallPromptEvent | null>(null);
const updateAvailable = ref(false);
const isStandalone = ref(false);

export function initPwaState() {
  if (initialized) return;
  initialized = true;
  if (typeof window === 'undefined') return;

  const updateStandalone = () => {
    const navStandalone = (navigator as any)?.standalone === true;
    const mediaStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches === true;
    isStandalone.value = navStandalone || mediaStandalone;
  };

  updateStandalone();

  try {
    const media = window.matchMedia?.('(display-mode: standalone)');
    media?.addEventListener?.('change', updateStandalone);
  } catch {
    // ignore
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt.value = e as BeforeInstallPromptEvent;
    updateStandalone();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt.value = null;
    updateAvailable.value = false;
    updateStandalone();
  });

  setupPWAUpdatePrompt(() => {
    updateAvailable.value = true;
  });
}

export const canInstallPwa = computed(() => !!deferredInstallPrompt.value && !isStandalone.value);
export const shouldShowRefresh = computed(() => !canInstallPwa.value);

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const promptEvent = deferredInstallPrompt.value;
  if (!promptEvent) return 'unavailable';
  deferredInstallPrompt.value = null;
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  return choice?.outcome ?? 'dismissed';
}

export async function refreshPwa(): Promise<'updated' | 'missing' | 'unsupported'> {
  const result = await requestServiceWorkerRefresh();
  updateAvailable.value = false;
  return result;
}

export function usePwaState() {
  return {
    canInstallPwa,
    shouldShowRefresh,
    updateAvailable,
    isStandalone
  };
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

