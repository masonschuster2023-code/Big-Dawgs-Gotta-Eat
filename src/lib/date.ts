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
