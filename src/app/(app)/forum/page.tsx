import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { NewThreadForm } from "./NewThreadForm";
import { ForumFilters } from "./ForumFilters";
import {
  THREAD_CATEGORY_LABEL,
  THREAD_CATEGORY_COLOR,
  THREAD_TYPE_LABEL,
  type ThreadCategory,
} from "@/lib/pm";
import { MessageSquare, ArrowRight, User2, Lock, Globe } from "lucide-react";

type SearchParams = Promise<{ category?: string; type?: string; division?: string }>;

export default async function ForumPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const sp = await searchParams;
  const isManager = user?.role === "superadmin" || user?.role === "admin";

  const [{ data: threadsRaw }, { data: divisions }, { data: profiles }] = await Promise.all([
    supabase
      .from("forum_threads")
      .select("id, title, topic_category, created_by, is_decision, visibility, created_at")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase.from("divisions").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name, division_id"),
  ]);

  const authorName = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const authorDivision = new Map((profiles ?? []).map((p) => [p.id, p.division_id]));

  // Filter in-memory (list dibatasi 80).
  const threads = (threadsRaw ?? []).filter((t) => {
    if (sp.category && t.topic_category !== sp.category) return false;
    const type = t.visibility === "private" ? "internal" : "global";
    if (sp.type && type !== sp.type) return false;
    if (isManager && sp.division && authorDivision.get(t.created_by) !== sp.division) return false;
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-blue-800 to-rose-700 bg-clip-text text-transparent">
          Forum Diskusi
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Ajukan Idea, Improvement, atau Issue. Diskusi async lintas tim &amp; divisi.
        </p>
      </div>

      {/* Buat thread */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-base font-bold text-slate-800">
          <MessageSquare className="h-4.5 w-4.5 text-rose-600" />
          <span>Pengajuan Thread Baru</span>
        </h2>
        <NewThreadForm />
      </section>

      {/* List */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Daftar Thread</h2>
          <ForumFilters showDivision={!!isManager} divisions={divisions ?? []} />
        </div>

        <div className="grid max-w-3xl gap-3">
          {threads.map((thread) => {
            const type = thread.visibility === "private" ? "internal" : "global";
            return (
              <Link
                key={thread.id}
                href={`/forum/${thread.id}`}
                className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:scale-[1.005] hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all duration-300 group-hover:bg-gradient-to-tr group-hover:from-blue-600 group-hover:to-rose-600 group-hover:text-white">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="max-w-[280px] truncate font-bold text-slate-800 transition-colors group-hover:text-blue-600">
                        {thread.title}
                      </p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${THREAD_CATEGORY_COLOR[thread.topic_category as ThreadCategory] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
                        {THREAD_CATEGORY_LABEL[thread.topic_category as ThreadCategory] ?? thread.topic_category}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        {type === "internal" ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                        {THREAD_TYPE_LABEL[type]}
                      </span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User2 className="h-3 w-3 text-slate-400" />
                        {authorName.get(thread.created_by) ?? "—"}
                      </span>
                      <span>&bull;</span>
                      <span>{new Date(thread.created_at).toLocaleDateString("id-ID", { dateStyle: "short" })}</span>
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-slate-800" />
              </Link>
            );
          })}

          {threads.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-12 text-center">
              <p className="text-sm italic text-slate-400">Belum ada thread yang cocok dengan filter.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
