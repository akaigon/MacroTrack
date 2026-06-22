// =============================================================================
// ThemeManager.tsx — applies your light/dark/system preference.
//
// It toggles the `dark` class on <html>, which flips the CSS color variables
// defined in globals.css. "system" follows your device setting live. The
// choice is also mirrored to localStorage so the inline script in layout.tsx
// can set the theme BEFORE first paint (avoiding a white flash in dark mode).
// =============================================================================
"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, SETTINGS_ID } from "@/lib/db";

export default function ThemeManager() {
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID));
  const theme = settings?.theme ?? "system";

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    try {
      localStorage.setItem("mt-theme", theme);
    } catch {
      // ignore (e.g. private mode) — theme just won't persist pre-paint
    }
    if (theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  return null;
}
