import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: divisions }, { data: scores }] = await Promise.all([
    supabase.from("divisions").select("id, name"),
    supabase
      .from("division_scores")
      .select("division_id, period_id, composite_score"),
  ]);

  const divisionNameById = new Map(
    (divisions ?? []).map((d) => [d.id, d.name]),
  );

  const rows = (scores ?? [])
    .map((row) => ({
      ...row,
      divisionName: divisionNameById.get(row.division_id) ?? "-",
    }))
    .sort((a, b) => a.divisionName.localeCompare(b.divisionName));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-neutral-500">
          Selamat datang, {user?.fullName ?? user?.email}.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-500">
          Skor komposit divisi (semua periode tercatat)
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Belum ada data KPI. Tambahkan metric &amp; entries di menu KPI.
          </p>
        ) : (
          <table className="w-full max-w-xl text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-1.5">Divisi</th>
                <th className="py-1.5">Skor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.division_id}-${row.period_id}`}
                  className="border-b border-neutral-100"
                >
                  <td className="py-1.5">{row.divisionName}</td>
                  <td className="py-1.5">
                    {row.composite_score != null
                      ? Number(row.composite_score).toFixed(1)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
