import { onBeforeUnmount, onMounted, ref } from 'vue';

type Options = {
  maxMobileWidth?: number;
};

export function useOrientationLock(options: Options = {}) {
  const orientationLocked = ref(false);

  let orientationMedia: MediaQueryList | null = null;
  let orientationCleanup: (() => void) | null = null;

  const evaluate = () => {
    if (typeof window === 'undefined') return;
    if (!orientationMedia) {
      orientationMedia = window.matchMedia('(orientation: portrait)');
    }
    const portrait = orientationMedia.matches;
    const mobileViewport = window.innerWidth <= (options.maxMobileWidth ?? 900);
    orientationLocked.value = mobileViewport && !portrait;
  };

  onMounted(() => {
    if (typeof window === 'undefined') return;
    orientationMedia = window.matchMedia('(orientation: portrait)');
    const listener = () => evaluate();
    if (typeof orientationMedia.addEventListener === 'function') {
      orientationMedia.addEventListener('change', listener);
      orientationCleanup = () => orientationMedia?.removeEventListener('change', listener);
    } else {
      orientationMedia.addListener(listener);
      orientationCleanup = () => orientationMedia?.removeListener(listener);
    }
    evaluate();
    window.addEventListener('resize', evaluate, { passive: true });
  });

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', evaluate);
    }
    orientationCleanup?.();
    orientationCleanup = null;
  });

  return { orientationLocked, evaluateOrientationLock: evaluate };
}

