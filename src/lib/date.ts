// Nashville-area timezone, since that's where Hyrox is — keeps "today" from
// rolling over at 7pm local like a naive UTC date would.
export const APP_TIMEZONE = "America/Chicago";

export function todayDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Pure calendar-date math below — safe to do in UTC since these operate on
// an already-resolved YYYY-MM-DD string, not a fresh "now".
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Monday of the week containing dateStr.
export function getWeekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDays(dateStr, diffToMonday);
}

// "YYYY-MM-DD" -> "Jan 15". UTC, same reasoning as addDays — operating on
// an already-resolved calendar date string, not a fresh "now".
export function formatShortDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateStr}T00:00:00Z`));
}
