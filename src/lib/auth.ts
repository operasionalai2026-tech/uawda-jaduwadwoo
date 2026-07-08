import { createClient } from "@/lib/supabase/server";

export type AppRole = "superadmin" | "admin" | "leader" | "staff";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: AppRole;
  divisionId: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: roleRow }, { data: profile }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role, division_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, division_id")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    role: (roleRow?.role as AppRole) ?? "staff",
    divisionId: roleRow?.division_id ?? profile?.division_id ?? null,
  };
}
