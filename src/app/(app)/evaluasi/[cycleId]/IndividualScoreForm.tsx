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
      className="space-y-3 rounded-lg border border-neutral-200 p-4"
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
                className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
              <input
                name={`comment_${c.id}`}
                placeholder="Komentar (opsional)"
                defaultValue={prev?.comment ?? ""}
                className="hidden rounded-md border border-neutral-300 px-2 py-1 text-sm sm:block"
              />
            </div>
          );
        })}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Simpan penilaian"}
      </button>
    </form>
  );
}
