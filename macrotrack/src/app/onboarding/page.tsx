// =============================================================================
// /onboarding — the one-time first-run form.
//
// We show the shared ProfileForm with default values. After saving, we display
// any guardrail notes and a button to continue to the Today page.
// =============================================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { defaultSettings } from "@/lib/settings";

export default function OnboardingPage() {
  const router = useRouter();
  const defaults = defaultSettings();
  const [notes, setNotes] = useState<string[] | null>(null);

  // Once saved, show a short confirmation (plus any notes) before continuing.
  if (notes) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold">You&apos;re all set 🎉</h1>
        <p className="text-muted">
          Your starting targets are ready on the Today page. You can change any
          of this later in Settings.
        </p>
        {notes.length > 0 && (
          <ul className="space-y-2">
            {notes.map((n, i) => (
              <li
                key={i}
                className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-foreground"
              >
                {n}
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => router.replace("/")}
          className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white"
        >
          Go to Today
        </button>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to MacroTrack
        </h1>
        <p className="mt-1 text-sm text-muted">
          A few details so we can estimate your starting targets. Everything
          stays private on this device.
        </p>
      </header>

      <ProfileForm
        submitLabel="Calculate my targets"
        onSaved={(n) => setNotes(n)}
        initial={{
          units: defaults.units,
          sex: defaults.sex,
          age: defaults.age,
          heightCm: defaults.heightCm,
          weightKg: 75, // a neutral starting point for the form
          activityLevel: defaults.activityLevel,
          goal: defaults.goal,
          ratePerWeek: defaults.ratePerWeek,
          proteinPerKg: defaults.proteinRule.value,
          fatPerKg: defaults.fatRule.value,
        }}
      />
    </div>
  );
}
