"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createMeeting, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

export function NewMeetingForm({
  divisions,
}: {
  divisions: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createMeeting, initialState);
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  return (
    <form
      action={formAction}
      className="space-y-2 rounded-2xl border border-slate-200 bg-white/80 shadow-sm p-4"
    >
      <p className="text-sm font-medium">Jadwalkan meeting baru</p>
      <div className="flex flex-wrap gap-2">
        <input
          name="title"
          placeholder="Judul meeting"
          required
          className="flex-1 min-w-48 rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
        />
        <input
          name="scheduled_at"
          type="datetime-local"
          required
          className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
        />
        <input
          name="location"
          placeholder="Lokasi / link"
          className="rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
        />
      </div>
      <textarea
        name="agenda"
        placeholder="Agenda (opsional)"
        rows={2}
        className="w-full rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 px-2 py-1.5 text-sm"
      />

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 shadow-sm p-3">
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={visibility === "public"}
              onChange={() => setVisibility("public")}
            />
            Publik (semua orang bisa lihat)
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={visibility === "private"}
              onChange={() => setVisibility("private")}
            />
            Privat (divisi terpilih saja)
          </label>
        </div>

        {visibility === "private" && (
          <div className="space-y-1">
            <p className="text-xs text-neutral-500">
              Pilih satu atau lebih divisi yang boleh melihat rapat ini. Owner tetap bisa melihat
              semua rapat privat.
            </p>
            <div className="flex flex-wrap gap-2">
              {divisions.map((d) => (
                <label
                  key={d.id}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white shadow-sm px-2 py-1 text-xs"
                >
                  <input type="checkbox" name="division_ids" value={d.id} />
                  {d.name}
                </label>
              ))}
              {divisions.length === 0 && (
                <span className="text-xs text-neutral-400">Belum ada divisi terdaftar.</span>
              )}
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-rose-600/15 transition-all hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Jadwalkan"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
