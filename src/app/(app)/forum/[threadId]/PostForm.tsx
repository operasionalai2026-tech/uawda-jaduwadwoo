"use client";

import { useActionState } from "react";
import { createPost, type ActionState } from "../actions";

const initialState: ActionState = { error: null };

export function PostForm({ threadId }: { threadId: string }) {
  const [state, formAction, pending] = useActionState(createPost, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="thread_id" value={threadId} />
      <textarea
        name="content"
        placeholder="Tulis balasan..."
        required
        rows={3}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Mengirim..." : "Balas"}
      </button>
    </form>
  );
}
