// Client-safe role constants -- no server-only imports (next/headers etc)
// so this can be imported from both Server and Client Components.

export type AppRole = "superadmin" | "admin" | "leader" | "staff";

// Display labels only -- the stored role values (superadmin/admin/leader/
// staff) are unchanged; this just renames them in the UI to match the
// Owner -> Management -> Leader Divisi -> Staff org structure.
export const ROLE_LABEL: Record<AppRole, string> = {
  superadmin: "Owner",
  admin: "Management",
  leader: "Lead Team",
  staff: "Staff",
};
