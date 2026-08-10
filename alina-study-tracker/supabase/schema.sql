-- Cloud sync schema for the study tracker.
-- Run this once in Supabase -> SQL Editor. Safe to re-run.
--
-- Design note: the whole app state travels as a single JSON document keyed by
-- a secret UUID ("sync code"). For one student's data this is far simpler than
-- a dozen relational tables, and it makes conflict handling a single
-- last-write-wins comparison.
--
-- Security: the table itself is NOT reachable by the anonymous API role.
-- Reads and writes go through two SECURITY DEFINER functions that only ever
-- touch the single row whose id matches the code passed in, so knowing the
-- code is the only way to reach a document — and knowing one code tells you
-- nothing about any other.

create table if not exists public.study_state (
  id          uuid primary key,
  data        jsonb       not null,
  updated_at  timestamptz not null default now()
);

alter table public.study_state enable row level security;

-- No policies are defined on purpose: with RLS on and zero policies, the anon
-- and authenticated roles cannot select, insert, update or delete directly.
revoke all on table public.study_state from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Read one document by its code.
-- ---------------------------------------------------------------------------
create or replace function public.pull_state(p_code uuid)
returns table (data jsonb, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select s.data, s.updated_at
  from public.study_state s
  where s.id = p_code;
$$;

-- ---------------------------------------------------------------------------
-- Create or replace one document.
-- ---------------------------------------------------------------------------
create or replace function public.push_state(
  p_code       uuid,
  p_data       jsonb,
  p_updated_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated timestamptz;
begin
  insert into public.study_state (id, data, updated_at)
  values (p_code, p_data, coalesce(p_updated_at, now()))
  on conflict (id) do update
    set data       = excluded.data,
        updated_at = excluded.updated_at
  returning study_state.updated_at into v_updated;

  return v_updated;
end;
$$;

grant execute on function public.pull_state(uuid)                       to anon, authenticated;
grant execute on function public.push_state(uuid, jsonb, timestamptz)   to anon, authenticated;
