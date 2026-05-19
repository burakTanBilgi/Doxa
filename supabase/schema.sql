-- Doxa Supabase schema.
--
-- Paste this into the Supabase SQL editor (https://supabase.com/dashboard →
-- your project → SQL Editor → New query) and run it. It's idempotent — safe to
-- re-run if you ever need to repair the table or the RLS policy.
--
-- After running, verify with: `npm run test:smoke`

-- doxa_charts: one row per saved project, owned by the signed-in user.
create table if not exists public.doxa_charts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  payload     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Index for the common list query (user's rows, newest first).
create index if not exists doxa_charts_user_updated_idx
  on public.doxa_charts (user_id, updated_at desc);

-- RLS: users can only see / change their own rows.
alter table public.doxa_charts enable row level security;

drop policy if exists doxa_charts_own on public.doxa_charts;
create policy doxa_charts_own
  on public.doxa_charts
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tell PostgREST to reload its schema cache so the new table is immediately
-- visible via the REST API (otherwise it can take up to a minute).
notify pgrst, 'reload schema';
