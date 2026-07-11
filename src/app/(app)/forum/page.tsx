import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { NewThreadForm } from "./NewThreadForm";
import { NewCategoryForm } from "./NewCategoryForm";
import { MessageSquare, Plus, CheckCircle, ArrowRight, User2, Layers, Lock } from "lucide-react";

export default async function ForumPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: categories }, { data: threads }, { data: divisions }] = await Promise.all([
    supabase.from("forum_categories").select("id, name, division_id").order("name"),
    // RLS sudah menyaring: thread privat hanya muncul kalau divisi user
    // di-include, dibuat sendiri, atau user Owner.
    supabase
      .from("forum_threads")
      .select("id, title, category_id, created_by, is_decision, visibility, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("divisions").select("id, name").order("name"),
  ]);

  const canCreatePrivate =
    user?.role === "leader" || user?.role === "admin" || user?.role === "superadmin";

  const authorIds = [...new Set((threads ?? []).map((t) => t.created_by).filter(Boolean))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const authorNameById = new Map((authors ?? []).map((a) => [a.id, a.full_name]));
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const canManageCategories = user?.role === "superadmin" || user?.role === "admin";

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Forum Diskusi
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Wadah koordinasi async, pengumuman keputusan resmi, dan diskusi topik antar divisi.
        </p>
      </div>

      {/* Admin Panel: Kelola Kategori */}
      {canManageCategories && (
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Layers className="h-4.5 w-4.5 text-blue-600" />
            <span>Tambah Kategori Diskusi</span>
          </h2>
          <NewCategoryForm />
        </div>
      )}

      {/* Form: New Thread */}
      <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <MessageSquare className="h-4.5 w-4.5 text-rose-600" />
          <span>Mulai Topik Diskusi Baru</span>
        </h2>
        <NewThreadForm
          categories={categories ?? []}
          divisions={divisions ?? []}
          canCreatePrivate={canCreatePrivate}
        />
      </div>

      {/* Thread List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Topik Terbaru</h2>
        
        <div className="grid gap-3 max-w-3xl">
          {(threads ?? []).map((thread) => {
            const authorName = authorNameById.get(thread.created_by) ?? "—";
            const categoryName = categoryNameById.get(thread.category_id) ?? "Umum";
            return (
              <Link
                key={thread.id}
                href={`/forum/${thread.id}`}
                className="group flex items-center justify-between rounded-2xl bg-white p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 hover:scale-[1.005]"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-gradient-to-tr group-hover:from-blue-600 group-hover:to-rose-600 group-hover:text-white transition-all duration-300">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800 truncate max-w-[300px] group-hover:text-blue-600 transition-colors">
                        {thread.title}
                      </p>
                      {thread.is_decision && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100">
                          <CheckCircle className="h-3 w-3" />
                          <span>Keputusan Resmi</span>
                        </span>
                      )}
                      {thread.visibility === "private" && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-100">
                          <Lock className="h-3 w-3" />
                          <span>Privat</span>
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span className="bg-slate-100 border border-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded text-[10px] uppercase">
                        {categoryName}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <User2 className="h-3 w-3 text-slate-400" />
                        <span>{authorName}</span>
                      </span>
                      <span>&bull;</span>
                      <span>{new Date(thread.created_at).toLocaleDateString("id-ID", { dateStyle: "short" })}</span>
                    </p>
                  </div>
                </div>

                <span className="text-slate-400 group-hover:text-slate-800 transition-colors pl-4">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}

          {(threads ?? []).length === 0 && (
            <div className="py-12 text-center border border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
              <p className="text-sm text-slate-400 italic">Belum ada topik diskusi dibuat.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
