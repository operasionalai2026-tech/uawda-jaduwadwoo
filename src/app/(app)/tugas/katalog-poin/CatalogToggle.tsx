"use client";

import { useTransition } from "react";
import { toggleCatalogActive } from "../actions";

export function CatalogToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleCatalogActive(id, !active))}
      className={`rounded-full px-2.5 py-1 text-xs font-semibold border disabled:opacity-50 ${
        active
          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
          : "bg-slate-100 text-slate-500 border-slate-200"
      }`}
    >
      {active ? "Aktif" : "Nonaktif"}
    </button>
  );
}
