-- getmira.gg waitlist table
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  interest text not null default 'free' check (interest in ('free', 'dfy', 'pro')),
  source text not null default 'getmira.gg',
  created_at timestamptz not null default now()
);

-- Lock the table down: RLS on with NO policies means the browser's anon key can
-- do nothing. Only the waitlist edge function (service role) can read/write.
alter table public.waitlist enable row level security;

-- Handy view of signups per tier for a quick look in the dashboard
create or replace view public.waitlist_summary
with (security_invoker = off) as
  select interest, count(*) as signups, min(created_at) as first, max(created_at) as latest
  from public.waitlist group by interest;
