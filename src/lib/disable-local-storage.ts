// This module disables writable client-side storage methods to ensure
// no data is persisted locally. It intentionally runs only in the
// browser (client) and is imported by a client-root component.
if (typeof window !== 'undefined') {
  try {
    const noop = () => {};
    // Patch localStorage methods
    try {
      // Some hosts lock down descriptors; attempt guarded assignments first
      // getItem returns null so reads fall back to defaults
      // setItem/removeItem/clear become no-ops
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.localStorage.getItem = () => null;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.localStorage.setItem = noop;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.localStorage.removeItem = noop;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.localStorage.clear = noop;
    } catch (_) {
      try {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          enumerable: true,
          writable: true,
          value: {
            getItem: () => null,
            setItem: noop,
            removeItem: noop,
            clear: noop,
          },
        });
      } catch (__) {
        // give up silently — best effort only
      }
    }

    // Patch sessionStorage similarly
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.sessionStorage.getItem = () => null;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.sessionStorage.setItem = noop;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.sessionStorage.removeItem = noop;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.sessionStorage.clear = noop;
    } catch (_) {
      try {
        Object.defineProperty(window, 'sessionStorage', {
          configurable: true,
          enumerable: true,
          writable: true,
          value: {
            getItem: () => null,
            setItem: noop,
            removeItem: noop,
            clear: noop,
          },
        });
      } catch (__) {
        // ignore
      }
    }
  } catch (err) {
    // never crash the app if this fails
    // eslint-disable-next-line no-console
    console.warn('disable-local-storage: could not fully patch storage', err);
  }
}
