"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

export async function createCategory(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const divisionId = String(formData.get("division_id") ?? "") || null;

  const { error } = await supabase.from("forum_categories").insert({
    name: String(formData.get("name")),
    division_id: divisionId,
  });

  if (error) return { error: error.message };
  revalidatePath("/forum");
  return { error: null };
}

export async function createThread(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const categoryId = String(formData.get("category_id"));
  const title = String(formData.get("title"));
  const content = String(formData.get("content") ?? "");

  const { data: thread, error } = await supabase
    .from("forum_threads")
    .insert({ category_id: categoryId, title, created_by: user.id })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (content.trim()) {
    await supabase
      .from("forum_posts")
      .insert({ thread_id: thread.id, author_id: user.id, content });
  }

  revalidatePath("/forum");
  redirect(`/forum/${thread.id}`);
}

export async function createPost(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const threadId = String(formData.get("thread_id"));
  const content = String(formData.get("content"));

  const { error } = await supabase
    .from("forum_posts")
    .insert({ thread_id: threadId, author_id: user.id, content });

  if (error) return { error: error.message };
  revalidatePath(`/forum/${threadId}`);
  return { error: null };
}
