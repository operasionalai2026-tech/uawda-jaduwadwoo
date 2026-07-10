import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { NewMeetingForm } from "./NewMeetingForm";
import { Calendar, Plus, Users, Clock, ArrowRight, Layers } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Terjadwal",
  ongoing: "Berlangsung",
  done: "Selesai",
  cancelled: "Dibatalkan",
};

export default async function MeetingPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: meetings }, { data: divisions }] = await Promise.all([
    supabase
      .from("meetings")
      .select("id, title, division_id, scheduled_at, status")
      .order("scheduled_at", { ascending: false }),
    supabase.from("divisions").select("id, name").order("name"),
  ]);

  const divisionNameById = new Map((divisions ?? []).map((d) => [d.id, d.name]));
  const canCreate =
    user?.role === "superadmin" || user?.role === "admin" || user?.role === "leader";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-50 text-blue-700 border-blue-100";
      case "ongoing": return "bg-rose-50 text-rose-700 border-rose-100 animate-pulse";
      case "done": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      default: return "bg-slate-50 text-slate-500 border-slate-200";
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Rapat &amp; Notulen
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola jadwal pertemuan, catat kehadiran peserta, dan dokumentasikan keputusan penting serta tugas tindak lanjut.
        </p>
      </div>

      {/* Admin Panel: Jadwalkan Rapat */}
      {canCreate && (
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Plus className="h-4.5 w-4.5 text-blue-600" />
            <span>Jadwalkan Rapat Baru</span>
          </h2>
          <NewMeetingForm divisions={divisions ?? []} />
        </div>
      )}

      {/* Meeting List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Jadwal Rapat Terkini</h2>
        
        <div className="grid gap-3 max-w-3xl">
          {(meetings ?? []).map((m) => {
            const divisionName = m.division_id ? divisionNameById.get(m.division_id) : "Lintas Divisi";
            const dateObj = new Date(m.scheduled_at);
            
            return (
              <Link
                key={m.id}
                href={`/meeting/${m.id}`}
                className="group flex items-center justify-between rounded-2xl bg-white p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 hover:scale-[1.005]"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-gradient-to-tr group-hover:from-blue-600 group-hover:to-rose-600 group-hover:text-white transition-all duration-300">
                    <Calendar className="h-5 w-5" />
                  </span>
                  
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate max-w-[300px] group-hover:text-blue-600 transition-colors">
                      {m.title}
                    </p>
                    
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap font-medium">
                      <span className="bg-slate-100 border border-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded text-[10px] uppercase">
                        {divisionName}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{dateObj.toLocaleDateString("id-ID", { dateStyle: "medium" })} pukul {dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</span>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${getStatusColor(m.status)}`}>
                    {STATUS_LABEL[m.status] ?? m.status}
                  </span>
                  <span className="text-slate-400 group-hover:text-slate-800 transition-colors">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
          })}

          {(meetings ?? []).length === 0 && (
            <div className="py-12 text-center border border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
              <p className="text-sm text-slate-400 italic">Belum ada rapat terdaftar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
