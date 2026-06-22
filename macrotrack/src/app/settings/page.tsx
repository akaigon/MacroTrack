// =============================================================================
// Settings page — edit your profile & goal (reusing the onboarding form),
// choose a light/dark theme, and export/import all your data as JSON.
// =============================================================================
"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, SETTINGS_ID, type Settings } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import ProfileForm from "@/components/ProfileForm";
import DataManagement from "@/components/DataManagement";

const THEMES: { value: NonNullable<Settings["theme"]>; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID));
  // The most recent weigh-in is our current weight for the form.
  const lastWeighIn = useLiveQuery(() =>
    db.weighIns.orderBy("date").last()
  );
  const [savedNotes, setSavedNotes] = useState<string[] | null>(null);

  if (settings === undefined) return null; // loading
  if (!settings) return null; // gate will redirect to onboarding

  // Prefer the latest weigh-in; fall back to a neutral default if none yet.
  const weightKg = lastWeighIn?.weightKg ?? 75;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your profile, goal, and targets." />

      {/* A quick summary of the current targets. */}
      <div className="mb-6 grid grid-cols-4 gap-2 rounded-2xl border border-black/10 dark:border-white/10 bg-card p-4 text-center">
        {[
          { label: "kcal", value: settings.currentTargets.calories },
          { label: "Protein", value: settings.currentTargets.protein },
          { label: "Carbs", value: settings.currentTargets.carbs },
          { label: "Fat", value: settings.currentTargets.fat },
        ].map((t) => (
          <div key={t.label}>
            <div className="text-lg font-semibold tabular-nums">{t.value}</div>
            <div className="text-xs text-muted">{t.label}</div>
          </div>
        ))}
      </div>

      {savedNotes && (
        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium text-accent">Targets updated.</p>
          {savedNotes.map((n, i) => (
            <p
              key={i}
              className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-foreground"
            >
              {n}
            </p>
          ))}
        </div>
      )}

      <ProfileForm
        submitLabel="Save changes"
        onSaved={(notes) => {
          setSavedNotes(notes);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        initial={{
          units: settings.units,
          sex: settings.sex,
          age: settings.age,
          heightCm: settings.heightCm,
          weightKg,
          activityLevel: settings.activityLevel,
          goal: settings.goal,
          ratePerWeek: settings.ratePerWeek,
          proteinPerKg: settings.proteinRule.value,
          fatPerKg: settings.fatRule.value,
        }}
      />

      {/* Appearance */}
      <div className="mt-8">
        <h2 className="mb-2 text-sm font-medium">Appearance</h2>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/5 dark:bg-white/10 p-1">
          {THEMES.map((t) => (
            <button
              key={t.value}
              onClick={() => db.settings.update(SETTINGS_ID, { theme: t.value })}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                (settings.theme ?? "system") === t.value
                  ? "bg-card text-accent shadow-sm"
                  : "text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data export / import */}
      <div className="mt-6">
        <DataManagement />
      </div>
    </div>
  );
}
