import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser, ROLE_LABEL } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users2, Layers, ChevronDown, Crown, Briefcase, UserCog, User } from "lucide-react";

export default async function PengaturanPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    redirect("/");
  }

  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

  const [{ data: divisions }, { data: profiles }, { data: userRoles }] = await Promise.all([
    supabase.from("divisions").select("id, name").order("name"),
    supabaseAdmin.from("profiles").select("id, full_name, division_id"),
    supabaseAdmin.from("user_roles").select("user_id, role, division_id"),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const roleRows = userRoles ?? [];

  const owners = roleRows.filter((r) => r.role === "superadmin");
  const management = roleRows.filter((r) => r.role === "admin");
  const leaders = roleRows.filter((r) => r.role === "leader");
  const staff = roleRows.filter((r) => r.role === "staff");

  const leadersByDivision = new Map<string, string[]>();
  for (const l of leaders) {
    if (!l.division_id) continue;
    const list = leadersByDivision.get(l.division_id) ?? [];
    list.push(nameById.get(l.user_id) ?? "-");
    leadersByDivision.set(l.division_id, list);
  }

  const staffCountByDivision = new Map<string, number>();
  for (const s of staff) {
    if (!s.division_id) continue;
    staffCountByDivision.set(s.division_id, (staffCountByDivision.get(s.division_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-blue-800 to-rose-700 bg-clip-text text-transparent">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Satu pintu untuk mengelola struktur perusahaan: karyawan, divisi, dan hierarki role.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/pengaturan/karyawan"
          className="group flex items-center gap-4 rounded-2xl bg-white p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 group-hover:bg-gradient-to-tr group-hover:from-blue-600 group-hover:to-rose-600 group-hover:text-white transition-all">
            <Users2 className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Karyawan &amp; User</p>
            <p className="text-xs text-slate-500 mt-0.5">Buat akun baru, atur jabatan, divisi, dan hak akses.</p>
          </div>
        </Link>
        <Link
          href="/pengaturan/divisi"
          className="group flex items-center gap-4 rounded-2xl bg-white p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-violet-500 text-white shadow-md shadow-purple-500/25 group-hover:bg-gradient-to-tr group-hover:from-blue-600 group-hover:to-rose-600 group-hover:text-white transition-all">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Divisi</p>
            <p className="text-xs text-slate-500 mt-0.5">Tambah atau ubah struktur divisi perusahaan.</p>
          </div>
        </Link>
      </div>

      {/* Role Tree */}
      <section className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-800">Struktur Role Perusahaan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Owner &rarr; Management &rarr; Leader Divisi &rarr; Staff. Setiap level punya kewenangan
            sendiri; Owner melihat semua, level di bawahnya dibatasi sesuai cakupan tugasnya.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          {/* Owner tier */}
          <div className="w-full max-w-md rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-rose-700 font-bold text-sm">
              <Crown className="h-4 w-4" />
              <span>{ROLE_LABEL.superadmin}</span>
            </div>
            <p className="mt-1 text-xs text-rose-600">
              {owners.length === 0
                ? "Belum ada"
                : owners.map((o) => nameById.get(o.user_id) ?? "-").join(", ")}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-300" />

          {/* Management tier */}
          <div className="w-full max-w-md rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-blue-700 font-bold text-sm">
              <Briefcase className="h-4 w-4" />
              <span>{ROLE_LABEL.admin}</span>
            </div>
            <p className="mt-1 text-xs text-blue-600">
              {management.length === 0
                ? "Belum ada"
                : management.map((m) => nameById.get(m.user_id) ?? "-").join(", ")}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-300" />

          {/* Leader Divisi + Staff tier, one card per division */}
          <div className="w-full grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(divisions ?? []).map((d) => {
              const divLeaders = leadersByDivision.get(d.id) ?? [];
              const divStaffCount = staffCountByDivision.get(d.id) ?? 0;
              return (
                <div key={d.id} className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">
                    {d.name}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-sm font-bold text-purple-700">
                    <UserCog className="h-3.5 w-3.5" />
                    <span>{ROLE_LABEL.leader}</span>
                  </div>
                  <p className="text-xs text-purple-600">
                    {divLeaders.length === 0 ? "Belum ada" : divLeaders.join(", ")}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500 border-t border-purple-100 pt-2">
                    <User className="h-3.5 w-3.5" />
                    <span>
                      {divStaffCount} {ROLE_LABEL.staff}
                    </span>
                  </div>
                </div>
              );
            })}
            {(divisions ?? []).length === 0 && (
              <p className="col-span-full text-center text-xs text-slate-400 italic py-4">
                Belum ada divisi. Tambah divisi dulu di menu Divisi.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
