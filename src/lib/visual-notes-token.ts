import { createHash } from "node:crypto";

// Token deterministik untuk link publik poster "Catatan Visual": siapa pun
// yang memegang link bisa melihat gambarnya tanpa login, tapi token tidak
// bisa ditebak tanpa secret server. Server-only -- jangan diimpor dari
// client component.
export function getVisualNotesToken(meetingId: string): string {
  return createHash("sha256")
    .update(`visual-notes:${meetingId}:${process.env.SUPABASE_SERVICE_ROLE_KEY}`)
    .digest("hex")
    .slice(0, 32);
}
