// =============================================================================
// manifest.ts — the PWA manifest. Next.js serves this at /manifest.webmanifest
// and links it automatically. It tells the phone how to install the app to the
// home screen: its name, colors, icons, and that it should open standalone
// (full-screen, no browser chrome).
// =============================================================================

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MacroTrack",
    short_name: "MacroTrack",
    description: "Private calorie & macro tracking that adapts to your data.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#0d9488",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
