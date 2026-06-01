# Hurayrah Essentials Launch Cutover

The preview remains intentionally connected to Razorpay test mode and the Convex development deployment until final cutover.

## Required production switches

1. Create the production Convex deployment and deploy the backend functions.
2. Set `ADMIN_EMAIL`, `SITE_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in the production Convex environment.
3. Set `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` to the production Convex deployment before the production frontend build.
4. Add the custom customer domain to Cloudflare Pages and set `SITE_URL` to that final HTTPS URL.
5. In the Razorpay dashboard, register the production webhook:
   - URL: `https://<production-convex-site>/razorpay/webhook`
   - Event: `payment.captured`
   - Secret: the same value configured as `RAZORPAY_WEBHOOK_SECRET`
6. Enable Cloudflare Web Analytics for the production Pages domain and set `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN` before the production frontend build.

## Required catalog review

Admin notifications identify active products that still need attention. Before launch:

- Upload cover images for the seven products currently missing covers.
- Add product copy for the one product currently missing a description.
- Confirm whether zero-stock products should remain visible as sold out.

Weights remain useful admin reference data but are not checkout-critical because shipping is included across India.

## Final live test

Run one low-value real payment after switching to live keys. Confirm:

- Razorpay payment is captured.
- The order appears once in admin with a sequential `#` order number.
- Stock decreases once.
- Guest tracking works with order number and checkout email.
- Admin can send the WhatsApp tracking message.
- Closing the confirmation tab does not prevent webhook order creation.

Clear development test orders and reset the order sequence only when preparing the production database.
