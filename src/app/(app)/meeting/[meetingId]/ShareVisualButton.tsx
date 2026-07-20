"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

// Salin link publik poster Catatan Visual — penerima link bisa langsung
// melihat gambarnya tanpa login. `sharePath` relatif; origin diambil dari
// browser supaya link selalu cocok dengan domain yang sedang dipakai.
export function ShareVisualButton({ sharePath }: { sharePath: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const shareUrl = `${window.location.origin}${sharePath}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback browser lama / non-HTTPS
      const el = document.createElement("textarea");
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Link2 className="h-3.5 w-3.5" />}
      <span>{copied ? "Link tersalin!" : "Salin Link"}</span>
    </button>
  );
}
