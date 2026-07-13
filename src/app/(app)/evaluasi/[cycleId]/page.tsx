import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { IndividualScoreForm } from "./IndividualScoreForm";
import { CrossDivisionForm } from "./CrossDivisionForm";
import { ArrowLeft, User, ShieldAlert, Award, Columns, Users } from "lucide-react";
import Link from "next/link";

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: cycle }, { data: individualCriteria }, { data: divisions }] =
    await Promise.all([
      supabase.from("eval_cycles").select("id, name, status").eq("id", cycleId).single(),
      supabase
        .from("eval_criteria")
        .select("id, name, weight")
        .eq("scope", "individual")
        .eq("active", true),
      supabase.from("divisions").select("id, name").order("name"),
    ]);

  const isLeader = user?.role === "leader";
  const canSeeResults =
    user?.role === "superadmin" || user?.role === "admin" || isLeader;

  let staff: { id: string; full_name: string }[] = [];
  const existingScoresByRatee = new Map<string, { criteria_id: string; score: number; comment: string | null }[]>();

  if (isLeader && user?.divisionId) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("division_id", user.divisionId)
      .neq("id", user.id);
    staff = data ?? [];

    const { data: scores } = await supabase
      .from("evaluations_individual")
      .select("ratee_id, criteria_id, score, comment")
      .eq("cycle_id", cycleId)
      .eq("rater_id", user.id);

    for (const row of scores ?? []) {
      const list = existingScoresByRatee.get(row.ratee_id) ?? [];
      list.push({ criteria_id: row.criteria_id, score: row.score, comment: row.comment });
      existingScoresByRatee.set(row.ratee_id, list);
    }
  }

  const otherDivisions = (divisions ?? []).filter((d) => d.id !== user?.divisionId);

  let individualResults: { ratee_id: string; avg_score: number; num_raters: number }[] = [];
  let crossResults: { ratee_division_id: string; avg_score: number; num_raters: number }[] = [];

  if (canSeeResults) {
    const { data } = await supabase
      .from("individual_eval_scores")
      .select("ratee_id, avg_score, num_raters")
      .eq("cycle_id", cycleId);
    individualResults = data ?? [];
  }

  if (user?.divisionId) {
    const { data } = await supabase
      .from("cross_division_aggregate")
      .select("ratee_division_id, avg_score, num_raters")
      .eq("cycle_id", cycleId)
      .eq("ratee_division_id", user.divisionId);
    crossResults = data ?? [];
  }

  // Load profiles for mapping names in Superadmin/Admin audit views
  let allProfiles: { id: string; full_name: string }[] = [];
  let rawIndividualEvaluations: any[] = [];
  let rawCrossDivisionEvaluations: any[] = [];

  if (user?.role === "superadmin" || user?.role === "admin") {
    const { data } = await supabase.from("profiles").select("id, full_name");
    allProfiles = data ?? [];
  }

  if (user?.role === "superadmin") {
    const [indRes, crossRes] = await Promise.all([
      supabase
        .from("evaluations_individual")
        .select("rater_id, ratee_id, criteria_id, score, comment, eval_criteria(name)")
        .eq("cycle_id", cycleId),
      supabase
        .from("evaluations_cross_division")
        .select("rater_user_id, rater_division_id, ratee_division_id, score, comment")
        .eq("cycle_id", cycleId)
    ]);
    rawIndividualEvaluations = indRes.data ?? [];
    rawCrossDivisionEvaluations = crossRes.data ?? [];
  }

  const profileNameById = new Map([
    ...staff.map((s) => [s.id, s.full_name] as [string, string]),
    ...allProfiles.map((p) => [p.id, p.full_name] as [string, string])
  ]);
  const divisionMap = new Map((divisions ?? []).map((d) => [d.id, d.name]));

  return (
    <div className="space-y-8 pb-12">
      {/* Back link & Title */}
      <div>
        <div className="flex items-center gap-2">
          <Link
            href="/evaluasi"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-blue-800 to-rose-700 bg-clip-text text-transparent">
            {cycle?.name ?? "Detail Siklus Evaluasi"}
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-2 ml-10 text-xs font-semibold">
          <span className="text-slate-500">Status Siklus:</span>
          <span
            className={`rounded-full px-2.5 py-0.5 uppercase border ${
              cycle?.status === "open"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-slate-50 text-slate-500 border-slate-200"
            }`}
          >
            {cycle?.status === "open" ? "Aktif (Open)" : "Ditutup (Closed)"}
          </span>
        </div>
      </div>

      {/* Leader Input: Individual Rating */}
      {isLeader && (
        <section className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="h-4.5 w-4.5 text-blue-600" />
            <span>Penilaian Kinerja Staff Divisi Anda</span>
          </h2>
          {staff.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Tidak ada staff terdaftar di divisi Anda.</p>
          ) : (
            <div className="space-y-4">
              {staff.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-100 p-4 bg-slate-50/30">
                  <IndividualScoreForm
                    cycleId={cycleId}
                    rateeId={s.id}
                    rateeName={s.full_name}
                    criteria={individualCriteria ?? []}
                    existing={existingScoresByRatee.get(s.id) ?? []}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Peer Review Antar Divisi */}
      {user?.divisionId && (
        <section className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Columns className="h-4.5 w-4.5 text-purple-600" />
            <span>Peer Review Antar-Divisi (Evaluasi Kolaborasi)</span>
          </h2>
          <CrossDivisionForm cycleId={cycleId} divisions={otherDivisions} />
        </section>
      )}

      {/* Individual Results Panel */}
      {canSeeResults && individualResults.length > 0 && (
        <section className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Award className="h-4.5 w-4.5 text-emerald-600" />
            <span>Hasil Evaluasi Kinerja Individu</span>
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Staff</th>
                  <th className="p-4 text-center">Rata-rata Skor</th>
                  <th className="p-4 text-right">Jumlah Penilai</th>
                </tr>
              </thead>
              <tbody>
                {individualResults.map((r) => (
                  <tr key={r.ratee_id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">
                      {profileNameById.get(r.ratee_id) ?? r.ratee_id}
                    </td>
                    <td className="p-4 text-center font-bold text-emerald-600">{Number(r.avg_score).toFixed(1)}%</td>
                    <td className="p-4 text-right text-slate-600 font-medium">{r.num_raters} Rater</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Cross Division Results Panel */}
      {crossResults.length > 0 && (
        <section className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Users className="h-4.5 w-4.5 text-orange-600" />
            <span>Hasil Peer Review Divisi Anda (Anonim)</span>
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Indikator Penilaian</th>
                  <th className="p-4 text-center">Rata-rata Skor Divisi</th>
                  <th className="p-4 text-right">Jumlah Divisi Penilai</th>
                </tr>
              </thead>
              <tbody>
                {crossResults.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">Skor Kolaborasi Lintas Divisi</td>
                    <td className="p-4 text-center font-bold text-orange-600">{Number(r.avg_score).toFixed(1)}%</td>
                    <td className="p-4 text-right text-slate-600 font-medium">{r.num_raters} Divisi</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Superadmin Audit Log Panel */}
      {user?.role === "superadmin" && (
        <section className="rounded-2xl bg-slate-900 text-white p-6 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShieldAlert className="h-5.5 w-5.5 text-rose-500" />
            <div>
              <h2 className="text-base font-bold text-slate-100">Panel Audit Superadmin (Log Penilaian Detil)</h2>
              <p className="text-xs text-slate-400">Khusus Superadmin: Akses rincian data mentah evaluasi untuk melacak siapa menilai siapa.</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* 1. Detail Individu */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-300">Log Penilaian Individual (Leader ➔ Staff)</h3>
              {rawIndividualEvaluations.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Belum ada penilaian individual diinput.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="p-3">Penilai (Leader)</th>
                        <th className="p-3">Yang Dinilai (Staff)</th>
                        <th className="p-3">Kriteria</th>
                        <th className="p-3 text-center">Skor</th>
                        <th className="p-3">Komentar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawIndividualEvaluations.map((e, idx) => (
                        <tr key={idx} className="border-b border-slate-900 hover:bg-slate-900/50">
                          <td className="p-3 font-semibold text-slate-200">
                            {profileNameById.get(e.rater_id) ?? e.rater_id}
                          </td>
                          <td className="p-3 text-slate-300">
                            {profileNameById.get(e.ratee_id) ?? e.ratee_id}
                          </td>
                          <td className="p-3 text-slate-400">
                            {(e.eval_criteria as any)?.name ?? "Kriteria"}
                          </td>
                          <td className="p-3 text-center font-bold text-rose-400">{e.score}</td>
                          <td className="p-3 text-slate-400 italic max-w-xs truncate" title={e.comment}>
                            {e.comment || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 2. Detail Lintas Divisi */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-300">Log Penilaian Lintas Divisi (Divisi ➔ Divisi)</h3>
              {rawCrossDivisionEvaluations.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Belum ada penilaian lintas divisi diinput.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="p-3">Rater (User)</th>
                        <th className="p-3">Divisi Penilai</th>
                        <th className="p-3">Divisi Dinilai</th>
                        <th className="p-3 text-center">Skor</th>
                        <th className="p-3">Komentar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawCrossDivisionEvaluations.map((e, idx) => (
                        <tr key={idx} className="border-b border-slate-900 hover:bg-slate-900/50">
                          <td className="p-3 font-semibold text-slate-200">
                            {profileNameById.get(e.rater_user_id) ?? e.rater_user_id}
                          </td>
                          <td className="p-3 text-slate-300">
                            {divisionMap.get(e.rater_division_id) ?? e.rater_division_id}
                          </td>
                          <td className="p-3 text-slate-300">
                            {divisionMap.get(e.ratee_division_id) ?? e.ratee_division_id}
                          </td>
                          <td className="p-3 text-center font-bold text-amber-400">{e.score}</td>
                          <td className="p-3 text-slate-400 italic max-w-xs truncate" title={e.comment}>
                            {e.comment || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
