import { BarChart3, ShieldCheck, Users } from "lucide-react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen bg-white">
      {/* Branding panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-blue-700 via-rose-600 to-pink-500 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-pink-300/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-blue-400/30 blur-3xl"
        />

        <div className="relative z-10">
          <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium tracking-wide text-white backdrop-blur-sm">
            Internal Platform
          </span>
          <h1 className="mt-6 max-w-md text-4xl font-semibold leading-tight text-white">
            Sistem Internal Operasional
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80">
            Satu tempat untuk memantau KPI, evaluasi kinerja, dan koordinasi
            seluruh divisi perusahaan.
          </p>
        </div>

        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-3 text-white/90">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <BarChart3 className="h-4.5 w-4.5" strokeWidth={2} />
            </span>
            <span className="text-sm">KPI &amp; skor divisi real-time</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <Users className="h-4.5 w-4.5" strokeWidth={2} />
            </span>
            <span className="text-sm">Evaluasi leader &amp; antar-divisi</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2} />
            </span>
            <span className="text-sm">Akses berbasis peran &amp; aman</span>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-16 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-rose-600 to-blue-700 px-4 py-1.5 text-xs font-medium text-white">
              Internal Platform
            </span>
          </div>

          <h2 className="text-2xl font-semibold text-neutral-900">
            Selamat datang kembali
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500">
            Masuk untuk mengakses dashboard operasional Anda.
          </p>

          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
