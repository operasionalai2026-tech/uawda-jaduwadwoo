"use client";

import { useActionState } from "react";
import { createPeriod, type ActionState } from "../actions";

const initialState: ActionState = { error: null };

export function PeriodForm({ divisionId }: { divisionId: string }) {
  const [state, formAction, pending] = useActionState(
    createPeriod,
    initialState,
  );
  const now = new Date();

  return (
    <form action={formAction} className="flex items-end gap-2 text-sm">
      <input type="hidden" name="division_id" value={divisionId} />
      <select
        name="period_type"
        className="rounded-md border border-neutral-300 px-2 py-1"
      >
        <option value="monthly">Bulanan</option>
        <option value="yearly">Tahunan</option>
      </select>
      <input
        name="year"
        type="number"
        defaultValue={now.getFullYear()}
        className="w-20 rounded-md border border-neutral-300 px-2 py-1"
      />
      <input
        name="month"
        type="number"
        min="1"
        max="12"
        defaultValue={now.getMonth() + 1}
        className="w-16 rounded-md border border-neutral-300 px-2 py-1"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-2 py-1 hover:bg-neutral-100 disabled:opacity-50"
      >
        {pending ? "..." : "Buat periode"}
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
