# Hurayrah Essentials Storefront

React, Vite, Convex, Cloudflare Pages, and Razorpay storefront for Hurayrah Essentials.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Launch/base checks

```bash
npm run check:launch
npm test -- --run
```

See `docs/WEBSHOP_BASE_RUNBOOK.md` before launching or copying this base for another webshop.

For a new webshop copy, follow `docs/NEW_SHOP_START.md`. After replacing the brand/domain/contact values in the copied shop, run:

```bash
npm run check:new-shop
```

That check is expected to fail on the original Hurayrah shop because it still uses the live Hurayrah branding.
