-- Lumen database schema
-- Paste this whole file into Supabase Dashboard > SQL Editor > New query > Run.
-- It is safe to run more than once.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Saved summaries (signed-in users only; guests keep history in their browser)
-- ---------------------------------------------------------------------------
create table if not exists public.summaries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  url             text not null check (char_length(url) <= 2048),
  final_url       text not null check (char_length(final_url) <= 2048),
  site_name       text not null default '' check (char_length(site_name) <= 200),
  title           text not null check (char_length(title) <= 300),
  tldr            text not null check (char_length(tldr) <= 600),
  summary         text not null check (char_length(summary) <= 4000),
  key_points      jsonb not null default '[]'::jsonb,
  topics          jsonb not null default '[]'::jsonb,
  content_type    text not null default 'other',
  quality         text not null default 'good',
  injection_detected boolean not null default false,
  length          text not null check (length in ('brief', 'standard', 'detailed')),
  word_count      integer not null default 0,
  reading_minutes integer not null default 1,
  byline          text,
  published_time  text,
  lang            text,
  truncated       boolean not null default false,
  model           text not null default '',
  created_at      timestamptz not null default now()
);

create index if not exists summaries_user_created_idx on public.summaries (user_id, created_at desc);

alter table public.summaries enable row level security;

drop policy if exists "summaries: owner can read" on public.summaries;
create policy "summaries: owner can read" on public.summaries
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "summaries: owner can insert" on public.summaries;
create policy "summaries: owner can insert" on public.summaries
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "summaries: owner can delete" on public.summaries;
create policy "summaries: owner can delete" on public.summaries
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Support tickets (created by the server with the service role)
-- ---------------------------------------------------------------------------
create table if not exists public.tickets (
  id          uuid primary key default gen_random_uuid(),
  ticket_ref  text not null unique,
  user_id     uuid references auth.users (id) on delete set null,
  name        text not null check (char_length(name) <= 80),
  email       text not null check (char_length(email) <= 254),
  category    text not null default 'other',
  subject     text not null check (char_length(subject) <= 120),
  message     text not null check (char_length(message) <= 4000),
  source      text not null default 'form' check (source in ('form', 'tara')),
  transcript  jsonb,
  status      text not null default 'open' check (status in ('open', 'answered', 'closed')),
  ip_hash     text,
  email_sent  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists tickets_user_idx on public.tickets (user_id, created_at desc);
create index if not exists tickets_email_idx on public.tickets (email, created_at desc);

alter table public.tickets enable row level security;

drop policy if exists "tickets: owner can read" on public.tickets;
create policy "tickets: owner can read" on public.tickets
  for select to authenticated using ((select auth.uid()) = user_id);
-- No insert/update/delete policies: only the service role (server) writes tickets.

-- ---------------------------------------------------------------------------
-- Consent records (Terms of Service acceptance, with document version)
-- ---------------------------------------------------------------------------
create table if not exists public.consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete cascade,
  anon_id      uuid,
  document     text not null check (document in ('terms', 'privacy')),
  version      text not null check (char_length(version) <= 20),
  accepted_at  timestamptz not null default now(),
  ip_hash      text,
  user_agent   text check (char_length(user_agent) <= 300),
  constraint consents_subject_present check (user_id is not null or anon_id is not null)
);

create index if not exists consents_user_idx on public.consents (user_id, accepted_at desc);
create index if not exists consents_anon_idx on public.consents (anon_id, accepted_at desc);

alter table public.consents enable row level security;

drop policy if exists "consents: owner can read" on public.consents;
create policy "consents: owner can read" on public.consents
  for select to authenticated using ((select auth.uid()) = user_id);
-- Writes go through the server (service role) so the version and time are trusted.

-- ---------------------------------------------------------------------------
-- Rate limiting (fixed window). Service role only.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;
-- No policies: anon and authenticated roles cannot read or write.

create or replace function public.rate_limit_hit(p_key text, p_window_seconds integer, p_max integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_count  integer;
begin
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  -- Opportunistic cleanup of old windows.
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return jsonb_build_object(
    'allowed', v_count <= p_max,
    'remaining', greatest(p_max - v_count, 0),
    'retry_after', case when v_count <= p_max then 0
                   else ceil(extract(epoch from (v_window + make_interval(secs => p_window_seconds) - now())))::int end
  );
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
