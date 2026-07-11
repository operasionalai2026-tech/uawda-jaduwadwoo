"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
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
      return { success: false, error: "Unauthorized. Hanya Management atau Owner yang dapat melakukan ini." };
    }

    // Management cannot promote anyone to Owner
    if (data.role === "superadmin" && currentUser.role !== "superadmin") {
      return { success: false, error: "Hanya Owner yang dapat memberikan akses Owner." };
    }

    // Management cannot promote anyone to Management -- only Owner mints peers/superiors
    if (data.role === "admin" && currentUser.role !== "superadmin") {
      return { success: false, error: "Hanya Owner yang dapat memberikan akses Management." };
    }

    // Fetch the target user's current role
    const { data: targetRoleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    // Prevent Management from modifying an Owner's role or profile
    if (targetRoleRow?.role === "superadmin" && currentUser.role !== "superadmin") {
      return { success: false, error: "Management tidak dapat mengubah profil atau hak akses Owner." };
    }

    // Prevent Management from modifying a peer Management account
    if (targetRoleRow?.role === "admin" && currentUser.role !== "superadmin") {
      return { success: false, error: "Management tidak dapat mengubah profil atau hak akses sesama Management." };
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

    revalidatePath("/pengaturan/karyawan");
    revalidatePath("/");
    return { success: true, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return { success: false, error: message };
  }
}

export async function registerNewUser(data: {
  email: string;
  password: string;
  fullName: string;
  position: string;
  divisionId: string | null;
  role: AppRole;
}): Promise<UserActionState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    // Role protection logic
    if (currentUser.role !== "superadmin" && currentUser.role !== "admin") {
      return { success: false, error: "Unauthorized. Hanya Management atau Owner yang dapat mendaftarkan karyawan baru." };
    }

    // Management cannot create Owner accounts
    if (data.role === "superadmin" && currentUser.role !== "superadmin") {
      return { success: false, error: "Hanya Owner yang dapat membuat akun dengan akses Owner." };
    }

    // Management cannot create peer Management accounts -- only Owner can
    if (data.role === "admin" && currentUser.role !== "superadmin") {
      return { success: false, error: "Hanya Owner yang dapat membuat akun dengan akses Management." };
    }

    // Inputs validation
    if (!data.email || !data.password || !data.fullName) {
      return { success: false, error: "Email, password, dan nama lengkap wajib diisi." };
    }

    if (data.password.length < 6) {
      return { success: false, error: "Password minimal terdiri dari 6 karakter." };
    }

    const supabaseAdmin = createAdminClient();

    // 1. Create the user in Supabase Auth using the admin service role client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // auto-confirm the user email so they can log in directly
    });

    if (authError) {
      return { success: false, error: `Gagal membuat akun auth: ${authError.message}` };
    }

    const newUserId = authData.user?.id;
    if (!newUserId) {
      return { success: false, error: "Gagal mendapatkan User ID dari Auth" };
    }

    // 2. Insert into profiles table
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: newUserId,
        full_name: data.fullName,
        division_id: data.divisionId || null,
        position: data.position || null,
        employment_status: "active",
      });

    if (profileError) {
      // Cleanup auth user to prevent orphaned auth record
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return { success: false, error: `Gagal membuat data profil: ${profileError.message}` };
    }

    // 3. Insert into user_roles table
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUserId,
        role: data.role,
        division_id: (data.role === "leader" || data.role === "staff") ? data.divisionId : null,
      });

    if (roleError) {
      // Cleanup both auth and profile
      await supabaseAdmin.from("profiles").delete().eq("id", newUserId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return { success: false, error: `Gagal memberikan hak akses: ${roleError.message}` };
    }

    revalidatePath("/pengaturan/karyawan");
    revalidatePath("/");
    return { success: true, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return { success: false, error: message };
  }
}
