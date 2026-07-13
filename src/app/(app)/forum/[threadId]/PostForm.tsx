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
        className="w-full rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-3 py-2 text-sm"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-rose-600/15 transition-all hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Mengirim..." : "Balas"}
      </button>
    </form>
  );
}
