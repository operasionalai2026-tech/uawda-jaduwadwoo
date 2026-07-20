import { type NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

// Isi notulen/keputusan/action items dari teks catatan rapat yang ditempel
// (untuk rapat lama tanpa rekaman audio). Sinkron, bukan background job:
// ekstraksi teks oleh Gemini Flash cukup cepat, beri ruang sampai 60 detik.
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const { meetingId } = await params;

  const user = await getCurrentUser();
  if (!user || !["superadmin", "admin", "leader"].includes(user.role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  // RLS: pastikan user memang boleh melihat rapat ini (rapat privat -> 404).
  const supabase = await createClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("title, agenda")
    .eq("id", meetingId)
    .maybeSingle();
  if (!meeting) {
    return NextResponse.json({ error: "Rapat tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const rawText = typeof body?.text === "string" ? body.text.trim() : "";
  if (rawText.length < 20) {
    return NextResponse.json(
      { error: "Teks catatan terlalu pendek. Tempel isi catatan rapatnya dulu." },
      { status: 400 }
    );
  }
  if (rawText.length > 60000) {
    return NextResponse.json(
      { error: "Teks terlalu panjang (maks 60.000 karakter)." },
      { status: 400 }
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY belum dikonfigurasi." },
      { status: 500 }
    );
  }

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Rapat ini berjudul: "${meeting.title}" dengan agenda: "${
                meeting.agenda || "Koordinasi rutin"
              }". Hari ini tanggal ${new Date().toISOString().split("T")[0]}.

Berikut catatan mentah rapat yang ditulis manusia (bisa berantakan, campur singkatan):
"""
${rawText}
"""

Susun catatan tersebut menjadi notulensi yang rapi.

Format keluaran Anda harus berupa JSON valid dengan struktur berikut:
{
  "notulen": "isi notulen ringkasan rapat berformat Markdown",
  "decisions": ["keputusan penting 1", "keputusan penting 2"],
  "action_items": [
    {
      "title": "judul tugas tindak lanjut",
      "assignee_name": "nama penanggung jawab jika disebutkan, atau kosongkan",
      "due_date": "YYYY-MM-DD atau kosongkan jika tidak disebut"
    }
  ]
}

Pastikan respons Anda HANYA berupa JSON valid tersebut tanpa teks pembuka atau penutup.`,
            },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return NextResponse.json(
      { error: `Gemini API gagal: ${errText.slice(0, 500)}` },
      { status: 502 }
    );
  }

  const resJson = await response.json();
  const textResponse = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    return NextResponse.json({ error: "Gemini tidak mengembalikan hasil." }, { status: 502 });
  }

  let aiResults: {
    notulen?: string;
    decisions?: string[];
    action_items?: { title: string; assignee_name?: string; due_date?: string }[];
  };
  try {
    aiResults = JSON.parse(textResponse);
  } catch {
    return NextResponse.json({ error: "Hasil AI bukan JSON valid." }, { status: 502 });
  }

  const notulen = aiResults.notulen || "";
  const decisions = aiResults.decisions || [];
  const actionItems = aiResults.action_items || [];

  // Simpan hasil -- pakai admin client mengikuti pola pipeline rekaman, tapi
  // akses sudah digerbang role + RLS view check di atas.
  const admin = createAdminClient();

  const { data: existingNot } = await admin
    .from("notulen")
    .select("id")
    .eq("meeting_id", meetingId)
    .maybeSingle();
  if (existingNot) {
    await admin
      .from("notulen")
      .update({ content: notulen, source: "ai_generated", updated_at: new Date().toISOString() })
      .eq("meeting_id", meetingId);
  } else {
    await admin
      .from("notulen")
      .insert({ meeting_id: meetingId, content: notulen, source: "ai_generated" });
  }

  await admin.from("decisions").delete().eq("meeting_id", meetingId);
  if (decisions.length > 0) {
    await admin.from("decisions").insert(
      decisions.map((d) => ({ meeting_id: meetingId, content: d, source: "ai_generated" }))
    );
  }

  const { data: profiles } = await admin.from("profiles").select("id, full_name");
  await admin.from("action_items").delete().eq("meeting_id", meetingId);
  if (actionItems.length > 0) {
    await admin.from("action_items").insert(
      actionItems.map((item) => {
        const matched = item.assignee_name
          ? profiles?.find((p) =>
              p.full_name.toLowerCase().includes(item.assignee_name!.toLowerCase())
            )
          : null;
        return {
          meeting_id: meetingId,
          title: item.title,
          assignee_id: matched?.id ?? null,
          due_date: item.due_date || null,
          status: "open",
          source: "ai_generated",
        };
      })
    );
  }

  return NextResponse.json({
    success: true,
    counts: { decisions: decisions.length, actionItems: actionItems.length },
  });
}
