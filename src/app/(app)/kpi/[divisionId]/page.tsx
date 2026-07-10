import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { MetricForm } from "./MetricForm";
import { EntryForm } from "./EntryForm";
import { PeriodForm } from "./PeriodForm";
import { ArrowLeft, Sparkles, Plus, AlertCircle, Calendar } from "lucide-react";

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

  // Formatting helpers
  const getPeriodLabel = (p: { period_type: string; month: number | null; year: number }) => {
    if (p.period_type === "monthly" && p.month) {
      const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
      return `${months[p.month - 1]} ${p.year}`;
    }
    return `Tahun ${p.year}`;
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-slate-400 bg-slate-100 border-slate-200 fill-slate-500";
    if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-100 fill-emerald-500";
    if (score >= 70) return "text-amber-700 bg-amber-50 border-amber-100 fill-amber-500";
    return "text-rose-700 bg-rose-50 border-rose-100 fill-rose-500";
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Back button and title */}
      <div>
        <div className="flex items-center gap-2">
          <Link
            href="/kpi"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {division.name}
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500 ml-10">
          Kategori: <span className="font-semibold text-slate-700">{division.category || "Operasional"}</span> · Kelola target &amp; capaian KPI
        </p>
      </div>

      {/* Period Tabs */}
      <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span>Pilih Periode Laporan</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(periods ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/kpi/${divisionId}?period=${p.id}`}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                selectedPeriod?.id === p.id
                  ? "border-blue-600 bg-gradient-to-r from-blue-600 to-rose-600 text-white shadow-sm"
                  : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
              }`}
            >
              {getPeriodLabel(p)}
            </Link>
          ))}
          {(!periods || periods.length === 0) && (
            <span className="text-sm text-slate-400 italic">Belum ada periode.</span>
          )}
        </div>
      </div>

      {/* Period creation */}
      {canManage && <PeriodForm divisionId={divisionId} />}

      {/* Score and Main KPI Table Card */}
      {selectedPeriod && (
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-3">
            {/* Score box */}
            <div className={`md:col-span-1 rounded-2xl border p-5 shadow-sm flex flex-col justify-between ${getScoreColor(compositeScore)}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider opacity-85">Skor Komposit</span>
                <Sparkles className="h-4 w-4 opacity-80" />
              </div>
              <div className="mt-4">
                <h2 className="text-4xl font-extrabold tracking-tight">
                  {compositeScore != null ? `${compositeScore.toFixed(1)}%` : "—"}
                </h2>
                <p className="mt-1 text-xs opacity-75">
                  Rata-rata tertimbang bobot kriteria
                </p>
              </div>
            </div>

            {/* Helper box */}
            <div className="md:col-span-2 rounded-2xl bg-white p-5 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-slate-800">Catatan Penginputan</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Semua nilai KPI dihitung otomatis oleh sistem berdasarkan target &amp; aktual penginputan. Nilai kpi dapat dikunci bila periode status diubah menjadi locked.
                </p>
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Indikator Metrik (Unit)</th>
                    <th className="p-4 text-center">Bobot</th>
                    <th className="p-4 text-center">Target</th>
                    <th className="p-4 text-center">Aktual</th>
                    <th className="p-4 text-right">Skor Metrik</th>
                  </tr>
                </thead>
                <tbody>
                  {(metrics ?? []).map((m) => {
                    const entry = entryByMetric.get(m.id);
                    return (
                      <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-semibold text-slate-800">
                          {m.name}
                          <span className="ml-1.5 text-xs text-slate-400 font-normal">
                            ({m.unit || "-"})
                          </span>
                        </td>
                        <td className="p-4 text-center text-slate-600 font-medium">{(Number(m.weight) * 100).toFixed(0)}%</td>
                        <td className="p-4 text-center text-slate-800 font-semibold">{Number(m.target_value)}</td>
                        <td className="p-4 text-center">
                          {canManage && selectedPeriod.status === "open" ? (
                            <div className="inline-block w-24">
                              <EntryForm
                                divisionId={divisionId}
                                metricId={m.id}
                                periodId={selectedPeriod.id}
                                defaultValue={entry?.actual_value ?? null}
                              />
                            </div>
                          ) : (
                            <span className="font-semibold text-slate-800">
                              {entry?.actual_value != null ? Number(entry.actual_value) : "—"}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${getScoreColor(entry?.score != null ? Number(entry.score) : null)}`}>
                            {entry?.score != null ? `${Number(entry.score).toFixed(0)}%` : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {(!metrics || metrics.length === 0) && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                        Belum ada metrik aktif untuk divisi ini. Silakan buat metrik baru di bawah.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Metric creation form */}
      {canManage && (
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Plus className="h-4.5 w-4.5 text-blue-600" />
            <span>Tambah Indikator Metrik Baru</span>
          </h2>
          <MetricForm divisionId={divisionId} />
        </div>
      )}
    </div>
  );
}
