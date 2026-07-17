"use client";

import { useState } from "react";
import { Check } from "lucide-react";

type Option = { id: string; name: string };

// Multi-pilih divisi berbentuk chip (untuk Management/Owner). Nilai terpilih
// dikirim sebagai beberapa input hidden bernama `division_ids` sehingga server
// action bisa membacanya dengan formData.getAll("division_ids").
export function DivisionMultiSelect({
  divisions,
  defaultSelected = [],
  onChange,
  name = "division_ids",
}: {
  divisions: Option[];
  defaultSelected?: string[];
  onChange?: (ids: string[]) => void;
  name?: string;
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);

  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    setSelected(next);
    onChange?.(next);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {divisions.map((d) => {
          const active = selected.includes(d.id);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => toggle(d.id)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                active
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              {active && <Check className="h-3 w-3" />}
              {d.name}
            </button>
          );
        })}
      </div>
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      <p className="mt-1.5 text-[11px] text-slate-400">
        {selected.length === 0
          ? "Belum ada divisi dipilih — klik untuk memilih (boleh lebih dari satu)."
          : `${selected.length} divisi dipilih.`}
      </p>
    </div>
  );
}
