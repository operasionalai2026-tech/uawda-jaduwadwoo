-- Fase 1: Modul KPI

create table kpi_periods (
  id uuid primary key default gen_random_uuid(),
  period_type text not null check (period_type in ('monthly', 'yearly')),
  year int not null,
  month int check (month between 1 and 12),
  status text not null default 'open' check (status in ('open', 'locked')),
  created_at timestamptz default now(),
  unique (period_type, year, month)
);

create table kpi_metrics (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references divisions(id) on delete cascade,
  name text not null,
  unit text,
  weight numeric not null check (weight >= 0 and weight <= 1),
  target_value numeric not null,
  direction text not null check (direction in ('higher_better', 'lower_better')),
  source_type text not null default 'manual'
    check (source_type in ('manual', 'auto_iresis', 'auto_jubelio', 'auto_marketplace')),
  active boolean not null default true,
  created_at timestamptz default now()
);

create table kpi_entries (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null references kpi_metrics(id) on delete cascade,
  period_id uuid not null references kpi_periods(id) on delete cascade,
  actual_value numeric not null,
  score numeric,
  entered_by uuid references auth.users(id),
  entered_at timestamptz default now(),
  notes text,
  unique (metric_id, period_id)
);

-- Score is computed as % of target, capped [0, 100], direction-aware.
-- Recomputed on every insert/update via trigger so entries never drift
-- from their formula (score column stays queryable without a join).
create or replace function compute_kpi_score()
returns trigger
language plpgsql
as $$
declare
  v_target numeric;
  v_direction text;
begin
  select target_value, direction into v_target, v_direction
  from kpi_metrics where id = new.metric_id;

  if v_target = 0 then
    new.score := 0;
  elsif v_direction = 'higher_better' then
    new.score := least(100, greatest(0, (new.actual_value / v_target) * 100));
  else
    new.score := least(100, greatest(0, (v_target / nullif(new.actual_value, 0)) * 100));
  end if;

  return new;
end;
$$;

create trigger trg_compute_kpi_score
  before insert or update of actual_value on kpi_entries
  for each row execute function compute_kpi_score();

create view division_scores as
select
  m.division_id,
  e.period_id,
  sum(e.score * m.weight) / nullif(sum(m.weight), 0) as composite_score
from kpi_entries e
join kpi_metrics m on m.id = e.metric_id
group by m.division_id, e.period_id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table kpi_periods enable row level security;
alter table kpi_metrics enable row level security;
alter table kpi_entries enable row level security;

-- periods: readable by all authenticated users; only superadmin/admin manage.
create policy "kpi_periods_select_authenticated" on kpi_periods
  for select using (auth.role() = 'authenticated');

create policy "kpi_periods_write_admin" on kpi_periods
  for all using (get_user_role(auth.uid()) in ('superadmin', 'admin'));

-- metrics: readable by all authenticated (dashboard shows other divisions
-- read-only); write restricted to superadmin/admin, or the metric's own leader.
create policy "kpi_metrics_select_authenticated" on kpi_metrics
  for select using (auth.role() = 'authenticated');

create policy "kpi_metrics_write_admin" on kpi_metrics
  for all using (get_user_role(auth.uid()) in ('superadmin', 'admin'));

create policy "kpi_metrics_write_own_leader" on kpi_metrics
  for all using (
    get_user_role(auth.uid()) = 'leader'
    and division_id = get_user_division(auth.uid())
  );

-- entries: superadmin/admin full access; leader can manage entries for
-- metrics in their own division; staff read via division_scores view only
-- (no direct staff SELECT policy on the raw table).
create policy "kpi_entries_all_admin" on kpi_entries
  for all using (get_user_role(auth.uid()) in ('superadmin', 'admin'));

create policy "kpi_entries_leader_own_division" on kpi_entries
  for all using (
    get_user_role(auth.uid()) = 'leader'
    and exists (
      select 1 from kpi_metrics m
      where m.id = kpi_entries.metric_id
      and m.division_id = get_user_division(auth.uid())
    )
  );
