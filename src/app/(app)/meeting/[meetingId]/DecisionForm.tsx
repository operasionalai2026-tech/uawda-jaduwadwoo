"use client";

import { useActionState, useRef } from "react";
import { addDecision, type ActionState } from "../actions";

const initialState: ActionState = { error: null };

export function DecisionForm({ meetingId }: { meetingId: string }) {
  const [state, formAction, pending] = useActionState(addDecision, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formAction(formData);
        formRef.current?.reset();
      }}
      className="flex gap-2"
    >
      <input type="hidden" name="meeting_id" value={meetingId} />
      <input
        name="content"
        placeholder="Tambah keputusan..."
        required
        className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50"
      >
        Tambah
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
