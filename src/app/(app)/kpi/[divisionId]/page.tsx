import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { MetricForm } from "./MetricForm";
import { EntryForm } from "./EntryForm";
import { PeriodForm } from "./PeriodForm";

export default async function DivisionKpiPage({
  params,
  searchParams,
}: {
  params: Promise<{ divisionId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { divisionId } = await params;
  const { period: periodIdParam } = await searchParams;

  const supabase = await createClient();
  const user = await getCurrentUser();

  const canManage =
    user?.role === "superadmin" ||
    user?.role === "admin" ||
    (user?.role === "leader" && user.divisionId === divisionId);

  const [{ data: division }, { data: metrics }, { data: periods }] =
    await Promise.all([
      supabase
        .from("divisions")
        .select("id, name, category")
        .eq("id", divisionId)
        .maybeSingle(),
      supabase
        .from("kpi_metrics")
        .select("id, name, unit, weight, target_value, direction, source_type")
        .eq("division_id", divisionId)
        .eq("active", true)
        .order("created_at"),
      supabase
        .from("kpi_periods")
        .select("id, period_type, year, month, status")
        .order("year", { ascending: false })
        .order("month", { ascending: false }),
    ]);

  if (!division) notFound();

  const selectedPeriod =
    (periods ?? []).find((p) => p.id === periodIdParam) ??
    (periods ?? [])[0] ??
    null;

  const metricIds = (metrics ?? []).map((m) => m.id);
  const { data: entries } = selectedPeriod && metricIds.length > 0
    ? await supabase
        .from("kpi_entries")
        .select("metric_id, actual_value, score, notes")
        .eq("period_id", selectedPeriod.id)
        .in("metric_id", metricIds)
    : { data: [] as { metric_id: string; actual_value: number; score: number | null; notes: string | null }[] };

  const entryByMetric = new Map((entries ?? []).map((e) => [e.metric_id, e]));

  const compositeScore = (metrics ?? []).length
    ? (metrics ?? []).reduce((sum, m) => {
        const e = entryByMetric.get(m.id);
        return sum + (e?.score ?? 0) * m.weight;
      }, 0) /
      ((metrics ?? []).reduce((sum, m) => sum + m.weight, 0) || 1)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/kpi" className="text-xs text-neutral-500 hover:underline">
          ← Semua divisi
        </Link>
        <h1 className="text-xl font-semibold">{division.name}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-neutral-500">Periode:</span>
        <div className="flex flex-wrap gap-1">
          {(periods ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/kpi/${divisionId}?period=${p.id}`}
              className={`rounded-md border px-2 py-1 ${
                selectedPeriod?.id === p.id
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300"
              }`}
            >
              {p.period_type === "monthly" ? `${p.month}/${p.year}` : `${p.year}`}
            </Link>
          ))}
          {(!periods || periods.length === 0) && (
            <span className="text-neutral-400">Belum ada periode.</span>
          )}
        </div>
      </div>

      {canManage && <PeriodForm divisionId={divisionId} />}

      {selectedPeriod && (
        <div>
          <p className="mb-2 text-sm text-neutral-500">
            Skor komposit periode ini:{" "}
            <span className="font-medium text-neutral-900">
              {compositeScore != null ? compositeScore.toFixed(1) : "-"}
            </span>
          </p>
          <table className="w-full max-w-3xl text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-1.5">Metric</th>
                <th className="py-1.5">Bobot</th>
                <th className="py-1.5">Target</th>
                <th className="py-1.5">Aktual</th>
                <th className="py-1.5">Skor</th>
              </tr>
            </thead>
            <tbody>
              {(metrics ?? []).map((m) => {
                const entry = entryByMetric.get(m.id);
                return (
                  <tr key={m.id} className="border-b border-neutral-100">
                    <td className="py-1.5">
                      {m.name}
                      <span className="ml-1 text-xs text-neutral-400">
                        ({m.unit ?? "-"})
                      </span>
                    </td>
                    <td className="py-1.5">{m.weight}</td>
                    <td className="py-1.5">{m.target_value}</td>
                    <td className="py-1.5">
                      {canManage ? (
                        <EntryForm
                          divisionId={divisionId}
                          metricId={m.id}
                          periodId={selectedPeriod.id}
                          defaultValue={entry?.actual_value ?? null}
                        />
                      ) : (
                        (entry?.actual_value ?? "-")
                      )}
                    </td>
                    <td className="py-1.5">
                      {entry?.score != null ? Number(entry.score).toFixed(1) : "-"}
                    </td>
                  </tr>
                );
              })}
              {(!metrics || metrics.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-3 text-neutral-400">
                    Belum ada metric untuk divisi ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-500">
            Tambah metric baru
          </h2>
          <MetricForm divisionId={divisionId} />
        </div>
      )}
    </div>
  );
}
