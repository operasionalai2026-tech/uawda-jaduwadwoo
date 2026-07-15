"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  ASSIGNEE_NEXT_STATUS,
  REVIEWER_NEXT_STATUS,
  TASK_LEVELS,
  TASK_STATUSES,
  TASK_TYPES,
  type TaskLevel,
  type TaskStatus,
  type TaskType,
} from "@/lib/pm";

export type ActionState = { error: string | null };

function asType(v: FormDataEntryValue | null): TaskType {
  const s = String(v ?? "");
  return (TASK_TYPES as string[]).includes(s) ? (s as TaskType) : "pengembangan";
}
function asLevel(v: FormDataEntryValue | null): TaskLevel {
  const s = String(v ?? "");
  return (TASK_LEVELS as string[]).includes(s) ? (s as TaskLevel) : "medium";
}
function asStatus(v: FormDataEntryValue | null, fallback: TaskStatus): TaskStatus {
  const s = String(v ?? "");
  return (TASK_STATUSES as string[]).includes(s) ? (s as TaskStatus) : fallback;
}
function optionalString(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

// ---------------------------------------------------------------------------
// Buat Tugas (role-aware). Staff -> idea (menunggu approval) & assign ke diri
// sendiri di divisinya. Lead -> divisinya sendiri, boleh set assignee/status/
// tanggal. Management/Owner -> bebas lintas divisi.
// ---------------------------------------------------------------------------
export async function createTask(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Nama tugas wajib diisi." };

  const type = asType(formData.get("type"));
  const level = asLevel(formData.get("level"));
  const description = optionalString(formData.get("description"));
  const projectId = optionalString(formData.get("project_id"));

  const supabase = await createClient();

  // Bangun payload sesuai peran.
  const base: Record<string, unknown> = {
    title,
    description,
    type,
    level,
    project_id: projectId,
    created_by: user.id,
  };

  if (user.role === "staff") {
    if (!user.divisionId) return { error: "Akun Anda belum punya divisi." };
    base.status = "idea"; // menunggu approval Lead/Management
    base.assignee_id = user.id;
    base.division_id = user.divisionId;
  } else if (user.role === "leader") {
    if (!user.divisionId) return { error: "Akun Anda belum punya divisi." };
    base.division_id = user.divisionId;
    base.status = asStatus(formData.get("status"), "todo");
    base.start_date = optionalString(formData.get("start_date"));
    base.end_date = optionalString(formData.get("end_date"));
    const assigneeId = optionalString(formData.get("assignee_id"));
    if (assigneeId) {
      // Pastikan assignee memang anggota divisi Lead ini.
      const { data: prof } = await supabase
        .from("profiles")
        .select("division_id")
        .eq("id", assigneeId)
        .maybeSingle();
      if (prof?.division_id !== user.divisionId) {
        return { error: "Assignee harus anggota divisi Anda." };
      }
      base.assignee_id = assigneeId;
    }
  } else {
    // Management / Owner
    const divisionId = optionalString(formData.get("division_id"));
    if (!divisionId) return { error: "Divisi wajib dipilih." };
    base.division_id = divisionId;
    base.status = asStatus(formData.get("status"), "todo");
    base.start_date = optionalString(formData.get("start_date"));
    base.end_date = optionalString(formData.get("end_date"));
    base.assignee_id = optionalString(formData.get("assignee_id"));
  }

  const { error } = await supabase.from("pm_tasks").insert(base);
  if (error) return { error: error.message };

  revalidatePath("/tugas");
  revalidatePath("/");
  if (projectId) revalidatePath(`/tugas/proyek/${projectId}`);
  return { error: null };
}

// ---------------------------------------------------------------------------
// Ubah status task (validasi transisi per peran).
// ---------------------------------------------------------------------------
export async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { data: task } = await supabase
    .from("pm_tasks")
    .select("id, status, assignee_id, division_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { error: "Task tidak ditemukan." };

  const isReviewer =
    user.role === "superadmin" ||
    user.role === "admin" ||
    (user.role === "leader" && task.division_id === user.divisionId);
  const isAssignee = task.assignee_id === user.id;

  const allowed = new Set<TaskStatus>();
  if (isAssignee) ASSIGNEE_NEXT_STATUS[task.status as TaskStatus].forEach((s) => allowed.add(s));
  if (isReviewer) REVIEWER_NEXT_STATUS[task.status as TaskStatus].forEach((s) => allowed.add(s));

  if (!allowed.has(newStatus)) {
    return { error: "Perubahan status ini tidak diizinkan." };
  }

  const { error } = await supabase.from("pm_tasks").update({ status: newStatus }).eq("id", taskId);
  if (error) return { error: error.message };

  revalidatePath("/tugas");
  revalidatePath("/");
  return { error: null };
}

// Approve idea -> todo (khusus reviewer).
export async function approveIdeaTask(taskId: string) {
  return updateTaskStatus(taskId, "todo");
}

// Tolak / batalkan task -> cancelled (khusus reviewer).
export async function rejectTask(taskId: string) {
  return updateTaskStatus(taskId, "cancelled");
}

// ---------------------------------------------------------------------------
// Proyek (Management / Owner).
// ---------------------------------------------------------------------------
export async function createProject(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };
  if (user.role !== "superadmin" && user.role !== "admin") {
    return { error: "Hanya Management atau Owner yang dapat membuat proyek." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nama proyek wajib diisi." };
  const divisionId = optionalString(formData.get("division_id"));
  if (!divisionId) return { error: "Divisi wajib dipilih." };

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("pm_projects")
    .insert({
      name,
      description: optionalString(formData.get("description")),
      division_id: divisionId,
      start_date: optionalString(formData.get("start_date")),
      end_date: optionalString(formData.get("end_date")),
      type: asType(formData.get("type")),
      status: asStatus(formData.get("status"), "todo"),
      level: asLevel(formData.get("level")),
      assignee_id: optionalString(formData.get("assignee_id")),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/tugas/proyek");
  redirect(`/tugas/proyek/${project.id}`);
}

export async function updateProjectStatus(projectId: string, newStatus: TaskStatus) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };
  if (user.role !== "superadmin" && user.role !== "admin") {
    return { error: "Tidak diizinkan." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("pm_projects")
    .update({ status: newStatus })
    .eq("id", projectId);
  if (error) return { error: error.message };
  revalidatePath("/tugas/proyek");
  revalidatePath(`/tugas/proyek/${projectId}`);
  return { error: null };
}
