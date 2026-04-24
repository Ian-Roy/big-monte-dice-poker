import { computed, ref } from 'vue';

import { setupPWAUpdatePrompt, requestServiceWorkerRefresh } from './ServiceWorkerManager';

let initialized = false;

const deferredInstallPrompt = ref<BeforeInstallPromptEvent | null>(null);
const updateAvailable = ref(false);
const isStandalone = ref(false);
const isIosDevice = ref(false);
const isIosSafari = ref(false);

const IOS_BROWSER_TOKENS =
  /CriOS|FxiOS|EdgiOS|OPiOS|OPT|DuckDuckGo|YaBrowser|GSA|Instagram|FBAN|FBAV/;

export type PwaInstallMode = 'native' | 'ios-manual' | 'ios-open-safari' | 'unavailable';

export function initPwaState() {
  if (initialized) return;
  initialized = true;
  if (typeof window === 'undefined') return;

  const updatePlatform = () => {
    const ua = navigator.userAgent ?? '';
    const platform = navigator.platform ?? '';
    const touchPoints = navigator.maxTouchPoints ?? 0;
    const looksIos = /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && touchPoints > 1);
    const looksSafari = /Safari/.test(ua) && !IOS_BROWSER_TOKENS.test(ua);
    isIosDevice.value = looksIos;
    isIosSafari.value = looksSafari;
  };

  const updateStandalone = () => {
    const navStandalone = (navigator as any)?.standalone === true;
    const mediaStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches === true;
    isStandalone.value = navStandalone || mediaStandalone;
  };

  updatePlatform();
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

const hasNativeInstallPrompt = computed(() => !!deferredInstallPrompt.value);

export const installMode = computed<PwaInstallMode>(() => {
  if (isStandalone.value) return 'unavailable';
  if (hasNativeInstallPrompt.value) return 'native';
  if (!isIosDevice.value) return 'unavailable';
  return isIosSafari.value ? 'ios-manual' : 'ios-open-safari';
});

export const canInstallPwa = computed(() => installMode.value !== 'unavailable');

export async function promptPwaInstall(): Promise<
  'accepted' | 'dismissed' | 'unavailable' | 'ios-manual' | 'ios-open-safari'
> {
  if (installMode.value === 'ios-manual') return 'ios-manual';
  if (installMode.value === 'ios-open-safari') return 'ios-open-safari';

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
    installMode,
    updateAvailable,
    isStandalone,
    isIosDevice,
    isIosSafari
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
