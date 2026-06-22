// =============================================================================
// dateUtils.ts — tiny helpers for working with calendar dates.
//
// Throughout the app we store dates as plain strings like "2026-06-18"
// (year-month-day). That keeps them easy to sort, compare, and group by day
// without worrying about time zones or clock times.
// =============================================================================

// Turn a JavaScript Date into a "YYYY-MM-DD" string using LOCAL time
// (so "today" matches the user's wall clock, not UTC).
export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Today's date as "YYYY-MM-DD".
export function todayISO(): string {
  return toISODate(new Date());
}

// Add (or subtract, with a negative number) days to a "YYYY-MM-DD" string.
export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00"); // noon-safe parse, local time
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

// A friendly label like "Thursday, Jun 18" for showing in the UI.
export function formatFriendly(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
