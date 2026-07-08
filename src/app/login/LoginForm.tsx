"use client";

import { useActionState } from "react";
import { signInWithPassword, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPassword,
    initialState,
  );

  return (
    <div className="w-full max-w-sm">
      <form action={passwordAction} className="space-y-3">
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
    </div>
  );
}
