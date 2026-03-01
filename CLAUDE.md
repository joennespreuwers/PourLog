# Pourlog — Project Context

## Overview
Specialty coffee journal — log roasteries, beans, and brew recipes. Public browsing, authenticated editing. Local-first (localStorage cache) backed by Supabase.

**GitHub:** https://github.com/joennespreuwers/PourLog  
**Supabase project URL:** `https://bmlwxambicgoupnozvsu.supabase.co`  
**Local path:** `/Users/joenne/Documents/dev/pourlog`  
**Deploy target:** Cloudflare Pages (not yet deployed)

---

## Stack
| Layer | Tool |
|---|---|
| UI | React 19 + Vite 7 (JSX) |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` (no config file needed) |
| Icons | Lucide React |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (email/password) |
| Offline | vite-plugin-pwa (Workbox service worker, precache + NetworkFirst for Supabase) |
| Hosting | Cloudflare Pages (pending) |

---

## Access Model
- **Public** → can read all data (no login required)
- **Authenticated** → can add, edit, delete (login required)
- **Equipment** — localStorage-only, never synced to Supabase (personal gear config)

---

## Workspace Structure
```
src/
  App.jsx                   ← root, wires auth + data + tab navigation
  index.css                 ← global CSS + design tokens (--color-paper etc.)
  App.css                   ← empty
  main.jsx
  assets/
  lib/
    supabase.js             ← createClient (uses VITE_SUPABASE_ env vars)
  hooks/
    useLocalStorage.js      ← simple localStorage state hook
    useAuth.js              ← signIn / signUp / signOut / updateProfile / updatePassword
    useSupabaseData.js      ← local-first data layer (roasteries, beans, recipes)
  components/
    Layout.jsx              ← header, nav tabs, mobile bottom bar, sync dot, auth button
    Drawer.jsx              ← slide-in edit panel (Escape-aware, capture phase)
    DetailPage.jsx          ← modal card detail view (content cached during exit animation)
    FormFields.jsx          ← Input, Textarea, Select, FieldRow, FieldSection
    TagInput.jsx            ← SCA flavour wheel (13 categories, no custom tags)
    StarRating.jsx          ← display-only star rating
    StarPicker.jsx          ← interactive star picker
    EmptyState.jsx          ← empty list placeholder
    AuthModal.jsx           ← sign in / sign up modal
    AccountDrawer.jsx       ← account panel (display name, email, change password, sign out)
  pages/
    Roasteries.jsx          ← CRUD + detail
    Beans.jsx               ← CRUD + detail + SCA flavour notes
    Recipes.jsx             ← CRUD + detail + copy recipe
    Equipment.jsx           ← CRUD (localStorage only) + Export/Import JSON
```

---

## Design Tokens (defined in `index.css`)
```css
--color-paper      /* warm off-white background */
--color-cream      /* slightly darker cream, used for hover/active states */
--color-border     /* subtle border */
--color-stone      /* secondary text */
--color-roast      /* primary accent (warm brown) */
--color-espresso   /* dark text / primary button bg */
```

Fonts: **Inter** (body) + **Lora** (serif headings) from Google Fonts.

---

## Data Model

### `roasteries`
`id, name, country, city, website, description, rating (1-5), notes, created_at`

### `beans`
`id, name, roastery_id→roasteries, origin_country, origin_region, farm, variety, process, roast_level, altitude_masl, harvest_date, roast_date, flavor_notes (text[]), price_per_100g, rating (1-5), notes, created_at`

### `recipes`
`id, title, bean_id→beans, brew_method, filter_type, dose_g, yield_g, water_temp_c, grind_size, brew_time_sec, steps, rating (1-5), notes, created_at`

### Equipment (localStorage only, not in Supabase)
`id, name, category (brewer|grinder|filter_paper|accessory), brand, color, notes, created_at`

---

## `useSupabaseData` — local-first sync logic
1. **On mount:** reads localStorage immediately (instant UI), then fetches Supabase
2. **Supabase has data:** overwrites localStorage cache
3. **Supabase empty + user signed in + localStorage has data:** auto-migrates all local data to Supabase (one-time migration)
4. **Writes:** hit localStorage first (optimistic), then fire-and-forget to Supabase if authenticated
5. **`syncStatus`:** `'local' | 'syncing' | 'synced' | 'error'` — shown as a dot in the header

---

## `useAuth` exports
```js
{ user, loading, signIn, signUp, signOut, updateProfile, updatePassword }
```
- `updateProfile(displayName)` → `supabase.auth.updateUser({ data: { display_name } })`
- `updatePassword(newPassword)` → `supabase.auth.updateUser({ password })`
- Display name stored in `user.user_metadata.display_name`

---

## Key UI Patterns

### Escape key layering
- `Drawer.jsx` — `window.addEventListener('keydown', handler, true)` (capture phase)
- Checks `document.querySelector('[data-traps-escape]')` before closing — yields to child panels
- `TagInput.jsx` — sets `data-traps-escape` on its container when a dropdown is open; its own `window` capture handler closes the dropdown first

### DetailPage exit animation
- `cacheRef` stores `{title, children, footer}` when `open=true`
- During the 200ms exit animation, uses cached content so the panel doesn't flash empty

### Equipment card color
- Top stripe: `<div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: item.color.bg }} />`
- Color swatches are pastel `bg` with darker `text` for selected border

### Copy recipe
- `openCopy(r)` in Recipes.jsx pre-fills form with recipe data + `" (copy)"` title suffix
- Button in both RecipeCard and detail footer

---

## localStorage Keys
| Key | Contents |
|---|---|
| `pourlog_tab` | active tab name |
| `pourlog_roasteries` | roastery array |
| `pourlog_beans` | bean array |
| `pourlog_recipes` | recipe array |
| `pourlog_equipment` | equipment array |

---

## Environment Variables (`.env.local` — gitignored)
```
VITE_SUPABASE_URL=https://bmlwxambicgoupnozvsu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SwBG2Q-XTnrsVZdsv9o_2A_2sBKvP7P
```
Add these same vars in Cloudflare Pages dashboard when deploying.

---

## Supabase RLS Policies
- `SELECT` → public (anyone can read)
- `INSERT / UPDATE / DELETE` → `auth.role() = 'authenticated'`
- Schema + policies are in `schema.sql` (safe to re-run)

---

## PWA / Offline
- `vite-plugin-pwa` with Workbox
- App shell (JS/CSS/HTML) → **precached** (works fully offline)
- Supabase API calls → **NetworkFirst** (fresh when online, cached fallback offline, 5s timeout)
- Google Fonts → **CacheFirst** (cached forever after first load)
- Service worker only activates in production build (`npm run build`)

---

## Completed Features
- ✅ CRUD for Roasteries, Beans, Recipes, Equipment
- ✅ Detail views with exit animation
- ✅ SCA flavour wheel (13 categories) in TagInput
- ✅ Star ratings
- ✅ Copy recipe
- ✅ Export / Import JSON (Equipment page)
- ✅ Lucide React icons throughout
- ✅ Supabase local-first sync
- ✅ Auth (sign up / sign in / sign out)
- ✅ Account drawer (display name, email, change password)
- ✅ Sync status dot in header
- ✅ PWA / offline caching
- ✅ Equipment card colour stripes
- ✅ Mobile layout (bottom tab bar, Equipment back button)
- ✅ Escape key layering (Drawer → TagInput dropdowns)

## Pending / Next
- [ ] **Sharing features** — share a recipe/bean publicly via URL
- [ ] Roastery autosuggestion when typing in Bean form
- [ ] Brew flow page (step-by-step live brew session)
- [ ] Green/Vegetal SCA flavour category (grassy, herbaceous, hay-like, olive oil)
- [ ] Cloudflare Pages deployment (repo is ready, just needs to be connected)


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
