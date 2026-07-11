"use client";

import { useState, useTransition } from "react";
import { updateDivision, deleteDivision } from "./actions";
import { Edit2, Check, X, Trash2 } from "lucide-react";

export function DivisiRow({
  division,
  memberCount,
  canManage,
}: {
  division: { id: string; name: string; category: string | null };
  memberCount: number;
  canManage: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(division.name);
  const [category, setCategory] = useState(division.category ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateDivision(division.id, { name, category: category || null });
      if (res.error) setError(res.error);
      else setIsEditing(false);
    });
  };

  const handleDelete = () => {
    if (memberCount > 0) {
      setError("Divisi masih punya anggota, pindahkan dulu sebelum menghapus.");
      return;
    }
    if (!confirm(`Hapus divisi "${division.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteDivision(division.id);
      if (res.error) setError(res.error);
    });
  };

  if (isEditing) {
    return (
      <tr className="border-b border-slate-100 bg-slate-50/50">
        <td className="p-4">
          <input
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
          />
          {error && <p className="mt-1 text-[10px] text-rose-600">{error}</p>}
        </td>
        <td className="p-4">
          <input
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={pending}
          />
        </td>
        <td className="p-4 text-center text-slate-500">{memberCount}</td>
        <td className="p-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleSave}
              disabled={pending}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setName(division.name);
                setCategory(division.category ?? "");
                setError(null);
              }}
              disabled={pending}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
      <td className="p-4 font-semibold text-slate-800">{division.name}</td>
      <td className="p-4 text-slate-600">{division.category || "—"}</td>
      <td className="p-4 text-center text-slate-600">{memberCount}</td>
      <td className="p-4 text-right">
        {canManage && (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-blue-600"
              title="Edit Divisi"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={pending}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600"
              title="Hapus Divisi"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {error && !isEditing && <p className="mt-1 text-[10px] text-rose-600">{error}</p>}
      </td>
    </tr>
  );
}
