/**
 * Hooks into vite-plugin-pwa's `autoUpdate` lifecycle.
 * When a new Service Worker is waiting, we call `onUpdateFound` so UI can prompt reload.
 */
import { registerSW } from 'virtual:pwa-register';

type UpdateFn = (reloadPage?: boolean) => Promise<void>;

let forceUpdateFn: UpdateFn | null = null;

export function setupPWAUpdatePrompt(onUpdateFound: () => void) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      onUpdateFound?.();
    },
    onOfflineReady() {
      // Optional: could show "Ready to work offline" toast.
      // Intentionally silent to avoid noise.
    }
  });

  forceUpdateFn = (reloadPage = false) => updateSW(reloadPage);
}

export type ServiceWorkerRefreshResult = 'updated' | 'missing' | 'unsupported';

export async function requestServiceWorkerRefresh(): Promise<ServiceWorkerRefreshResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return 'unsupported';
  }
  if (forceUpdateFn) {
    await forceUpdateFn(true);
    return 'updated';
  }
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (!registrations.length) {
    return 'missing';
  }
  await Promise.all(registrations.map((reg) => reg.update()));
  return 'updated';
}
