import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { TaskProgressButton } from "./TaskProgressButton";
import { TaskReviewForm } from "./TaskReviewForm";
import { Target, Settings, Clock, Award, MessageSquare } from "lucide-react";

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

export default async function TugasPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  if (!user) return null;

  const canReview =
    user.role === "superadmin" || user.role === "admin" || user.role === "leader";
  const canManageCatalog = user.role === "superadmin";

  const [{ data: myTasks }, { data: catalog }, { data: cycles }, { data: myScores }] =
    await Promise.all([
      supabase
        .from("kpi_tasks")
        .select(
          "id, title, description, status, due_date, cycle_id, point_catalog_id, thread_id, rejection_reason",
        )
        .eq("assignee_id", user.id)
        .order("due_date", { ascending: true }),
      supabase.from("point_catalog").select("id, name, points, active").order("points"),
      supabase.from("eval_cycles").select("id, name, status").order("start_date", { ascending: false }),
      supabase
        .from("individual_task_scores")
        .select("cycle_id, total_points, approved_task_count")
        .eq("assignee_id", user.id),
    ]);

  let pendingReview: {
    id: string;
    title: string;
    status: string;
    due_date: string | null;
    assignee_id: string;
    division_id: string;
    point_catalog_id: string;
    cycle_id: string;
  }[] = [];

  if (canReview) {
    let query = supabase
      .from("kpi_tasks")
      .select("id, title, status, due_date, assignee_id, division_id, point_catalog_id, cycle_id")
      .eq("status", "submitted")
      .order("due_date", { ascending: true });
    if (user.role === "leader" && user.divisionId) {
      query = query.eq("division_id", user.divisionId);
    }
    const { data } = await query;
    pendingReview = data ?? [];
  }

  const assigneeIds = [...new Set(pendingReview.map((t) => t.assignee_id))];
  const { data: assigneeProfiles } = assigneeIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", assigneeIds)
    : { data: [] };
  const assigneeNameById = new Map((assigneeProfiles ?? []).map((p) => [p.id, p.full_name]));

  const catalogById = new Map((catalog ?? []).map((c) => [c.id, c]));
  const cycleById = new Map((cycles ?? []).map((c) => [c.id, c]));
  const scoreByCycle = new Map((myScores ?? []).map((s) => [s.cycle_id, s]));
  const openCycle = (cycles ?? []).find((c) => c.status === "open");
  const myOpenCycleScore = openCycle ? scoreByCycle.get(openCycle.id) : null;

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Tugas &amp; Poin</h1>
          <p className="mt-1 text-sm text-slate-500">
            Task bernilai poin yang di-assign dari diskusi Forum, jadi komponen KPI individu karyawan.
          </p>
        </div>
        {canManageCatalog && (
          <Link
            href="/tugas/katalog-poin"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm"
          >
            <Settings className="h-4 w-4" />
            <span>Kelola Katalog Poin</span>
          </Link>
        )}
      </div>

      {/* Poin saya cycle aktif */}
      <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Award className="h-5.5 w-5.5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Poin Saya {openCycle ? `- ${openCycle.name}` : ""}
            </p>
            <p className="text-2xl font-extrabold text-slate-900">
              {myOpenCycleScore?.total_points ?? 0}{" "}
              <span className="text-sm font-medium text-slate-400">poin</span>
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500 max-w-xs text-right">
          {myOpenCycleScore?.approved_task_count ?? 0} task disetujui pada cycle berjalan.
        </p>
      </div>

      {/* Perlu Persetujuan */}
      {canReview && (
        <section className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-amber-600" />
              <span>Menunggu Persetujuan Anda</span>
            </h2>
            <span className="text-xs font-extrabold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
              {pendingReview.length}
            </span>
          </div>

          {pendingReview.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-4 text-center">
              Tidak ada task menunggu persetujuan.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingReview.map((task) => {
                const catalogItem = catalogById.get(task.point_catalog_id);
                return (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-100 p-4 bg-slate-50/30 space-y-2"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{task.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        PIC:{" "}
                        <span className="font-semibold text-slate-700">
                          {assigneeNameById.get(task.assignee_id) ?? "-"}
                        </span>
                        {" · "}
                        {catalogItem ? `${catalogItem.name} (${catalogItem.points} poin)` : "-"}
                        {" · "}
                        Due{" "}
                        {task.due_date
                          ? new Date(task.due_date).toLocaleDateString("id-ID", { dateStyle: "medium" })
                          : "-"}
                      </p>
                    </div>
                    <TaskReviewForm taskId={task.id} />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Tugas Saya */}
      <section className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Target className="h-4.5 w-4.5 text-blue-600" />
          <span>Tugas Saya</span>
        </h2>

        {(myTasks ?? []).length === 0 ? (
          <p className="text-sm text-slate-400 italic py-4 text-center">
            Belum ada task yang ditugaskan ke Anda. Task muncul di sini setelah dibuat leader/owner
            dari diskusi Forum.
          </p>
        ) : (
          <div className="space-y-3">
            {(myTasks ?? []).map((task) => {
              const catalogItem = catalogById.get(task.point_catalog_id);
              const cycle = cycleById.get(task.cycle_id);
              const isOverdue =
                !!task.due_date &&
                task.due_date < todayStr &&
                !["approved", "rejected", "cancelled"].includes(task.status);
              return (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-800">{task.title}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${STATUS_COLOR[task.status]}`}
                        >
                          {STATUS_LABEL[task.status]}
                        </span>
                        {isOverdue && (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-100">
                            Terlambat
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {catalogItem ? `${catalogItem.name} (${catalogItem.points} poin)` : "-"}
                        {" · "}
                        {cycle?.name ?? "-"}
                        {" · "}
                        Due{" "}
                        {task.due_date
                          ? new Date(task.due_date).toLocaleDateString("id-ID", { dateStyle: "medium" })
                          : "-"}
                      </p>
                      {task.status === "rejected" && task.rejection_reason && (
                        <p className="text-xs text-rose-600 mt-1">
                          Alasan ditolak: {task.rejection_reason}
                        </p>
                      )}
                      <Link
                        href={`/forum/${task.thread_id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline mt-1"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Lihat diskusi asal
                      </Link>
                    </div>
                    <TaskProgressButton taskId={task.id} status={task.status} />
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
