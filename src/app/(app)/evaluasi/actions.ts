"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export type ActionState = { error: string | null };

// Buat Evaluasi/Retro (Lead / Management / Owner).
// Lead -> divisinya sendiri; Management/Owner -> pilih divisi.
export async function createRetro(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };
  if (user.role !== "leader" && user.role !== "admin" && user.role !== "superadmin") {
    return { error: "Hanya Lead Team, Management, atau Owner yang dapat membuat evaluasi." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Judul evaluasi wajib diisi." };

  const assigneeId = String(formData.get("assignee_id") ?? "") || null;
  if (!assigneeId) return { error: "Pilih anggota yang dievaluasi." };

  const supabase = await createClient();

  let divisionId: string | null;
  if (user.role === "leader") {
    if (!user.divisionId) return { error: "Akun Anda belum punya divisi." };
    divisionId = user.divisionId;
    // Pastikan assignee anggota divisi Lead.
    const { data: prof } = await supabase
      .from("profiles")
      .select("division_id")
      .eq("id", assigneeId)
      .maybeSingle();
    if (prof?.division_id !== user.divisionId) {
      return { error: "Anggota yang dievaluasi harus dari divisi Anda." };
    }
  } else {
    divisionId = String(formData.get("division_id") ?? "") || null;
    if (!divisionId) return { error: "Divisi wajib dipilih." };
  }

  const { error } = await supabase.from("retros").insert({
    title,
    description: String(formData.get("description") ?? "") || null,
    evaluator_id: user.id,
    assignee_id: assigneeId,
    division_id: divisionId,
    eval_date: String(formData.get("eval_date") ?? "") || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/evaluasi");
  revalidatePath("/");
  return { error: null };
}

// Hapus evaluasi/retro (Owner/Management/Lead). RLS membatasi Lead hanya
// untuk retro di divisinya sendiri.
export async function deleteRetro(retroId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (user.role !== "superadmin" && user.role !== "admin" && user.role !== "leader") {
    throw new Error("Hanya Owner, Management, atau Lead yang dapat menghapus evaluasi.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("retros").delete().eq("id", retroId);
  if (error) throw new Error(error.message);

  revalidatePath("/evaluasi");
  revalidatePath("/");
}
