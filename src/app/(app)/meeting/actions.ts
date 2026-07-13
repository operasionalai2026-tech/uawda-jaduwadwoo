"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

export async function createMeeting(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const visibility = String(formData.get("visibility") ?? "public") === "private" ? "private" : "public";
  const divisionIds = formData.getAll("division_ids").map(String).filter(Boolean);

  if (visibility === "private" && divisionIds.length === 0) {
    return { error: "Pilih minimal satu divisi untuk rapat privat." };
  }

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      title: String(formData.get("title")),
      visibility,
      scheduled_at: String(formData.get("scheduled_at")),
      location: String(formData.get("location") ?? "") || null,
      agenda: String(formData.get("agenda") ?? "") || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (visibility === "private") {
    const { error: divisionError } = await supabase
      .from("meeting_divisions")
      .insert(divisionIds.map((division_id) => ({ meeting_id: meeting.id, division_id })));
    if (divisionError) return { error: divisionError.message };
  }

  revalidatePath("/meeting");
  redirect(`/meeting/${meeting.id}`);
}

export async function rsvp(meetingId: string, status: "yes" | "no") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("meeting_attendees")
    .upsert(
      { meeting_id: meetingId, user_id: user.id, rsvp_status: status },
      { onConflict: "meeting_id,user_id" },
    );

  revalidatePath(`/meeting/${meetingId}`);
}

export async function saveNotulen(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const meetingId = String(formData.get("meeting_id"));

  const { error } = await supabase.from("notulen").upsert(
    {
      meeting_id: meetingId,
      content: String(formData.get("content") ?? ""),
      created_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "meeting_id" },
  );

  if (error) return { error: error.message };
  revalidatePath(`/meeting/${meetingId}`);
  return { error: null };
}

export async function addDecision(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const meetingId = String(formData.get("meeting_id"));

  const { error } = await supabase.from("decisions").insert({
    meeting_id: meetingId,
    content: String(formData.get("content")),
  });

  if (error) return { error: error.message };
  revalidatePath(`/meeting/${meetingId}`);
  return { error: null };
}

export async function addActionItem(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const meetingId = String(formData.get("meeting_id"));

  const { error } = await supabase.from("action_items").insert({
    meeting_id: meetingId,
    title: String(formData.get("title")),
    assignee_id: String(formData.get("assignee_id") ?? "") || null,
    due_date: String(formData.get("due_date") ?? "") || null,
  });

  if (error) return { error: error.message };
  revalidatePath(`/meeting/${meetingId}`);
  return { error: null };
}

export async function updateActionItemStatus(
  meetingId: string,
  actionItemId: string,
  status: string,
) {
  const supabase = await createClient();
  await supabase
    .from("action_items")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", actionItemId);

  revalidatePath(`/meeting/${meetingId}`);
}
