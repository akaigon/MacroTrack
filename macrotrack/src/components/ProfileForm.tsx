// =============================================================================
// ProfileForm.tsx — the profile & goal form.
//
// Used in TWO places:
//   - /onboarding   (first run, with onboarded=false in the database)
//   - /settings     (to edit your details later)
//
// It collects your units, body details, activity level, goal, rate, and macro
// rules, then calls saveProfile() which recomputes your targets. We keep the
// numeric fields as TEXT while you type (so half-typed numbers like "70." work)
// and parse them on submit.
// =============================================================================
"use client";

import { useState } from "react";
import type { ActivityLevel, Goal, Sex, Units } from "@/lib/db";
import {
  cmToFeetInches,
  feetInchesToCm,
  inputWeightToKg,
  kgToInputWeight,
  weightUnitLabel,
} from "@/lib/units";
import { maxSustainableRateKg } from "@/lib/nutrition";
import { saveProfile, type ProfileFormValues } from "@/lib/settings";

// The form's starting values. When editing, we pass in the saved profile.
export interface ProfileFormInitial {
  units: Units;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  ratePerWeek: number; // kg/week
  proteinPerKg: number;
  fatPerKg: number;
}

// Human-readable descriptions for the activity dropdown.
const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sedentary — little or no exercise" },
  { value: "light", label: "Light — exercise 1–3 days/week" },
  { value: "moderate", label: "Moderate — exercise 3–5 days/week" },
  { value: "active", label: "Active — exercise 6–7 days/week" },
  { value: "very_active", label: "Very active — hard daily exercise / job" },
];

// A small segmented button group (used for units, sex, goal).
function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-xl bg-black/5 dark:bg-white/10 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            value === opt.value
              ? "bg-card text-accent shadow-sm"
              : "text-muted"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// A labelled field wrapper for consistent spacing.
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-black/10 dark:border-white/15 bg-card px-3 py-2.5 text-base outline-none focus:border-accent focus:ring-1 focus:ring-accent";

export default function ProfileForm({
  initial,
  submitLabel,
  onSaved,
}: {
  initial: ProfileFormInitial;
  submitLabel: string;
  onSaved: (notes: string[]) => void;
}) {
  // Units & choices are kept as real values; numeric inputs are kept as text.
  const [units, setUnits] = useState<Units>(initial.units);
  const [sex, setSex] = useState<Sex>(initial.sex);
  const [age, setAge] = useState(String(initial.age));
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    initial.activityLevel
  );
  const [goal, setGoal] = useState<Goal>(initial.goal);
  const [proteinPerKg, setProteinPerKg] = useState(String(initial.proteinPerKg));
  const [fatPerKg, setFatPerKg] = useState(String(initial.fatPerKg));

  // Height: metric uses cm; imperial uses feet + inches.
  const initFt = cmToFeetInches(initial.heightCm);
  const [heightCm, setHeightCm] = useState(String(Math.round(initial.heightCm)));
  const [feet, setFeet] = useState(String(initFt.feet));
  const [inches, setInches] = useState(String(initFt.inches));

  // Weight & rate are shown in the chosen units.
  const [weight, setWeight] = useState(
    String(round1(kgToInputWeight(initial.weightKg, initial.units)))
  );
  const [rate, setRate] = useState(
    String(round2(kgToInputWeight(initial.ratePerWeek, initial.units)))
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // When the user flips units, convert the currently-shown numbers so they
  // keep meaning the same thing.
  function switchUnits(next: Units) {
    if (next === units) return;
    // weight
    const wKg = inputWeightToKg(parseFloat(weight) || 0, units);
    setWeight(String(round1(kgToInputWeight(wKg, next))));
    // rate
    const rKg = inputWeightToKg(parseFloat(rate) || 0, units);
    setRate(String(round2(kgToInputWeight(rKg, next))));
    // height
    if (next === "imperial") {
      const ft = cmToFeetInches(parseFloat(heightCm) || 0);
      setFeet(String(ft.feet));
      setInches(String(ft.inches));
    } else {
      const cm = feetInchesToCm(parseInt(feet) || 0, parseInt(inches) || 0);
      setHeightCm(String(Math.round(cm)));
    }
    setUnits(next);
  }

  // Resolve the current height inputs into cm regardless of units.
  function currentHeightCm(): number {
    return units === "metric"
      ? parseFloat(heightCm) || 0
      : feetInchesToCm(parseInt(feet) || 0, parseInt(inches) || 0);
  }

  const weightKgNow = inputWeightToKg(parseFloat(weight) || 0, units);
  // Suggested sustainable rate, shown in the user's units, for the rate hint.
  const suggestedRate = kgToInputWeight(
    maxSustainableRateKg(weightKgNow),
    units
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const ageNum = parseInt(age);
    const heightCmNum = currentHeightCm();
    const weightKgNum = weightKgNow;
    const proteinNum = parseFloat(proteinPerKg);
    const fatNum = parseFloat(fatPerKg);
    const rateUnits = parseFloat(rate) || 0;

    // Basic sanity checks with friendly messages.
    if (!ageNum || ageNum < 13 || ageNum > 100)
      return setError("Please enter an age between 13 and 100.");
    if (!heightCmNum || heightCmNum < 100 || heightCmNum > 250)
      return setError("Please enter a realistic height.");
    if (!weightKgNum || weightKgNum < 30 || weightKgNum > 400)
      return setError("Please enter a realistic current weight.");
    if (!proteinNum || proteinNum <= 0)
      return setError("Protein per kg must be greater than 0.");
    if (!fatNum || fatNum <= 0)
      return setError("Fat per kg must be greater than 0.");

    const values: ProfileFormValues = {
      units,
      sex,
      age: ageNum,
      heightCm: heightCmNum,
      weightKg: weightKgNum,
      activityLevel,
      goal,
      ratePerWeek: inputWeightToKg(rateUnits, units),
      proteinRule: { mode: "perKg", value: proteinNum },
      fatRule: { mode: "perKg", value: fatNum },
    };

    try {
      setSaving(true);
      const notes = await saveProfile(values);
      onSaved(notes);
    } catch {
      setError("Sorry, something went wrong saving. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Units">
        <Segmented
          value={units}
          onChange={switchUnits}
          options={[
            { value: "metric", label: "Metric (kg, cm)" },
            { value: "imperial", label: "Imperial (lb, ft)" },
          ]}
        />
      </Field>

      <Field label="Sex" hint="Used by the BMR formula.">
        <Segmented
          value={sex}
          onChange={setSex}
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ]}
        />
      </Field>

      <Field label="Age">
        <input
          className={inputClass}
          inputMode="numeric"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />
      </Field>

      {units === "metric" ? (
        <Field label="Height">
          <div className="flex items-center gap-2">
            <input
              className={inputClass}
              inputMode="decimal"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
            <span className="text-sm text-muted">cm</span>
          </div>
        </Field>
      ) : (
        <Field label="Height">
          <div className="flex items-center gap-2">
            <input
              className={inputClass}
              inputMode="numeric"
              value={feet}
              onChange={(e) => setFeet(e.target.value)}
            />
            <span className="text-sm text-muted">ft</span>
            <input
              className={inputClass}
              inputMode="numeric"
              value={inches}
              onChange={(e) => setInches(e.target.value)}
            />
            <span className="text-sm text-muted">in</span>
          </div>
        </Field>
      )}

      <Field label="Current weight">
        <div className="flex items-center gap-2">
          <input
            className={inputClass}
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <span className="text-sm text-muted">{weightUnitLabel(units)}</span>
        </div>
      </Field>

      <Field label="Activity level">
        <select
          className={inputClass}
          value={activityLevel}
          onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
        >
          {ACTIVITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Goal">
        <Segmented
          value={goal}
          onChange={setGoal}
          options={[
            { value: "lose", label: "Lose" },
            { value: "maintain", label: "Maintain" },
            { value: "gain", label: "Gain" },
          ]}
        />
      </Field>

      {goal !== "maintain" && (
        <Field
          label={`Target rate (${weightUnitLabel(units)} per week)`}
          hint={
            goal === "lose"
              ? `A sustainable pace is up to about ${round2(
                  suggestedRate
                )} ${weightUnitLabel(units)}/week (≈1% of bodyweight).`
              : "A slower gain means less added body fat."
          }
        >
          <input
            className={inputClass}
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </Field>
      )}

      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4 space-y-4">
        <p className="text-sm font-medium">Macro rules</p>
        <p className="text-xs text-muted">
          Protein and fat are set per kg of bodyweight; carbs fill the rest of
          your calories. Defaults sit in the recommended ranges.
        </p>
        <Field label="Protein (g per kg)" hint="Recommended 1.6–2.2">
          <input
            className={inputClass}
            inputMode="decimal"
            value={proteinPerKg}
            onChange={(e) => setProteinPerKg(e.target.value)}
          />
        </Field>
        <Field label="Fat (g per kg)" hint="Recommended 0.6–0.9">
          <input
            className={inputClass}
            inputMode="decimal"
            value={fatPerKg}
            onChange={(e) => setFatPerKg(e.target.value)}
          />
        </Field>
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-accent px-4 py-3 text-center font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

// Small rounding helpers so the displayed numbers stay tidy.
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
