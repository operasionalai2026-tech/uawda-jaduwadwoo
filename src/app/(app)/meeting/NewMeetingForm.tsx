"use client";

import { useActionState } from "react";
import { createMeeting, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

export function NewMeetingForm({
  divisions,
}: {
  divisions: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createMeeting, initialState);

  return (
    <form
      action={formAction}
      className="space-y-2 rounded-lg border border-neutral-200 p-4"
    >
      <p className="text-sm font-medium">Jadwalkan meeting baru</p>
      <div className="flex flex-wrap gap-2">
        <input
          name="title"
          placeholder="Judul meeting"
          required
          className="flex-1 min-w-48 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          name="scheduled_at"
          type="datetime-local"
          required
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <select
          name="division_id"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">Lintas divisi</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input
          name="location"
          placeholder="Lokasi / link"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <textarea
        name="agenda"
        placeholder="Agenda (opsional)"
        rows={2}
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Jadwalkan"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
