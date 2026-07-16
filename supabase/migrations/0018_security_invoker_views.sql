-- Fix temuan Supabase security advisor: 5 view dibuat tanpa security_invoker,
-- artinya berjalan dengan permission PEMBUAT view (bypass RLS) -- siapa pun
-- yang login bisa membaca agregat data semua orang lewat view ini.
--
-- security_invoker = true membuat view tunduk pada RLS user yang meng-query.
-- Aman untuk app: satu-satunya view yang dipakai UI adalah pm_user_points
-- (dibaca per assignee sendiri), dan tabel dasarnya (pm_tasks) memang punya
-- SELECT policy untuk semua authenticated. Empat view lain milik modul lama
-- yang dorman (kpi_entries/eval lama) dan tidak dirender UI.

alter view division_scores set (security_invoker = true);
alter view cross_division_aggregate set (security_invoker = true);
alter view individual_eval_scores set (security_invoker = true);
alter view individual_task_scores set (security_invoker = true);
alter view pm_user_points set (security_invoker = true);
