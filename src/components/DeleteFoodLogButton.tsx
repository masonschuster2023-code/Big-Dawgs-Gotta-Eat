"use client";

import { useTransition } from "react";
import { deleteFoodLog } from "@/lib/actions/food";

export function DeleteFoodLogButton({ foodLogId }: { foodLogId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => deleteFoodLog(foodLogId))}
      className="text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
      aria-label="Remove entry"
    >
      Remove
    </button>
  );
}
