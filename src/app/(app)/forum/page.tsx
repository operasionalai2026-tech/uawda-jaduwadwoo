import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { NewThreadForm } from "./NewThreadForm";
import { NewCategoryForm } from "./NewCategoryForm";

export default async function ForumPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: categories }, { data: threads }] = await Promise.all([
    supabase.from("forum_categories").select("id, name, division_id").order("name"),
    supabase
      .from("forum_threads")
      .select("id, title, category_id, created_by, is_decision, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const authorIds = [...new Set((threads ?? []).map((t) => t.created_by).filter(Boolean))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const authorNameById = new Map((authors ?? []).map((a) => [a.id, a.full_name]));
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const canManageCategories = user?.role === "superadmin" || user?.role === "admin";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Forum</h1>

      {canManageCategories && <NewCategoryForm />}

      <NewThreadForm categories={categories ?? []} />

      <div className="space-y-2">
        {(threads ?? []).map((thread) => (
          <Link
            key={thread.id}
            href={`/forum/${thread.id}`}
            className="flex items-center justify-between rounded-md border border-neutral-200 px-4 py-3 text-sm hover:bg-neutral-50"
          >
            <div>
              <p className="font-medium">
                {thread.title}
                {thread.is_decision && (
                  <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                    Keputusan
                  </span>
                )}
              </p>
              <p className="text-xs text-neutral-500">
                {categoryNameById.get(thread.category_id) ?? "-"} &middot;{" "}
                {authorNameById.get(thread.created_by) ?? "-"}
              </p>
            </div>
          </Link>
        ))}
        {(threads ?? []).length === 0 && (
          <p className="text-sm text-neutral-400">Belum ada thread.</p>
        )}
      </div>
    </div>
  );
}
