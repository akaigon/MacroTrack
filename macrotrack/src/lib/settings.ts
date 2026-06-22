// =============================================================================
// settings.ts — helpers for reading and writing the single Settings row.
//
// There is only ever ONE settings row (id = 1). These helpers give us sensible
// starting values for the onboarding form, and a single place that saves the
// profile and recomputes your targets at the same time.
// =============================================================================

import { db, SETTINGS_ID, type Settings } from "./db";
import { computeTargets, type ComputeTargetsInput } from "./nutrition";
import { todayISO } from "./dateUtils";

// The values the onboarding/settings form starts from before you change them.
// Protein 1.8 g/kg and fat 0.8 g/kg sit comfortably inside the recommended
// ranges (protein 1.6–2.2, fat 0.6–0.9).
export function defaultSettings(): Settings {
  return {
    id: SETTINGS_ID,
    onboarded: false,
    units: "metric",
    sex: "male",
    age: 30,
    heightCm: 175,
    activityLevel: "moderate",
    goal: "maintain",
    ratePerWeek: 0,
    proteinRule: { mode: "perKg", value: 1.8 },
    fatRule: { mode: "perKg", value: 0.8 },
    currentTargets: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    theme: "system",
  };
}

// Everything the form collects. Weight is separate because we store it as a
// weigh-in (in the weighIns table), not inside settings.
export interface ProfileFormValues {
  units: Settings["units"];
  sex: Settings["sex"];
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: Settings["activityLevel"];
  goal: Settings["goal"];
  ratePerWeek: number;
  proteinRule: Settings["proteinRule"];
  fatRule: Settings["fatRule"];
}

// Save the profile: recompute targets, store the settings row, and record the
// current weight as today's weigh-in (seeding the Weight tab for later phases).
// Returns the notes from the target calculation (guardrail messages, if any).
export async function saveProfile(
  values: ProfileFormValues
): Promise<string[]> {
  const input: ComputeTargetsInput = {
    sex: values.sex,
    weightKg: values.weightKg,
    heightCm: values.heightCm,
    age: values.age,
    activityLevel: values.activityLevel,
    goal: values.goal,
    // Rate is irrelevant when maintaining; force it to 0 to keep data clean.
    ratePerWeek: values.goal === "maintain" ? 0 : values.ratePerWeek,
    proteinRule: values.proteinRule,
    fatRule: values.fatRule,
  };

  const { targets, notes } = computeTargets(input);

  const existing = await db.settings.get(SETTINGS_ID);
  const next: Settings = {
    ...(existing ?? defaultSettings()),
    onboarded: true,
    units: values.units,
    sex: values.sex,
    age: values.age,
    heightCm: values.heightCm,
    activityLevel: values.activityLevel,
    goal: values.goal,
    ratePerWeek: input.ratePerWeek,
    proteinRule: values.proteinRule,
    fatRule: values.fatRule,
    currentTargets: targets,
  };

  await db.settings.put(next);

  // Record today's weight (overwrites any existing weigh-in for today).
  await db.weighIns.put({ date: todayISO(), weightKg: values.weightKg });

  return notes;
}
