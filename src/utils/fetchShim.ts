// Shim to prevent "TypeError: Cannot set property fetch of #<Window> which has only a getter"
// when third-party libraries or sandboxed iframes attempt to reassign window.fetch.

(function initFetchShim() {
  if (typeof window === 'undefined') return;

  try {
    const rawFetch = window.fetch;
    let currentFetch = typeof rawFetch === 'function' ? rawFetch.bind(window) : null;

    const descriptor = {
      get() {
        return currentFetch;
      },
      set(fn: typeof window.fetch) {
        currentFetch = fn;
      },
      configurable: true,
      enumerable: true
    };

    try {
      Object.defineProperty(window, 'fetch', descriptor);
    } catch {}

    if (typeof Window !== 'undefined' && Window.prototype) {
      try {
        Object.defineProperty(Window.prototype, 'fetch', descriptor);
      } catch {}
    }
  } catch {}
})();
