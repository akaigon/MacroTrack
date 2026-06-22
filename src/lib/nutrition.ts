// =============================================================================
// nutrition.ts — the calorie & macro math.
//
// These are plain, well-commented functions with no UI in them, so the logic is
// easy to read, test, and reuse. Phase 1 uses them to compute your INITIAL
// targets from the onboarding form. Later phases reuse the same helpers.
//
// Energy conversion facts used here:
//   - 1 kg of body mass ≈ 7700 kcal
//   - protein & carbs = 4 kcal per gram, fat = 9 kcal per gram
// =============================================================================

import type {
  ActivityLevel,
  Goal,
  Macros,
  MacroRule,
  Sex,
} from "./db";

export const KCAL_PER_KG = 7700;
export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

// A hard safety floor: we never suggest a calorie target below this, ever.
export const HARD_MIN_CALORIES = 1200;

// -----------------------------------------------------------------------------
// BMR — Basal Metabolic Rate: roughly the energy you'd burn at complete rest.
// Mifflin–St Jeor is the standard, well-validated formula.
// -----------------------------------------------------------------------------
export function mifflinStJeorBMR(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  // The only difference between sexes is a constant offset.
  return sex === "male" ? base + 5 : base - 161;
}

// -----------------------------------------------------------------------------
// Activity multiplier — scales BMR up to a full-day burn (TDEE) based on how
// active you are. These are the standard multipliers.
// -----------------------------------------------------------------------------
export function activityMultiplier(level: ActivityLevel): number {
  switch (level) {
    case "sedentary":
      return 1.2;
    case "light":
      return 1.375;
    case "moderate":
      return 1.55;
    case "active":
      return 1.725;
    case "very_active":
      return 1.9;
  }
}

// TDEE — Total Daily Energy Expenditure: BMR × activity. This is the starting
// estimate of how much you burn per day, before the app learns the real number.
export function estimateTDEE(
  bmr: number,
  level: ActivityLevel
): number {
  return bmr * activityMultiplier(level);
}

// Convert a desired weekly weight change (kg/week) into a daily calorie change.
// e.g. lose 0.5 kg/week ≈ a 550 kcal/day deficit.
export function weeklyRateToDailyDelta(ratePerWeekKg: number): number {
  return (ratePerWeekKg * KCAL_PER_KG) / 7;
}

// The "sustainable" suggested loss-rate cap: about 1% of bodyweight per week.
export function maxSustainableRateKg(weightKg: number): number {
  return weightKg * 0.01;
}

// Resolve a protein/fat rule (per-kg or absolute) into grams for this person.
function gramsFromRule(rule: MacroRule, weightKg: number): number {
  return rule.mode === "perKg" ? rule.value * weightKg : rule.value;
}

// -----------------------------------------------------------------------------
// computeTargets — the main entry point.
//
// Given your profile + goal, it returns:
//   - targets: the calorie + macro goal,
//   - bmr / tdee: the intermediate numbers (handy to show),
//   - notes: short, neutral messages when a safety guardrail kicked in.
//
// The order of operations:
//   1) BMR → TDEE.
//   2) Apply your goal/rate to get a calorie target.
//   3) GUARDRAIL: clamp calories to a safe floor (never below BMR or the hard
//      minimum), with a note if we did.
//   4) Set protein & fat from your rules; carbs fill whatever calories remain.
// -----------------------------------------------------------------------------
export interface ComputeTargetsInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  ratePerWeek: number; // magnitude in kg/week; ignored when goal is "maintain"
  proteinRule: MacroRule;
  fatRule: MacroRule;
  // Optional: use this expenditure instead of BMR×activity. The weekly
  // check-in passes the LEARNED expenditure here so targets adapt to real data.
  tdeeOverride?: number;
}

export interface ComputeTargetsResult {
  targets: Macros;
  bmr: number;
  tdee: number;
  notes: string[];
}

// Split a calorie target into protein / fat / carbs. Protein & fat come from
// the per-kg (or absolute) rules; carbs fill the remaining calories. Shared by
// the initial calculation AND the weekly check-in (and live target editing).
export function macrosForCalories(
  calories: number,
  weightKg: number,
  proteinRule: MacroRule,
  fatRule: MacroRule
): { targets: Macros; notes: string[] } {
  const notes: string[] = [];
  const protein = gramsFromRule(proteinRule, weightKg);
  const fat = gramsFromRule(fatRule, weightKg);
  let carbsCals = calories - protein * KCAL_PER_G.protein - fat * KCAL_PER_G.fat;

  // If protein + fat already exceed the calories, there's no room for carbs.
  if (carbsCals < 0) {
    carbsCals = 0;
    notes.push(
      "Your protein and fat targets already use up your calories, so carbs are set to 0. Consider lowering one of them."
    );
  }

  return {
    notes,
    targets: {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbsCals / KCAL_PER_G.carbs),
      fat: Math.round(fat),
    },
  };
}

// Apply your goal + rate to an expenditure number to get a calorie target,
// then clamp it to a safe floor. Returns the calories plus any guardrail notes.
export function caloriesForGoal(
  tdee: number,
  bmr: number,
  goal: Goal,
  ratePerWeek: number,
  weightKg: number
): { calories: number; notes: string[] } {
  const notes: string[] = [];
  const dailyDelta = weeklyRateToDailyDelta(ratePerWeek);
  let calories =
    goal === "maintain" ? tdee : goal === "lose" ? tdee - dailyDelta : tdee + dailyDelta;

  if (goal === "lose" && ratePerWeek > maxSustainableRateKg(weightKg) + 1e-6) {
    notes.push(
      "That's a fairly fast pace. A slower rate (around 1% of bodyweight per week) tends to be easier to sustain — but it's your call."
    );
  }

  // GUARDRAIL: never below the estimated resting burn (BMR) or the hard floor.
  const floor = Math.max(bmr, HARD_MIN_CALORIES);
  if (calories < floor) {
    calories = floor;
    notes.push(
      `Calorie target was raised to ${Math.round(
        floor
      )} kcal — going lower than your estimated resting needs isn't recommended.`
    );
  }
  return { calories, notes };
}

export function computeTargets(
  input: ComputeTargetsInput
): ComputeTargetsResult {
  const bmr = mifflinStJeorBMR(
    input.sex,
    input.weightKg,
    input.heightCm,
    input.age
  );
  // Use the learned expenditure if provided, otherwise the BMR×activity guess.
  const tdee = input.tdeeOverride ?? estimateTDEE(bmr, input.activityLevel);

  const cals = caloriesForGoal(
    tdee,
    bmr,
    input.goal,
    input.ratePerWeek,
    input.weightKg
  );
  const macros = macrosForCalories(
    cals.calories,
    input.weightKg,
    input.proteinRule,
    input.fatRule
  );

  return {
    bmr,
    tdee,
    notes: [...cals.notes, ...macros.notes],
    targets: macros.targets,
  };
}

// Calories implied by a protein/carbs/fat split (4/4/9 kcal per gram). Used by
// the manual target editor, where you set the grams and calories follow.
export function caloriesFromMacros(
  protein: number,
  carbs: number,
  fat: number
): number {
  return Math.round(
    protein * KCAL_PER_G.protein +
      carbs * KCAL_PER_G.carbs +
      fat * KCAL_PER_G.fat
  );
}

// Sum a list of macro bundles into one total (used for a day's running totals).
export function sumMacros(items: Macros[]): Macros {
  return items.reduce<Macros>(
    (total, m) => ({
      calories: total.calories + m.calories,
      protein: total.protein + m.protein,
      carbs: total.carbs + m.carbs,
      fat: total.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
