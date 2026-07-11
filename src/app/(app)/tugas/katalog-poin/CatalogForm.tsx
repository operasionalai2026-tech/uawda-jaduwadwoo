"use client";

import { useActionState } from "react";
import { createPointCatalog, type ActionState } from "../actions";

const initialState: ActionState = { error: null };

export function CatalogForm() {
  const [state, formAction, pending] = useActionState(createPointCatalog, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-3"
    >
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Nama Tier</label>
        <input
          name="name"
          required
          placeholder="mis. Ringan"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Poin</label>
        <input
          name="points"
          type="number"
          min="1"
          step="1"
          required
          className="w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Deskripsi</label>
        <input
          name="description"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
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
