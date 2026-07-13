import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { NewProjectTaskForm } from "./NewProjectTaskForm";
import { ArrowLeft, Layers, Target } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  assigned: "Ditugaskan",
  in_progress: "Dikerjakan",
  submitted: "Menunggu Persetujuan",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

const STATUS_COLOR: Record<string, string> = {
  assigned: "bg-slate-100 text-slate-600 border-slate-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-100",
  submitted: "bg-amber-50 text-amber-700 border-amber-100",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  rejected: "bg-rose-50 text-rose-700 border-rose-100",
  cancelled: "bg-slate-100 text-slate-400 border-slate-200",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description, status")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    return (
      <div className="max-w-2xl space-y-3">
        <h1 className="text-xl font-semibold">Proyek tidak ditemukan</h1>
        <Link href="/tugas/proyek" className="text-sm font-semibold text-blue-600 hover:underline">
          &larr; Kembali ke Proyek
        </Link>
      </div>
    );
  }

  const [{ data: tasks }, { data: divisions }, { data: catalog }] = await Promise.all([
    supabase
      .from("kpi_tasks")
      .select("id, title, status, due_date, assignee_id, division_id, point_catalog_id")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase.from("divisions").select("id, name").order("name"),
    supabase.from("point_catalog").select("id, name, points").order("points"),
  ]);

  const assigneeIds = [...new Set((tasks ?? []).map((t) => t.assignee_id).filter(Boolean))];
  const { data: profiles } = assigneeIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", assigneeIds)
    : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const catalogById = new Map((catalog ?? []).map((c) => [c.id, c]));

  const tasksByDivision = new Map<string, typeof tasks>();
  for (const t of tasks ?? []) {
    const list = tasksByDivision.get(t.division_id) ?? [];
    list.push(t);
    tasksByDivision.set(t.division_id, list);
  }

  const canAssign =
    user?.role === "leader" || user?.role === "admin" || user?.role === "superadmin";

  let assignableProfiles: { id: string; full_name: string }[] = [];
  let cycles: { id: string; name: string }[] = [];

  if (canAssign) {
    const assigneeQuery =
      user?.role === "leader" && user.divisionId
        ? supabase.from("profiles").select("id, full_name").eq("division_id", user.divisionId)
        : supabase.from("profiles").select("id, full_name");

    const [{ data: assignees }, { data: cyclesData }] = await Promise.all([
      assigneeQuery,
      supabase
        .from("eval_cycles")
        .select("id, name")
        .eq("status", "open")
        .order("start_date", { ascending: false }),
    ]);

    assignableProfiles = assignees ?? [];
    cycles = cyclesData ?? [];
  }

  const divisionsWithTasks = (divisions ?? []).filter((d) => tasksByDivision.has(d.id));

  return (
    <div className="space-y-8 pb-12">
      <div>
        <div className="flex items-center gap-2">
          <Link
            href="/tugas/proyek"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{project.name}</h1>
        </div>
        {project.description && (
          <p className="mt-1 text-sm text-slate-500 ml-10">{project.description}</p>
        )}
      </div>

      {canAssign && (
        <section className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Target className="h-4.5 w-4.5 text-blue-600" />
            <span>Tambah Task ke Proyek Ini</span>
          </h2>
          {(catalog ?? []).length === 0 || cycles.length === 0 ? (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
              {(catalog ?? []).length === 0 && "Belum ada katalog poin aktif. "}
              {cycles.length === 0 && "Belum ada cycle evaluasi yang sedang open. "}
              Hubungi superadmin/admin untuk menyiapkannya.
            </p>
          ) : (
            <NewProjectTaskForm
              projectId={projectId}
              assignees={assignableProfiles}
              catalog={catalog ?? []}
              cycles={cycles}
            />
          )}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          Task per Divisi
        </h2>

        {divisionsWithTasks.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
            <p className="text-sm text-slate-400 italic">Belum ada task di proyek ini.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {divisionsWithTasks.map((d) => {
              const divTasks = tasksByDivision.get(d.id) ?? [];
              return (
                <div
                  key={d.id}
                  className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <Layers className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-800">{d.name}</h3>
                    <span className="ml-auto text-xs font-semibold text-slate-400">
                      {divTasks.length} task
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {divTasks.map((t) => {
                      const catalogItem = catalogById.get(t.point_catalog_id);
                      return (
                        <div key={t.id} className="rounded-xl border border-slate-100 p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold text-slate-800">{t.title}</p>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase border ${STATUS_COLOR[t.status]}`}
                            >
                              {STATUS_LABEL[t.status] ?? t.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {nameById.get(t.assignee_id) ?? "-"}
                            {catalogItem && ` · ${catalogItem.points} poin`}
                            {t.due_date &&
                              ` · Due ${new Date(t.due_date).toLocaleDateString("id-ID", { dateStyle: "short" })}`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
