---
title: Admin workspace — product CRUD with storage uploads, orders, customers
status: todo
priority: high
type: feature
tags:
  - admin
  - supabase
  - storage
created_by: agent
created_at: 2026-05-02
position: 5
---

## Notes

Replace placeholder Admin (`src/pages/Admin.tsx:1-173`) with a real workspace gated by the admin gate from task 1. Admin email locked to `thebestofgaming2008@gmail.com`.

Storage:
- A bucket already exists where existing product images live (user said "a saved folder on supabase storage"). Confirm bucket name in task 6 — assume `product-images` until verified, with `<bucket>/products/<product_id>/<filename>` as the path convention.
- Bucket must be PUBLIC for read, writes restricted to admin via storage policy (delivered in task 6). Frontend uses signed upload URLs or direct upload via authenticated client (admin RLS lets the upload through).
- Image URLs go into `products.cover_image_url` (primary) and `products.images[]` (gallery). Allow paste-by-URL fallback for products whose images are hosted elsewhere.

Sections:
- Dashboard: real revenue (sum `orders.total` where `payment_status = 'paid'` in last 30 days), order count, customer count (distinct `orders.user_id`), conversion ratio
- Orders: filter by status, search by `order_number`, click row to view detail with shipping, items, status timeline, status update select that writes to `orders.status` and inserts `order_status_history` row
- Products: paginated table, search, filter by category and active state; create/edit form with all key fields and image management; toggle `is_active`, `is_featured`, `is_bestseller`, `is_new_arrival`
- Customers: list `profiles` joined to a count of `orders` and lifetime value; click for detail with their orders
- Settings: read/write `site_settings` keyed entries (site name, support email, free shipping threshold, currency)

UX polish:
- Sticky page header per section with primary action on the right
- Tables use `tabular-nums`, zebra-free, dense rows, sortable headers
- Edit drawer slides in from the right rather than navigating away — preserves table scroll state
- Destructive actions (delete product, cancel order) use a confirm dialog with typed confirmation for products that have order history
- Toasts for every mutation with undo where reversible

## Checklist

- [ ] Admin route guard wraps `/admin` and redirects non-admins
- [ ] Dashboard cards: revenue 30d, orders 30d, customers, conversion, all from live aggregations
- [ ] Orders table: filter by status, search by order number, paginated, status pill, click-to-detail drawer
- [ ] Order detail drawer: customer info, shipping address, line items with thumbs, payment info, tracking input, status update with note, status history timeline
- [ ] Products table: search, category filter, active/inactive toggle, sortable columns; "Add product" opens an edit drawer
- [ ] Product edit drawer: all editable fields, cover image uploader (drag-drop or paste URL), gallery image manager (reorder, remove, add), tag editor, category select bound to `categories`
- [ ] Image upload writes to Supabase Storage at `product-images/products/<product_id>/<uuid>.<ext>`, returns a public URL that is saved to `products.cover_image_url` or appended to `products.images[]`
- [ ] Customers list with order count and lifetime value; row click reveals their order history
- [ ] Settings panel for `site_settings` keyed entries with type-aware inputs (string, number, boolean, json)
- [ ] Confirm-to-delete dialogs and toast notifications for every mutation

## Acceptance

Admin can sign in, upload a new product cover image to storage, save the product, and see it appear in `/shop` immediately. Order status changes reflect in the customer's account page and write a status history entry.