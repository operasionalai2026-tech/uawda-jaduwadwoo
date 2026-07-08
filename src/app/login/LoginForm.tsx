"use client";

import { useActionState } from "react";
import { signInWithPassword, sendMagicLink, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const [magicState, magicAction, magicPending] = useActionState(
    sendMagicLink,
    initialState,
  );

  return (
    <div className="w-full max-w-sm space-y-8">
      <form action={passwordAction} className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Masuk dengan password</h2>
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        {passwordState.error && (
          <p className="text-sm text-red-600">{passwordState.error}</p>
        )}
        <button
          type="submit"
          disabled={passwordPending}
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {passwordPending ? "Memproses..." : "Masuk"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <div className="h-px flex-1 bg-neutral-200" />
        atau
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <form action={magicAction} className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Kirim magic link</h2>
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        {magicState.error && <p className="text-sm text-red-600">{magicState.error}</p>}
        {magicState.sent && (
          <p className="text-sm text-green-600">Cek email untuk link masuk.</p>
        )}
        <button
          type="submit"
          disabled={magicPending}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {magicPending ? "Mengirim..." : "Kirim magic link"}
        </button>
      </form>
    </div>
  );
}
