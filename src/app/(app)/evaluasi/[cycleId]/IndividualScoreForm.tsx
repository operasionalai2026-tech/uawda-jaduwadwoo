"use client";

import { useActionState } from "react";
import { submitIndividualScores, type ActionState } from "../actions";

const initialState: ActionState = { error: null };

type Criteria = { id: string; name: string; weight: number | null };
type ExistingScore = { criteria_id: string; score: number; comment: string | null };

export function IndividualScoreForm({
  cycleId,
  rateeId,
  rateeName,
  criteria,
  existing,
}: {
  cycleId: string;
  rateeId: string;
  rateeName: string;
  criteria: Criteria[];
  existing: ExistingScore[];
}) {
  const [state, formAction, pending] = useActionState(
    submitIndividualScores,
    initialState,
  );

  const existingByCriteria = new Map(existing.map((e) => [e.criteria_id, e]));

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 shadow-sm p-4"
    >
      <input type="hidden" name="cycle_id" value={cycleId} />
      <input type="hidden" name="ratee_id" value={rateeId} />
      <p className="text-sm font-medium">{rateeName}</p>

      <div className="space-y-2">
        {criteria.map((c) => {
          const prev = existingByCriteria.get(c.id);
          return (
            <div key={c.id} className="grid grid-cols-[1fr_5rem] gap-2 sm:grid-cols-[1fr_5rem_2fr]">
              <input type="hidden" name="criteria_id" value={c.id} />
              <label className="self-center text-sm text-neutral-600">{c.name}</label>
              <input
                name={`score_${c.id}`}
                type="number"
                min="0"
                max="100"
                required
                defaultValue={prev?.score ?? ""}
                className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1 text-sm"
              />
              <input
                name={`comment_${c.id}`}
                placeholder="Komentar (opsional)"
                defaultValue={prev?.comment ?? ""}
                className="hidden rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1 text-sm sm:block"
              />
            </div>
          );
        })}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-rose-600/15 transition-all hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Simpan penilaian"}
      </button>
    </form>
  );
}
