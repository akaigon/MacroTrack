// =============================================================================
// weight.ts — logging body weight and computing the smoothed weight TREND.
//
// Why a trend? Your scale weight bounces around day to day from water, food in
// your gut, etc. That noise can swing a kilo or more and would wreck the
// expenditure math in Phase 4. So we smooth the raw weigh-ins into a calmer
// "trend" line using an Exponentially Weighted Moving Average (EWMA), and use
// the TREND — not the raw number — for any calculations.
//
// EWMA in plain terms: each day's trend is mostly the previous trend, nudged a
// little toward the newest weigh-in. ALPHA controls how big that nudge is.
//   trend[today] = ALPHA * weight[today] + (1 - ALPHA) * trend[yesterday]
// ALPHA = 0.10 gives roughly a 10-day smoothing window — responsive but stable.
// =============================================================================

import { db, type WeighIn, type WeightTrendPoint } from "./db";

export const TREND_ALPHA = 0.1;

// Save (or overwrite) a weigh-in for a date, then rebuild the trend.
// One entry per day: the date is the primary key, so put() replaces.
export async function saveWeighIn(
  date: string,
  weightKg: number
): Promise<void> {
  await db.weighIns.put({ date, weightKg });
  await recomputeWeightTrend();
}

// Delete a weigh-in and rebuild the trend.
export async function deleteWeighIn(date: string): Promise<void> {
  await db.weighIns.delete(date);
  await recomputeWeightTrend();
}

// Recompute the entire smoothed trend from scratch. We do the whole series (not
// just the newest point) because editing or deleting an old weigh-in changes
// every trend value after it. The dataset is tiny (one row per day), so this is
// fast and keeps the logic simple and obviously correct.
export async function recomputeWeightTrend(): Promise<void> {
  const weighIns = await db.weighIns.orderBy("date").toArray();

  await db.weightTrend.clear();
  if (weighIns.length === 0) return;

  const points: WeightTrendPoint[] = [];
  let trend = weighIns[0].weightKg; // seed the trend with the first weigh-in
  for (let i = 0; i < weighIns.length; i++) {
    const w = weighIns[i].weightKg;
    trend = i === 0 ? w : TREND_ALPHA * w + (1 - TREND_ALPHA) * trend;
    points.push({
      date: weighIns[i].date,
      smoothedWeightKg: Math.round(trend * 100) / 100,
    });
  }
  await db.weightTrend.bulkPut(points);
}

// Look up the smoothed trend weight for an exact date, or undefined if none.
export async function trendOnDate(date: string): Promise<number | undefined> {
  const point = await db.weightTrend.get(date);
  return point?.smoothedWeightKg;
}

// A merged row for charts/lists: the raw weigh-in plus its trend value.
export interface WeightSeriesRow {
  date: string;
  weightKg: number;
  trendKg: number;
}

// Build the combined series (raw + trend), oldest first, for the chart & list.
export async function getWeightSeries(): Promise<WeightSeriesRow[]> {
  const [weighIns, trend] = await Promise.all([
    db.weighIns.orderBy("date").toArray(),
    db.weightTrend.orderBy("date").toArray(),
  ]);
  const trendByDate = new Map(trend.map((t) => [t.date, t.smoothedWeightKg]));

  return weighIns.map((w: WeighIn) => ({
    date: w.date,
    weightKg: w.weightKg,
    trendKg: trendByDate.get(w.date) ?? w.weightKg,
  }));
}
