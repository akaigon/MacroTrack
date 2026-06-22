// =============================================================================
// layout.tsx — the outer wrapper shared by every page.
//
// It renders the page content plus the persistent bottom navigation, sets the
// page <head> details (title, mobile viewport, theme color, PWA icons), wires
// up theme + service-worker, and includes a tiny inline script that applies the
// saved dark/light theme BEFORE first paint (so there's no white flash).
// =============================================================================

import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import OnboardingGate from "@/components/OnboardingGate";
import ThemeManager from "@/components/ThemeManager";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "MacroTrack",
  description: "Private calorie & macro tracking that adapts to your data.",
  // PWA / home-screen icons.
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  // Make iOS treat it like an installed app.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MacroTrack",
  },
};

// Viewport settings tuned for a phone app feel: fit the device width and
// prevent zoom-jumping. The theme color tints the browser/status bar.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0d9488",
};

// Runs before React hydrates: set the dark class from the saved preference so
// dark mode doesn't flash white on load.
const noFlashTheme = `(function(){try{var t=localStorage.getItem('mt-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the inline theme script below intentionally
    // changes the <html> class before React hydrates, which is expected.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body className="min-h-full">
        {/* Behind-the-scenes helpers (each renders nothing). */}
        <OnboardingGate />
        <ThemeManager />
        <ServiceWorkerRegister />
        {/* Center the content and keep it phone-width even on a laptop.
            The bottom padding leaves room for the fixed nav bar. */}
        <main className="mx-auto max-w-md px-4 pb-24 pt-6">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
