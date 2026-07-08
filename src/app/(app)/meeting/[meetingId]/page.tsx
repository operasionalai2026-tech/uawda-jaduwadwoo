import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { rsvp } from "../actions";
import { NotulenForm } from "./NotulenForm";
import { DecisionForm } from "./DecisionForm";
import { ActionItemForm } from "./ActionItemForm";
import { ActionItemStatusSelect } from "./ActionItemStatusSelect";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [
    { data: meeting },
    { data: attendees },
    { data: notulenRow },
    { data: decisions },
    { data: actionItems },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("meetings").select("*").eq("id", meetingId).single(),
    supabase.from("meeting_attendees").select("user_id, rsvp_status, attended").eq("meeting_id", meetingId),
    supabase.from("notulen").select("content").eq("meeting_id", meetingId).maybeSingle(),
    supabase.from("decisions").select("id, content, created_at").eq("meeting_id", meetingId).order("created_at"),
    supabase.from("action_items").select("id, title, assignee_id, due_date, status").eq("meeting_id", meetingId).order("created_at"),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const myRsvp = (attendees ?? []).find((a) => a.user_id === user?.id)?.rsvp_status;
  const canEditNotulen =
    user?.role === "superadmin" || user?.role === "admin" || user?.role === "leader";

  const rsvpYes = rsvp.bind(null, meetingId, "yes");
  const rsvpNo = rsvp.bind(null, meetingId, "no");

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">{meeting?.title}</h1>
        <p className="text-sm text-neutral-500">
          {meeting && new Date(meeting.scheduled_at).toLocaleString("id-ID")}
          {meeting?.location ? ` · ${meeting.location}` : ""}
        </p>
        {meeting?.agenda && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">
            {meeting.agenda}
          </p>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-500">Kehadiran Anda</h2>
        <div className="flex items-center gap-2">
          <form action={rsvpYes}>
            <button
              type="submit"
              className={`rounded-md border px-3 py-1.5 text-sm ${
                myRsvp === "yes"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                  : "border-neutral-300 hover:bg-neutral-100"
              }`}
            >
              Hadir
            </button>
          </form>
          <form action={rsvpNo}>
            <button
              type="submit"
              className={`rounded-md border px-3 py-1.5 text-sm ${
                myRsvp === "no"
                  ? "border-rose-600 bg-rose-50 text-rose-700"
                  : "border-neutral-300 hover:bg-neutral-100"
              }`}
            >
              Tidak Hadir
            </button>
          </form>
        </div>
        <p className="text-xs text-neutral-400">
          {(attendees ?? []).filter((a) => a.rsvp_status === "yes").length} konfirmasi
          hadir dari {(attendees ?? []).length} peserta tercatat.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-500">Notulen</h2>
        {canEditNotulen ? (
          <NotulenForm meetingId={meetingId} initialContent={notulenRow?.content ?? ""} />
        ) : (
          <p className="whitespace-pre-wrap rounded-md border border-neutral-200 p-3 text-sm">
            {notulenRow?.content || "Belum ada notulen."}
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-500">Keputusan</h2>
        <ul className="space-y-1.5">
          {(decisions ?? []).map((d) => (
            <li
              key={d.id}
              className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
            >
              {d.content}
            </li>
          ))}
          {(decisions ?? []).length === 0 && (
            <p className="text-sm text-neutral-400">Belum ada keputusan tercatat.</p>
          )}
        </ul>
        {canEditNotulen && <DecisionForm meetingId={meetingId} />}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-500">Action Items</h2>
        <ul className="space-y-1.5">
          {(actionItems ?? []).map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-neutral-500">
                  {item.assignee_id ? nameById.get(item.assignee_id) ?? "-" : "Belum ditugaskan"}
                  {item.due_date ? ` · due ${item.due_date}` : ""}
                </p>
              </div>
              <ActionItemStatusSelect
                meetingId={meetingId}
                itemId={item.id}
                status={item.status}
              />
            </li>
          ))}
          {(actionItems ?? []).length === 0 && (
            <p className="text-sm text-neutral-400">Belum ada action item.</p>
          )}
        </ul>
        {canEditNotulen && (
          <ActionItemForm meetingId={meetingId} profiles={profiles ?? []} />
        )}
      </section>
    </div>
  );
}
