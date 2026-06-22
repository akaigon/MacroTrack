// =============================================================================
// OnboardingGate.tsx — sends first-time users to the onboarding form.
//
// It watches the settings row. If onboarding isn't complete, it redirects to
// /onboarding (unless you're already there). If onboarding IS complete and you
// somehow land on /onboarding, it sends you home. It renders nothing itself.
//
// We include this once in the root layout so it protects every page.
// =============================================================================
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, SETTINGS_ID } from "@/lib/db";

export default function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();

  // useLiveQuery returns `undefined` while the first read is still loading.
  // db.settings.get() ALSO returns undefined when there's no settings row yet,
  // which would be indistinguishable from "loading". So we coerce a missing
  // row to `null`: now `undefined` strictly means "still loading", and `null`
  // means "no profile yet → needs onboarding".
  const settings = useLiveQuery(
    async () => (await db.settings.get(SETTINGS_ID)) ?? null
  );

  useEffect(() => {
    if (settings === undefined) return; // still loading — do nothing yet
    const onboarded = settings?.onboarded === true;

    // Only force first-time users TO onboarding. We deliberately do NOT
    // redirect away from /onboarding when it completes — the onboarding page
    // shows its own confirmation screen and navigates home when you tap
    // "Go to Today". (Redirecting here would skip that confirmation.)
    if (!onboarded && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [settings, pathname, router]);

  return null;
}
