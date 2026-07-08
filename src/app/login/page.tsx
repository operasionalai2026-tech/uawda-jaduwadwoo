import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-lg font-semibold">
          Sistem Internal Operasional
        </h1>
        <LoginForm />
      </div>
    </main>
  );
}
