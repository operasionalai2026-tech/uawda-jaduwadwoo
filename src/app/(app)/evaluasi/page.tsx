import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { CreateCycleForm } from "./CreateCycleForm";
import { ClipboardCheck, Settings, ArrowRight, Calendar } from "lucide-react";

export default async function EvaluasiIndexPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: cycles } = await supabase
    .from("eval_cycles")
    .select("id, name, start_date, end_date, status")
    .order("created_at", { ascending: false });

  const canManage = user?.role === "superadmin" || user?.role === "admin";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Evaluasi Kinerja
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Siklus evaluasi individual bulanan/kuartalan serta penilaian kolaboratif antar divisi.
          </p>
        </div>
        <Link
          href="/evaluasi/kriteria"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm"
        >
          <Settings className="h-4 w-4" />
          <span>Kelola Kriteria Penilaian</span>
        </Link>
      </div>

      {/* Admin Management Panel */}
      {canManage && (
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ClipboardCheck className="h-4.5 w-4.5 text-blue-600" />
            <span>Mulai Siklus Evaluasi Baru</span>
          </h2>
          <CreateCycleForm />
        </div>
      )}

      {/* Cycles Grid */}
      <div className="space-y-4 max-w-3xl">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Daftar Siklus Aktif</h2>
        <div className="grid gap-3">
          {(cycles ?? []).map((cycle) => (
            <Link
              key={cycle.id}
              href={`/evaluasi/${cycle.id}`}
              className="group flex items-center justify-between rounded-2xl bg-white p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 hover:scale-[1.005]"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-gradient-to-tr group-hover:from-blue-600 group-hover:to-rose-600 group-hover:text-white transition-all duration-300">
                  <Calendar className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {cycle.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Durasi: {cycle.start_date ? new Date(cycle.start_date).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "-"} &ndash; {cycle.end_date ? new Date(cycle.end_date).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase border ${
                    cycle.status === "open"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-slate-50 text-slate-500 border-slate-200"
                  }`}
                >
                  {cycle.status === "open" ? "Aktif" : "Selesai"}
                </span>
                <span className="text-slate-400 group-hover:text-slate-800 transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
          {(cycles ?? []).length === 0 && (
            <div className="py-12 text-center border border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
              <p className="text-sm text-slate-400 italic">Belum ada siklus evaluasi terdaftar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
