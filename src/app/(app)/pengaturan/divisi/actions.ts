"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

export async function createDivision(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const { error } = await supabase.from("divisions").insert({
    name: String(formData.get("name")),
    category: String(formData.get("category") ?? "") || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/pengaturan/divisi");
  revalidatePath("/pengaturan");
  return { error: null };
}

export async function updateDivision(
  id: string,
  data: { name: string; category: string | null },
): Promise<ActionState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("divisions")
    .update({ name: data.name, category: data.category || null })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/pengaturan/divisi");
  revalidatePath("/pengaturan");
  return { error: null };
}

export async function deleteDivision(id: string): Promise<ActionState> {
  const supabase = await createClient();

  const { error } = await supabase.from("divisions").delete().eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/pengaturan/divisi");
  revalidatePath("/pengaturan");
  return { error: null };
}
