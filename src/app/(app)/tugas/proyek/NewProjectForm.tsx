"use client";

import { useActionState } from "react";
import { createProject, type ActionState } from "../actions";

const initialState: ActionState = { error: null };

export function NewProjectForm() {
  const [state, formAction, pending] = useActionState(createProject, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input
        name="name"
        placeholder="Nama proyek"
        required
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <textarea
        name="description"
        placeholder="Deskripsi proyek (opsional)"
        rows={2}
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Membuat..." : "Buat Proyek"}
      </button>
    </form>
  );
}
