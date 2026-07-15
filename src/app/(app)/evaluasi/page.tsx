import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { RetroForm } from "./RetroForm";
import { ClipboardCheck, User2, CalendarDays } from "lucide-react";

type SearchParams = Promise<{ division?: string }>;

export default async function EvaluasiIndexPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const sp = await searchParams;
  const isManager = user.role === "superadmin" || user.role === "admin";
  const isLeader = user.role === "leader";
  const canCreate = isManager || isLeader;

  const [{ data: retrosRaw }, { data: divisions }, { data: profiles }] = await Promise.all([
    supabase
      .from("retros")
      .select("id, title, description, evaluator_id, assignee_id, division_id, eval_date, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("divisions").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name, division_id"),
  ]);

  const profileName = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const divisionName = new Map((divisions ?? []).map((d) => [d.id, d.name]));

  const retros = (retrosRaw ?? []).filter((r) => {
    if (isManager && sp.division && r.division_id !== sp.division) return false;
    return true;
  });

  const members = (profiles ?? [])
    .filter((p) => (isLeader ? p.division_id === user.divisionId : true))
    .map((p) => ({ id: p.id, name: p.full_name, divisionId: p.division_id }));

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-blue-800 to-rose-700 bg-clip-text text-transparent">
            Evaluasi Kinerja / Retro
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {canCreate
              ? "Beri evaluasi & catatan retro untuk anggota tim Anda."
              : "Evaluasi & catatan retro dari leader Anda."}
          </p>
        </div>
        {canCreate && <RetroForm role={user.role} divisions={divisions ?? []} members={members} />}
      </div>

      <div className="grid max-w-3xl gap-3">
        {retros.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <ClipboardCheck className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">{r.title}</h3>
                  {isManager && r.division_id && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {divisionName.get(r.division_id) ?? "-"}
                    </span>
                  )}
                </div>
                {r.description && <p className="text-xs text-slate-500">{r.description}</p>}
                <p className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <User2 className="h-3 w-3" /> Untuk: <span className="font-medium text-slate-600">{profileName.get(r.assignee_id ?? "") ?? "-"}</span>
                  </span>
                  <span>&bull;</span>
                  <span>Oleh: {profileName.get(r.evaluator_id ?? "") ?? "-"}</span>
                  {r.eval_date && (
                    <>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(r.eval_date).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}

        {retros.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-12 text-center">
            <p className="text-sm italic text-slate-400">Belum ada evaluasi.</p>
          </div>
        )}
      </div>
    </div>
  );
}
