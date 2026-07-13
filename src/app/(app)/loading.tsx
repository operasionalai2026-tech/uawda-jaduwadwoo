// Fallback Suspense bawaan App Router: otomatis tampil setiap navigasi ke
// halaman yang masih menunggu data server. File loading.tsx di folder modul
// lain cukup re-export komponen ini biar animasinya seragam.
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
      <div className="relative h-16 w-16">
        {/* Cincin berputar */}
        <div className="absolute inset-0 rounded-2xl border-4 border-slate-200" />
        <div className="absolute inset-0 animate-spin rounded-2xl border-4 border-transparent border-t-blue-600 border-r-rose-500" />
        {/* Logo berdenyut di tengah */}
        <div className="absolute inset-2.5 flex items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-rose-600 font-bold text-white shadow-md animate-pulse">
          O
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-semibold text-slate-500">Memuat halaman</p>
        <span className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rose-500 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-500 [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
}
