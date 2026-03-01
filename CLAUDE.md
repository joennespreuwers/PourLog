# Pourlog — Claude Context

## Project Overview
**Pourlog** is a specialty coffee tracker web app — a personal/shared coffee journal for logging roasteries, beans, and brew recipes. Public browsing, authenticated editing.

---

## Stack
| Layer | Tool |
|---|---|
| UI | React (Vite, JSX) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (email/password) |
| Hosting | Cloudflare Pages |

**Supabase Project URL:** `https://bmlwxambicgoupnozvsu.supabase.co`

---

## Access Model
- **Public** → can read/browse all roasteries, beans, recipes (no login)
- **Authenticated** → can add, edit, delete entries (login required)

---

## Data Model

### `roasteries`
| Field | Type |
|---|---|
| id | uuid (PK) |
| name | text |
| country | text |
| city | text |
| website | text |
| description | text |
| rating | int (1–5) |
| notes | text |
| created_at | timestamptz |

### `beans`
| Field | Type |
|---|---|
| id | uuid (PK) |
| name | text |
| roastery_id | uuid → roasteries |
| origin_country | text |
| origin_region | text |
| farm | text |
| variety | text (e.g. Gesha, Bourbon) |
| process | text (washed, natural, honey, anaerobic…) |
| roast_level | text (light / medium / dark) |
| altitude_masl | int |
| harvest_date | date |
| roast_date | date |
| flavor_notes | text[] |
| price_per_100g | numeric |
| rating | int (1–5) |
| notes | text |
| created_at | timestamptz |

### `recipes`
| Field | Type |
|---|---|
| id | uuid (PK) |
| title | text |
| bean_id | uuid → beans |
| brew_method | text (V60, Aeropress, Espresso, Chemex, French Press, Moka Pot…) |
| filter_type | text (paper, metal, cloth, none) |
| dose_g | numeric |
| yield_g | numeric |
| ratio | computed (yield / dose) |
| water_temp_c | numeric |
| grind_size | text |
| brew_time_sec | int |
| steps | text |
| rating | int (1–5) |
| notes | text |
| created_at | timestamptz |

---

## Features
- **CRUD** — add, edit, delete for all three sections
- **Linking** — beans link to roasteries; recipes link to beans
- **Search & filter** — by name, origin, brew method, rating, etc.
- **Ratings** — 1–5 star personal scores
- **Filter type** — paper, metal, cloth, none (per recipe)

---

## Design Direction
Clean, minimal, editorial. Warm off-white/paper tones, generous whitespace, precise typography. Feels like a **specialty coffee journal**, not a database UI.

---

## Workflow
1. Build & polish frontend locally (mock data)
2. Connect to Supabase (real data + auth)
3. Deploy to Cloudflare Pages (connect GitHub repo)

---

## Supabase RLS Policies (already set up)
- `SELECT` → public
- `INSERT / UPDATE / DELETE` → `auth.role() = 'authenticated'`

---

## Notes
- Supabase uses new-style publishable keys (`sb_publishable_...`) — safe for frontend
- Never commit the secret key (`sb_secret_...`)
- Tailwind v4 is used via `@tailwindcss/vite` plugin (no `tailwind.config.js` needed)
