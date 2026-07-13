"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  MessageSquare,
  CalendarDays,
  Settings,
  Target,
  Users2,
} from "lucide-react";

interface SidebarNavProps {
  isAdminOrSuperadmin: boolean;
  isLeader?: boolean;
}

// Tiap modul punya identitas warna sendiri biar navigasi terasa hidup:
// gradient saat aktif, warna ikon saat idle.
const NAV_COLORS = {
  blue: { active: "from-blue-600 to-cyan-500 shadow-blue-500/20", idle: "text-blue-400" },
  violet: { active: "from-violet-600 to-purple-500 shadow-violet-500/20", idle: "text-violet-400" },
  emerald: { active: "from-emerald-600 to-teal-500 shadow-emerald-500/20", idle: "text-emerald-400" },
  amber: { active: "from-amber-500 to-orange-500 shadow-amber-500/20", idle: "text-amber-400" },
  rose: { active: "from-rose-600 to-pink-500 shadow-rose-500/20", idle: "text-rose-400" },
  indigo: { active: "from-indigo-600 to-blue-500 shadow-indigo-500/20", idle: "text-indigo-400" },
  slate: { active: "from-slate-600 to-slate-500 shadow-slate-500/20", idle: "text-slate-400" },
} as const;

type NavColor = keyof typeof NAV_COLORS;

export function SidebarNav({ isAdminOrSuperadmin, isLeader }: SidebarNavProps) {
  const pathname = usePathname();

  const links: { href: string; label: string; icon: typeof LayoutDashboard; color: NavColor }[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, color: "blue" },
    { href: "/kpi", label: "KPI Divisi", icon: BarChart3, color: "violet" },
    { href: "/evaluasi", label: "Evaluasi", icon: ClipboardList, color: "emerald" },
    { href: "/tugas", label: "Tugas & Poin", icon: Target, color: "amber" },
    { href: "/forum", label: "Forum Diskusi", icon: MessageSquare, color: "rose" },
    { href: "/meeting", label: "Rapat & Notulen", icon: CalendarDays, color: "indigo" },
  ];

  if (isAdminOrSuperadmin) {
    links.push({ href: "/pengaturan", label: "Pengaturan", icon: Settings, color: "slate" });
  } else if (isLeader) {
    // Leader Divisi only gets the Staff sub-page, not the full Pengaturan
    // hub (Divisi CRUD & company-wide Role Tree stay Management/Owner-only).
    links.push({ href: "/pengaturan/karyawan", label: "Staff Divisi", icon: Users2, color: "slate" });
  }

  return (
    <nav className="flex flex-col gap-1.5 text-sm">
      {links.map((link) => {
        const Icon = link.icon;
        const colors = NAV_COLORS[link.color];
        // Exact match for dashboard (/) or starts with for other routes
        const isActive =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-all duration-200 ${
              isActive
                ? `bg-gradient-to-r ${colors.active} text-white shadow-md hover:opacity-95`
                : "text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1"
            }`}
          >
            <Icon
              className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                isActive ? "text-white" : colors.idle
              }`}
            />
            <span>{link.label}</span>
            {isActive && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
