// Pure calculation logic — no server/client dependency, mirrors goals.ts.

import { addDays } from "@/lib/date";

export interface WeightLog {
  date: string;
  weight: number;
}

export interface WeightPoint {
  date: string;
  raw: number;
  rollingAvg: number;
}

// Trailing 7-calendar-day average, not a fixed 7-entry average — a date
// with only 3 logged entries in its window averages those 3, rather than
// requiring exactly 7 data points to produce a number.
export function computeRollingAverage(logs: WeightLog[], windowDays = 7): WeightPoint[] {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  return sorted.map((log) => {
    const windowStart = addDays(log.date, -(windowDays - 1));
    const windowLogs = sorted.filter((l) => l.date >= windowStart && l.date <= log.date);
    const rollingAvg =
      windowLogs.reduce((sum, l) => sum + l.weight, 0) / windowLogs.length;

    return { date: log.date, raw: log.weight, rollingAvg };
  });
}
