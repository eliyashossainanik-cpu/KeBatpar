export function isTouchOrMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.innerWidth <= 960 ||
    window.innerHeight <= 540 ||
    (navigator.maxTouchPoints ?? 0) > 0
  );
}

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

export async function enterMobileFullscreenAndLandscape(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };

  let entered = isFullscreenActive();
  if (!entered) {
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
        entered = true;
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
        entered = true;
      }
    } catch {
      // Browsers or sandboxed iframes may decline fullscreen; continue gracefully
    }
  }

  try {
    const orient = screen.orientation as
      | (ScreenOrientation & { lock?: (orientation: string) => Promise<void> })
      | undefined;
    if (orient?.lock) {
      await orient.lock('landscape');
    }
  } catch {
    // Orientation lock is only supported in fullscreen on mobile browsers
  }

  return entered;
}

export async function exitFullscreenMode(): Promise<void> {
  if (typeof document === 'undefined') return;
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
  };
  try {
    if (doc.fullscreenElement && doc.exitFullscreen) {
      await doc.exitFullscreen();
    } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    }
  } catch {
    // ignore
  }
  try {
    const orient = screen.orientation as
      | (ScreenOrientation & { unlock?: () => void })
      | undefined;
    orient?.unlock?.();
  } catch {
    // ignore
  }
}

export async function toggleFullscreenMode(lockLandscapeOnMobile = true): Promise<boolean> {
  if (isFullscreenActive()) {
    await exitFullscreenMode();
    return false;
  }
  if (lockLandscapeOnMobile && isTouchOrMobileDevice()) {
    return enterMobileFullscreenAndLandscape();
  }
  if (typeof document === 'undefined') return false;
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
      return true;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function subscribeFullscreenChange(callback: (active: boolean) => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const handler = () => callback(isFullscreenActive());
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
  };
}
