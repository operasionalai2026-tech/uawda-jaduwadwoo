"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export type ActionState = { error: string | null };

export async function createMeeting(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Judul rapat wajib diisi." };

  // Type rapat: Internal Divisi = privat ke satu divisi; Global = publik.
  const meetingType = String(formData.get("meeting_type") ?? "global");
  const isInternal = meetingType === "internal";
  // Divisi untuk rapat internal: Management/Owner boleh lebih dari satu
  // (division_ids); role lain memakai satu pilihan atau divisinya sendiri.
  const multi = formData
    .getAll("division_ids")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const single = String(formData.get("division_id") ?? "") || null;
  const internalDivisions =
    multi.length > 0 ? multi : single ? [single] : user.divisionId ? [user.divisionId] : [];

  if (isInternal && internalDivisions.length === 0) {
    return { error: "Pilih minimal satu divisi untuk rapat Internal." };
  }

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      title,
      visibility: isInternal ? "private" : "public",
      scheduled_at: String(formData.get("scheduled_at")),
      location: String(formData.get("location") ?? "") || null,
      agenda: String(formData.get("agenda") ?? "") || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (isInternal && internalDivisions.length > 0) {
    const { error: divisionError } = await supabase
      .from("meeting_divisions")
      .insert(internalDivisions.map((divId) => ({ meeting_id: meeting.id, division_id: divId })));
    if (divisionError) return { error: divisionError.message };
  }

  revalidatePath("/meeting");
  redirect(`/meeting/${meeting.id}`);
}

// Hapus rapat (Owner/Management/Lead) -- mis. rapat yang sudah selesai atau
// dibatalkan. Attendee, notulen, keputusan, action item, dan rekaman ikut
// terhapus (cascade).
export async function deleteMeeting(meetingId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (user.role !== "superadmin" && user.role !== "admin" && user.role !== "leader") {
    throw new Error("Hanya Owner, Management, atau Lead yang dapat menghapus rapat.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("meetings").delete().eq("id", meetingId);
  if (error) throw new Error(error.message);

  revalidatePath("/meeting");
  redirect("/meeting");
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
