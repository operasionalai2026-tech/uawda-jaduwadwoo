"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Loader2, Sparkles, AlertCircle } from "lucide-react";

interface PasteNotesFormProps {
  meetingId: string;
}

// Untuk rapat lama tanpa rekaman: tempel catatan mentah, AI menyusun notulen
// rapi + keputusan + action items (Catatan Visual otomatis ikut terisi).
export function PasteNotesForm({ meetingId }: PasteNotesFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/meeting/${meetingId}/notes-from-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses catatan.");
      setText("");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses catatan.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all hover:scale-[1.01] active:scale-[0.99]"
      >
        <ClipboardPaste className="h-4 w-4" />
        <span>Tempel Catatan Rapat</span>
      </button>
    );
  }

  return (
    <div className="w-full space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        disabled={busy}
        placeholder="Tempel catatan mentah rapat di sini (boleh berantakan) — AI akan menyusunnya jadi notulen rapi, keputusan, dan action items..."
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
      {error && (
        <div className="flex items-start gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={busy || text.trim().length < 20}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50 transition-all"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span>{busy ? "Memproses dengan AI..." : "Proses dengan AI"}</span>
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={busy}
          className="rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
