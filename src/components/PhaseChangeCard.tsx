"use client";

import { useState, useTransition } from "react";
import { startNewPeriod, type WeightPeriod } from "@/lib/actions/weight";
import { todayDate, formatShortDate } from "@/lib/date";

function formatDelta(delta: number): string {
  const rounded = Math.round(Math.abs(delta) * 10) / 10;
  const magnitude = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  return delta < 0 ? `−${magnitude}` : `+${magnitude}`;
}

export function PhaseChangeCard({
  initialPeriod,
  latestWeight,
}: {
  initialPeriod: WeightPeriod | null;
  latestWeight: number | null;
}) {
  const [period, setPeriod] = useState(initialPeriod);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const startPhase = () => {
    setError(null);
    startTransition(async () => {
      try {
        await startNewPeriod();
        setPeriod({
          id: crypto.randomUUID(),
          startDate: todayDate(),
          startWeight: latestWeight!,
          endDate: null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start new phase");
      }
    });
  };

  const delta = period && latestWeight !== null ? latestWeight - period.startWeight : null;

  return (
    <div className="space-y-3">
      {period && delta !== null ? (
        <div>
          <p className="text-3xl font-bold">
            {formatDelta(delta)} <span className="text-lg font-medium text-neutral-400">lbs</span>
          </p>
          <p className="text-sm text-neutral-500">since {formatShortDate(period.startDate)}</p>
        </div>
      ) : (
        <p className="text-sm text-neutral-400">
          No active phase yet — log a weight entry, then start one.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={isPending || latestWeight === null}
        onClick={startPhase}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-tennessee/60 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
      >
        {isPending ? "Starting…" : "Start new phase"}
      </button>
    </div>
  );
}
