"use client";

import { useActionState } from "react";
import { createTaskFromThread, type ActionState } from "@/app/(app)/tugas/actions";

const initialState: ActionState = { error: null };

export function NewTaskForm({
  threadId,
  assignees,
  catalog,
  cycles,
}: {
  threadId: string;
  assignees: { id: string; full_name: string }[];
  catalog: { id: string; name: string; points: number }[];
  cycles: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createTaskFromThread, initialState);

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      <input type="hidden" name="thread_id" value={threadId} />
      <input
        name="title"
        placeholder="Judul task..."
        required
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <textarea
        name="description"
        placeholder="Detail task (opsional)"
        rows={2}
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <select name="assignee_id" required className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">PIC...</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
            </option>
          ))}
        </select>
        <select
          name="point_catalog_id"
          required
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">Poin...</option>
          {catalog.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.points} poin)
            </option>
          ))}
        </select>
        <select name="cycle_id" required className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">Cycle...</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          name="due_date"
          type="date"
          required
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Membuat..." : "Buat Task dari Diskusi Ini"}
      </button>
    </form>
  );
}
