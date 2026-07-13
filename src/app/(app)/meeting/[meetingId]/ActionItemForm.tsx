"use client";

import { useActionState } from "react";
import { addActionItem, type ActionState } from "../actions";

const initialState: ActionState = { error: null };

export function ActionItemForm({
  meetingId,
  profiles,
}: {
  meetingId: string;
  profiles: { id: string; full_name: string }[];
}) {
  const [state, formAction, pending] = useActionState(addActionItem, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="meeting_id" value={meetingId} />
      <input
        name="title"
        placeholder="Action item..."
        required
        className="flex-1 min-w-40 rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
      />
      <select
        name="assignee_id"
        className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
      >
        <option value="">PIC...</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name}
          </option>
        ))}
      </select>
      <input
        name="due_date"
        type="date"
        className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50"
      >
        Tambah
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
