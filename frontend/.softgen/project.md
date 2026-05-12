## Vision

Hurayrah Essentials — a calm, devotional Islamic books and modest-essentials shop for Indian and international readers. Customers browse a real Supabase-backed catalog, manage their orders, addresses and wishlist, and admins (locked to `thebestofgaming2008@gmail.com`) run the store from a polished workspace.

## Design

The existing token system in `src/index.css` and `tailwind.config.ts` is the source of truth. Keep:

- `--background` cream parchment, `--foreground` deep slate, `--brand` deep emerald-red accent (existing), `--hero` warm soft surface, `--muted`, `--accent`, `--border` already defined
- Headings: existing serif/italic display already wired via Tailwind config
- Body: existing sans body
- Style direction: parchment + bookshop, restraint over chrome, serifs only on display, emerald-tone CTA, single accent — do not add new palette colors. Keep dense, calm admin tables.

If a token is missing for a new surface, reuse `bg-hero/60`, `border-border`, `text-foreground/70` instead of introducing new ones.

## Features

- Live catalog from `products` table (Shop, category pages, product detail, cart, wishlist)
- Customer account: profile, addresses, orders, wishlist — all gated by Supabase auth
- Admin workspace at `/admin` for `thebestofgaming2008@gmail.com` only: product CRUD with cover image upload to Supabase Storage, orders, customers, settings
- Cart and checkout writing to `orders`/`order_items` with order tracking via `/track`
- Refined Supabase project: consolidated RLS, single source-of-truth columns, hardened storage bucket, admin-only secrets, no public PII leaks

Notes: Supabase is connected. RLS is enabled on every table but currently has duplicate / overlapping policies that must be consolidated before new write paths are added (see task 6).