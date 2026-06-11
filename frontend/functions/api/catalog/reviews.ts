type Env = {
  MEDIA_BUCKET?: R2Bucket;
  VITE_CONVEX_URL?: string;
};

const SNAPSHOT_TTL_MS = 5 * 60 * 1000;
const REVIEWS_CACHE_CONTROL = "public, max-age=120, s-maxage=300, stale-while-revalidate=1800";

function safeKeyPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(0, 120);
}

function fresh(updatedAt: string | undefined) {
  const timestamp = Number(updatedAt ?? 0);
  return Number.isFinite(timestamp) && Date.now() - timestamp < SNAPSHOT_TTL_MS;
}

function json(data: unknown, source: string, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": REVIEWS_CACHE_CONTROL,
      "x-catalog-source": source,
    },
  });
}

async function fetchReviews(convexUrl: string, productId: string) {
  const upstream = await fetch(`${convexUrl}/api/query`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path: "reviews:listPublishedForProduct", args: { productId }, format: "json" }),
  });
  if (!upstream.ok) throw new Error("Convex reviews request failed.");
  const payload = (await upstream.json()) as { status?: string; value?: unknown };
  if (payload.status !== "success" || !Array.isArray(payload.value)) throw new Error("Convex reviews response was invalid.");
  return payload.value;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const convexUrl = env.VITE_CONVEX_URL?.replace(/\/+$/, "");
  if (!convexUrl) return json({ error: "Convex URL is not configured." }, "error", 500);

  const productId = new URL(request.url).searchParams.get("productId")?.trim();
  if (!productId) return json({ error: "Missing product id." }, "error", 400);
  const key = `catalog/reviews/${safeKeyPart(productId)}.json`;
  const url = new URL(request.url);
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}${url.pathname}${url.search}`, request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  if (env.MEDIA_BUCKET) {
    const snapshot = await env.MEDIA_BUCKET.get(key);
    if (snapshot && fresh(snapshot.customMetadata?.updatedAt)) {
      const response = new Response(snapshot.body, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": REVIEWS_CACHE_CONTROL,
          "x-catalog-source": "r2",
        },
      });
      await cache.put(cacheKey, response.clone());
      return response;
    }

    try {
      const reviews = await fetchReviews(convexUrl, productId);
      const body = JSON.stringify(reviews);
      await env.MEDIA_BUCKET.put(key, body, {
        httpMetadata: { contentType: "application/json; charset=utf-8" },
        customMetadata: { updatedAt: String(Date.now()) },
      });
      const response = json(reviews, "convex-refresh");
      await cache.put(cacheKey, response.clone());
      return response;
    } catch {
      if (snapshot) {
        const response = new Response(snapshot.body, {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": REVIEWS_CACHE_CONTROL,
            "x-catalog-source": "r2-stale",
          },
        });
        await cache.put(cacheKey, response.clone());
        return response;
      }
      return json({ error: "Reviews are temporarily unavailable." }, "error", 502);
    }
  }

  const response = json(await fetchReviews(convexUrl, productId), "convex");
  await cache.put(cacheKey, response.clone());
  return response;
};
