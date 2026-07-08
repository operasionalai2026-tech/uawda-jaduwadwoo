"use client";

import { useActionState } from "react";
import { createCycle, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

export function CreateCycleForm() {
  const [state, formAction, pending] = useActionState(createCycle, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-3"
    >
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Nama siklus</label>
        <input
          name="name"
          placeholder="Q3 2026"
          required
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Mulai</label>
        <input
          name="start_date"
          type="date"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Selesai</label>
        <input
          name="end_date"
          type="date"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Buat siklus"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
