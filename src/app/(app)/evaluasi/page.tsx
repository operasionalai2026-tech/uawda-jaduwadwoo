import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { CreateCycleForm } from "./CreateCycleForm";

export default async function EvaluasiIndexPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: cycles } = await supabase
    .from("eval_cycles")
    .select("id, name, start_date, end_date, status")
    .order("created_at", { ascending: false });

  const canManage = user?.role === "superadmin" || user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Evaluasi Kinerja</h1>
        <Link
          href="/evaluasi/kriteria"
          className="text-sm text-blue-700 hover:underline"
        >
          Kelola kriteria
        </Link>
      </div>

      {canManage && <CreateCycleForm />}

      <div className="grid max-w-2xl gap-2">
        {(cycles ?? []).map((cycle) => (
          <Link
            key={cycle.id}
            href={`/evaluasi/${cycle.id}`}
            className="flex items-center justify-between rounded-md border border-neutral-200 px-4 py-3 text-sm hover:bg-neutral-50"
          >
            <div>
              <p className="font-medium">{cycle.name}</p>
              <p className="text-xs text-neutral-500">
                {cycle.start_date ?? "-"} &ndash; {cycle.end_date ?? "-"}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                cycle.status === "open"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {cycle.status}
            </span>
          </Link>
        ))}
        {(cycles ?? []).length === 0 && (
          <p className="text-sm text-neutral-400">Belum ada siklus evaluasi.</p>
        )}
      </div>
    </div>
  );
}
