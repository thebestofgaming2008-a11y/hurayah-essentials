import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function has(path, pattern) {
  if (!existsSync(resolve(root, path))) return false;
  return pattern.test(read(path));
}

const checks = [
  {
    name: "Convex Razorpay webhook route exists",
    pass: () => has("convex/http.ts", /\/razorpay\/webhook/) && has("convex/orders.ts", /razorpayWebhook/),
    fix: "Keep convex/http.ts wired to orders.razorpayWebhook.",
  },
  {
    name: "Razorpay signature verification exists",
    pass: () => has("convex/orders.ts", /hmacSha256Hex/) && has("convex/orders.ts", /timingSafeEqual/),
    fix: "Verify callback and webhook signatures server-side before saving orders.",
  },
  {
    name: "Checkout stock reservations are cleaned up",
    pass: () => has("convex/crons.ts", /cleanupExpiredCheckoutIntents/) && has("convex/orders.ts", /releaseExpiredReservations/),
    fix: "Keep the abandoned checkout cleanup cron enabled.",
  },
  {
    name: "Admin mutations require admin access",
    pass: () => has("convex/products.ts", /requireAdmin\(ctx\)/) && has("convex/admin.ts", /requireAdmin\(ctx\)/),
    fix: "Any product, discount, order, review, or setting mutation must call requireAdmin.",
  },
  {
    name: "Verified text reviews are enforced",
    pass: () => has("convex/reviews.ts", /Only verified customers can review/) && has("convex/reviews.ts", /media_urls:\s*\[\]/),
    fix: "Keep customer review submission tied to paid order history and text-only media.",
  },
  {
    name: "R2 media upload endpoint exists",
    pass: () => has("functions/api/media/upload.ts", /MEDIA_BUCKET/) && has("wrangler.toml", /binding\s*=\s*"MEDIA_BUCKET"/),
    fix: "Bind MEDIA_BUCKET in wrangler.toml and keep uploads outside Convex storage.",
  },
  {
    name: "Catalog cache endpoints exist",
    pass: () => existsSync(resolve(root, "functions/api/catalog/products.ts")) && existsSync(resolve(root, "functions/api/catalog/product.ts")),
    fix: "Keep public catalog reads cached through Pages Functions/R2 snapshots.",
  },
  {
    name: "Static asset cache headers exist",
    pass: () => has("public/_headers", /Cache-Control:\s*public,\s*max-age=31536000/),
    fix: "Keep immutable cache headers for hashed assets and icons.",
  },
  {
    name: "SEO middleware exists",
    pass: () => has("functions/_middleware.ts", /application\/ld\+json/) && has("functions/_middleware.ts", /canonical/),
    fix: "Keep dynamic meta/canonical/schema middleware enabled for product pages.",
  },
  {
    name: "Sitemap and robots exist",
    pass: () => existsSync(resolve(root, "functions/sitemap.xml.ts")) && has("public/robots.txt", /Sitemap:/),
    fix: "Keep sitemap.xml and robots.txt pointed at the production domain.",
  },
  {
    name: "Launch readiness backend query exists",
    pass: () => has("convex/admin.ts", /launchReadiness/),
    fix: "Expose an admin-only launchReadiness query for pre-launch checks.",
  },
  {
    name: "Audit log schema exists",
    pass: () => has("convex/schema.ts", /audit_logs/) && has("convex/lib.ts", /writeAuditLog/),
    fix: "Keep audit logs for admin edits, order status changes, and settings changes.",
  },
];

let failed = 0;
for (const check of checks) {
  const ok = check.pass();
  console.log(`${ok ? "PASS" : "FAIL"} ${check.name}`);
  if (!ok) {
    failed += 1;
    console.log(`  Fix: ${check.fix}`);
  }
}

if (failed) {
  console.error(`\n${failed} launch readiness check(s) failed.`);
  process.exit(1);
}

console.log("\nLaunch readiness file checks passed.");
