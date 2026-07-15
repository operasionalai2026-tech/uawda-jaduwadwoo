"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  THREAD_CATEGORIES,
  THREAD_TYPES,
  THREAD_CATEGORY_LABEL,
  THREAD_TYPE_LABEL,
} from "@/lib/pm";

type Option = { id: string; name: string };

const selectCls =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm outline-none focus:border-blue-400";

export function ForumFilters({ showDivision, divisions }: { showDivision: boolean; divisions: Option[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className={selectCls} value={params.get("category") ?? ""} onChange={(e) => setParam("category", e.target.value)}>
        <option value="">Semua Kategori</option>
        {THREAD_CATEGORIES.map((c) => (
          <option key={c} value={c}>{THREAD_CATEGORY_LABEL[c]}</option>
        ))}
      </select>
      <select className={selectCls} value={params.get("type") ?? ""} onChange={(e) => setParam("type", e.target.value)}>
        <option value="">Semua Type</option>
        {THREAD_TYPES.map((t) => (
          <option key={t} value={t}>{THREAD_TYPE_LABEL[t]}</option>
        ))}
      </select>
      {showDivision && (
        <select className={selectCls} value={params.get("division") ?? ""} onChange={(e) => setParam("division", e.target.value)}>
          <option value="">Semua Divisi</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
