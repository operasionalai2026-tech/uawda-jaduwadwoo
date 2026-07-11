"use client";

import { useState, useTransition, useActionState } from "react";
import { approveTask, rejectTask, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

export function TaskReviewForm({ taskId }: { taskId: string }) {
  const [showReject, setShowReject] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, rejectAction, rejectPending] = useActionState(rejectTask, initialState);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => startTransition(() => approveTask(taskId))}
          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Setujui
        </button>
        <button
          type="button"
          onClick={() => setShowReject((v) => !v)}
          className="rounded-md border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
        >
          Tolak
        </button>
      </div>
      {showReject && (
        <form action={rejectAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="task_id" value={taskId} />
          <input
            name="rejection_reason"
            placeholder="Alasan penolakan..."
            className="min-w-48 flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
          />
          <button
            type="submit"
            disabled={rejectPending}
            className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            {rejectPending ? "..." : "Kirim Penolakan"}
          </button>
          {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
