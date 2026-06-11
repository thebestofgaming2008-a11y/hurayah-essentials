# Webshop Base Runbook

This project is the reusable Hurayrah-style webshop base. Every copied shop should keep the same safety rules, backend flows, and launch checks unless a new shop has a documented reason to change them.

For the exact copy-and-launch sequence for a new store, use `docs/NEW_SHOP_START.md`.

## Stack

- Frontend: Vite, React, Tailwind, shadcn-style primitives
- Hosting: Cloudflare Pages
- Public catalog cache: Cloudflare Pages Functions with R2 snapshots
- Media: Cloudflare R2
- Backend/database/auth: Convex
- India payments: Razorpay
- International checkout: WhatsApp request flow

## Store Configuration To Change For Each New Shop

Update these before cloning the shop for a different brand:

- domain and canonical URL in `functions/_middleware.ts`, `functions/sitemap.xml.ts`, `public/robots.txt`
- store name, logo, favicon, manifest, SEO text, Open Graph image
- WhatsApp number and WhatsApp community/group links
- contact page email, phone, Instagram, address, hours
- Razorpay live keys in Convex environment
- `ADMIN_EMAIL` or `ADMIN_EMAILS` in Convex environment
- Cloudflare Pages environment variables in `wrangler.toml`
- R2 bucket binding and public media base URL
- categories, subjects, products, stock, prices, images
- policy pages: shipping, returns, privacy, terms, refunds

## Mandatory Customer Features

- Guest checkout works.
- Account checkout works.
- India customers pay with Razorpay.
- International customers send a readable WhatsApp order request.
- Wishlist requires sign-in.
- Account users can save addresses, view orders, track orders, and review purchased products.
- Reviews are text-only and verified by order history.
- Product cards, product page, cart, checkout, wishlist, account, and tracking pages work on mobile.

## Mandatory Admin Features

- Admin access is controlled server-side by Convex `ADMIN_EMAIL` / `ADMIN_EMAILS`.
- Admin can manage products, media, stock, categories, orders, customers, reviews, discounts, shipping reference data, and settings.
- Product media uploads go to R2, not Convex storage.
- Product edits, order status changes, review moderation, discounts, and settings write audit logs.
- Orders show customer address, product image, selected variants, payment status, fulfillment status, and tracking.
- Payment recovery items are visible to admin and must be resolved before fulfillment.

## Backend Rules

- Never trust frontend totals. Convex recalculates product totals from current products.
- Razorpay checkout is India-only.
- Stock is reserved during checkout and released by cron if payment is abandoned.
- Verification must use the reserved checkout intent amount when one exists, so low-stock products do not fail after payment.
- Webhooks must be signed with `RAZORPAY_WEBHOOK_SECRET`.
- Webhook events must be idempotent.
- Failed Razorpay payments release reserved stock.
- Reviews must be tied to paid order history.

## Required Convex Environment Variables

- `ADMIN_EMAIL` or `ADMIN_EMAILS`
- `AUTH_SECRET`
- `CONVEX_SITE_URL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `AUTH_RESEND_KEY`
- `AUTH_EMAIL_FROM`
- `PUBLIC_SITE_URL`

Optional:

- `EXCHANGE_RATE_API_KEY`

## Required Cloudflare Pages Variables

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `R2_PUBLIC_BASE_URL`
- `ADMIN_UPLOAD_TOKEN`

Required bindings:

- `MEDIA_BUCKET`

## Razorpay Webhook

Webhook URL:

```text
https://<convex-site-domain>/razorpay/webhook
```

Recommended events:

- `payment.captured`
- `payment.failed`
- `order.paid`

The code primarily creates orders from `payment.captured`; `payment.failed` releases reserved stock. `order.paid` is safe to subscribe to for observability/idempotency but should not be the only order creation event.

## Launch Checklist

Run:

```bash
npm run check:new-shop
npm run check:launch
npm run build
npm test -- --run
```

`npm run check:new-shop` is for copied shops after brand replacement. It is expected to fail on the original Hurayrah production shop.

Then, from admin:

- run or inspect the Convex `admin.launchReadiness` query
- check product images and stock
- check orders and payment recoveries
- check pending reviews
- check low-stock notifications
- create/edit one test product and revert/archive it
- upload one test image to R2 and delete/revert it
- confirm `/admin` works on mobile

## Customer Smoke Test

- Homepage loads fast on mobile.
- Shop products load without manual refresh.
- Product page images and thumbnails load.
- Add to cart works with variants.
- Wishlist prompts sign-in.
- Account sign-in and password reset work.
- Saved address appears in checkout.
- India checkout reaches Razorpay.
- International checkout opens WhatsApp with clean order text.
- Track order works by order number and email.
- Review submission appears as pending in admin.

## Operational Rules

- Do not delete orders or customers on a live site without a backup and a hard confirmation phrase.
- Do not store public product images in Convex storage.
- Do not add event-heavy analytics until there is a clear budget.
- Do not make frontend-only admin checks; every sensitive mutation must require admin server-side.
- Before copying the shop, create a new Convex deployment and R2 bucket.
- After copying, seed categories and run `admin.launchReadiness`.
