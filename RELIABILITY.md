# Store reliability and recovery

## Scope and limits

This is a maintained production service, not a guarantee of uninterrupted operation.
Domain renewals, provider account status, usage limits, security updates and alert response still need an owner.
No live payments or customer orders are created by the tests below.

## Checks added in October 2026

- Unit and integration tests use isolated Convex databases, never the production database.
- Payment tests cover duplicate callbacks/webhooks, late captured payments, expired reservations, removed products, mismatched amounts, multi-variant inventory, refund ordering and expired recovery queues.
- Authentication tests cover registration, rejected passwords, repeat sign-in and password-reset code verification with a mocked email provider.
- Currency tests cover real-rate-only fallback, unavailable storage/providers, cache expiry, manual selection, location races and blocked browser storage.
- Login destinations are restricted to local paths, with adversarial redirect tests.
- GitHub regression checks run tests, Convex typechecking, a critical-dependency audit, static launch checks and a production frontend build. They do not deploy Convex or alter customer data.
- GitHub live checks run hourly; a daily run scans all catalog covers. An incident issue is assigned to the repository owner on failure, updated rather than duplicated, and closed after recovery.
- Dependabot proposes updates. Updates are not automatically merged or deployed.

## Live health checks

From `frontend`:

```sh
npm ci
npm test -- --run
npx tsc --noEmit -p convex/tsconfig.json
npm run build
npm run check:health
npm run check:health:full
```

The health command checks DNS, TLS expiry, application shells and entry scripts, catalog data, image URLs, exchange rates, geolocation, unsigned-webhook rejection and rejection of anonymous administrative requests.
It uses bounded concurrency, short timeouts and one retry. It never sends a valid payment event or creates an order.
Anonymous Convex errors are redacted in production, so that check verifies rejection, not the precise internal reason.
Passing HTTP checks is not a substitute for signed-in browser tests or a genuine payment-provider delivery test.

GitHub scheduled runs can be delayed or disabled (including inactivity rules for public repositories). Check their execution history monthly and ensure issue/Actions notifications reach the person responsible. This is not an SLA-grade independent uptime service.

## Current architecture

- Store: `https://hurayrahessentials.com`.
- Media: `https://media.hurayrahessentials.com`, existing R2 bucket `hurayah-product-media`.
- Legacy media links are translated at service boundaries; no production product records were bulk rewritten.
- Convex production: `kindly-herring-709`.
- Currency rates use authenticated ExchangeRate-API requests with edge caching and an R2 snapshot. Normal refresh is hourly; outages may use verified snapshots for up to 48 hours. Health checks alert on degraded/stale responses before that reserve expires. No guessed conversion rates are substituted.
- Razorpay India payments and international WhatsApp orders retain their existing routing. This work does not enable the paused international card-payment experiment.
- Existing payment recovery runs every five minutes; daily audit checks the most recent 48 hours, capped at 200 payments. Revisit that cap before volume approaches 200 payments per 48 hours. It is not an unlimited historical reconciliation service.
- Recovery entries older than the 14-day automatic recovery window are retired from polling, not erased by this change. Recovery-required entries remain visible for manual attention.

## Confirmed unresolved items

1. The configured email sender is on `hurayrahessentials.com`, but Resend rejected a test to its official simulated-delivery address with `403 domain not verified`. Password-reset delivery is not healthy until that domain is verified. The current send-only key cannot inspect or create domains. Obtain Resend's exact DNS records, add them in the authoritative DNS zone, verify in Resend, and repeat the test. Never switch to an unrelated sender merely to hide the failure.
2. No real charge, bank settlement, live refund or signed production webhook was performed. The webhook signature gate and isolated recovery logic were tested; actual dashboard delivery/enabled status needs verification from the merchant account.
3. The dependency scan after targeted patches has no critical findings, but still reports Tailwind/build-tool chain advisories and moderate React Router advisories requiring major-version migrations. Do not claim a clean security audit. The application does not use React Router SSR hydration; local redirects are restricted. Build glob/CSS input is trusted repository source, not customer input. Test the Tailwind 4 / Router 7 migrations separately before release; do not use `npm audit fix --force` on production.
4. Public probes cannot verify actual customer email receipt, every authenticated admin action, provider quotas, or registrar auto-renewal. The owner must maintain those account settings.

## Backup and rollback

- Before the backend changes, a production database export was saved outside the repository as `hurayah-pre-reliability-20261021.zip` in the local workspace's `outputs` folder. It contains sensitive customer/auth data and must never be committed or uploaded publicly.
- That export excludes R2 media and is a point-in-time backup, not ongoing backup coverage or a tested full disaster-recovery restore.
- Keep recurring database exports in access-controlled storage and verify a restore in a separate deployment periodically. Establish a separate media-backup policy; do not delete R2 objects referenced by products or past orders.
- Frontend rollback before this reliability pass: Cloudflare Pages deployment `19ec6661` (source `388f559`). Use the dashboard's deployment rollback, then rerun health checks.
- Backend rollback: redeploy the reviewed previous commit `388f559` from a separate clean checkout. Do not restore an old database snapshot over new customer orders merely to undo code.
- Never deploy an arbitrary old checkout: it may reinstate broken image domains or omit later currency fixes.

## Incident handling

1. Open the failed health run and identify the failed service. Preserve logs; never include secrets or customer details in public issues.
2. For payment concerns, compare Razorpay payment/order IDs with checkout intents and orders before changing anything. Never ask a customer to pay twice merely because the browser timed out. A captured payment and a bank settlement are different states.
3. Review the admin payment-recovery warnings and reconciliation/audit timestamps. Do not clear recovery records to make a warning disappear.
4. For images, verify the media domain and an original object before changing catalog data. Do not delete or re-upload the catalog as an initial response.
5. For currency or email failures, check provider account/key/domain/quota status. Keep secrets server-side.
6. Fix on a branch, run regression checks, validate a preview, take a backup for backend/data changes, deploy narrowly, and rerun live checks.

## Ongoing responsibility

- Enable domain auto-renewal and registrar/provider billing alerts.
- Keep Cloudflare, Convex, Resend, Razorpay and the exchange-rate account owned by the business with recovery access.
- Rotate credentials that have been shared in chat or other insecure channels through a staged process; do not revoke working payment credentials before their replacements are deployed.
- Review usage and quotas monthly and increase the plan before a limit is reached. No free-tier capacity promise is implied.
- Review dependency/security PRs and alert delivery monthly. A new provider rule or vulnerability can require a future update even if application code has not changed.
