"use client";

import { useTransition } from "react";
import { updateActionItemStatus } from "../actions";

const STATUS_LABEL: Record<string, string> = {
  open: "Belum mulai",
  in_progress: "Berjalan",
  done: "Selesai",
  carried_over: "Dilanjutkan",
};

export function ActionItemStatusSelect({
  meetingId,
  itemId,
  status,
}: {
  meetingId: string;
  itemId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(() => {
          updateActionItemStatus(meetingId, itemId, value);
        });
      }}
      className="rounded-md border border-neutral-300 px-2 py-1 text-xs disabled:opacity-50"
    >
      {Object.entries(STATUS_LABEL).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
