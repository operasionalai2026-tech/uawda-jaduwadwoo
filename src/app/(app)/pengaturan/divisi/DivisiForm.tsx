"use client";

import { useActionState } from "react";
import { createDivision, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

export function DivisiForm() {
  const [state, formAction, pending] = useActionState(createDivision, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white/80 shadow-sm p-3"
    >
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Nama Divisi</label>
        <input
          name="name"
          required
          placeholder="mis. Inbound"
          className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Kategori (opsional)</label>
        <input
          name="category"
          placeholder="mis. Operasional"
          className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-rose-600/15 transition-all hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Tambah Divisi"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
