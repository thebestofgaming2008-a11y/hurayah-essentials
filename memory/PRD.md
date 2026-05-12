# Hurayrah Essentials E-commerce Backend Migration PRD

## Original Problem Statement
The user has an existing Vite, React, and Tailwind e-commerce frontend from GitHub and wants the default backend replaced with Convex. The requested backend scope includes Convex authentication, Razorpay checkout, randomized shipping rates, and a basic admin panel for managing products and orders.

Repository cloned into `/app/frontend`:
- `https://github.com/thebestofgaming2008-a11y/sg-9dc732b9-81b5-4587-8340-714362446d58-1777924451`

Convex deployment:
- `https://posh-malamute-31.convex.cloud`

User instruction update:
- Razorpay credentials will be added later, so current payment flow is intentionally **MOCKED**.
- Tracking notifications must be sent via **WhatsApp** click-to-send (not email).
- Currency rates must use **exchangerate-api.com Pro tier** (key: `90a4a8fbed7a8a6d1bbbc43d`).

## Current Architecture
- Frontend: Vite + React + TypeScript + Tailwind in `/app/frontend`
- Backend/data/auth: Convex functions in `/app/frontend/convex`
- Currency rates: fetched **directly from frontend** to `exchangerate-api.com` (Pro tier).
- Public frontend URL: `https://header-polish-3.preview.emergentagent.com`

## Implemented on 2026-05-04
- Cloned the user’s existing shop frontend into `/app/frontend` and configured Vite on port 3000.
- Installed and configured Convex + Convex Auth.
- Added Convex schema/functions for profiles, addresses, products, orders, order items, admin access.
- Removed active Supabase imports.
- Added admin guard based on configured admin email.
- Seeded sample products into Convex.
- Added randomized shipping rate calculation.
- Added checkout order creation with **MOCKED** Razorpay payment fields.
- Added order tracking by order number and email.
- Added `data-testid` attributes to key controls.
- Fixed Vite preview host blocking by allowing preview hosts.
- Added `/app/memory/test_credentials.md`.

## Implemented on 2026-05-07
- Added secure Convex wrappers for the (now retired) Cloudflare Currency Worker.
- Added customer-facing currency selector and approximate converted prices on shop, cart, checkout, product, account.
- Added Brevo manual tracking email action (later disabled).
- Added admin tracking controls and `mailto:` fallback.
- Added tracking fields to Convex `orders` table.
- Fixed `.gitignore` deployment readiness blocker.

## Implemented on 2026-05-07 (Header polish round 2)
- **Header geometry rebuilt with absolute positioning**: announcement bar and main header use `relative + flex justify-center` containers with the menu button absolutely on the left and the action buttons absolutely on the right. The logo and the announcement notice are perfectly centered at every viewport width and the right cluster is anchored to the screen edge — no more drifting toward the middle on narrow screens.
- **"Track order" removed from main header nav** (still available in the footer for customers).
- **Books menu simplified**: removed the dropdown chevron and the entire dropdown. Clicking "Books" smoothly scrolls to the "Choose your subject" section on the homepage (`#subjects`); from other pages it navigates to `/` and then scrolls. Sticky-header offset handled via `scroll-mt-[140px]` on the section. Mobile menu Books button has the same behaviour.
- Cleaned unused state (`booksOpen`, `mobileBooksOpen`, `booksRef`) and unused imports (`ChevronDown`, `BOOK_SUBJECTS`, `useRef`).

## Implemented on 2026-05-07 (UI/UX & integrations refresh)
- **Sticky header**: site header now stays visible while scrolling (`sticky top-0 z-40`) with a subtle shadow on scroll.
- **Currency selector fixed**: replaced native `<select>` (which produced double arrows) with the shadcn `Select` component for a clean single-chevron control. Now also shows a flag emoji + currency code in a soft white pill on the navy bar.
- **Header geometry rebuilt**: announcement bar and main header both use a 3-equal-column grid (`grid-cols-3`) with `justify-self-start/center/end`. Logo and notice are perfectly centered at every viewport width regardless of left/right content widths.
- **Admin pill**: when an admin is signed in, an "Admin" pill (`LayoutDashboard` icon) appears on the left of the announcement bar across all pages — one-click navigation to `/admin`.
- **"Children" → "Essentials"** label rename: top-level category label, header desktop nav, mobile menu, homepage "Shop by category" tabs, and homepage "Choose your subject" tile. URL slug `/category/children` is preserved (no DB migration needed).
- **Admin dashboard redesigned (Shopify/Medusa style)**: dense, high-contrast cards; light gray page background; black primary tab indicator; uppercase metric labels with tabular-nums values; KPI cards (Revenue, Orders, To-fulfill, Customers); section headers with subtitles; cleaner spacing; mobile-friendly stacked rows; orders search + status filter.
- **Order row redesign**: inline expandable tracking form per order (Carrier, Tracking number, Tracking URL); coloured status badges (Pending/Confirmed/Processing/Shipped/Delivered/Cancelled); payment badge with “Mock paid” label; inline status dropdown; consistent typography.
- **One-click WhatsApp tracking send**: green branded `Send WhatsApp` button per order. On click it auto-saves tracking and opens `wa.me/<phone>?text=...` in a new tab with a pre-filled, multi-line tracking message (Assalamu alaikum, order #, carrier, tracking number, tracking URL, signature). Disabled with a “No phone on order” chip when `customer_phone` is missing.
- **Email send removed from admin** per user direction (skip email; WhatsApp only). Brevo integration is no longer wired into the UI.
- **Currency API replaced**: removed Cloudflare Worker dependency; rates now fetched directly by the frontend from `https://v6.exchangerate-api.com/v6/{KEY}/latest/INR`. Key stored in `frontend/.env` as `VITE_EXCHANGE_RATE_API_KEY`. Rates cached in `localStorage` for 6 hours to limit API usage.

## Verification on 2026-05-07
- `yarn build` passed.
- Smoke screenshots:
  - Homepage and Shop pages render with the new sticky header.
  - Header remains visible after scrolling 1500px.
  - Currency dropdown opens cleanly with a single chevron and switches the converted price (₹1,099 → ≈ $11.64 with rate `0.01058912`).
- Admin smoke + functional check:
  - Logged in as admin, navigated to Orders.
  - Expanded order row, filled carrier (`Delhivery`), tracking (`AWB99999TEST`), and tracking URL.
  - Clicked **Send WhatsApp**; intercepted `window.open` URL was a valid `https://wa.me/<digits>?text=<encoded message>` link with carrier, tracking number, tracking URL and store signature.
  - Order status auto-updated to “Shipped” after tracking save.
- Direct API check on `https://v6.exchangerate-api.com/v6/.../latest/INR` returned `result: success` with full rate map.

## Known Integration Notes
- WhatsApp delivery is **click-to-send via wa.me** — admin presses Send inside WhatsApp Web/app once it opens.
- Brevo email path is removed from the admin UI. Re-enable later only after sender domain verification.
- Currency API key is bundled in the client (Pro tier; rate cap by request volume). Caching mitigates request volume.

## Active Credentials
See `/app/memory/test_credentials.md`.

## P0 Remaining
- None.

## P1 Next Action Items
- Replace **MOCKED** Razorpay checkout with real Razorpay order creation and signature verification when keys are provided.
- Phase 1 deeper admin upgrade (when user requests): dedicated Order Detail page with split layout, fulfillment timeline, customer panel, and shipment events table in Convex.
- Phase 2: Products & Inventory upgrade — draft/active/archive statuses, low-stock warnings, richer product list.

## P2 Future / Backlog
- Customer accounts upgrade (lifetime value, order timeline).
- Public order tracking page with timeline.
- Coupons/discounts, refunds, automated email notifications, admin roles.
- Real WhatsApp Business automation via Twilio (if click-to-send becomes operationally too manual).

## Important Notes
- Razorpay is intentionally **MOCKED** until the user adds credentials.
- Convex deployment environment variables previously configured: `ADMIN_EMAIL`, `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`. The currency worker env vars (`CURRENCY_API_URL`, `CURRENCY_API_KEY`) are no longer used by the frontend.
