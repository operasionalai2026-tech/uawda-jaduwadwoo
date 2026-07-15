import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { TaskForm } from "../../TaskForm";
import { TaskStatusControl } from "../../TaskStatusControl";
import {
  STATUS_LABEL,
  STATUS_COLOR,
  LEVEL_LABEL,
  LEVEL_COLOR,
  TYPE_LABEL,
  type TaskLevel,
  type TaskStatus,
  type TaskType,
} from "@/lib/pm";
import { ArrowLeft, Target } from "lucide-react";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: project } = await supabase
    .from("pm_projects")
    .select("id, name, description, status, division_id")
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

  const [{ data: tasks }, { data: divisions }, { data: profiles }] = await Promise.all([
    supabase
      .from("pm_tasks")
      .select("id, title, description, type, level, status, division_id, assignee_id, end_date, points")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase.from("divisions").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name, division_id"),
  ]);

  const profileName = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const isManager = user.role === "admin" || user.role === "superadmin";
  const isLeader = user.role === "leader";
  const members = (profiles ?? [])
    .filter((p) => (isLeader ? p.division_id === user.divisionId : true))
    .map((p) => ({ id: p.id, name: p.full_name, divisionId: p.division_id }));

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/tugas/proyek"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{project.name}</h1>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_COLOR[project.status as TaskStatus]}`}>
              {STATUS_LABEL[project.status as TaskStatus] ?? project.status}
            </span>
          </div>
          {project.description && <p className="ml-10 mt-1 text-sm text-slate-500">{project.description}</p>}
        </div>
        {(isManager || isLeader) && (
          <TaskForm role={user.role} divisions={divisions ?? []} members={members} projectId={projectId} label="Tambah Tugas" />
        )}
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-bold text-slate-800">
          <Target className="h-4.5 w-4.5 text-blue-600" />
          <span>Tugas dalam Proyek ({(tasks ?? []).length})</span>
        </h2>

        {(tasks ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm italic text-slate-400">Belum ada tugas di proyek ini.</p>
        ) : (
          <div className="space-y-3">
            {(tasks ?? []).map((t) => {
              const isAssignee = t.assignee_id === user.id;
              const reviewerForThis = isManager || (isLeader && t.division_id === user.divisionId);
              return (
                <div key={t.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800">{t.title}</h3>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLOR[t.status as TaskStatus]}`}>
                          {STATUS_LABEL[t.status as TaskStatus]}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${LEVEL_COLOR[t.level as TaskLevel]}`}>
                          {LEVEL_LABEL[t.level as TaskLevel]}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {TYPE_LABEL[t.type as TaskType]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        PIC: <span className="font-medium text-slate-600">{t.assignee_id ? profileName.get(t.assignee_id) ?? "-" : "Belum ditugaskan"}</span>
                        {" · "}
                        {t.points} poin
                        {t.end_date && ` · Due ${new Date(t.end_date).toLocaleDateString("id-ID", { dateStyle: "medium" })}`}
                      </p>
                    </div>
                    <TaskStatusControl
                      taskId={t.id}
                      status={t.status as TaskStatus}
                      isAssignee={isAssignee}
                      isReviewer={reviewerForThis}
                    />
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
