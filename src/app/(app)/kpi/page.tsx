import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Layers, ArrowRight } from "lucide-react";

export default async function KpiIndexPage() {
  const supabase = await createClient();

  const { data: divisions } = await supabase
    .from("divisions")
    .select("id, name, category")
    .order("name");

  const getCategoryColor = (cat: string | null) => {
    switch (cat?.toLowerCase()) {
      case "marketplace": return "bg-blue-50 text-blue-700 border-blue-100";
      case "gudang": return "bg-amber-50 text-amber-700 border-amber-100";
      case "support": return "bg-purple-50 text-purple-700 border-purple-100";
      default: return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-blue-800 to-rose-700 bg-clip-text text-transparent">
          KPI Per Divisi
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pilih divisi di bawah ini untuk melihat indikator metrik, memasukkan data aktual, dan melihat laporan kinerja bulanan.
        </p>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(divisions ?? []).map((division) => (
          <Link
            key={division.id}
            href={`/kpi/${division.id}`}
            className="group relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:scale-[1.01]"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 group-hover:bg-gradient-to-tr group-hover:from-blue-600 group-hover:to-rose-600 group-hover:text-white transition-all duration-300">
                  <Layers className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors">
                    {division.name}
                  </h3>
                  <span className={`inline-block mt-2 text-[10px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full border ${getCategoryColor(division.category)}`}>
                    {division.category || "Operasional"}
                  </span>
                </div>
              </div>
              <span className="text-slate-400 group-hover:text-slate-800 transition-colors pt-1">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
        {(divisions ?? []).length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
            <p className="text-sm text-slate-400 italic">Belum ada divisi terdaftar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
