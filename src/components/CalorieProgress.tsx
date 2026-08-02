export function CalorieProgress({ consumed, goal }: { consumed: number; goal: number }) {
  const remaining = goal - consumed;
  const pct = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
  const over = remaining < 0;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-bold">{Math.round(consumed)}</span>
        <span className="text-sm text-neutral-500">/ {Math.round(goal)} cal</span>
      </div>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={`h-full rounded-full ${over ? "bg-red-500" : "bg-tennessee"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p
        className={`mt-2 text-sm font-medium ${over ? "text-red-600" : "text-neutral-600 dark:text-neutral-300"}`}
      >
        {over ? `${Math.round(-remaining)} over` : `${Math.round(remaining)} left`}
      </p>
    </div>
  );
}
