"use client";

import { useActionState, useState } from "react";
import { createRetro, type ActionState } from "./actions";
import { Plus, X } from "lucide-react";
import type { AppRole } from "@/lib/roles";

type Option = { id: string; name: string };

const initialState: ActionState = { error: null };
const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10";
const labelCls = "mb-1 block text-xs font-semibold text-slate-500";

// Create Evaluasi/Retro: buat evaluasi, assignee, (divisi utk Management),
// deskripsi, date.
export function RetroForm({
  role,
  divisions,
  members,
}: {
  role: AppRole;
  divisions: Option[];
  members: { id: string; name: string; divisionId: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createRetro, initialState);
  const [divisionId, setDivisionId] = useState<string>("");

  const isManager = role === "admin" || role === "superadmin";
  const assigneeOptions = isManager ? members.filter((m) => !divisionId || m.divisionId === divisionId) : members;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-rose-600/15 transition-all hover:scale-[1.02] hover:opacity-95 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" /> Buat Evaluasi
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">Buat Evaluasi / Retro</h3>
        <button type="button" onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className={labelCls}>Judul Evaluasi *</label>
        <input name="title" required placeholder="mis. Review kinerja sprint 12" className={inputCls} />
      </div>

      {isManager && (
        <div>
          <label className={labelCls}>Divisi *</label>
          <select name="division_id" required className={inputCls} value={divisionId} onChange={(e) => setDivisionId(e.target.value)}>
            <option value="">— Pilih divisi —</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Anggota Dievaluasi *</label>
          <select name="assignee_id" required className={inputCls} defaultValue="">
            <option value="">— Pilih anggota —</option>
            {assigneeOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tanggal</label>
          <input type="date" name="eval_date" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Deskripsi / Catatan</label>
        <textarea name="description" rows={3} className={inputCls} placeholder="Umpan balik, hal yang berjalan baik, area perbaikan..." />
      </div>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:opacity-95 disabled:opacity-50">
          {pending ? "Menyimpan..." : "Simpan Evaluasi"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Batal
        </button>
      </div>
    </form>
  );
}
