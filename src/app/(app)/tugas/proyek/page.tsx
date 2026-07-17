import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { ProjectForm } from "./ProjectForm";
import { STATUS_LABEL, STATUS_COLOR, type TaskStatus } from "@/lib/pm";
import { ArrowLeft, ArrowRight, Layers } from "lucide-react";

export default async function ProyekPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: projects }, { data: divisions }, { data: profiles }] = await Promise.all([
    supabase
      .from("pm_projects")
      .select("id, name, description, status, division_id, end_date, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("divisions").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name, division_id"),
  ]);

  const divisionName = new Map((divisions ?? []).map((d) => [d.id, d.name]));
  const canCreate = user?.role === "admin" || user?.role === "superadmin";
  const members = (profiles ?? []).map((p) => ({ id: p.id, name: p.full_name, divisionId: p.division_id }));

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/tugas"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-blue-800 to-rose-700 bg-clip-text text-transparent">
              Proyek
            </h1>
          </div>
          <p className="ml-10 mt-1 text-sm text-slate-500">
            Kelompok kerja lintas divisi. Dibuat oleh Management/Owner, berisi tugas-tugas berpoin.
          </p>
        </div>
        {canCreate && user && (
          <ProjectForm role={user.role} divisions={divisions ?? []} members={members} />
        )}
      </div>

      <div className="grid max-w-3xl gap-3">
        {(projects ?? []).map((p) => (
          <Link
            key={p.id}
            href={`/tugas/proyek/${p.id}`}
            className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:scale-[1.005] hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all duration-300 group-hover:bg-gradient-to-tr group-hover:from-blue-600 group-hover:to-rose-600 group-hover:text-white">
                <Layers className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-800 transition-colors group-hover:text-blue-600">
                  {p.name}
                </p>
                <p className="mt-1 max-w-md truncate text-xs text-slate-500">
                  {divisionName.get(p.division_id ?? "") ?? "Lintas divisi"}
                  {p.description ? ` · ${p.description}` : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_COLOR[p.status as TaskStatus]}`}>
                {STATUS_LABEL[p.status as TaskStatus] ?? p.status}
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-800" />
            </div>
          </Link>
        ))}
        {(projects ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-12 text-center">
            <p className="text-sm italic text-slate-400">Belum ada proyek dibuat.</p>
          </div>
        )}
      </div>
    </div>
  );
}
