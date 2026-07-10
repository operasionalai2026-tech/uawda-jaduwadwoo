"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, type AppRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type UserActionState = {
  success: boolean;
  error: string | null;
};

export async function updateUserRoleAndProfile(
  userId: string,
  data: {
    role: AppRole;
    divisionId: string | null;
    fullName: string;
    position: string;
    employmentStatus: string;
  }
): Promise<UserActionState> {
  try {
    const supabase = await createClient();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    // Role protection logic
    if (currentUser.role !== "superadmin" && currentUser.role !== "admin") {
      return { success: false, error: "Unauthorized. Hanya Admin atau Superadmin yang dapat melakukan ini." };
    }

    // Admin cannot promote anyone to superadmin
    if (data.role === "superadmin" && currentUser.role !== "superadmin") {
      return { success: false, error: "Hanya Superadmin yang dapat memberikan akses Superadmin." };
    }

    // Fetch the target user's current role
    const { data: targetRoleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    // Prevent Admin from modifying a Superadmin's role or profile
    if (targetRoleRow?.role === "superadmin" && currentUser.role !== "superadmin") {
      return { success: false, error: "Admin tidak dapat mengubah profil atau hak akses Superadmin." };
    }

    // 1. Update profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        full_name: data.fullName,
        division_id: data.divisionId || null,
        position: data.position || null,
        employment_status: data.employmentStatus,
      }, { onConflict: "id" });

    if (profileError) {
      return { success: false, error: `Profil error: ${profileError.message}` };
    }

    // 2. Update user_roles table
    // Delete existing roles first to ensure one role per user
    const { error: deleteRoleError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (deleteRoleError) {
      return { success: false, error: `Hapus role error: ${deleteRoleError.message}` };
    }

    // Insert new role
    const { error: insertRoleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role: data.role,
        division_id: (data.role === "leader" || data.role === "staff") ? data.divisionId : null,
      });

    if (insertRoleError) {
      return { success: false, error: `Tambah role error: ${insertRoleError.message}` };
    }

    revalidatePath("/users");
    revalidatePath("/");
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error?.message || "Terjadi kesalahan internal" };
  }
}
