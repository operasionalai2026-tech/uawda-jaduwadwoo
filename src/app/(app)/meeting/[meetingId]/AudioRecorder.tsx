"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface AudioRecorderProps {
  meetingId: string;
}

export function AudioRecorder({ meetingId }: AudioRecorderProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "recording" | "transcribing" | "summarizing" | "ready" | "failed">("idle");
  const [duration, setDuration] = useState(0);
  const [chunksUploaded, setChunksUploaded] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkIndexRef = useRef(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll processing status when in background AI states
  useEffect(() => {
    if (status === "transcribing" || status === "summarizing") {
      statusPollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/meeting/${meetingId}/recording?action=status`);
          const data = await res.json();
          
          if (data.status && data.status !== status) {
            setStatus(data.status);
            
            if (data.status === "ready") {
              // Refresh server component data
              router.refresh();
              // Reset to idle after a delay
              setTimeout(() => {
                setStatus("idle");
                setDuration(0);
                setChunksUploaded(0);
              }, 4000);
            } else if (data.status === "failed") {
              setErrorMsg(data.errorMessage || "AI processing failed.");
            }
          }
        } catch (err) {
          console.error("Error polling recording status:", err);
        }
      }, 3000);
    } else {
      if (statusPollIntervalRef.current) {
        clearInterval(statusPollIntervalRef.current);
      }
    }

    return () => {
      if (statusPollIntervalRef.current) clearInterval(statusPollIntervalRef.current);
    };
  }, [status, meetingId, router]);

  // Clean up recording timers on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      setErrorMsg(null);
      setDuration(0);
      setChunksUploaded(0);
      chunkIndexRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine mimeType
      let options = {};
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/webm" };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
          const currentIndex = chunkIndexRef.current;
          chunkIndexRef.current++;

          const formData = new FormData();
          formData.append("chunk", event.data);
          formData.append("index", currentIndex.toString());

          try {
            await fetch(`/api/meeting/${meetingId}/recording?action=chunk`, {
              method: "POST",
              body: formData,
            });
            setChunksUploaded((prev) => prev + 1);
          } catch (err) {
            console.error(`Failed uploading chunk ${currentIndex}:`, err);
          }
        }
      };

      // Collect data chunks every 10 seconds (10000ms)
      mediaRecorder.start(10000);
      setStatus("recording");

      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Failed to start recording:", err);
      setErrorMsg(err.message || "Mikrofon tidak dapat diakses.");
      setStatus("failed");
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || status !== "recording") return;

    setStatus("transcribing");

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    // Stop MediaRecorder (fires the final ondataavailable)
    mediaRecorderRef.current.stop();
    
    // Stop all audio track streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Give a short delay to ensure final chunk is uploaded
    setTimeout(async () => {
      try {
        const total = chunkIndexRef.current;
        const res = await fetch(`/api/meeting/${meetingId}/recording?action=finalize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ totalChunks: total }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Gagal memproses rekaman.");
          setStatus("failed");
        }
      } catch (err: any) {
        setErrorMsg(err?.message || "Kesalahan jaringan saat memproses rekaman.");
        setStatus("failed");
      }
    }, 1500);
  };

  // Format elapsed time (seconds -> MM:SS)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Asisten Notulen AI &amp; Rekaman Rapat
          </h3>
          <p className="text-xs text-slate-500">
            Rekam suara rapat secara real-time untuk ditranskrip &amp; diringkas AI secara otomatis.
          </p>
        </div>
        {status === "recording" && (
          <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
        {status === "idle" && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Mic className="h-4 w-4" />
            <span>Mulai Rekam Suara</span>
          </button>
        )}

        {status === "recording" && (
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Square className="h-4 w-4" />
              <span>Selesai &amp; Proses AI</span>
            </button>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              <span>{formatTime(duration)}</span>
              <span className="text-[10px] font-semibold text-slate-400 font-sans">
                ({chunksUploaded} part terunggah)
              </span>
            </div>
          </div>
        )}

        {(status === "transcribing" || status === "summarizing") && (
          <div className="flex items-center gap-3 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 w-full">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
            <span>
              {status === "transcribing"
                ? "Mengonversi rekaman suara menjadi teks (Whisper)..."
                : "Menganalisis & mengekstrak ringkasan, keputusan, dan tugas (Claude AI)..."}
            </span>
          </div>
        )}

        {status === "ready" && (
          <div className="flex items-center gap-3 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 w-full">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Proses AI Selesai! Halaman sedang diperbarui otomatis...</span>
          </div>
        )}

        {status === "failed" && (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-start gap-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Gagal memproses rekaman</p>
                <p className="font-normal text-[11px] mt-0.5 text-rose-600/90">{errorMsg}</p>
              </div>
            </div>
            <button
              onClick={() => setStatus("idle")}
              className="self-start text-[11px] font-bold text-blue-600 hover:underline"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
