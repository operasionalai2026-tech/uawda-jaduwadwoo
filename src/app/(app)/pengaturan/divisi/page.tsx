import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { DivisiForm } from "./DivisiForm";
import { DivisiRow } from "./DivisiRow";

export default async function DivisiPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    redirect("/");
  }

  const supabase = await createClient();
  const canManage = user.role === "superadmin";

  const [{ data: divisions }, { data: profiles }] = await Promise.all([
    supabase.from("divisions").select("id, name, category").order("name"),
    supabase.from("profiles").select("division_id"),
  ]);

  const memberCountByDivision = new Map<string, number>();
  for (const p of profiles ?? []) {
    if (!p.division_id) continue;
    memberCountByDivision.set(p.division_id, (memberCountByDivision.get(p.division_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2">
          <Link
            href="/pengaturan"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-blue-800 to-rose-700 bg-clip-text text-transparent">Divisi</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500 ml-10">
          Struktur divisi perusahaan. Hanya Owner yang bisa menambah, mengubah, atau menghapus divisi.
        </p>
      </div>

      {canManage ? (
        <DivisiForm />
      ) : (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
          Anda bisa melihat daftar divisi, tapi hanya Owner yang bisa mengelolanya.
        </p>
      )}

      <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Nama Divisi</th>
                <th className="p-4">Kategori</th>
                <th className="p-4 text-center">Anggota</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(divisions ?? []).map((d) => (
                <DivisiRow
                  key={d.id}
                  division={d}
                  memberCount={memberCountByDivision.get(d.id) ?? 0}
                  canManage={canManage}
                />
              ))}
              {(divisions ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                    <Layers className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                    Belum ada divisi terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
