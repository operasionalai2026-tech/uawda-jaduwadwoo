"use client";

import { useActionState } from "react";
import { createCriteria, type ActionState } from "../actions";

const initialState: ActionState = { error: null };

export function CreateCriteriaForm() {
  const [state, formAction, pending] = useActionState(createCriteria, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-3"
    >
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Scope</label>
        <select
          name="scope"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="individual">Individual</option>
          <option value="cross_division">Antar-divisi</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Nama</label>
        <input
          name="name"
          required
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Deskripsi</label>
        <input
          name="description"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Bobot</label>
        <input
          name="weight"
          type="number"
          step="0.1"
          min="0"
          max="1"
          defaultValue="1"
          className="w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Tambah"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
