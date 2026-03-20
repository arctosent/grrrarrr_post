create table if not exists public.site_state (
  id text primary key,
  posts jsonb not null default '[]'::jsonb,
  followers jsonb not null default '[]'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.site_state enable row level security;

drop policy if exists "read_site_state" on public.site_state;
drop policy if exists "insert_site_state" on public.site_state;
drop policy if exists "update_site_state" on public.site_state;

create policy "read_site_state"
on public.site_state
for select
to anon, authenticated
using (id = 'global');

create policy "insert_site_state"
on public.site_state
for insert
to anon, authenticated
with check (id = 'global');

create policy "update_site_state"
on public.site_state
for update
to anon, authenticated
using (id = 'global')
with check (id = 'global');

insert into public.site_state (id, posts, followers, revision, updated_at)
values ('global', '[]'::jsonb, '[]'::jsonb, 0, timezone('utc', now()))
on conflict (id) do nothing;
