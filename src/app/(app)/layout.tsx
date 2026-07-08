import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, type AppRole } from "@/lib/auth";

const ROLE_LABEL: Record<AppRole, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  leader: "Leader",
  staff: "Staff",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-neutral-200 bg-neutral-50 p-4">
        <div className="mb-6">
          <p className="text-sm font-semibold">Sistem Operasional</p>
          <p className="text-xs text-neutral-500">
            {user.fullName ?? user.email} · {ROLE_LABEL[user.role]}
          </p>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/" className="rounded-md px-2 py-1.5 hover:bg-neutral-200">
            Dashboard
          </Link>
          <Link
            href="/kpi"
            className="rounded-md px-2 py-1.5 hover:bg-neutral-200"
          >
            KPI
          </Link>
          <Link
            href="/evaluasi"
            className="rounded-md px-2 py-1.5 hover:bg-neutral-200"
          >
            Evaluasi
          </Link>
          <Link
            href="/forum"
            className="rounded-md px-2 py-1.5 hover:bg-neutral-200"
          >
            Forum
          </Link>
          <Link
            href="/meeting"
            className="rounded-md px-2 py-1.5 hover:bg-neutral-200"
          >
            Meeting
          </Link>
        </nav>
        <form action="/auth/signout" method="post" className="mt-6">
          <button
            type="submit"
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-left text-sm hover:bg-neutral-200"
          >
            Keluar
          </button>
        </form>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
