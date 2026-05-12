---
title: Supabase project audit — RLS consolidation, schema cleanup, storage hardening
status: todo
priority: urgent
type: chore
tags:
  - supabase
  - security
  - cleanup
  - cost
created_by: agent
created_at: 2026-05-02
position: 6
---

## Notes

The database has 24 tables with widespread duplication, conflicting policies, and dead columns. This task consolidates and hardens it. **Every destructive step (DROP COLUMN, DROP POLICY, DELETE rows) is gated behind explicit user confirmation per the destructive-SQL protocol.** Run a backup-style export of `products`, `orders`, `order_items`, `profiles`, `categories`, `user_roles`, `site_settings` before any destructive change.

Concrete issues found in the schema audit (do not skip any):

### Duplicate / overlapping RLS policies (consolidate to one per command)
- `user_roles`: `Users can read own role` and `roles_select_own` are identical SELECT policies → keep one
- `profiles`: NINE policies with conflicting predicates on both `id` AND `user_id` (`Users can insert own profile` vs `Users can insert their own profile`, two update policies, two select policies, one admin ALL) → keep one of each plus the admin ALL
- `products`: separate `Admin can insert/update/delete products` plus a broader `products_admin` ALL → keep `products_admin` plus `products_public_read_active`, drop the three single-command admin policies
- `categories`: same pattern as products → keep `categories_admin` plus `categories_public_read_active`
- `orders`: `Admin can read all orders` + `Admin can update orders` + admin policies elsewhere; consolidate to `orders_admin_all` + `orders_user_select_own` + `orders_user_insert_own`
- `support_messages`: 8 policies, three duplicates (`support_admin_all` vs three `Admin can ...`, `support_insert` vs `Anyone can insert support messages`, `support_user_read` vs `Users can read own support messages`) → keep one per command
- `support_replies`: keep current set, no change
- `banners`: `banners_public_read` + `banners_read` are the same → keep one
- `exchange_rates`: `Anyone can read` + `rates_read` duplicate; `Admin can insert/update` + `rates_write` overlap → keep `rates_read` + `rates_write`
- `addresses`: `addresses_own` and `addresses_user_all` are identical ALL policies → keep one, plus `addresses_admin_read`
- `notifications`: `notifications_own` and `notifications_user_all` duplicate → keep one
- `reviews`: `Users can insert own reviews` and `reviews_user_create` duplicate → keep one
- `order_status_history`: keep `Users can read own order status history` + `order_history_admin_all`, drop the two single-command admin policies that duplicate the ALL policy

### Schema redundancies (drop after data migration)
- `products.category` (text) — dead, all reads must use `category_id` join. Migrate any non-null values into `categories` and `category_id`, then DROP COLUMN
- `products.reviews` (int) — duplicate of `reviews_count`. Backfill `reviews_count = greatest(reviews_count, reviews)`, then DROP COLUMN
- `orders.razorpay_order_id` / `razorpay_payment_id` / `razorpay_signature` — duplicates of `payment_order_id` / `payment_id` / `payment_signature`. Backfill non-null values into the canonical columns, then DROP COLUMN
- `orders.shipping_address` (text) — superseded by structured `shipping_address_line_1..country`. Drop after backfill check
- `profiles.id` vs `profiles.user_id` — `user_id` is the FK to `users.id`. The `id` column is the row PK and SHOULD stay, but RLS policies referencing `auth.uid() = id` are incorrect and must be dropped
- `exchange_rates.target_currency` + `exchange_rates.rate` vs `rates` jsonb — pick one source of truth (jsonb `rates` is more flexible), backfill, drop the scalar columns

### Indexes and performance
- Add missing indexes: `orders(user_id, created_at DESC)`, `order_items(product_id)` already exists, `wishlists(product_id)` already exists, `reviews(product_id, is_approved)`, `cart_items(user_id, updated_at DESC)`
- Drop unused index on `orders.razorpay_order_id` after column drop
- Verify no full-table scans on the homepage rails (`is_featured`, `is_bestseller`, `is_new_arrival`) — index exists on `is_featured`; add partial indexes on `is_bestseller WHERE is_bestseller`, `is_new_arrival WHERE is_new_arrival`

### Security and access
- Confirm `is_admin(auth.uid())` function exists (referenced by 20+ policies). If not, create it as `SECURITY DEFINER STABLE` returning true when the caller's `user_roles.role IN ('admin','super_admin')`
- Lock the admin role: insert `user_roles(user_id, role)` row for the auth user whose email is `thebestofgaming2008@gmail.com` with role `super_admin`. Verify there are no other admin/super_admin rows; if there are, audit them with the user before keeping
- `user_roles` must NOT allow users to insert/update their own role. Confirm `roles_admin_all` is admin-only (it is — `is_admin(auth.uid())`), and that no INSERT/UPDATE policy exists for non-admins. Only `Users can read own role` SELECT remains for non-admins
- `support_messages` allows `Anyone can insert` — keep, but add a per-IP rate-limit check via `activity_log` count in the last hour (defensive, optional)
- `coupon_usage_insert` is `WITH CHECK true` — tighten to `auth.uid() = user_id OR user_id IS NULL`

### Storage bucket
- Confirm bucket name from user (currently assumed `product-images`). List buckets and ask before creating a new one
- Bucket policies: public SELECT, INSERT/UPDATE/DELETE only when `is_admin(auth.uid())`
- Set max file size 5 MB and allowed MIME types `image/jpeg, image/png, image/webp, image/avif`
- Folder structure: `products/<product_id>/<uuid>.<ext>` for product images; `banners/<id>/<uuid>.<ext>` for banners
- Audit existing files for orphans (no matching `products.cover_image_url` or `images[]` reference) — list before deleting

### Cost and usage
- Set `activity_log` retention: schedule a daily cron deleting rows older than 90 days (use a Supabase cron via pg_cron)
- Add `notifications` retention: delete rows older than 60 days where `is_read = true`
- Truncate `exchange_rates` to most recent 30 entries per `base_currency`
- Confirm Realtime is disabled on tables that don't need it (Realtime on every table inflates egress); enable only on `orders`, `support_messages`, `notifications` if needed

### Common-mistake checklist (verify each)
- [ ] No policy uses `USING (true)` for SELECT on PII tables (profiles, addresses, orders, order_items, support_messages)
- [ ] No table writes from anon (`auth.uid() IS NULL`) except `orders` insert (guest checkout) and `support_messages` insert
- [ ] All foreign keys ON DELETE behavior is sensible (CASCADE for owned rows, SET NULL for soft references)
- [ ] No `SECURITY DEFINER` view bypasses RLS
- [ ] Email-uniqueness on `profiles` (currently no unique on `email`) — add unique index if business requires it

## Checklist

- [ ] Pre-flight: export current `products`, `orders`, `order_items`, `profiles`, `categories`, `user_roles`, `site_settings` to a downloadable backup
- [ ] Confirm `is_admin(auth.uid())` function exists with correct definition; create if missing
- [ ] Insert / verify `super_admin` `user_roles` row for `thebestofgaming2008@gmail.com`; audit any other admin rows with the user
- [ ] Consolidate RLS: drop duplicate policies on `user_roles`, `profiles`, `products`, `categories`, `orders`, `order_items`, `support_messages`, `banners`, `exchange_rates`, `addresses`, `notifications`, `reviews`, `order_status_history`
- [ ] Backfill and drop dead columns: `products.category`, `products.reviews`, `orders.razorpay_*`, `orders.shipping_address`, `exchange_rates.target_currency` + `rate`
- [ ] Add missing indexes; drop indexes on dropped columns
- [ ] Tighten `coupon_usage` insert policy
- [ ] Confirm storage bucket name with user, then apply hardened bucket policies (public read, admin-only write, MIME and size limits)
- [ ] Audit existing storage files for orphans, list with the user before any deletion
- [ ] Set up retention crons for `activity_log` (90d), `notifications` (60d read), `exchange_rates` (30 latest)
- [ ] Audit Realtime publications: disable on tables that don't need it
- [ ] Run a final verification query that returns: count of policies per table, list of remaining columns per cleaned table, list of indexes per cleaned table — share with the user as the cleanup receipt

## Acceptance

After cleanup: every table has exactly one SELECT, INSERT, UPDATE, DELETE policy (or one ALL admin policy plus a public read where applicable). No PII table is publicly readable. The `products` table has a single category column (`category_id`), a single reviews count column. The `orders` table has a single set of payment columns. The admin email has a `super_admin` row in `user_roles` and no other unverified admin rows exist. The storage bucket allows public reads but only admin writes. A receipt query of policies, columns and indexes is shared with the user.