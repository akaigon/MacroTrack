// =============================================================================
// analytics.ts — read-only helpers that summarise your data for the Trends tab.
//
// None of this changes your data; it just aggregates the log into daily totals
// and averages that the charts can render.
// =============================================================================

import { db, type Macros } from "./db";
import { addDays, todayISO } from "./dateUtils";
import { sumMacros } from "./nutrition";

export interface DailyTotals extends Macros {
  date: string;
}

// Daily calorie + macro totals for the last `days` days (oldest first).
// Days with nothing logged are included as zeros so charts show the gap.
export async function dailyTotals(days: number): Promise<DailyTotals[]> {
  const start = addDays(todayISO(), -(days - 1));
  const entries = await db.logEntries
    .where("date")
    .between(start, todayISO(), true, true)
    .toArray();

  // Group entries by date.
  const byDate = new Map<string, Macros[]>();
  for (const e of entries) {
    const list = byDate.get(e.date) ?? [];
    list.push(e.computed);
    byDate.set(e.date, list);
  }

  // Build a continuous day-by-day series.
  const out: DailyTotals[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(todayISO(), -i);
    const totals = sumMacros(byDate.get(date) ?? []);
    out.push({ date, ...totals });
  }
  return out;
}

export interface MacroAverage {
  days: number;
  loggedDays: number; // days that actually had food logged
  avg: Macros; // average PER LOGGED DAY
}

// Average daily macros over the last `days` days, counting only logged days
// (so a missed day doesn't drag the average down to a misleading number).
export async function macroAverage(days: number): Promise<MacroAverage> {
  const series = await dailyTotals(days);
  const logged = series.filter((d) => d.calories > 0);
  const total = sumMacros(logged);
  const n = logged.length || 1;
  return {
    days,
    loggedDays: logged.length,
    avg: {
      calories: Math.round(total.calories / n),
      protein: Math.round(total.protein / n),
      carbs: Math.round(total.carbs / n),
      fat: Math.round(total.fat / n),
    },
  };
}

// The expenditure estimate history (from saved check-ins), oldest first.
export async function expenditureHistory(): Promise<
  { date: string; tdee: number }[]
> {
  const checkIns = await db.checkIns.orderBy("date").toArray();
  return checkIns.map((c) => ({
    date: c.date,
    tdee: Math.round(c.estimatedTdee),
  }));
}
