import { writeFile } from "node:fs/promises";
import { resolveNs } from "node:dns/promises";
import tls from "node:tls";
import { pathToFileURL } from "node:url";

export function validateRates(data, now = Date.now()) {
  const currencies = ["INR", "USD", "EUR", "GBP", "AED", "SAR", "CAD", "AUD", "SGD", "MYR", "QAR", "KWD", "ZAR"];
  const age = now - Date.parse(data?.fetchedAt);
  return data?.source === "exchangerate-api.com" && data.base === "INR" && data.rates?.INR === 1 &&
    !data.stale && Number.isFinite(age) && age >= -60000 && age < 2 * 3600000 &&
    currencies.every((code) => Number.isFinite(data.rates[code]) && data.rates[code] > 0);
}

export async function checkStoreHealth({ origin = "https://hurayrahessentials.com", full = false } = {}) {
  const results = [];
  async function check(name, work) {
    try {
      const detail = await work();
      results.push({ name, ok: true, detail });
    } catch (error) {
      results.push({ name, ok: false, detail: error instanceof Error ? error.message : "Check failed" });
    }
  }
  async function request(url, init = {}) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(15000) });
        if (response.status >= 500) {
          await response.body?.cancel();
          throw new Error(`HTTP ${response.status}`);
        }
        return response;
      } catch {
        lastError = new Error("Endpoint unavailable or redirected unexpectedly");
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    throw lastError;
  }
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const hostname = new URL(origin).hostname;
  await check("DNS", async () => {
    const servers = await resolveNs(hostname);
    assert(servers.length > 0 && servers.every((s) => s.endsWith(".ns.cloudflare.com")), "Unexpected domain nameservers");
    return "Cloudflare nameservers active";
  });
  await check("TLS", () => new Promise((resolve, reject) => {
    const socket = tls.connect({ host: hostname, servername: hostname, port: 443, rejectUnauthorized: true });
    socket.setTimeout(10000, () => socket.destroy(new Error("TLS timeout")));
    socket.once("error", () => reject(new Error("TLS connection failed")));
    socket.once("secureConnect", () => {
      const days = Math.floor((Date.parse(socket.getPeerCertificate().valid_to) - Date.now()) / 86400000);
      socket.end();
      if (!Number.isFinite(days) || days < 7) reject(new Error("TLS certificate expires within seven days"));
      else resolve(`Certificate valid for ${days} days`);
    });
  }));
  for (const path of ["/", "/shop", "/checkout", "/account", "/admin"]) {
    await check(`Page ${path}`, async () => {
      const response = await request(origin + path);
      const html = await response.text();
      assert(response.ok && html.includes('id="root"'), "Application shell unavailable");
      if (path === "/") {
        const scripts = [...html.matchAll(/src="(\/assets\/[^" ]+\.js)"/g)].map((m) => m[1]);
        assert(scripts.length > 0, "Entry script missing");
        for (const script of scripts.slice(0, 3)) {
          const asset = await request(origin + script, { method: "HEAD" });
          assert(asset.ok && /javascript/.test(asset.headers.get("content-type") ?? ""), "Application script unavailable");
        }
      }
      return "Application shell reachable (not a signed-in UI test)";
    });
  }
  await check("Currency rates", async () => {
    const response = await request(origin + "/api/rates");
    assert(response.ok && validateRates(await response.json()), "Provider rates missing, stale or invalid");
    return "All 13 currencies have recent provider rates";
  });
  await check("Location detection", async () => {
    const response = await request(origin + "/api/geo");
    const data = await response.json();
    assert(response.ok && /^[A-Z]{2}$/.test(data.country) && /^[A-Z]{3}$/.test(data.currency), "Location response invalid");
    return "Country and currency response valid";
  });
  let products = [];
  await check("Product catalog", async () => {
    const response = await request(origin + "/api/catalog/products?v=r2-compact-v3-subjects-20260611");
    products = await response.json();
    assert(response.ok && Array.isArray(products) && products.length > 0, "Catalog empty or invalid");
    assert(products.every((p) => p.id && p.name && Number.isFinite(p.price_inr)), "Catalog contains invalid products");
    return `${products.length} products`;
  });
  const allowedImageHosts = new Set([hostname, "media.hurayrahessentials.com"]);
  async function checkImages(urls) {
    assert(urls.length > 0, "No image URLs available");
    const failures = [];
    let cursor = 0;
    async function worker() {
      while (cursor < urls.length) {
        const raw = urls[cursor++];
        try {
          const url = new URL(raw, origin);
          assert(url.protocol === "https:" && allowedImageHosts.has(url.hostname), "Unexpected image domain");
          const response = await request(url, { method: "HEAD" });
          assert(response.ok && /^image\//.test(response.headers.get("content-type") ?? ""), "Image unavailable");
        } catch { failures.push(true); }
      }
    }
    await Promise.all(Array.from({ length: Math.min(4, urls.length) }, worker));
    assert(failures.length === 0, `${failures.length} of ${urls.length} image checks failed`);
    return `${urls.length} images reachable`;
  }
  await check("Product cover images", async () => {
    const urls = [...new Set(products.map((p) => p.cover_image_url).filter(Boolean))];
    const sample = full ? urls : [...new Set([urls[0], ...urls.filter((_, i) => i % Math.max(1, Math.floor(urls.length / 5)) === 0)].filter(Boolean))].slice(0, 6);
    return checkImages(sample);
  });
  await check("Product detail and gallery", async () => {
    assert(products.length > 0, "Cannot check detail without catalog");
    const product = products.find((p) => p.slug === "dafaatir-set") ?? products[0];
    const response = await request(origin + "/api/catalog/product?slug=" + encodeURIComponent(product.slug));
    const data = await response.json();
    assert(response.ok && data?.id === product.id, "Product detail is inconsistent with catalog");
    return checkImages((data.images?.length ? data.images : [data.cover_image_url]).filter(Boolean).slice(0, 10));
  });
  await check("Webhook rejects unsigned requests", async () => {
    const response = await request("https://kindly-herring-709.convex.site/razorpay/webhook", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert(response.status === 401, "Unsigned webhook was not rejected with HTTP 401");
    await response.body?.cancel();
    return "Signature gate active (does not confirm Razorpay delivery)";
  });
  await check("Administrative access control", async () => {
    const response = await request("https://kindly-herring-709.convex.cloud/api/query", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: "orders:listAll", args: {}, format: "json" }) });
    const data = await response.json();
    assert(data.status === "error" && typeof data.errorMessage === "string" && !("value" in data), "Admin endpoint did not reject anonymous access as expected");
    return "Anonymous request rejected; production redacts the error reason";
  });
  return { checkedAt: new Date().toISOString(), ok: results.every((r) => r.ok), full, results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await checkStoreHealth({ full: process.argv.includes("--full") });
  for (const result of report.results) console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}: ${result.detail}`);
  const reportIndex = process.argv.indexOf("--report");
  if (reportIndex !== -1 && process.argv[reportIndex + 1]) await writeFile(process.argv[reportIndex + 1], JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
}
