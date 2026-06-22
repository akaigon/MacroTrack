// =============================================================================
// targets.ts — works out which macro targets apply on a given day, and saves
// changes to the default / weekly / per-date targets.
//
// Priority for any date (highest first):
//   1. A specific-date override (db.dayTargets) — set from the Today screen.
//   2. The weekly schedule for that weekday (settings.weeklyTargets), if enabled.
//   3. The default targets (settings.currentTargets).
// =============================================================================

import { db, SETTINGS_ID, type Macros, type Settings } from "./db";

// 0 = Sunday … 6 = Saturday (matches JavaScript's Date.getDay()).
export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function weekdayOf(dateISO: string): number {
  return new Date(dateISO + "T00:00:00").getDay();
}

// Where a day's targets came from — used to label the Today screen.
export type TargetSource = "override" | "weekday" | "default";

export interface ResolvedTargets {
  targets: Macros;
  source: TargetSource;
}

// Resolve the targets for a date given the loaded settings + any date override.
export function resolveTargets(
  dateISO: string,
  settings: Settings,
  dayOverride: Macros | null | undefined
): ResolvedTargets {
  if (dayOverride) return { targets: dayOverride, source: "override" };

  if (settings.weeklyEnabled && settings.weeklyTargets) {
    const wd = weekdayOf(dateISO);
    const t = settings.weeklyTargets[wd];
    if (t) return { targets: t, source: "weekday" };
  }

  return { targets: settings.currentTargets, source: "default" };
}

// ---- Writers ----

// Set/replace the override for one specific date.
export async function setDayOverride(
  dateISO: string,
  targets: Macros
): Promise<void> {
  await db.dayTargets.put({ date: dateISO, targets });
}

// Remove a date's override (it falls back to the weekly schedule / default).
export async function clearDayOverride(dateISO: string): Promise<void> {
  await db.dayTargets.delete(dateISO);
}

// Replace the default (baseline) targets.
export async function setDefaultTargets(targets: Macros): Promise<void> {
  await db.settings.update(SETTINGS_ID, { currentTargets: targets });
}

// Turn the weekly schedule on/off. When turning on for the first time, seed all
// seven days from the current default so the user has something to edit.
export async function setWeeklyEnabled(
  enabled: boolean,
  seedFrom: Macros
): Promise<void> {
  const settings = await db.settings.get(SETTINGS_ID);
  const existing = settings?.weeklyTargets;
  const weeklyTargets =
    existing && existing.length === 7
      ? existing
      : Array.from({ length: 7 }, () => ({ ...seedFrom }));
  await db.settings.update(SETTINGS_ID, { weeklyEnabled: enabled, weeklyTargets });
}

// Set the targets for one weekday in the weekly schedule.
export async function setWeekdayTargets(
  weekday: number,
  targets: Macros
): Promise<void> {
  const settings = await db.settings.get(SETTINGS_ID);
  const week =
    settings?.weeklyTargets && settings.weeklyTargets.length === 7
      ? [...settings.weeklyTargets]
      : Array.from({ length: 7 }, () => null as Macros | null);
  week[weekday] = targets;
  await db.settings.update(SETTINGS_ID, { weeklyTargets: week });
}
