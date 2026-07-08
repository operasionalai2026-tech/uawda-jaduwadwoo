"use client";

import { useActionState } from "react";
import { createThread, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

export function NewThreadForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createThread, initialState);

  return (
    <form
      action={formAction}
      className="space-y-2 rounded-lg border border-neutral-200 p-4"
    >
      <p className="text-sm font-medium">Buat thread baru</p>
      <div className="flex flex-wrap gap-2">
        <select
          name="category_id"
          required
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">Kategori&hellip;</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          name="title"
          placeholder="Judul thread"
          required
          className="flex-1 min-w-48 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <textarea
        name="content"
        placeholder="Isi pesan pertama (opsional)"
        rows={2}
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Membuat..." : "Buat thread"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
