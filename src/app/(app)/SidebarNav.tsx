"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  MessageSquare,
  CalendarDays,
  Users2,
} from "lucide-react";

interface SidebarNavProps {
  isAdminOrSuperadmin: boolean;
}

export function SidebarNav({ isAdminOrSuperadmin }: SidebarNavProps) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/kpi", label: "KPI Divisi", icon: BarChart3 },
    { href: "/evaluasi", label: "Evaluasi", icon: ClipboardList },
    { href: "/forum", label: "Forum Diskusi", icon: MessageSquare },
    { href: "/meeting", label: "Rapat & Notulen", icon: CalendarDays },
  ];

  if (isAdminOrSuperadmin) {
    links.push({ href: "/users", label: "Manajemen Karyawan", icon: Users2 });
  }

  return (
    <nav className="flex flex-col gap-1 text-sm">
      {links.map((link) => {
        const Icon = link.icon;
        // Exact match for dashboard (/) or starts with for other routes
        const isActive =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-all duration-200 ${
              isActive
                ? "bg-gradient-to-r from-blue-600 to-rose-600 text-white shadow-md shadow-rose-600/10 hover:opacity-95"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
