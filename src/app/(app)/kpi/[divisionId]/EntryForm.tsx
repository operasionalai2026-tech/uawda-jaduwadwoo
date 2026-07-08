"use client";

import { useActionState } from "react";
import { upsertEntry, type ActionState } from "../actions";

const initialState: ActionState = { error: null };

export function EntryForm({
  divisionId,
  metricId,
  periodId,
  defaultValue,
}: {
  divisionId: string;
  metricId: string;
  periodId: string;
  defaultValue: number | null;
}) {
  const [state, formAction, pending] = useActionState(
    upsertEntry,
    initialState,
  );

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="division_id" value={divisionId} />
      <input type="hidden" name="metric_id" value={metricId} />
      <input type="hidden" name="period_id" value={periodId} />
      <input
        name="actual_value"
        type="number"
        step="any"
        defaultValue={defaultValue ?? ""}
        placeholder="Nilai aktual"
        required
        className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-100 disabled:opacity-50"
      >
        {pending ? "..." : "Simpan"}
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
