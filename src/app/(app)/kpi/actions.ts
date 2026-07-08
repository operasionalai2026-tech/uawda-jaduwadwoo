"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

export async function createMetric(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const divisionId = String(formData.get("division_id"));

  const { error } = await supabase.from("kpi_metrics").insert({
    division_id: divisionId,
    name: String(formData.get("name")),
    unit: String(formData.get("unit") ?? "") || null,
    weight: Number(formData.get("weight")),
    target_value: Number(formData.get("target_value")),
    direction: String(formData.get("direction")),
    source_type: String(formData.get("source_type") ?? "manual"),
  });

  if (error) return { error: error.message };

  revalidatePath(`/kpi/${divisionId}`);
  return { error: null };
}

export async function upsertEntry(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const divisionId = String(formData.get("division_id"));
  const metricId = String(formData.get("metric_id"));
  const periodId = String(formData.get("period_id"));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("kpi_entries").upsert(
    {
      metric_id: metricId,
      period_id: periodId,
      actual_value: Number(formData.get("actual_value")),
      notes: String(formData.get("notes") ?? "") || null,
      entered_by: user?.id,
    },
    { onConflict: "metric_id,period_id" },
  );

  if (error) return { error: error.message };

  revalidatePath(`/kpi/${divisionId}`);
  return { error: null };
}

export async function createPeriod(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const divisionId = String(formData.get("division_id"));
  const periodType = String(formData.get("period_type"));
  const year = Number(formData.get("year"));
  const month = periodType === "monthly" ? Number(formData.get("month")) : null;

  const { error } = await supabase.from("kpi_periods").insert({
    period_type: periodType,
    year,
    month,
  });

  if (error) return { error: error.message };

  revalidatePath(`/kpi/${divisionId}`);
  return { error: null };
}
