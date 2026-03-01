-- Pourlog — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Safe to re-run: uses IF NOT EXISTS / CREATE POLICY IF NOT EXISTS

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table if not exists roasteries (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  country      text,
  city         text,
  website      text,
  description  text,
  rating       int check (rating >= 1 and rating <= 5),
  notes        text,
  created_at   timestamptz default now()
);

create table if not exists beans (
  id               uuid primary key default gen_random_uuid(),
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
  rating           int check (rating >= 1 and rating <= 5),
  notes            text,
  created_at       timestamptz default now()
);

create table if not exists recipes (
  id             uuid primary key default gen_random_uuid(),
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
  rating         int check (rating >= 1 and rating <= 5),
  notes          text,
  created_at     timestamptz default now()
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table roasteries enable row level security;
alter table beans       enable row level security;
alter table recipes     enable row level security;

-- Public read
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'roasteries' and policyname = 'Public can read roasteries') then
    create policy "Public can read roasteries" on roasteries for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'beans' and policyname = 'Public can read beans') then
    create policy "Public can read beans" on beans for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'recipes' and policyname = 'Public can read recipes') then
    create policy "Public can read recipes" on recipes for select using (true);
  end if;
end $$;

-- Authenticated write
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'roasteries' and policyname = 'Auth insert roasteries') then
    create policy "Auth insert roasteries" on roasteries for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'roasteries' and policyname = 'Auth update roasteries') then
    create policy "Auth update roasteries" on roasteries for update using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'roasteries' and policyname = 'Auth delete roasteries') then
    create policy "Auth delete roasteries" on roasteries for delete using (auth.role() = 'authenticated');
  end if;

  if not exists (select 1 from pg_policies where tablename = 'beans' and policyname = 'Auth insert beans') then
    create policy "Auth insert beans" on beans for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'beans' and policyname = 'Auth update beans') then
    create policy "Auth update beans" on beans for update using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'beans' and policyname = 'Auth delete beans') then
    create policy "Auth delete beans" on beans for delete using (auth.role() = 'authenticated');
  end if;

  if not exists (select 1 from pg_policies where tablename = 'recipes' and policyname = 'Auth insert recipes') then
    create policy "Auth insert recipes" on recipes for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'recipes' and policyname = 'Auth update recipes') then
    create policy "Auth update recipes" on recipes for update using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'recipes' and policyname = 'Auth delete recipes') then
    create policy "Auth delete recipes" on recipes for delete using (auth.role() = 'authenticated');
  end if;
end $$;
