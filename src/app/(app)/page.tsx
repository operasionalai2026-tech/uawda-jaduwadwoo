import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Activity,
  Layers,
  AlertCircle,
  ListTodo,
  Target
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  // Step 1: Query base metadata (divisions, periods, metrics, profiles) in parallel
  const [
    { data: divisions },
    { data: periods },
    { data: metrics },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("divisions").select("id, name, category"),
    supabase.from("kpi_periods").select("id, period_type, year, month, status").order("year", { ascending: false }).order("month", { ascending: false }),
    supabase.from("kpi_metrics").select("id, division_id, name, weight, target_value, unit, direction, active"),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const activeDivisions = divisions ?? [];
  const activeMetrics = (metrics ?? []).filter((m) => m.active);
  const allPeriods = periods ?? [];
  const latestMonthlyPeriod = allPeriods.find((p) => p.period_type === "monthly");
  const monthlyPeriods = allPeriods
    .filter((p) => p.period_type === "monthly")
    .slice(0, 6) // Take the last 6 months
    .reverse(); // Order from oldest to newest

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  // Date constants
  const todayStr = new Date().toISOString().split("T")[0];
  const nowStr = new Date().toISOString();

  // Step 2: Query filtered transactional data in parallel using metadata for filters
  const [
    { data: entries },
    { data: actionItems },
    { data: meetings },
    { data: compositeScores },
  ] = await Promise.all([
    // Only fetch entries for the latest monthly period
    latestMonthlyPeriod
      ? supabase.from("kpi_entries").select("id, metric_id, period_id, actual_value, score, notes").eq("period_id", latestMonthlyPeriod.id)
      : Promise.resolve({ data: [] }),
    // Only fetch overdue action items (not done, and due date has passed)
    supabase.from("action_items")
      .select("id, title, assignee_id, due_date, status, meeting_id")
      .neq("status", "done")
      .lt("due_date", todayStr)
      .order("due_date", { ascending: true }),
    // Only fetch upcoming meetings (scheduled or ongoing)
    supabase.from("meetings")
      .select("id, title, scheduled_at, location, status")
      .in("status", ["scheduled", "ongoing"])
      .gte("scheduled_at", nowStr)
      .order("scheduled_at", { ascending: true }),
    // Only fetch composite scores for the 6 periods we are displaying
    monthlyPeriods.length > 0
      ? supabase.from("division_scores").select("division_id, period_id, composite_score").in("period_id", monthlyPeriods.map((p) => p.id))
      : Promise.resolve({ data: [] }),
  ]);

  const activeEntries = entries ?? [];
  const allActionItems = actionItems ?? [];
  const allMeetings = meetings ?? [];

  // Step 2b: Tugas & Poin widget - reviewer sees pending approvals, staff sees own points
  const canReviewTasks =
    user?.role === "superadmin" || user?.role === "admin" || user?.role === "leader";

  const { data: openCycle } = await supabase
    .from("eval_cycles")
    .select("id, name")
    .eq("status", "open")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let pendingTaskCount = 0;
  let myTaskPoints = 0;

  if (canReviewTasks) {
    let pendingQuery = supabase
      .from("kpi_tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted");
    if (user?.role === "leader" && user.divisionId) {
      pendingQuery = pendingQuery.eq("division_id", user.divisionId);
    }
    const { count } = await pendingQuery;
    pendingTaskCount = count ?? 0;
  } else if (user && openCycle) {
    const { data: myScore } = await supabase
      .from("individual_task_scores")
      .select("total_points")
      .eq("assignee_id", user.id)
      .eq("cycle_id", openCycle.id)
      .maybeSingle();
    myTaskPoints = myScore?.total_points ?? 0;
  }

  // 1. Quick Stats Calculations
  const totalDivisions = activeDivisions.length;
  
  // Rata-rata KPI Global (latest period composite score average)
  const latestPeriodScores = latestMonthlyPeriod
    ? (compositeScores ?? []).filter((s) => s.period_id === latestMonthlyPeriod.id)
    : [];
  const averageKpiScore = latestPeriodScores.length > 0
    ? latestPeriodScores.reduce((acc, curr) => acc + Number(curr.composite_score || 0), 0) / latestPeriodScores.length
    : 0;

  // Overdue Action Items (status !== 'done' and due_date < today)
  const overdueItems = allActionItems.filter((item) => {
    if (item.status === "done" || !item.due_date) return false;
    return item.due_date < todayStr;
  });

  // Upcoming Meetings (scheduled_at >= now and status === 'scheduled' or 'ongoing')
  const upcomingMeetings = allMeetings.filter((m) => {
    if (m.status !== "scheduled" && m.status !== "ongoing") return false;
    return new Date(m.scheduled_at) >= new Date();
  });

  // 2. Division Status Map
  const divisionScoresMap = new Map<string, Map<string, number>>(); // divisionId -> periodId -> score
  for (const s of compositeScores ?? []) {
    if (!divisionScoresMap.has(s.division_id)) {
      divisionScoresMap.set(s.division_id, new Map());
    }
    divisionScoresMap.get(s.division_id)!.set(s.period_id, Number(s.composite_score));
  }

  // 3. Attention Metrics (Metric Score < 70 in latest monthly period)
  const attentionMetrics: {
    divisionName: string;
    metricName: string;
    score: number;
    actual: number;
    target: number;
    unit: string;
  }[] = [];

  if (latestMonthlyPeriod) {
    const latestEntries = activeEntries.filter((e) => e.period_id === latestMonthlyPeriod.id);
    for (const entry of latestEntries) {
      if (entry.score != null && entry.score < 70) {
        const metric = activeMetrics.find((m) => m.id === entry.metric_id);
        const div = activeDivisions.find((d) => d.id === metric?.division_id);
        if (metric && div) {
          attentionMetrics.push({
            divisionName: div.name,
            metricName: metric.name,
            score: Number(entry.score),
            actual: Number(entry.actual_value),
            target: Number(metric.target_value),
            unit: metric.unit ?? "",
          });
        }
      }
    }
  }

  // Helper to determine color classes for score
  const getScoreColorClasses = (score: number | null | undefined) => {
    if (score == null) return { text: "text-slate-400", bg: "bg-slate-100", border: "border-slate-200", fill: "bg-slate-300" };
    if (score >= 80) return { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", fill: "bg-emerald-500" };
    if (score >= 70) return { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", fill: "bg-amber-500" };
    return { text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", fill: "bg-rose-500" };
  };

  // Format month name in Indonesian
  const getMonthNameIndo = (m: number | null) => {
    if (!m) return "";
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    return months[m - 1];
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Welcome and Title */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-blue-800 to-rose-700 bg-clip-text text-transparent">
            Command Center
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Selamat datang, <span className="font-semibold text-slate-800">{user?.fullName ?? user?.email}</span>. Status operasional real-time perusahaan Anda.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white p-2.5 shadow-sm border border-slate-200 text-xs font-semibold text-slate-600">
          <Activity className="h-4 w-4 animate-pulse text-rose-500" />
          <span>Sistem Aktif &amp; Terkoneksi</span>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Divisi */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 transition-all duration-300 hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Total Divisi</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
              <Layers className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900">{totalDivisions}</h3>
            <p className="mt-1 text-xs text-slate-500">Divisi operasional aktif</p>
          </div>
        </div>

        {/* Rata-rata KPI Global */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 transition-all duration-300 hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Rata-rata KPI</span>
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl group-hover:scale-110 transition-transform duration-300 ${averageKpiScore >= 80 ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/25" : "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25"}`}>
              {averageKpiScore >= 80 ? <TrendingUp className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900">
              {averageKpiScore > 0 ? `${averageKpiScore.toFixed(1)}%` : "N/A"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Periode {latestMonthlyPeriod ? `${getMonthNameIndo(latestMonthlyPeriod.month)} ${latestMonthlyPeriod.year}` : "terbaru"}
            </p>
          </div>
        </div>

        {/* Overdue Action Items */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 transition-all duration-300 hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Overdue Task</span>
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl group-hover:scale-110 transition-transform duration-300 ${overdueItems.length > 0 ? "bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-md shadow-rose-500/25" : "bg-slate-100 text-slate-400"}`}>
              <ListTodo className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900">{overdueItems.length}</h3>
            <p className="mt-1 text-xs text-slate-500">Tugas melewati tenggat waktu</p>
          </div>
        </div>

        {/* Rapat Terjadwal */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 transition-all duration-300 hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Rapat Mendatang</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-violet-500 text-white shadow-md shadow-purple-500/25 group-hover:scale-110 transition-transform duration-300">
              <Calendar className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900">{upcomingMeetings.length}</h3>
            <p className="mt-1 text-xs text-slate-500">Rapat terjadwal berikutnya</p>
          </div>
        </div>

        {/* Tugas & Poin */}
        <Link
          href="/tugas"
          className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 transition-all duration-300 hover:shadow-md hover:border-slate-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              {canReviewTasks ? "Tugas Menunggu Approval" : "Poin Saya"}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 group-hover:scale-110 transition-transform duration-300">
              <Target className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold text-slate-900">
              {canReviewTasks ? pendingTaskCount : myTaskPoints}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {canReviewTasks
                ? "Task dari Forum menunggu Anda review"
                : openCycle
                  ? `Cycle ${openCycle.name} berjalan`
                  : "Belum ada cycle aktif"}
            </p>
          </div>
        </Link>
      </div>

      {/* Grid: Papan Status Divisi & Attention Panel */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Papan Status Divisi (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Papan Status Divisi</h2>
            <Link href="/kpi" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Lihat Rincian KPI &rarr;
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {activeDivisions.map((div) => {
              // Get current composite score
              const divScores = divisionScoresMap.get(div.id);
              const currentScore = latestMonthlyPeriod ? divScores?.get(latestMonthlyPeriod.id) ?? null : null;
              
              // Calculate trend (compare latest period with previous period)
              let trend: "up" | "down" | "flat" | null = null;
              if (divScores && allPeriods.length > 1) {
                const sortedPeriods = [...allPeriods].filter(p => p.period_type === "monthly");
                if (sortedPeriods.length >= 2) {
                  const pLatest = sortedPeriods[0].id;
                  const pPrev = sortedPeriods[1].id;
                  const sLatest = divScores.get(pLatest);
                  const sPrev = divScores.get(pPrev);
                  if (sLatest != null && sPrev != null) {
                    if (sLatest > sPrev) trend = "up";
                    else if (sLatest < sPrev) trend = "down";
                    else trend = "flat";
                  }
                }
              }

              const colors = getScoreColorClasses(currentScore);
              const divisionMetrics = activeMetrics.filter((m) => m.division_id === div.id).slice(0, 2);

              return (
                <div
                  key={div.id}
                  className="group rounded-2xl bg-white p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Name and Category */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors duration-200">
                          {div.name}
                        </h3>
                        <span className="inline-block mt-1 text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          {div.category || "Operasional"}
                        </span>
                      </div>

                      {/* Score Badge */}
                      <div className="flex flex-col items-end">
                        <div className={`text-2xl font-extrabold tracking-tight ${colors.text}`}>
                          {currentScore != null ? `${currentScore.toFixed(1)}` : "—"}
                        </div>
                        {trend && (
                          <div className="flex items-center mt-0.5 gap-0.5">
                            {trend === "up" && (
                              <>
                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                                <span className="text-[9px] font-semibold text-emerald-500">Naik</span>
                              </>
                            )}
                            {trend === "down" && (
                              <>
                                <TrendingDown className="h-3 w-3 text-rose-500" />
                                <span className="text-[9px] font-semibold text-rose-500">Turun</span>
                              </>
                            )}
                            {trend === "flat" && (
                              <span className="text-[9px] font-semibold text-slate-400">Stabil</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Score Bar */}
                    <div className="mt-4">
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200/40">
                        <div
                          className={`h-full rounded-full ${colors.fill}`}
                          style={{ width: `${currentScore ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Division metrics snippet */}
                  <div className="mt-5 border-t border-slate-100 pt-3.5 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Indikator Utama
                    </p>
                    {divisionMetrics.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Belum ada metrik aktif.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {divisionMetrics.map((m) => {
                          const entry = latestMonthlyPeriod
                            ? activeEntries.find((e) => e.metric_id === m.id && e.period_id === latestMonthlyPeriod.id)
                            : null;
                          return (
                            <div key={m.id} className="flex items-center justify-between text-xs">
                              <span className="text-slate-500 truncate max-w-[120px]">{m.name}</span>
                              <span className="font-medium text-slate-800">
                                {entry ? `${Number(entry.actual_value)} / ${Number(m.target_value)}` : `Target: ${Number(m.target_value)}`} {m.unit}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attention Panel / "Perlu Perhatian" (1/3 width) */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Perlu Perhatian</h2>

          <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              <p className="text-sm font-semibold text-slate-800">Metrik Di Bawah Threshold (&lt;70)</p>
            </div>

            {attentionMetrics.length === 0 ? (
              <div className="py-6 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="text-xs font-semibold text-slate-700">Semua target aman!</p>
                <p className="text-[10px]">Seluruh metrik divisi berada di atas batas toleransi.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {attentionMetrics.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 rounded-xl bg-rose-50/50 p-3.5 border border-rose-100 hover:bg-rose-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-rose-600 bg-rose-100/50 px-1.5 py-0.5 rounded">
                          {item.divisionName}
                        </span>
                        <h4 className="mt-1.5 text-xs font-bold text-slate-800 truncate max-w-[170px]">
                          {item.metricName}
                        </h4>
                      </div>
                      <span className="text-xs font-extrabold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                        {item.score.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-rose-100/40">
                      <span>Target: {item.target} {item.unit}</span>
                      <span className="font-semibold text-slate-700">Aktual: {item.actual} {item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Heatmap Section */}
      <section className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Peta Kinerja Bulanan (6 Bulan Terakhir)</h2>
            <p className="text-xs text-slate-500">Matriks heatmap agregat nilai komposit per divisi</p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-rose-500" />
              <span>&lt;70</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-amber-500" />
              <span>70-80</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-emerald-500" />
              <span>80+</span>
            </div>
          </div>
        </div>

        {monthlyPeriods.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-6">Belum ada periode bulanan tercatat.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold text-xs">
                  <th className="py-3 px-4 w-48">Divisi</th>
                  {monthlyPeriods.map((p) => (
                    <th key={p.id} className="py-3 px-4 text-center">
                      {getMonthNameIndo(p.month)} {p.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeDivisions.map((div) => {
                  const divScores = divisionScoresMap.get(div.id);
                  return (
                    <tr key={div.id} className="border-b border-slate-100/50 hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-800">{div.name}</td>
                      {monthlyPeriods.map((p) => {
                        const score = divScores?.get(p.id) ?? null;
                        let cellBg = "bg-slate-100 text-slate-400";
                        if (score != null) {
                          if (score >= 80) cellBg = "bg-emerald-500 text-white shadow-sm shadow-emerald-500/10";
                          else if (score >= 70) cellBg = "bg-amber-500 text-white shadow-sm shadow-amber-500/10";
                          else cellBg = "bg-rose-500 text-white shadow-sm shadow-rose-500/10";
                        }

                        return (
                          <td key={p.id} className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center justify-center h-8 w-16 text-xs font-bold rounded-lg ${cellBg}`}>
                              {score != null ? score.toFixed(1) : "—"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Row: Overdue Tasks & Rapat Terjadwal */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Overdue Action Items */}
        <section className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-rose-500" />
              <h2 className="text-base font-bold text-slate-900">Action Items Terlambat (Overdue)</h2>
            </div>
            <span className="text-xs font-extrabold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full">
              {overdueItems.length}
            </span>
          </div>

          {overdueItems.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-6 text-center">Tidak ada action item yang terlambat.</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {overdueItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 p-3.5 hover:border-slate-200 transition-colors"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-slate-800 leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-500">
                      PIC: <span className="font-semibold text-slate-700">{profileMap.get(item.assignee_id) ?? "Tidak ditugaskan"}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded px-2 py-0.5">
                      {item.due_date ? new Date(item.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "No due"}
                    </span>
                    <Link
                      href={`/meeting/${item.meeting_id}`}
                      className="block mt-1 text-[10px] font-semibold text-blue-600 hover:underline"
                    >
                      Buka Rapat &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Rapat Terjadwal */}
        <section className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Jadwal Rapat Mendatang</h2>
            </div>
            <span className="text-xs font-extrabold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              {upcomingMeetings.length}
            </span>
          </div>

          {upcomingMeetings.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-6 text-center">Tidak ada jadwal rapat mendatang.</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {upcomingMeetings.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 p-3.5 hover:border-slate-200 transition-colors"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-slate-800 leading-tight">
                      {m.title}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Waktu: <span className="font-semibold text-slate-700">{new Date(m.scheduled_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
                    </p>
                    {m.location && (
                      <p className="text-[11px] text-slate-400">Tempat: {m.location}</p>
                    )}
                  </div>
                  <Link
                    href={`/meeting/${m.id}`}
                    className="shrink-0 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all hover:border-slate-300"
                  >
                    <span>Detail</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
