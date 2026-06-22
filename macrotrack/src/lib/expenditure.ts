// =============================================================================
// expenditure.ts — the adaptive TDEE estimate (the MacroFactor-style feature).
//
// Idea: your real daily burn is hidden, but we can back it out from data you
// already provide. Over a trailing window we know (a) how much you ATE on
// average and (b) how your TREND weight moved. Weight change converts to
// calories at ~7700 kcal/kg, so:
//
//     observed expenditure = average intake − (trend-weight change in kcal/day)
//
// Example: trend dropped while you averaged 2000 kcal → you must have burned
// MORE than 2000, so expenditure > 2000.
//
// We don't trust one noisy fortnight, so we BLEND the observed number with the
// previous estimate:  new = prior + K·(observed − prior).  K = 0.25 keeps it
// responsive but stable. Until there's enough clean data we stay "holding".
// =============================================================================

import { db, SETTINGS_ID, type Settings, type Macros } from "./db";
import { addDays, todayISO } from "./dateUtils";
import {
  KCAL_PER_KG,
  estimateTDEE,
  mifflinStJeorBMR,
} from "./nutrition";

// --- Tunable constants (all in one place, explained) ---
export const WINDOW_DAYS = 14; // trailing window we analyse
export const BLEND_K = 0.25; // how far we move toward the observed value
export const MIN_LOGGED_DAYS = 10; // need this many complete days in the window
export const MIN_DAY_KCAL = 500; // a day below this looks like incomplete logging
export const CHECKIN_INTERVAL_DAYS = 7;

export type ExpenditureState = "holding" | "updating";

export interface ExpenditureResult {
  state: ExpenditureState;
  estimatedTdee: number; // the number to use (blended, or the prior while holding)
  priorTdee: number; // what we compared against
  observedTdee?: number; // the raw back-calculated value (only when updating)
  avgIntake?: number; // average daily intake over the window
  trendChangeKg?: number; // trend-weight change over the window
  loggedDays: number; // complete days found in the window
  windowDays: number;
  reason?: string; // why we're holding (shown to the user)
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

// Whole days from ISO date a to ISO date b (b − a).
function daysBetween(a: string, b: string): number {
  const ms = new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime();
  return Math.round(ms / 86_400_000);
}

// An initial expenditure guess (BMR×activity) from the profile + a weight.
// Used as the very first "prior" before we've recorded any estimate.
export function initialTDEE(settings: Settings, weightKg: number): number {
  const bmr = mifflinStJeorBMR(
    settings.sex,
    weightKg,
    settings.heightCm,
    settings.age
  );
  return estimateTDEE(bmr, settings.activityLevel);
}

// Estimate the smoothed TREND weight on any date by linear interpolation
// between the surrounding stored trend points (clamped at the ends).
export async function interpolatedTrend(
  date: string
): Promise<number | undefined> {
  const points = await db.weightTrend.orderBy("date").toArray();
  if (points.length === 0) return undefined;
  if (date <= points[0].date) return points[0].smoothedWeightKg;
  if (date >= points[points.length - 1].date)
    return points[points.length - 1].smoothedWeightKg;

  for (let i = 1; i < points.length; i++) {
    if (points[i].date >= date) {
      const a = points[i - 1];
      const b = points[i];
      const span = daysBetween(a.date, b.date) || 1;
      const frac = daysBetween(a.date, date) / span;
      return (
        a.smoothedWeightKg + frac * (b.smoothedWeightKg - a.smoothedWeightKg)
      );
    }
  }
  return points[points.length - 1].smoothedWeightKg;
}

// Total calories logged per day across [startDate, endDate] (inclusive).
async function dailyIntake(
  startDate: string,
  endDate: string
): Promise<Map<string, number>> {
  const entries = await db.logEntries
    .where("date")
    .between(startDate, endDate, true, true)
    .toArray();
  const map = new Map<string, number>();
  for (const e of entries) {
    map.set(e.date, (map.get(e.date) ?? 0) + e.computed.calories);
  }
  return map;
}

// The most recent stored estimate (our "prior"), if any.
export async function getLatestEstimate() {
  return db.expenditureEstimates.orderBy("date").last();
}

// -----------------------------------------------------------------------------
// The main estimate
// -----------------------------------------------------------------------------
export async function estimateExpenditure(
  asOf: string = todayISO()
): Promise<ExpenditureResult | null> {
  const settings = await db.settings.get(SETTINGS_ID);
  if (!settings) return null;

  const startDate = addDays(asOf, -(WINDOW_DAYS - 1)); // 14-day inclusive window
  const spanDays = WINDOW_DAYS - 1; // day-gaps between the two trend samples

  const weighIns = await db.weighIns.orderBy("date").toArray();
  const latestWeightKg =
    weighIns.length > 0 ? weighIns[weighIns.length - 1].weightKg : 75;

  // The prior we blend from: last stored estimate, else the initial guess.
  const lastEstimate = await getLatestEstimate();
  const priorTdee =
    lastEstimate?.estimatedTdee ?? initialTDEE(settings, latestWeightKg);

  const base = {
    priorTdee: Math.round(priorTdee),
    estimatedTdee: Math.round(priorTdee),
    loggedDays: 0,
    windowDays: WINDOW_DAYS,
  };

  // --- Guardrail 1: enough weight-trend history to span the window? ---
  if (weighIns.length < 2 || weighIns[0].date > startDate) {
    return {
      ...base,
      state: "holding",
      reason:
        "Still gathering weight data. Keep logging weigh-ins for about two weeks so the trend can settle.",
    };
  }

  const trendStart = await interpolatedTrend(startDate);
  const trendEnd = await interpolatedTrend(asOf);
  if (trendStart === undefined || trendEnd === undefined) {
    return {
      ...base,
      state: "holding",
      reason: "Not enough weight-trend data yet.",
    };
  }

  // --- Guardrail 2: enough complete food-log days in the window? ---
  const intake = await dailyIntake(startDate, asOf);
  let loggedDays = 0;
  let intakeSum = 0;
  for (const kcal of intake.values()) {
    if (kcal >= MIN_DAY_KCAL) {
      loggedDays++;
      intakeSum += kcal;
    }
  }
  if (loggedDays < MIN_LOGGED_DAYS) {
    return {
      ...base,
      state: "holding",
      loggedDays,
      reason: `Need more complete food logs — found ${loggedDays} of the last ${WINDOW_DAYS} days. Log most days for a week or two and the estimate will start adapting.`,
    };
  }

  // --- We have enough data: back-calculate and blend. ---
  const avgIntake = intakeSum / loggedDays;
  const trendChangeKg = trendEnd - trendStart;
  const balancePerDay = (trendChangeKg * KCAL_PER_KG) / spanDays; // +gain / −loss
  const observedTdee = avgIntake - balancePerDay;

  // Blend toward the observed value (the key stability step).
  const blended = priorTdee + BLEND_K * (observedTdee - priorTdee);

  return {
    state: "updating",
    priorTdee: Math.round(priorTdee),
    estimatedTdee: Math.round(blended),
    observedTdee: Math.round(observedTdee),
    avgIntake: Math.round(avgIntake),
    trendChangeKg: Math.round(trendChangeKg * 100) / 100,
    loggedDays,
    windowDays: WINDOW_DAYS,
  };
}

// -----------------------------------------------------------------------------
// Weekly check-in scheduling + recording
// -----------------------------------------------------------------------------

export async function getLatestCheckIn() {
  return db.checkIns.orderBy("date").last();
}

// Is a check-in due? True once you have ~2 weeks of weigh-in history and either
// you've never checked in, or it's been 7+ days since the last one.
export async function isCheckInDue(asOf: string = todayISO()): Promise<boolean> {
  const last = await getLatestCheckIn();
  if (last) return daysBetween(last.date, asOf) >= CHECKIN_INTERVAL_DAYS;

  // No check-in yet: only prompt once there's roughly two weeks of data.
  const first = await db.weighIns.orderBy("date").first();
  if (!first) return false;
  return daysBetween(first.date, asOf) >= WINDOW_DAYS - 1;
}

// Record a completed check-in: store the estimate + this check-in, and apply
// the accepted targets as the new current targets.
export async function recordCheckIn(params: {
  asOf?: string;
  estimatedTdee: number;
  state: ExpenditureState;
  proposedTargets: Macros;
  acceptedTargets: Macros;
}): Promise<void> {
  const date = params.asOf ?? todayISO();
  await db.expenditureEstimates.put({
    date,
    estimatedTdee: params.estimatedTdee,
    state: params.state,
  });
  await db.checkIns.add({
    date,
    estimatedTdee: params.estimatedTdee,
    proposedTargets: params.proposedTargets,
    acceptedTargets: params.acceptedTargets,
  });
  await db.settings.update(SETTINGS_ID, {
    currentTargets: params.acceptedTargets,
  });
}
