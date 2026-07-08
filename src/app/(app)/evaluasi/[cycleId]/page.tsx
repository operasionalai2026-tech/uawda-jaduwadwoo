import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { IndividualScoreForm } from "./IndividualScoreForm";
import { CrossDivisionForm } from "./CrossDivisionForm";

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

  const profileNameById = new Map(staff.map((s) => [s.id, s.full_name]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">{cycle?.name ?? "Siklus"}</h1>
        <p className="text-sm text-neutral-500">Status: {cycle?.status}</p>
      </div>

      {isLeader && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-500">
            Penilaian Staff Divisi Anda
          </h2>
          {staff.length === 0 && (
            <p className="text-sm text-neutral-400">Tidak ada staff di divisi Anda.</p>
          )}
          <div className="space-y-3">
            {staff.map((s) => (
              <IndividualScoreForm
                key={s.id}
                cycleId={cycleId}
                rateeId={s.id}
                rateeName={s.full_name}
                criteria={individualCriteria ?? []}
                existing={existingScoresByRatee.get(s.id) ?? []}
              />
            ))}
          </div>
        </section>
      )}

      {user?.divisionId && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-500">
            Peer Review Antar Divisi
          </h2>
          <CrossDivisionForm cycleId={cycleId} divisions={otherDivisions} />
        </section>
      )}

      {canSeeResults && individualResults.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-neutral-500">
            Hasil Penilaian Individual
          </h2>
          <table className="w-full max-w-lg text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-1.5">Staff</th>
                <th className="py-1.5">Rata-rata</th>
                <th className="py-1.5">Jumlah Penilai</th>
              </tr>
            </thead>
            <tbody>
              {individualResults.map((r) => (
                <tr key={r.ratee_id} className="border-b border-neutral-100">
                  <td className="py-1.5">
                    {profileNameById.get(r.ratee_id) ?? r.ratee_id}
                  </td>
                  <td className="py-1.5">{Number(r.avg_score).toFixed(1)}</td>
                  <td className="py-1.5">{r.num_raters}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {crossResults.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-neutral-500">
            Hasil Peer Review untuk Divisi Anda (anonim)
          </h2>
          <table className="w-full max-w-lg text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-1.5">Rata-rata Skor</th>
                <th className="py-1.5">Jumlah Penilai</th>
              </tr>
            </thead>
            <tbody>
              {crossResults.map((r, i) => (
                <tr key={i} className="border-b border-neutral-100">
                  <td className="py-1.5">{Number(r.avg_score).toFixed(1)}</td>
                  <td className="py-1.5">{r.num_raters}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
