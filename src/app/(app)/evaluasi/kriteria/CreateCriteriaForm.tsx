"use client";

import { useActionState } from "react";
import { createCriteria, type ActionState } from "../actions";

const initialState: ActionState = { error: null };

export function CreateCriteriaForm() {
  const [state, formAction, pending] = useActionState(createCriteria, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white/80 shadow-sm p-3"
    >
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Scope</label>
        <select
          name="scope"
          className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
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
          className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Deskripsi</label>
        <input
          name="description"
          className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
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
          className="w-20 rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-rose-600/15 transition-all hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Tambah"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
