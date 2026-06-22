// =============================================================================
// ServiceWorkerRegister.tsx — registers the service worker (public/sw.js) so
// the app can load offline and be installed to the home screen.
//
// We only register in production. In development, a service worker would cache
// aggressively and make code changes confusing, so we skip it (and clean up any
// previously-registered worker).
// =============================================================================
"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration can fail (e.g. on http) — that's fine, app still works.
      });
    } else {
      // Dev: make sure no stale worker is controlling the page.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    }
  }, []);

  return null;
}
