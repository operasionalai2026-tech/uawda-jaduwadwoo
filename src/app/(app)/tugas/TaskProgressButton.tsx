"use client";

import { useTransition } from "react";
import { startTask, submitTask } from "./actions";

export function TaskProgressButton({ taskId, status }: { taskId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  if (status === "assigned") {
    return (
      <button
        disabled={pending}
        onClick={() => startTransition(() => startTask(taskId))}
        className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        Mulai Kerjakan
      </button>
    );
  }

  if (status === "in_progress" || status === "rejected") {
    return (
      <button
        disabled={pending}
        onClick={() => startTransition(() => submitTask(taskId))}
        className="shrink-0 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Tandai Selesai
      </button>
    );
  }

  return null;
}
