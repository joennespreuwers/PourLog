-- Pourlog — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Safe to re-run: uses IF NOT EXISTS / CREATE POLICY IF NOT EXISTS

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  slug          text unique,
  created_at    timestamptz default now()
);

create table if not exists roasteries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  name         text not null,
  country      text,
  city         text,
  website      text,
  description  text,
  notes        text,
  is_favorite  boolean default false,
  photo_url    text,
  created_at   timestamptz default now()
);

create table if not exists beans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade,
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
  notes            text,
  is_favorite      boolean default false,
  created_at       timestamptz default now()
);

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
  steps          text,
  notes          text,
  is_favorite    boolean default false,
  created_at     timestamptz default now()
);

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

-- Add new columns to existing tables if upgrading
alter table roasteries add column if not exists is_favorite boolean default false;
alter table roasteries add column if not exists photo_url text;
alter table roasteries add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table beans      add column if not exists is_favorite boolean default false;
alter table beans      add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table recipes    add column if not exists is_favorite boolean default false;
alter table recipes    add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table equipment  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table profiles   add column if not exists slug text unique;

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table profiles    enable row level security;
alter table roasteries enable row level security;
alter table beans       enable row level security;
alter table recipes     enable row level security;
alter table equipment   enable row level security;

-- Public read
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Public can read profiles') then
    create policy "Public can read profiles" on profiles for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'roasteries' and policyname = 'Public can read roasteries') then
    create policy "Public can read roasteries" on roasteries for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'beans' and policyname = 'Public can read beans') then
    create policy "Public can read beans" on beans for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'recipes' and policyname = 'Public can read recipes') then
    create policy "Public can read recipes" on recipes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'equipment' and policyname = 'Public can read equipment') then
    create policy "Public can read equipment" on equipment for select using (true);
  end if;
end $$;

-- Owner-only write (drop old policies first so updated checks are always applied)
drop policy if exists "Auth insert roasteries" on roasteries;
drop policy if exists "Auth update roasteries" on roasteries;
drop policy if exists "Auth delete roasteries" on roasteries;
create policy "Auth insert roasteries" on roasteries for insert with check (auth.uid() = user_id);
create policy "Auth update roasteries" on roasteries for update using (auth.uid() = user_id);
create policy "Auth delete roasteries" on roasteries for delete using (auth.uid() = user_id);

drop policy if exists "Auth insert beans" on beans;
drop policy if exists "Auth update beans" on beans;
drop policy if exists "Auth delete beans" on beans;
create policy "Auth insert beans" on beans for insert with check (auth.uid() = user_id);
create policy "Auth update beans" on beans for update using (auth.uid() = user_id);
create policy "Auth delete beans" on beans for delete using (auth.uid() = user_id);

drop policy if exists "Auth insert recipes" on recipes;
drop policy if exists "Auth update recipes" on recipes;
drop policy if exists "Auth delete recipes" on recipes;
create policy "Auth insert recipes" on recipes for insert with check (auth.uid() = user_id);
create policy "Auth update recipes" on recipes for update using (auth.uid() = user_id);
create policy "Auth delete recipes" on recipes for delete using (auth.uid() = user_id);

drop policy if exists "Auth insert equipment" on equipment;
drop policy if exists "Auth update equipment" on equipment;
drop policy if exists "Auth delete equipment" on equipment;
create policy "Auth insert equipment" on equipment for insert with check (auth.uid() = user_id);
create policy "Auth update equipment" on equipment for update using (auth.uid() = user_id);
create policy "Auth delete equipment" on equipment for delete using (auth.uid() = user_id);

drop policy if exists "Auth upsert own profile" on profiles;
create policy "Auth upsert own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- ─── Follow tables (persisted followed items from other users) ─────────────────

create table if not exists followed_roasteries (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  roastery_id uuid        not null references roasteries(id) on delete cascade,
  is_favorite boolean     not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, roastery_id)
);

create table if not exists followed_beans (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  bean_id     uuid        not null references beans(id) on delete cascade,
  is_favorite boolean     not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, bean_id)
);

alter table followed_roasteries enable row level security;
drop policy if exists "Users manage followed roasteries" on followed_roasteries;
create policy "Users manage followed roasteries" on followed_roasteries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table followed_beans enable row level security;
drop policy if exists "Users manage followed beans" on followed_beans;
create policy "Users manage followed beans" on followed_beans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- origin_id: tracks which item a clone was made from
alter table roasteries add column if not exists origin_id uuid references roasteries(id) on delete set null;
alter table beans      add column if not exists origin_id uuid references beans(id)      on delete set null;

create table if not exists followed_recipes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  recipe_id   uuid        not null references recipes(id) on delete cascade,
  is_favorite boolean     not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, recipe_id)
);

alter table followed_recipes enable row level security;
drop policy if exists "Users manage followed recipes" on followed_recipes;
create policy "Users manage followed recipes" on followed_recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table recipes add column if not exists origin_id uuid references recipes(id) on delete set null;

-- ─── Purge rating columns (run to remove from existing tables) ───────────────
alter table roasteries drop column if exists rating;
alter table beans      drop column if exists rating;
alter table recipes    drop column if exists rating;
