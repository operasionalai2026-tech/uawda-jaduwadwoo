import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { NewMeetingForm } from "./NewMeetingForm";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Terjadwal",
  ongoing: "Berlangsung",
  done: "Selesai",
  cancelled: "Dibatalkan",
};

export default async function MeetingPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: meetings }, { data: divisions }] = await Promise.all([
    supabase
      .from("meetings")
      .select("id, title, division_id, scheduled_at, status")
      .order("scheduled_at", { ascending: false }),
    supabase.from("divisions").select("id, name").order("name"),
  ]);

  const divisionNameById = new Map((divisions ?? []).map((d) => [d.id, d.name]));
  const canCreate =
    user?.role === "superadmin" || user?.role === "admin" || user?.role === "leader";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Meeting</h1>

      {canCreate && <NewMeetingForm divisions={divisions ?? []} />}

      <div className="space-y-2">
        {(meetings ?? []).map((m) => (
          <Link
            key={m.id}
            href={`/meeting/${m.id}`}
            className="flex items-center justify-between rounded-md border border-neutral-200 px-4 py-3 text-sm hover:bg-neutral-50"
          >
            <div>
              <p className="font-medium">{m.title}</p>
              <p className="text-xs text-neutral-500">
                {new Date(m.scheduled_at).toLocaleString("id-ID")} &middot;{" "}
                {m.division_id ? divisionNameById.get(m.division_id) : "Lintas divisi"}
              </p>
            </div>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
              {STATUS_LABEL[m.status] ?? m.status}
            </span>
          </Link>
        ))}
        {(meetings ?? []).length === 0 && (
          <p className="text-sm text-neutral-400">Belum ada meeting terjadwal.</p>
        )}
      </div>
    </div>
  );
}
