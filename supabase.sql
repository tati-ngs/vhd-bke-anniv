create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birthday date not null,
  phone text not null,
  service text,
  created_at timestamptz not null default now()
);

create unique index if not exists members_name_birthday_unique
on public.members (lower(name), birthday);
