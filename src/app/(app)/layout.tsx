import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, ROLE_LABEL } from "@/lib/auth";
import { SidebarNav } from "./SidebarNav";
import { LogOut, Shield } from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const isAdminOrSuperadmin = user.role === "superadmin" || user.role === "admin";

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 antialiased">
      {/* Sidebar */}
      <aside className="relative flex w-64 shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-950 p-5 text-white">
        {/* Glow effect at top left */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl"
        />
        
        <div className="relative z-10 flex flex-col gap-8">
          {/* Logo Brand */}
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-rose-600 font-bold text-white shadow-md shadow-rose-600/20">
              O
            </span>
            <div>
              <p className="text-sm font-bold tracking-wider uppercase text-white">
                INTERNAL OPS
              </p>
              <p className="text-[10px] text-slate-500">MNGM SYSTEM</p>
            </div>
          </div>

          {/* Nav Menu */}
          <SidebarNav isAdminOrSuperadmin={isAdminOrSuperadmin} />
        </div>

        {/* User Card & Sign Out */}
        <div className="relative z-10 mt-auto flex flex-col gap-4 border-t border-slate-800/80 pt-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 backdrop-blur-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-700 via-rose-600 to-pink-500 text-white font-semibold shadow-md">
              {user.fullName ? user.fullName[0].toUpperCase() : user.email?.[0].toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {user.fullName ?? user.email}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="h-3 w-3 text-slate-400" />
                <span className="text-[10px] font-medium text-slate-400">
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
            </div>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg border border-slate-800 bg-transparent px-3 py-2.5 text-left text-sm font-medium text-slate-400 transition-all duration-200 hover:bg-white/5 hover:text-white hover:border-slate-700"
            >
              <LogOut className="h-4.5 w-4.5" />
              <span>Keluar</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}

