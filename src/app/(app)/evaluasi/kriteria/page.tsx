import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { CreateCriteriaForm } from "./CreateCriteriaForm";

export default async function KriteriaPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: criteria } = await supabase
    .from("eval_criteria")
    .select("id, scope, name, description, weight, active")
    .order("scope")
    .order("name");

  const individual = (criteria ?? []).filter((c) => c.scope === "individual");
  const crossDivision = (criteria ?? []).filter((c) => c.scope === "cross_division");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Kriteria Evaluasi</h1>

      {user?.role === "superadmin" && <CreateCriteriaForm />}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-500">
            Individual (leader &rarr; staff)
          </h2>
          <ul className="space-y-1.5">
            {individual.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2 text-sm"
              >
                <p className="font-medium">
                  {c.name}{" "}
                  <span className="font-normal text-neutral-400">
                    (bobot {c.weight})
                  </span>
                </p>
                {c.description && (
                  <p className="text-xs text-neutral-500">{c.description}</p>
                )}
              </li>
            ))}
            {individual.length === 0 && (
              <p className="text-sm text-neutral-400">Belum ada kriteria.</p>
            )}
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-500">
            Antar-divisi
          </h2>
          <ul className="space-y-1.5">
            {crossDivision.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2 text-sm"
              >
                <p className="font-medium">
                  {c.name}{" "}
                  <span className="font-normal text-neutral-400">
                    (bobot {c.weight})
                  </span>
                </p>
                {c.description && (
                  <p className="text-xs text-neutral-500">{c.description}</p>
                )}
              </li>
            ))}
            {crossDivision.length === 0 && (
              <p className="text-sm text-neutral-400">Belum ada kriteria.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
