"use client";

import { useActionState } from "react";
import { saveNotulen, type ActionState } from "../actions";

const initialState: ActionState = { error: null };

export function NotulenForm({
  meetingId,
  initialContent,
}: {
  meetingId: string;
  initialContent: string;
}) {
  const [state, formAction, pending] = useActionState(saveNotulen, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="meeting_id" value={meetingId} />
      <textarea
        name="content"
        defaultValue={initialContent}
        rows={6}
        placeholder="Tulis notulen di sini..."
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Simpan notulen"}
      </button>
    </form>
  );
}
