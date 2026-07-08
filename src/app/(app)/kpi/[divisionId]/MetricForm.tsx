"use client";

import { useActionState } from "react";
import { createMetric, type ActionState } from "../actions";

const initialState: ActionState = { error: null };

export function MetricForm({ divisionId }: { divisionId: string }) {
  const [state, formAction, pending] = useActionState(
    createMetric,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="grid max-w-2xl grid-cols-2 gap-2 rounded-md border border-neutral-200 p-4 text-sm"
    >
      <input type="hidden" name="division_id" value={divisionId} />
      <input
        name="name"
        placeholder="Nama metric"
        required
        className="col-span-2 rounded-md border border-neutral-300 px-2 py-1"
      />
      <input
        name="unit"
        placeholder="Unit (%, unit, menit, ...)"
        className="rounded-md border border-neutral-300 px-2 py-1"
      />
      <input
        name="weight"
        type="number"
        step="0.01"
        min="0"
        max="1"
        placeholder="Bobot (0-1)"
        required
        className="rounded-md border border-neutral-300 px-2 py-1"
      />
      <input
        name="target_value"
        type="number"
        step="any"
        placeholder="Target"
        required
        className="rounded-md border border-neutral-300 px-2 py-1"
      />
      <select
        name="direction"
        className="rounded-md border border-neutral-300 px-2 py-1"
      >
        <option value="higher_better">Semakin tinggi semakin baik</option>
        <option value="lower_better">Semakin rendah semakin baik</option>
      </select>
      <select
        name="source_type"
        className="col-span-2 rounded-md border border-neutral-300 px-2 py-1"
      >
        <option value="manual">Manual</option>
        <option value="auto_iresis">Auto - IRESIS</option>
        <option value="auto_jubelio">Auto - Jubelio</option>
        <option value="auto_marketplace">Auto - Marketplace</option>
      </select>
      {state.error && (
        <p className="col-span-2 text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="col-span-2 rounded-md bg-neutral-900 px-3 py-1.5 text-white disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Tambah metric"}
      </button>
    </form>
  );
}
