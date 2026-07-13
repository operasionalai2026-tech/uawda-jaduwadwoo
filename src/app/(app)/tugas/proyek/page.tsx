import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { NewProjectForm } from "./NewProjectForm";
import { FolderKanban, ArrowLeft, ArrowRight, Layers } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  active: "Berjalan",
  completed: "Selesai",
  archived: "Diarsipkan",
};

export default async function ProyekPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, status, created_at")
    .order("created_at", { ascending: false });

  const canCreate =
    user?.role === "leader" || user?.role === "admin" || user?.role === "superadmin";

  return (
    <div className="space-y-8 pb-12">
      <div>
        <div className="flex items-center gap-2">
          <Link
            href="/tugas"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-blue-800 to-rose-700 bg-clip-text text-transparent">Proyek</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500 ml-10">
          Task berpoin yang tidak berasal dari diskusi Forum -- langsung dibuat dari sini, bisa
          lintas divisi, dikelompokkan per divisi di halaman detail.
        </p>
      </div>

      {canCreate && (
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FolderKanban className="h-4.5 w-4.5 text-blue-600" />
            <span>Buat Proyek Baru</span>
          </h2>
          <NewProjectForm />
        </div>
      )}

      <div className="grid gap-3 max-w-3xl">
        {(projects ?? []).map((p) => (
          <Link
            key={p.id}
            href={`/tugas/proyek/${p.id}`}
            className="group flex items-center justify-between rounded-2xl bg-white p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 hover:scale-[1.005]"
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-gradient-to-tr group-hover:from-blue-600 group-hover:to-rose-600 group-hover:text-white transition-all duration-300">
                <Layers className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                  {p.name}
                </p>
                <p className="text-xs text-slate-500 mt-1 truncate max-w-md">
                  {p.description || "Tidak ada deskripsi."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase border ${
                  p.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
              >
                {STATUS_LABEL[p.status] ?? p.status}
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
            </div>
          </Link>
        ))}
        {(projects ?? []).length === 0 && (
          <div className="py-12 text-center border border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
            <p className="text-sm text-slate-400 italic">Belum ada proyek dibuat.</p>
          </div>
        )}
      </div>
    </div>
  );
}
