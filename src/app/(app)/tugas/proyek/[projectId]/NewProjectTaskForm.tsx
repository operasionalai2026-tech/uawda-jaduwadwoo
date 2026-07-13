"use client";

import { useActionState } from "react";
import { createTaskForProject, type ActionState } from "../../actions";

const initialState: ActionState = { error: null };

export function NewProjectTaskForm({
  projectId,
  assignees,
  catalog,
  cycles,
}: {
  projectId: string;
  assignees: { id: string; full_name: string }[];
  catalog: { id: string; name: string; points: number }[];
  cycles: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createTaskForProject, initialState);

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      <input type="hidden" name="project_id" value={projectId} />
      <input
        name="title"
        placeholder="Judul task..."
        required
        className="w-full rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
      />
      <textarea
        name="description"
        placeholder="Detail task (opsional)"
        rows={2}
        className="w-full rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <select name="assignee_id" required className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm">
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
          className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
        >
          <option value="">Poin...</option>
          {catalog.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.points} poin)
            </option>
          ))}
        </select>
        <select name="cycle_id" required className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm">
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
          className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-rose-600/15 transition-all hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Membuat..." : "Tambah Task"}
      </button>
    </form>
  );
}
