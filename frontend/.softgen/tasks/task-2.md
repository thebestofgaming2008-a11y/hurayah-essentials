---
title: Live catalog wiring
status: todo
priority: urgent
type: feature
tags:
  - shop
  - supabase
  - catalog
created_by: agent
created_at: 2026-05-02
position: 2
---

## Notes

Replace static `src/data/products.ts` consumption with live reads from the `products` table. Existing pages: `Shop.tsx`, `ProductDetail.tsx`, `Category.tsx`, `Cart.tsx`, `Wishlist.tsx`, `Index.tsx` (homepage rails).

Schema notes (from audit):
- `products` is the source of truth. Use `is_active = true` filter (RLS already enforces it for non-admins, but query explicitly for clarity).
- Use `category_id` joined to `categories.slug`, NOT the legacy text `category` column — the legacy column is dropped in task 6.
- Use `cover_image_url` for primary; `images[]` for the gallery.
- Use `sale_price_inr` when present and `is_on_sale=true`, else `price_inr`.
- Subjects/tags come from `tags[]` and `categories.name`.
- Wishlist persists in `wishlists` table for signed-in users; fall back to localStorage for guests with sync-on-login.
- Cart persists in `cart_items` for signed-in users (`user_id`) or `session_id` for guests; reuse the existing local cart store as the in-memory layer and sync.

## Checklist

- [ ] Product list service: paginated fetch with filters for category slug, subject tag, search query, max price, min rating, sort (featured/price-asc/price-desc/rating)
- [ ] Single product fetch by slug with related products (same category, exclude current, limit 4)
- [ ] Category service returning active categories with cover image and product counts for nav and category landing pages
- [ ] Shop page reads live products with skeleton grid during load and empty state when filters return zero
- [ ] Product detail page renders cover image, gallery, author/publisher/binding/pages metadata, sale price logic, stock status, reviews count
- [ ] Homepage rails (bestsellers, new arrivals, featured) read from `products` flags `is_bestseller`, `is_new_arrival`, `is_featured`
- [ ] Wishlist syncs to `wishlists` table when authenticated, merges localStorage entries on sign-in
- [ ] Cart syncs to `cart_items` table when authenticated, merges guest session cart on sign-in
- [ ] Subjects dropdown in header sourced from `categories` (children of "books") instead of hardcoded `SUBJECTS`
- [ ] Remove `src/data/products.ts` once all consumers are migrated

## Acceptance

Browsing /shop, category pages and product detail pages shows the real catalog from Supabase. Wishlist and cart survive sign-in/sign-out without losing items.