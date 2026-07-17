"use client";

import { useState, useActionState } from "react";
import { createThread, type ActionState } from "./actions";
import { THREAD_CATEGORIES, THREAD_TYPES, THREAD_CATEGORY_LABEL, THREAD_TYPE_LABEL } from "@/lib/pm";
import { DivisionMultiSelect } from "@/components/DivisionMultiSelect";

const initialState: ActionState = { error: null };

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10";
const labelCls = "mb-1 block text-xs font-semibold text-slate-500";

// Buat thread: Kategori (Ide/Perbaikan/Masalah) + Tipe (Internal/Global) +
// Judul + Deskripsi. Tipe Internal memunculkan pilihan divisi tujuan
// (default: divisi pembuat). Management/Owner boleh memilih lebih dari satu.
export function NewThreadForm({
  divisions,
  userDivisionId,
  isManager,
}: {
  divisions: { id: string; name: string }[];
  userDivisionId: string | null;
  isManager: boolean;
}) {
  const [state, formAction, pending] = useActionState(createThread, initialState);
  const [type, setType] = useState<"internal" | "global">("global");

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Kategori Thread</label>
          <select name="topic_category" className={inputCls} defaultValue="idea">
            {THREAD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {THREAD_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Tipe Thread</label>
          <select
            name="thread_type"
            className={inputCls}
            value={type}
            onChange={(e) => setType(e.target.value as "internal" | "global")}
          >
            {THREAD_TYPES.map((t) => (
              <option key={t} value={t}>
                {THREAD_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {type === "internal" && isManager && (
        <div>
          <label className={labelCls}>Divisi * (boleh lebih dari satu)</label>
          <DivisionMultiSelect divisions={divisions} />
        </div>
      )}
      {type === "internal" && !isManager && (
        <div>
          <label className={labelCls}>Divisi *</label>
          <select name="division_id" className={inputCls} defaultValue={userDivisionId ?? ""}>
            <option value="">— Pilih divisi —</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={labelCls}>Judul Thread *</label>
        <input name="title" required placeholder="Judul diskusi..." className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Deskripsi</label>
        <textarea name="content" rows={3} placeholder="Jelaskan idea / masalah Anda..." className={inputCls} />
      </div>

      <p className="text-xs text-slate-400">
        Thread <b>Internal Divisi</b> hanya terlihat oleh divisi yang dipilih. Thread <b>Global</b> terlihat semua tim.
      </p>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-rose-600/15 transition-all hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Membuat..." : "Buat Thread"}
      </button>
    </form>
  );
}
