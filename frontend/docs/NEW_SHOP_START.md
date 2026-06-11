# New Shop Start Guide

Use this when copying the webshop base for a new store. The goal is to start with a clean backend, a new media bucket, and no old brand details leaking into the new shop.

## 1. Copy The Base

```bash
git clone <base-repo-url> <new-shop-folder>
cd <new-shop-folder>/frontend
npm install
copy .env.local.example .env.local
copy .dev.vars.example .dev.vars
```

Keep the first run local until every brand and environment value below has been changed.

## 2. Create Fresh Infrastructure

Create these fresh for every shop:

- a new Convex project/deployment
- a new Cloudflare Pages project
- a new Cloudflare R2 bucket
- a new public media domain or subdomain
- a new Razorpay account/key set if payments belong to a different merchant
- a new Resend sending domain if password reset emails belong to a different domain

Do not reuse the Hurayrah production Convex deployment, R2 bucket, Razorpay keys, or admin env vars.

## 3. Replace Brand Configuration

Search and replace the old shop values before launch:

```bash
rg -n "Hurayrah|hurayrah|abuhurayrah|918491|84919|hurayah|Seek Knowledge" src functions convex public docs index.html wrangler.toml
```

At minimum update:

- `index.html`: title, canonical URL, favicon paths, Open Graph image, social handle
- `functions/_middleware.ts`: primary domain, legacy redirects, SEO copy, organization schema
- `functions/sitemap.xml.ts`: production origin
- `public/robots.txt`: sitemap URL
- `public/site.webmanifest`: app name and icons
- `wrangler.toml`: Cloudflare Pages project name, R2 public URL, bucket name, Convex URLs
- `src/assets/*`: logo/favicon/brand images
- `src/pages/Contact.tsx`: phone, email, Instagram, location, business hours
- `src/pages/Checkout.tsx`: WhatsApp order number, Razorpay display name
- `src/components/shop/OfferOptIn.tsx`: announcement/community links
- `src/components/layout/SiteFooter.tsx`: footer copy and links
- `src/data/products.ts`: media host and default category metadata

## 4. Set Convex Environment

Run these against the new Convex deployment only:

```bash
npx convex env set ADMIN_EMAILS "owner@example.com"
npx convex env set AUTH_SECRET "<long-random-secret>"
npx convex env set CONVEX_SITE_URL "https://<deployment>.convex.site"
npx convex env set PUBLIC_SITE_URL "https://<new-domain>"
npx convex env set AUTH_RESEND_KEY "<resend-api-key>"
npx convex env set AUTH_EMAIL_FROM "Store Name <no-reply@new-domain>"
npx convex env set RAZORPAY_KEY_ID "<live-or-test-key-id>"
npx convex env set RAZORPAY_KEY_SECRET "<live-or-test-key-secret>"
npx convex env set RAZORPAY_WEBHOOK_SECRET "<webhook-secret>"
```

Optional:

```bash
npx convex env set EXCHANGE_RATE_API_KEY "<exchange-rate-key>"
```

## 5. Set Cloudflare Pages Variables

In Cloudflare Pages, set:

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `R2_PUBLIC_BASE_URL`
- `ADMIN_UPLOAD_TOKEN`

Bind R2:

- binding name: `MEDIA_BUCKET`
- bucket: the new shop bucket

## 6. Seed Store Data

Before showing the shop publicly:

- create categories and subjects
- add products, prices, stock, images, variants, tags, and slugs
- make sure product images are served from R2/public media, not Convex storage
- confirm India and international checkout rules match the merchant
- create the admin account and verify `/admin` on mobile

## 7. Verify Before Launch

Run:

```bash
npm run check:launch
npm test -- --run
npm run build
```

Then test manually:

- homepage, shop, category filters, product page, cart, checkout
- India checkout up to Razorpay
- international checkout WhatsApp message formatting
- sign in, password reset, account, saved address, wishlist
- track order and order review flow
- admin product edit, upload, stock, orders, reviews, customers, discounts
- mobile menu, mobile admin, mobile checkout

## 8. Deploy Order

1. Deploy Convex after env vars are set.
2. Deploy Cloudflare Pages.
3. Add the custom domain.
4. Add Razorpay webhook:

```text
https://<convex-site-domain>/razorpay/webhook
```

Events:

- `payment.captured`
- `payment.failed`
- `order.paid`

5. Place one controlled real payment test if the merchant allows it, then refund or mark it clearly.

## 9. Keep The Base Clean

After each shop launch, copy improvements back into the base only if they are generic. Do not copy:

- live orders
- live customers
- merchant secrets
- brand-specific copy
- product inventory from one merchant into another
