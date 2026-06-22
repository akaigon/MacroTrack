// =============================================================================
// units.ts — converting and displaying weights and heights.
//
// INTERNALLY the app always stores weight in kilograms (kg) and height in
// centimetres (cm). That keeps every calculation simple and consistent. We
// only convert to pounds / feet+inches when SHOWING numbers to a user who
// picked imperial units, and convert back when they type a number in.
// =============================================================================

import type { Units } from "./db";

// Exact conversion constants.
export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

// ---- Weight ----
export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const kgToLb = (kg: number) => kg / KG_PER_LB;

// ---- Height ----
export const inToCm = (inches: number) => inches * CM_PER_IN;
export const cmToIn = (cm: number) => cm / CM_PER_IN;

// Split a height in cm into whole feet + leftover inches (for imperial input).
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cmToIn(cm);
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return { feet, inches };
}

// Combine feet + inches back into cm.
export function feetInchesToCm(feet: number, inches: number): number {
  return inToCm(feet * 12 + inches);
}

// ---- Display helpers ----
export const weightUnitLabel = (units: Units) =>
  units === "metric" ? "kg" : "lb";

// Show a stored kg weight in the user's chosen units, e.g. "70.5 kg" / "155.4 lb".
export function formatWeight(kg: number, units: Units, decimals = 1): string {
  const value = units === "metric" ? kg : kgToLb(kg);
  return `${value.toFixed(decimals)} ${weightUnitLabel(units)}`;
}

// Convert a number the user typed (in their units) into kg for storage.
export function inputWeightToKg(value: number, units: Units): number {
  return units === "metric" ? value : lbToKg(value);
}

// Convert a stored kg weight into the user's units for editing in a form.
export function kgToInputWeight(kg: number, units: Units): number {
  return units === "metric" ? kg : kgToLb(kg);
}
