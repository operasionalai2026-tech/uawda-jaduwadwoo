import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PostForm } from "./PostForm";
import { NewTaskForm } from "./NewTaskForm";
import Link from "next/link";
import { Target, Lock } from "lucide-react";

const TASK_STATUS_LABEL: Record<string, string> = {
  assigned: "Ditugaskan",
  in_progress: "Dikerjakan",
  submitted: "Menunggu Persetujuan",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Ambil thread dulu -- RLS akan mengembalikan null kalau thread ini privat
  // dan divisi user tidak di-include (kecuali dia pembuatnya atau Owner).
  const { data: thread } = await supabase
    .from("forum_threads")
    .select("id, title, is_decision, visibility, created_by")
    .eq("id", threadId)
    .maybeSingle();

  if (!thread) {
    return (
      <div className="max-w-2xl space-y-3">
        <h1 className="text-xl font-semibold">Thread tidak ditemukan</h1>
        <p className="text-sm text-neutral-500">
          Thread ini tidak ada, atau bersifat privat dan divisi Anda tidak disertakan dalam
          diskusi ini.
        </p>
        <Link href="/forum" className="text-sm font-semibold text-blue-600 hover:underline">
          &larr; Kembali ke Forum
        </Link>
      </div>
    );
  }

  const [{ data: posts }, { data: tasks }, { data: threadDivisions }] = await Promise.all([
    supabase
      .from("forum_posts")
      .select("id, author_id, content, created_at")
      .eq("thread_id", threadId)
      .order("created_at"),
    supabase
      .from("kpi_tasks")
      .select("id, title, status, due_date, assignee_id")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false }),
    thread.visibility === "private"
      ? supabase.from("forum_thread_divisions").select("division_id, divisions(name)").eq("thread_id", threadId)
      : Promise.resolve({ data: [] as { division_id: string; divisions: unknown }[] }),
  ]);

  const authorIds = [...new Set((posts ?? []).map((p) => p.author_id).filter(Boolean))];
  const taskAssigneeIds = [...new Set((tasks ?? []).map((t) => t.assignee_id).filter(Boolean))];
  const profileIds = [...new Set([...authorIds, ...taskAssigneeIds])];
  const { data: authors } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] };
  const authorNameById = new Map((authors ?? []).map((a) => [a.id, a.full_name]));

  const canAssign =
    user?.role === "leader" || user?.role === "admin" || user?.role === "superadmin";

  let assignableProfiles: { id: string; full_name: string }[] = [];
  let catalog: { id: string; name: string; points: number }[] = [];
  let cycles: { id: string; name: string }[] = [];

  if (canAssign) {
    const assigneeQuery =
      user?.role === "leader" && user.divisionId
        ? supabase.from("profiles").select("id, full_name").eq("division_id", user.divisionId)
        : supabase.from("profiles").select("id, full_name");

    const [{ data: assignees }, { data: catalogData }, { data: cyclesData }] = await Promise.all([
      assigneeQuery,
      supabase.from("point_catalog").select("id, name, points").eq("active", true).order("points"),
      supabase
        .from("eval_cycles")
        .select("id, name")
        .eq("status", "open")
        .order("start_date", { ascending: false }),
    ]);

    assignableProfiles = assignees ?? [];
    catalog = catalogData ?? [];
    cycles = cyclesData ?? [];
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {thread.title}
          {thread.is_decision && (
            <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 align-middle">
              Keputusan
            </span>
          )}
          {thread.visibility === "private" && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 align-middle">
              <Lock className="h-3 w-3" />
              Privat
            </span>
          )}
        </h1>
        {thread.visibility === "private" && (
          <p className="mt-1 text-xs text-neutral-500">
            Hanya untuk:{" "}
            {(threadDivisions ?? [])
              .map((d) => {
                const rel = d.divisions;
                const div = Array.isArray(rel) ? rel[0] : rel;
                return (div as { name?: string } | null)?.name;
              })
              .filter(Boolean)
              .join(", ") || "-"}
            {" "}(dan Owner)
          </p>
        )}
      </div>

      <div className="space-y-3">
        {(posts ?? []).map((post) => (
          <div key={post.id} className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm p-3">
            <p className="mb-1 text-xs font-medium text-neutral-500">
              {authorNameById.get(post.author_id) ?? "-"} &middot;{" "}
              {new Date(post.created_at).toLocaleString("id-ID")}
            </p>
            <p className="whitespace-pre-wrap text-sm">{post.content}</p>
          </div>
        ))}
        {(posts ?? []).length === 0 && (
          <p className="text-sm text-neutral-400">Belum ada balasan.</p>
        )}
      </div>

      <PostForm threadId={threadId} />

      {(tasks ?? []).length > 0 && (
        <div className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-neutral-500">
            <Target className="h-4 w-4" />
            Task dari diskusi ini
          </h2>
          <ul className="space-y-1.5">
            {(tasks ?? []).map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-neutral-500">
                    PIC: {authorNameById.get(t.assignee_id) ?? "-"}
                    {t.due_date &&
                      ` · Due ${new Date(t.due_date).toLocaleDateString("id-ID", { dateStyle: "medium" })}`}
                  </p>
                </div>
                <Link href="/tugas" className="text-xs font-semibold text-blue-600 hover:underline">
                  {TASK_STATUS_LABEL[t.status] ?? t.status}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canAssign && (
        <div className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-neutral-500">
            <Target className="h-4 w-4" />
            Buat task berpoin dari diskusi ini
          </h2>
          {catalog.length === 0 || cycles.length === 0 ? (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
              {catalog.length === 0 && "Belum ada katalog poin aktif. "}
              {cycles.length === 0 && "Belum ada cycle evaluasi yang sedang open. "}
              Hubungi superadmin/admin untuk menyiapkannya.
            </p>
          ) : (
            <NewTaskForm
              threadId={threadId}
              assignees={assignableProfiles}
              catalog={catalog}
              cycles={cycles}
            />
          )}
        </div>
      )}
    </div>
  );
}
