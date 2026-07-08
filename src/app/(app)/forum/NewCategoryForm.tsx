"use client";

import { useActionState } from "react";
import { createCategory, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

export function NewCategoryForm() {
  const [state, formAction, pending] = useActionState(createCategory, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-3"
    >
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Kategori baru</label>
        <input
          name="name"
          placeholder="mis. Pengumuman"
          required
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Tambah kategori"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
