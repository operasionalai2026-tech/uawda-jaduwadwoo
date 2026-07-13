"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

export async function createTaskFromThread(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const threadId = String(formData.get("thread_id"));
  const assigneeId = String(formData.get("assignee_id"));
  const cycleId = String(formData.get("cycle_id"));
  const pointCatalogId = String(formData.get("point_catalog_id"));
  const title = String(formData.get("title"));
  const description = String(formData.get("description") ?? "") || null;
  const dueDate = String(formData.get("due_date"));

  const { data: assigneeProfile, error: profileError } = await supabase
    .from("profiles")
    .select("division_id")
    .eq("id", assigneeId)
    .single();

  if (profileError || !assigneeProfile?.division_id) {
    return { error: "Karyawan yang dipilih belum punya divisi." };
  }

  const { error } = await supabase.from("kpi_tasks").insert({
    thread_id: threadId,
    cycle_id: cycleId,
    division_id: assigneeProfile.division_id,
    point_catalog_id: pointCatalogId,
    title,
    description,
    assignee_id: assigneeId,
    assigned_by: user.id,
    due_date: dueDate,
  });

  if (error) return { error: error.message };
  revalidatePath(`/forum/${threadId}`);
  revalidatePath("/tugas");
  return { error: null };
}

export async function createProject(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = String(formData.get("name"));
  const description = String(formData.get("description") ?? "") || null;

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ name, description, created_by: user.id })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/tugas/proyek");
  redirect(`/tugas/proyek/${project.id}`);
}

export async function createTaskForProject(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const projectId = String(formData.get("project_id"));
  const assigneeId = String(formData.get("assignee_id"));
  const cycleId = String(formData.get("cycle_id"));
  const pointCatalogId = String(formData.get("point_catalog_id"));
  const title = String(formData.get("title"));
  const description = String(formData.get("description") ?? "") || null;
  const dueDate = String(formData.get("due_date"));

  const { data: assigneeProfile, error: profileError } = await supabase
    .from("profiles")
    .select("division_id")
    .eq("id", assigneeId)
    .single();

  if (profileError || !assigneeProfile?.division_id) {
    return { error: "Karyawan yang dipilih belum punya divisi." };
  }

  const { error } = await supabase.from("kpi_tasks").insert({
    project_id: projectId,
    cycle_id: cycleId,
    division_id: assigneeProfile.division_id,
    point_catalog_id: pointCatalogId,
    title,
    description,
    assignee_id: assigneeId,
    assigned_by: user.id,
    due_date: dueDate,
  });

  if (error) return { error: error.message };
  revalidatePath(`/tugas/proyek/${projectId}`);
  revalidatePath("/tugas");
  return { error: null };
}

export async function startTask(taskId: string) {
  const supabase = await createClient();
  await supabase.from("kpi_tasks").update({ status: "in_progress" }).eq("id", taskId);
  revalidatePath("/tugas");
}

export async function submitTask(taskId: string) {
  const supabase = await createClient();
  await supabase
    .from("kpi_tasks")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", taskId);
  revalidatePath("/tugas");
}

export async function approveTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("kpi_tasks")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", taskId);
  revalidatePath("/tugas");
}

export async function rejectTask(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const taskId = String(formData.get("task_id"));
  const reason = String(formData.get("rejection_reason") ?? "");

  const { error } = await supabase
    .from("kpi_tasks")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason || null,
    })
    .eq("id", taskId);

  if (error) return { error: error.message };
  revalidatePath("/tugas");
  return { error: null };
}

export async function createPointCatalog(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const { error } = await supabase.from("point_catalog").insert({
    name: String(formData.get("name")),
    points: Number(formData.get("points")),
    description: String(formData.get("description") ?? "") || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/tugas/katalog-poin");
  return { error: null };
}

export async function toggleCatalogActive(id: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("point_catalog").update({ active }).eq("id", id);
  revalidatePath("/tugas/katalog-poin");
}
