// =============================================================================
// BottomNav.tsx — the fixed bar of tabs at the bottom of the screen.
//
// This is the app's main navigation, like the tab bar in a phone app. It marks
// the current tab as active by checking the page's URL.
//
// "use client" tells Next.js this component runs in the browser (it needs the
// current URL via usePathname).
// =============================================================================
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Each tab: a label, the URL it points to, and a small inline SVG icon.
// Inline SVGs mean no extra icon library to install.
const TABS = [
  {
    href: "/",
    label: "Today",
    icon: (
      <path d="M3 12 12 3l9 9M5 10v10h14V10" />
    ),
  },
  {
    href: "/foods",
    label: "Foods",
    icon: (
      <path d="M4 3v18M4 8h6M10 3v18M16 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4 2.5-1 2.5-4-1-5-2.5-5Zm0 13v5" />
    ),
  },
  {
    href: "/weight",
    label: "Weight",
    icon: (
      <path d="M5 8h14l1.5 12H3.5L5 8Zm3 0a4 4 0 1 1 8 0" />
    ),
  },
  {
    href: "/trends",
    label: "Trends",
    icon: (
      <path d="M3 17l6-6 4 4 7-7M21 8v4M21 8h-4" />
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3a8 8 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a8 8 0 0 0-2.2-1.3L13 1h-2l-.3 2.4A8 8 0 0 0 8.5 4.7l-2.4-1-2 3.4 2 1.6A8 8 0 0 0 4 12c0 .4 0 .9.1 1.3l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 2.2 1.3L11 23h2l.3-2.4a8 8 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z" />
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide the tab bar during onboarding so it feels like a focused first step.
  if (pathname === "/onboarding") return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-black/10 dark:border-white/10 bg-[var(--background)]/95 backdrop-blur">
      {/* Respect the phone's bottom "safe area" (the home-bar inset). */}
      <ul className="mx-auto flex max-w-md items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          // The Today tab ("/") should only be active on an exact match;
          // other tabs are active when the path starts with their href.
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                  active
                    ? "text-[var(--accent)]"
                    : "text-black/50 dark:text-white/50"
                }`}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {tab.icon}
                </svg>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
