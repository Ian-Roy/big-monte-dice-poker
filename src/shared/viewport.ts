type Cleanup = () => void;

export function setupViewportSizing(): Cleanup {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const root = document.documentElement;

  const update = () => {
    const viewport = window.visualViewport;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    root.style.setProperty('--app-width', `${Math.round(width)}px`);
    root.style.setProperty('--app-height', `${Math.round(height)}px`);
  };

  update();

  window.addEventListener('resize', update, { passive: true });

  const viewport = window.visualViewport;
  if (viewport?.addEventListener) {
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
  }

  return () => {
    window.removeEventListener('resize', update);
    if (viewport?.removeEventListener) {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    }
  };
}

