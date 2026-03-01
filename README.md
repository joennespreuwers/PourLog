# Pourlog

A specialty coffee journal. Log roasteries, beans, and brew recipes — local-first, cloud-backed, shareable.

## Features

- **Roasteries** — track roasters you love, with ratings and notes
- **Beans** — log origin, process, roast level, SCA flavour notes, price
- **Recipes** — record brew parameters (dose, yield, temp, grind, time, steps)
- **Equipment** — manage your gear, synced to your account
- **Sharing** — share roasteries, beans, and recipes via URL; clone anything into your own library
- **Local-first** — works offline; syncs to Supabase when online
- **Auth** — sign up / sign in; your data is yours only

## Stack

| Layer | Tool |
|---|---|
| UI | React 19 + Vite 7 |
| Styling | Tailwind CSS v4 |
| Database & Auth | Supabase |
| Offline | vite-plugin-pwa (Workbox) |
| Hosting | Cloudflare Pages |

## Development

```bash
npm install
cp .env.example .env.local   # add your Supabase keys
npm run dev
```

Environment variables:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Run `schema.sql` in the Supabase SQL editor to set up tables and RLS policies.

## License

MIT — [Joenne Spreuwers](https://joennespreuwers.be)
