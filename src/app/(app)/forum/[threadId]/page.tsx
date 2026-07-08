import { createClient } from "@/lib/supabase/server";
import { PostForm } from "./PostForm";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const supabase = await createClient();

  const [{ data: thread }, { data: posts }] = await Promise.all([
    supabase
      .from("forum_threads")
      .select("id, title, is_decision, created_by")
      .eq("id", threadId)
      .single(),
    supabase
      .from("forum_posts")
      .select("id, author_id, content, created_at")
      .eq("thread_id", threadId)
      .order("created_at"),
  ]);

  const authorIds = [...new Set((posts ?? []).map((p) => p.author_id).filter(Boolean))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const authorNameById = new Map((authors ?? []).map((a) => [a.id, a.full_name]));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {thread?.title}
          {thread?.is_decision && (
            <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 align-middle">
              Keputusan
            </span>
          )}
        </h1>
      </div>

      <div className="space-y-3">
        {(posts ?? []).map((post) => (
          <div key={post.id} className="rounded-lg border border-neutral-200 p-3">
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
