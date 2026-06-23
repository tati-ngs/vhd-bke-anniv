create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birthday date not null,
  phone text not null,
  service text,
  created_at timestamptz not null default now()
);

create unique index if not exists members_phone_unique
on public.members (regexp_replace(phone, '[^0-9+]', '', 'g'));

alter table public.members
add column if not exists call_status text not null default 'a_rappeler';
