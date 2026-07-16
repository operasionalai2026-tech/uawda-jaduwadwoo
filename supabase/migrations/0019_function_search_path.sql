-- Fix advisor WARN "Function Search Path Mutable": pin search_path pada
-- fungsi trigger agar tidak bisa dibelokkan lewat manipulasi search_path
-- session (hardening standar; tidak mengubah perilaku).

alter function compute_kpi_score() set search_path = public;
alter function pm_default_task_points() set search_path = public;
alter function pm_touch_updated_at() set search_path = public;
alter function validate_kpi_task_due_date() set search_path = public;
alter function touch_kpi_task_updated_at() set search_path = public;
