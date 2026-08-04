import Link from "next/link";
import { Card } from "@/components/Card";
import { WeightEntryForm } from "@/components/WeightEntryForm";
import { PhaseChangeCard } from "@/components/PhaseChangeCard";
import { WeightChart } from "@/components/WeightChart";
import { getWeightLogs, getActivePeriod } from "@/lib/actions/weight";
import { computeRollingAverage } from "@/lib/weight";
import { todayDate, addDays } from "@/lib/date";

const DISPLAY_DAYS = 90;

export default async function WeightPage() {
  const [{ logs }, { period }] = await Promise.all([getWeightLogs(), getActivePeriod()]);

  const allPoints = computeRollingAverage(logs ?? []);
  const displayStart = addDays(todayDate(), -DISPLAY_DAYS);
  const points = allPoints.filter((p) => p.date >= displayStart);

  const latestWeight = allPoints.length > 0 ? allPoints[allPoints.length - 1].raw : null;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-black/5 bg-white/90 px-5 py-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/80">
          <div>
            <h1 className="text-xl font-bold">Weight</h1>
            <p className="text-sm text-neutral-500">Daily log, 7-day trend, phase tracking</p>
          </div>
          <Link href="/" className="text-sm font-medium text-tennessee hover:underline">
            ← Today
          </Link>
        </header>

        <div className="space-y-5">
          <Card title="Log weight">
            <WeightEntryForm latestWeight={latestWeight} />
          </Card>

          <Card title="Since phase start">
            <PhaseChangeCard initialPeriod={period ?? null} latestWeight={latestWeight} />
          </Card>

          <Card title="Trend">
            <WeightChart points={points} />
          </Card>
        </div>
      </div>
    </div>
  );
}
