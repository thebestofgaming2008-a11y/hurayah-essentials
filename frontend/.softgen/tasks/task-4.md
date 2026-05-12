---
title: Customer account workspace polish and live data
status: todo
priority: high
type: feature
tags:
  - account
  - supabase
  - ux
created_by: agent
created_at: 2026-05-02
position: 4
---

## Notes

Replace placeholder data in `src/pages/Account.tsx:1-129` with live reads from `profiles`, `addresses`, `orders`, `order_items`, `wishlists`. The page already uses tabs (Overview, Orders, Wishlist, Addresses) — keep the structure, polish the UX, wire data.

Schema-relevant constraints (from audit):
- `profiles.user_id` is the canonical link to `auth.users.id`. The duplicate `profiles.id = auth.uid()` policy is removed in task 6 — this task should query and update by `user_id` exclusively.
- `addresses` allows label `home`, `office`, `other` (CHECK constraint). Enforce in form select.
- `orders.status` enum drives the status pill color: pending/confirmed/processing → amber, shipped → blue, delivered → emerald, cancelled/refunded → muted.
- `wishlists` join to `products` for cover image and price.

UX polish points:
- Sticky sidebar tabs on desktop, segmented control on mobile (currently the sidebar collapses into a stacked column that pushes content down)
- Order rows expand to show line items with thumbnails when clicked
- Order status pill uses the right semantic color per status, not blanket `bg-brand/10`
- Address cards have a "Default" badge and inline edit/delete; default address cannot be deleted while it is the only one
- Profile edit becomes an inline form (full name, phone, marketing consent) writing to `profiles` with optimistic update and toast confirmation
- Empty states for each tab: no orders yet → CTA to /shop; no addresses → CTA to add address; no wishlist → CTA to /shop
- Sign-out moves to a confirmation menu inside the account header instead of a bare link

## Checklist

- [ ] Profile read/update form bound to `profiles` (full_name, phone, preferred_currency, marketing_consent) with toast on save
- [ ] Address book CRUD bound to `addresses` with label select (home/office/other) and default-address toggle
- [ ] Orders tab lists `orders` for the current user, paginated, with status pill mapped per enum and total formatted from `total` + `currency`
- [ ] Order row expands to show `order_items` (image, name, qty, line total) and shipping address summary
- [ ] Tracking link surfaces when `tracking_url` is present, otherwise shows `tracking_number` with carrier and estimated delivery window
- [ ] Wishlist tab lists `wishlists` joined to `products` with remove and add-to-cart actions
- [ ] Mobile layout uses a horizontal scrolling segmented control instead of stacked sidebar; desktop sidebar sticks to top of scroll area
- [ ] Sign-out lives in an account header dropdown with confirmation; redirects to `/`
- [ ] Empty states for each tab with relevant CTA
- [ ] Loading skeletons match the card/table shape rather than generic shimmer rectangles

## Acceptance

A signed-in customer sees their actual profile, real orders with correct status colors, their addresses with default control, and their wishlist with one-click remove and add-to-cart. All edits persist after a page refresh.