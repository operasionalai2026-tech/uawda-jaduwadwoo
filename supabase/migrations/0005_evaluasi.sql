-- Fase 2: Modul Evaluasi

create table eval_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz default now()
);

create table eval_criteria (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('individual', 'cross_division')),
  name text not null,
  description text,
  weight numeric,
  active boolean not null default true
);

-- Leader -> Staff (individual)
create table evaluations_individual (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references eval_cycles(id) on delete cascade,
  rater_id uuid not null references auth.users(id),
  ratee_id uuid not null references auth.users(id),
  criteria_id uuid not null references eval_criteria(id),
  score numeric not null check (score >= 0 and score <= 100),
  comment text,
  created_at timestamptz default now(),
  unique (cycle_id, rater_id, ratee_id, criteria_id)
);

-- Divisi -> Divisi (cross-functional)
create table evaluations_cross_division (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references eval_cycles(id) on delete cascade,
  rater_division_id uuid not null references divisions(id),
  ratee_division_id uuid not null references divisions(id),
  rater_user_id uuid not null references auth.users(id),
  score numeric not null check (score >= 0 and score <= 100),
  comment text,
  created_at timestamptz default now(),
  check (rater_division_id != ratee_division_id),
  unique (cycle_id, rater_division_id, ratee_division_id, rater_user_id)
);

create view cross_division_aggregate as
select
  rater_division_id,
  ratee_division_id,
  cycle_id,
  avg(score) as avg_score,
  count(*) as num_raters
from evaluations_cross_division
group by rater_division_id, ratee_division_id, cycle_id;

-- Ringkasan skor leader->staff per ratee per cycle (avg tertimbang bobot kriteria)
create view individual_eval_scores as
select
  ei.cycle_id,
  ei.ratee_id,
  sum(ei.score * coalesce(ec.weight, 1)) / nullif(sum(coalesce(ec.weight, 1)), 0) as avg_score,
  count(distinct ei.rater_id) as num_raters
from evaluations_individual ei
join eval_criteria ec on ec.id = ei.criteria_id
group by ei.cycle_id, ei.ratee_id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table eval_cycles enable row level security;
alter table eval_criteria enable row level security;
alter table evaluations_individual enable row level security;
alter table evaluations_cross_division enable row level security;

create policy "eval_cycles_select_authenticated" on eval_cycles
  for select using (auth.role() = 'authenticated');
create policy "eval_cycles_write_admin" on eval_cycles
  for all using (get_user_role(auth.uid()) in ('superadmin', 'admin'));

create policy "eval_criteria_select_authenticated" on eval_criteria
  for select using (auth.role() = 'authenticated');
create policy "eval_criteria_write_superadmin" on eval_criteria
  for all using (get_user_role(auth.uid()) = 'superadmin');

-- individual: superadmin all; leader can write/read evals where they are the
-- rater and ratee is in their division; ratee can read their own scores.
create policy "eval_individual_all_superadmin" on evaluations_individual
  for all using (get_user_role(auth.uid()) = 'superadmin');

create policy "eval_individual_leader_rater" on evaluations_individual
  for all using (
    get_user_role(auth.uid()) = 'leader'
    and rater_id = auth.uid()
    and exists (
      select 1 from profiles p
      where p.id = evaluations_individual.ratee_id
      and p.division_id = get_user_division(auth.uid())
    )
  );

create policy "eval_individual_select_own" on evaluations_individual
  for select using (ratee_id = auth.uid());

-- cross_division: only superadmin has direct table access (audit). Everyone
-- else reads via the cross_division_aggregate view. Raters (leader/staff)
-- can insert/update their own submissions.
create policy "eval_cross_all_superadmin" on evaluations_cross_division
  for all using (get_user_role(auth.uid()) = 'superadmin');

create policy "eval_cross_rater_write_own" on evaluations_cross_division
  for insert with check (
    rater_user_id = auth.uid()
    and rater_division_id = get_user_division(auth.uid())
  );

create policy "eval_cross_rater_update_own" on evaluations_cross_division
  for update using (rater_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants (anon/authenticated need base table privileges before RLS applies;
-- learned this the hard way in 0003/0004 - doing it right from the start here)
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on eval_cycles, eval_criteria,
  evaluations_individual, evaluations_cross_division to authenticated;
grant select on eval_cycles, eval_criteria to anon;
grant select on cross_division_aggregate, individual_eval_scores to authenticated;
