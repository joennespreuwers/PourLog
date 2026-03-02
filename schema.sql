-- PourLog — Schema v2 (global entities model)
-- Run in Supabase SQL Editor. Safe to re-run.
--
-- Key change from v1:
--   roasteries + beans are now GLOBAL (canonical), not per-user.
--   Users collect them via user_roasteries / user_beans junction tables.
--   Recipes remain user-owned.

-- ─── Core tables ──────────────────────────────────────────────────────────────

create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  slug          text unique,
  created_at    timestamptz default now()
);

-- Global roasteries — one canonical row per real-world roastery
create table if not exists roasteries (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid references auth.users(id) on delete set null,
  name         text not null,
  country      text,
  city         text,
  website      text,
  description  text,
  photo_url    text,
  created_at   timestamptz default now()
);

-- Global beans — one canonical row per real-world bean release
create table if not exists beans (
  id               uuid primary key default gen_random_uuid(),
  created_by       uuid references auth.users(id) on delete set null,
  name             text not null,
  roastery_id      uuid references roasteries(id) on delete set null,
  origin_country   text,
  origin_region    text,
  farm             text,
  variety          text,
  process          text,
  roast_level      text,
  altitude_masl    int,
  harvest_date     date,
  roast_date       date,
  flavor_notes     text[],
  price_per_100g   numeric,
  created_at       timestamptz default now()
);

-- Equipment (user-owned, personal gear)
create table if not exists equipment (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  category    text,
  brand       text,
  color       jsonb,
  notes       text,
  created_at  timestamptz default now()
);

-- User-owned recipes (reference global bean)
create table if not exists recipes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  title          text not null,
  bean_id        uuid references beans(id) on delete set null,
  brew_method    text,
  filter_type    text,
  dose_g         numeric,
  yield_g        numeric,
  water_temp_c   numeric,
  grind_size     text,
  brew_time_sec  int,
  brewer_id      uuid references equipment(id) on delete set null,
  grinder_id     uuid references equipment(id) on delete set null,
  filter_id      text,
  steps          text,
  notes          text,
  is_favorite    boolean default false,
  origin_id      uuid references recipes(id) on delete set null,
  created_at     timestamptz default now()
);

-- User roastery collections (personal layer on top of global objects)
create table if not exists user_roasteries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  roastery_id  uuid not null references roasteries(id) on delete cascade,
  notes        text,
  is_favorite  boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (user_id, roastery_id)
);

-- User bean collections (personal layer)
create table if not exists user_beans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  bean_id     uuid not null references beans(id) on delete cascade,
  notes       text,
  is_favorite boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, bean_id)
);

-- Followed recipes (recipes are user-owned so still need a junction)
create table if not exists followed_recipes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  recipe_id   uuid        not null references recipes(id) on delete cascade,
  is_favorite boolean     not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, recipe_id)
);

-- ─── Upgrade existing v1 tables (safe if already exists) ─────────────────────

alter table roasteries add column if not exists created_by  uuid references auth.users(id) on delete set null;
alter table beans      add column if not exists created_by  uuid references auth.users(id) on delete set null;
alter table recipes    add column if not exists brewer_id   uuid references equipment(id) on delete set null;
alter table recipes    add column if not exists grinder_id  uuid references equipment(id) on delete set null;
alter table recipes    add column if not exists filter_id   text;
alter table recipes    add column if not exists origin_id   uuid references recipes(id) on delete set null;
alter table profiles   add column if not exists slug        text unique;

-- ─── Data migration (v1 → v2) ─────────────────────────────────────────────────

-- Backfill created_by from legacy user_id
update roasteries set created_by = user_id where created_by is null and user_id is not null;
update beans      set created_by = user_id where created_by is null and user_id is not null;

-- Migrate owned roasteries → user_roasteries
insert into user_roasteries (user_id, roastery_id, notes, is_favorite, created_at)
select user_id, id, notes, coalesce(is_favorite, false), created_at
from   roasteries
where  user_id is not null
on conflict (user_id, roastery_id) do nothing;

-- Migrate owned beans → user_beans
insert into user_beans (user_id, bean_id, notes, is_favorite, created_at)
select user_id, id, notes, coalesce(is_favorite, false), created_at
from   beans
where  user_id is not null
on conflict (user_id, bean_id) do nothing;

-- Migrate followed_roasteries → user_roasteries (if table exists)
insert into user_roasteries (user_id, roastery_id, notes, is_favorite, created_at)
select user_id, roastery_id, null, is_favorite, created_at
from   followed_roasteries
on conflict (user_id, roastery_id) do nothing;

-- Migrate followed_beans → user_beans (if table exists)
insert into user_beans (user_id, bean_id, notes, is_favorite, created_at)
select user_id, bean_id, null, is_favorite, created_at
from   followed_beans
on conflict (user_id, bean_id) do nothing;

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table profiles         enable row level security;
alter table roasteries       enable row level security;
alter table beans            enable row level security;
alter table recipes          enable row level security;
alter table equipment        enable row level security;
alter table user_roasteries  enable row level security;
alter table user_beans       enable row level security;
alter table followed_recipes enable row level security;

-- Public read on global objects + collections
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profiles'        and policyname = 'Public can read profiles') then
    create policy "Public can read profiles"        on profiles        for select using (true); end if;
  if not exists (select 1 from pg_policies where tablename = 'roasteries'      and policyname = 'Public can read roasteries') then
    create policy "Public can read roasteries"      on roasteries      for select using (true); end if;
  if not exists (select 1 from pg_policies where tablename = 'beans'           and policyname = 'Public can read beans') then
    create policy "Public can read beans"           on beans           for select using (true); end if;
  if not exists (select 1 from pg_policies where tablename = 'recipes'         and policyname = 'Public can read recipes') then
    create policy "Public can read recipes"         on recipes         for select using (true); end if;
  if not exists (select 1 from pg_policies where tablename = 'equipment'       and policyname = 'Public can read equipment') then
    create policy "Public can read equipment"       on equipment       for select using (true); end if;
  if not exists (select 1 from pg_policies where tablename = 'user_roasteries' and policyname = 'Public can read user_roasteries') then
    create policy "Public can read user_roasteries" on user_roasteries for select using (true); end if;
  if not exists (select 1 from pg_policies where tablename = 'user_beans'      and policyname = 'Public can read user_beans') then
    create policy "Public can read user_beans"      on user_beans      for select using (true); end if;
end $$;

-- Global objects: any authenticated user can add; only creator can edit/delete
drop policy if exists "Auth insert roasteries" on roasteries;
drop policy if exists "Auth update roasteries" on roasteries;
drop policy if exists "Auth delete roasteries" on roasteries;
create policy "Auth insert roasteries" on roasteries for insert with check (auth.role() = 'authenticated');
create policy "Auth update roasteries" on roasteries for update using (auth.uid() = created_by);
create policy "Auth delete roasteries" on roasteries for delete using (auth.uid() = created_by);

drop policy if exists "Auth insert beans" on beans;
drop policy if exists "Auth update beans" on beans;
drop policy if exists "Auth delete beans" on beans;
create policy "Auth insert beans"      on beans for insert with check (auth.role() = 'authenticated');
create policy "Auth update beans"      on beans for update using (auth.uid() = created_by);
create policy "Auth delete beans"      on beans for delete using (auth.uid() = created_by);

-- User collections: full control for owner
drop policy if exists "Users manage own roastery collection" on user_roasteries;
create policy "Users manage own roastery collection" on user_roasteries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own bean collection" on user_beans;
create policy "Users manage own bean collection" on user_beans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Recipes (user-owned)
drop policy if exists "Auth insert recipes" on recipes;
drop policy if exists "Auth update recipes" on recipes;
drop policy if exists "Auth delete recipes" on recipes;
create policy "Auth insert recipes" on recipes for insert with check (auth.uid() = user_id);
create policy "Auth update recipes" on recipes for update using (auth.uid() = user_id);
create policy "Auth delete recipes" on recipes for delete using (auth.uid() = user_id);

-- Equipment (user-owned)
drop policy if exists "Auth insert equipment" on equipment;
drop policy if exists "Auth update equipment" on equipment;
drop policy if exists "Auth delete equipment" on equipment;
create policy "Auth insert equipment" on equipment for insert with check (auth.uid() = user_id);
create policy "Auth update equipment" on equipment for update using (auth.uid() = user_id);
create policy "Auth delete equipment" on equipment for delete using (auth.uid() = user_id);

-- Followed recipes
drop policy if exists "Users manage followed recipes" on followed_recipes;
create policy "Users manage followed recipes" on followed_recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Auth upsert own profile" on profiles;
create policy "Auth upsert own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
