"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

export async function createCycle(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const { error } = await supabase.from("eval_cycles").insert({
    name: String(formData.get("name")),
    start_date: String(formData.get("start_date") ?? "") || null,
    end_date: String(formData.get("end_date") ?? "") || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/evaluasi");
  return { error: null };
}

export async function closeCycle(cycleId: string) {
  const supabase = await createClient();
  await supabase.from("eval_cycles").update({ status: "closed" }).eq("id", cycleId);
  revalidatePath("/evaluasi");
  revalidatePath(`/evaluasi/${cycleId}`);
}

export async function createCriteria(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const { error } = await supabase.from("eval_criteria").insert({
    scope: String(formData.get("scope")),
    name: String(formData.get("name")),
    description: String(formData.get("description") ?? "") || null,
    weight: Number(formData.get("weight")),
  });

  if (error) return { error: error.message };
  revalidatePath("/evaluasi/kriteria");
  return { error: null };
}

export async function submitIndividualScores(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const cycleId = String(formData.get("cycle_id"));
  const rateeId = String(formData.get("ratee_id"));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const criteriaIds = formData.getAll("criteria_id").map(String);
  const rows = criteriaIds.map((criteriaId) => ({
    cycle_id: cycleId,
    rater_id: user.id,
    ratee_id: rateeId,
    criteria_id: criteriaId,
    score: Number(formData.get(`score_${criteriaId}`)),
    comment: String(formData.get(`comment_${criteriaId}`) ?? "") || null,
  }));

  const { error } = await supabase
    .from("evaluations_individual")
    .upsert(rows, { onConflict: "cycle_id,rater_id,ratee_id,criteria_id" });

  if (error) return { error: error.message };
  revalidatePath(`/evaluasi/${cycleId}`);
  return { error: null };
}

export async function submitCrossDivisionScore(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const cycleId = String(formData.get("cycle_id"));
  const rateeDivisionId = String(formData.get("ratee_division_id"));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("division_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.division_id) {
    return { error: "Akun Anda belum terhubung ke divisi manapun." };
  }

  const { error } = await supabase.from("evaluations_cross_division").upsert(
    {
      cycle_id: cycleId,
      rater_division_id: profile.division_id,
      ratee_division_id: rateeDivisionId,
      rater_user_id: user.id,
      score: Number(formData.get("score")),
      comment: String(formData.get("comment") ?? "") || null,
    },
    { onConflict: "cycle_id,rater_division_id,ratee_division_id,rater_user_id" },
  );

  if (error) return { error: error.message };
  revalidatePath(`/evaluasi/${cycleId}`);
  return { error: null };
}
