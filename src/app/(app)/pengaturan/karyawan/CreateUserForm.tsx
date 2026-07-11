"use client";

import { useState } from "react";
import { type AppRole } from "@/lib/auth";
import { registerNewUser } from "./actions";
import { UserPlus, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

interface CreateUserFormProps {
  divisions: { id: string; name: string }[];
  currentUserRole: AppRole;
}

export function CreateUserForm({ divisions, currentUserRole }: CreateUserFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [role, setRole] = useState<AppRole>("staff");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await registerNewUser({
      email,
      password,
      fullName,
      position,
      divisionId: divisionId || null,
      role,
    });

    setLoading(false);

    if (res.success) {
      setSuccess("Akun karyawan berhasil dibuat!");
      // Reset form
      setEmail("");
      setPassword("");
      setFullName("");
      setPosition("");
      setDivisionId("");
      setRole("staff");
      // Close form after 2 seconds
      setTimeout(() => {
        setSuccess(null);
        setIsOpen(false);
      }, 2000);
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setError(null);
            setSuccess(null);
          }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <UserPlus className="h-4 w-4" />
          <span>{isOpen ? "Tutup Form" : "Tambah Karyawan Baru"}</span>
        </button>
      </div>

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm space-y-4 transition-all duration-300 animate-in fade-in slide-in-from-top-2"
        >
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
            Form Pembuatan Akun Karyawan Baru
          </h3>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs font-semibold text-rose-700">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Nama Lengkap</label>
              <input
                type="text"
                required
                disabled={loading}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama lengkap karyawan"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Email Login</label>
              <input
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 karakter"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 py-2 text-xs focus:border-blue-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Jabatan */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Jabatan Pekerjaan</label>
              <input
                type="text"
                disabled={loading}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Leader Inbound, Packer CS"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Divisi */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Divisi</label>
              <select
                disabled={loading}
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="">Tanpa Divisi (—)</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Hak Akses */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Hak Akses (Role)</label>
              <select
                disabled={loading}
                value={role}
                onChange={(e) => setRole(e.target.value as AppRole)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="staff">Staff</option>
                <option value="leader">Leader Divisi</option>
                {currentUserRole === "superadmin" && <option value="admin">Management</option>}
                {currentUserRole === "superadmin" && <option value="superadmin">Owner</option>}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Buat Akun Karyawan</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
