import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getVisualNotesToken } from "@/lib/visual-notes-token";
import { renderVisualNotesPoster } from "./poster";

// Poster "Catatan Visual" rapat: infografis PNG yang dirender on-the-fly dari
// notulen, keputusan, dan action items -- selalu mengikuti data terbaru, tidak
// perlu disimpan ke Storage. Dua jalur akses:
//   1. Sesi login (RLS) -- rapat privat tetap terlindungi, tanpa akses 404.
//   2. ?token=... -- link bagikan publik; token deterministik per rapat yang
//      hanya bisa dihitung server, memberi akses lihat poster tanpa login.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const { meetingId } = await params;

  const token = new URL(request.url).searchParams.get("token");
  const expected = getVisualNotesToken(meetingId);
  const tokenValid =
    !!token &&
    token.length === expected.length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(expected));

  const supabase = tokenValid ? createAdminClient() : await createClient();

  // RLS: null kalau rapat privat & user tidak berhak, atau belum login.
  const { data: meeting } = await supabase
    .from("meetings")
    .select("title, location, scheduled_at")
    .eq("id", meetingId)
    .maybeSingle();

  if (!meeting) {
    return NextResponse.json({ error: "Rapat tidak ditemukan" }, { status: 404 });
  }

  const [
    { data: notulenRow },
    { data: decisions },
    { data: actionItems },
    { data: attendees },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("notulen").select("content").eq("meeting_id", meetingId).maybeSingle(),
    supabase.from("decisions").select("content").eq("meeting_id", meetingId).order("created_at"),
    supabase
      .from("action_items")
      .select("title, assignee_id, due_date, status")
      .eq("meeting_id", meetingId)
      .order("created_at"),
    supabase.from("meeting_attendees").select("user_id, rsvp_status").eq("meeting_id", meetingId),
    supabase.from("profiles").select("id, full_name"),
  ]);

  return renderVisualNotesPoster({
    meeting,
    notulenContent: notulenRow?.content ?? null,
    decisions: decisions ?? [],
    actionItems: actionItems ?? [],
    attendees: attendees ?? [],
    profiles: profiles ?? [],
  });
}
