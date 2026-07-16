import { createClient } from "@/lib/supabase/server";
import { PostForm } from "./PostForm";
import Link from "next/link";
import { Lock } from "lucide-react";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const supabase = await createClient();

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

  const [{ data: posts }, { data: threadDivisions }] = await Promise.all([
    supabase
      .from("forum_posts")
      .select("id, author_id, content, created_at")
      .eq("thread_id", threadId)
      .order("created_at"),
    thread.visibility === "private"
      ? supabase.from("forum_thread_divisions").select("division_id, divisions(name)").eq("thread_id", threadId)
      : Promise.resolve({ data: [] as { division_id: string; divisions: unknown }[] }),
  ]);

  const authorIds = [...new Set((posts ?? []).map((p) => p.author_id).filter(Boolean))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const authorNameById = new Map((authors ?? []).map((a) => [a.id, a.full_name]));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/forum"
          className="text-xs font-semibold text-blue-600 hover:underline"
        >
          &larr; Kembali ke Forum Diskusi
        </Link>
        <h1 className="mt-2 text-xl font-semibold">
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
    </div>
  );
}
