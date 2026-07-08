import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function KpiIndexPage() {
  const supabase = await createClient();

  const { data: divisions } = await supabase
    .from("divisions")
    .select("id, name, category")
    .order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">KPI per Divisi</h1>
      <div className="grid max-w-2xl gap-2">
        {(divisions ?? []).map((division) => (
          <Link
            key={division.id}
            href={`/kpi/${division.id}`}
            className="flex items-center justify-between rounded-md border border-neutral-200 px-4 py-3 text-sm hover:bg-neutral-50"
          >
            <span className="font-medium">{division.name}</span>
            <span className="text-neutral-400">{division.category ?? ""}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
