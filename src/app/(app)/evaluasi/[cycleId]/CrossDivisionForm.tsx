"use client";

import { useActionState } from "react";
import { submitCrossDivisionScore, type ActionState } from "../actions";

const initialState: ActionState = { error: null };

export function CrossDivisionForm({
  cycleId,
  divisions,
}: {
  cycleId: string;
  divisions: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    submitCrossDivisionScore,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white/80 shadow-sm p-4"
    >
      <input type="hidden" name="cycle_id" value={cycleId} />
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Divisi dinilai</label>
        <select
          name="ratee_division_id"
          required
          className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
        >
          <option value="">Pilih divisi&hellip;</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">Skor (0-100)</label>
        <input
          name="score"
          type="number"
          min="0"
          max="100"
          required
          className="w-24 rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex-1 min-w-40">
        <label className="mb-1 block text-xs text-neutral-500">Komentar</label>
        <input
          name="comment"
          placeholder="Opsional"
          className="w-full rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-rose-600/15 transition-all hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Kirim"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      <p className="w-full text-xs text-neutral-400">
        Identitas Anda dicatat untuk audit tapi tidak ditampilkan ke divisi yang dinilai
        — mereka hanya melihat rata-rata.
      </p>
    </form>
  );
}
