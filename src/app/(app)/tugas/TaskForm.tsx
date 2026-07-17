"use client";

import { useActionState, useState } from "react";
import { createTask, type ActionState } from "./actions";
import { TASK_LEVELS, TASK_TYPES, LEVEL_LABEL, TYPE_LABEL, STATUS_LABEL } from "@/lib/pm";
import { Plus, X } from "lucide-react";
import type { AppRole } from "@/lib/roles";
import { DivisionMultiSelect } from "@/components/DivisionMultiSelect";

type Option = { id: string; name: string };

const initialState: ActionState = { error: null };

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10";
const labelCls = "mb-1 block text-xs font-semibold text-slate-500";

// Create task role-aware:
// - Staff: nama, type, level (otomatis jadi Idea menunggu approval)
// - Lead: + deskripsi, start/end date, status, assignee (divisi sendiri)
// - Management/Owner: + divisi (pilih), assignee lintas divisi
export function TaskForm({
  role,
  divisions,
  members,
  projectId,
  label = "Buat Tugas",
}: {
  role: AppRole;
  divisions: Option[];
  members: { id: string; name: string; divisionId: string | null }[];
  projectId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createTask, initialState);
  const [divisionIds, setDivisionIds] = useState<string[]>([]);
  const [taskType, setTaskType] = useState<string>("pengembangan");

  const isStaff = role === "staff";
  const isManager = role === "admin" || role === "superadmin";
  // Management (admin) yang membuat tugas tipe "Fitur (Tugas Baru)" boleh
  // memilih minta ACC Owner dulu — opsional, tidak wajib.
  const showAccOption = role === "admin" && taskType === "fitur";

  // Assignee options: Lead melihat anggota divisinya (difilter server); Management
  // memfilter berdasarkan gabungan divisi yang dipilih.
  const assigneeOptions = isManager
    ? members.filter((m) => divisionIds.length === 0 || (m.divisionId && divisionIds.includes(m.divisionId)))
    : members;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-rose-600/15 transition-all hover:scale-[1.02] hover:opacity-95 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" /> {label}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      {projectId && <input type="hidden" name="project_id" value={projectId} />}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">Buat Tugas Baru</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className={labelCls}>Nama Tugas *</label>
        <input name="title" required placeholder="mis. Perbaiki alur checkout" className={inputCls} />
      </div>

      {!isStaff && (
        <div>
          <label className={labelCls}>Deskripsi</label>
          <textarea name="description" rows={2} className={inputCls} placeholder="Detail tugas..." />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Tipe Tugas</label>
          <select
            name="type"
            className={inputCls}
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
          >
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Level Tugas</label>
          <select name="level" className={inputCls} defaultValue="medium">
            {TASK_LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isManager && (
        <div>
          <label className={labelCls}>Divisi * (boleh lebih dari satu — tiap divisi dapat tugasnya sendiri)</label>
          <DivisionMultiSelect divisions={divisions} onChange={setDivisionIds} />
        </div>
      )}

      {showAccOption && (
        <label className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
          <input type="checkbox" name="need_acc" value="1" className="mt-0.5" />
          <span>
            <b>Ajukan ACC ke Owner terlebih dahulu</b> (opsional). Jika dicentang, tugas masuk
            sebagai <b>Ide</b> menunggu persetujuan Owner. Jika tidak, tugas langsung berjalan.
          </span>
        </label>
      )}

      {!isStaff && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Tanggal Mulai</label>
              <input type="date" name="start_date" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tanggal Selesai</label>
              <input type="date" name="end_date" className={inputCls} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Status</label>
              <select name="status" className={inputCls} defaultValue="todo">
                {(["todo", "in_progress", "in_review", "done"] as const).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Penanggung Jawab (PIC)</label>
              <select name="assignee_id" className={inputCls} defaultValue="">
                <option value="">— Belum ditugaskan —</option>
                {assigneeOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {isStaff && (
        <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700 border border-violet-100">
          Tugas dari Staff masuk sebagai <b>Ide</b> dan menunggu persetujuan Lead Team divisi Anda.
        </p>
      )}

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:opacity-95 disabled:opacity-50"
        >
          {pending ? "Menyimpan..." : "Simpan Tugas"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
