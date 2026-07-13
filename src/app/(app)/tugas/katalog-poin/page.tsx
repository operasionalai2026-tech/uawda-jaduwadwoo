import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CatalogForm } from "./CatalogForm";
import { CatalogToggle } from "./CatalogToggle";

export default async function KatalogPoinPage() {
  const user = await getCurrentUser();
  if (user?.role !== "superadmin") redirect("/tugas");

  const supabase = await createClient();
  const { data: catalog } = await supabase
    .from("point_catalog")
    .select("id, name, points, description, active")
    .order("points");

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Link
          href="/tugas"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold">Katalog Poin Task</h1>
      </div>
      <p className="text-sm text-slate-500">
        Nilai poin tugas dikunci di sini supaya konsisten antar leader/divisi. Leader hanya memilih
        dari daftar ini saat assign task dari Forum.
      </p>

      <CatalogForm />

      <ul className="space-y-1.5">
        {(catalog ?? []).map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">
                {c.name} <span className="font-normal text-neutral-400">({c.points} poin)</span>
              </p>
              {c.description && <p className="text-xs text-neutral-500">{c.description}</p>}
            </div>
            <CatalogToggle id={c.id} active={c.active} />
          </li>
        ))}
        {(catalog ?? []).length === 0 && (
          <p className="text-sm text-neutral-400">Belum ada katalog poin.</p>
        )}
      </ul>
    </div>
  );
}
