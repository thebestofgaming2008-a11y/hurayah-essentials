type Env = {
  MEDIA_BUCKET?: R2Bucket;
  VITE_CONVEX_URL?: string;
};

const SNAPSHOT_TTL_MS = 5 * 60 * 1000;
const PRODUCT_CACHE_CONTROL = "public, max-age=60, s-maxage=600, stale-while-revalidate=86400";
const STALE_PRODUCT_CACHE_CONTROL = "public, max-age=30, s-maxage=60, stale-while-revalidate=86400";
const REFRESH_CACHE_CONTROL = "no-store";

function safeKeyPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(0, 120);
}

function responseJson(data: unknown, source: string, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": PRODUCT_CACHE_CONTROL,
      "x-catalog-source": source,
    },
  });
}

function snapshotJson(snapshot: R2ObjectBody, source: string, stale = false) {
  return new Response(snapshot.body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": stale ? STALE_PRODUCT_CACHE_CONTROL : PRODUCT_CACHE_CONTROL,
      "x-catalog-source": source,
    },
  });
}

function fresh(updatedAt: string | undefined) {
  const timestamp = Number(updatedAt ?? 0);
  return Number.isFinite(timestamp) && Date.now() - timestamp < SNAPSHOT_TTL_MS;
}

async function convexQuery(convexUrl: string, path: string, args: Record<string, unknown>) {
  const upstream = await fetch(`${convexUrl}/api/query`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  if (!upstream.ok) throw new Error("Convex product request failed.");
  const payload = (await upstream.json()) as { status?: string; value?: unknown };
  if (payload.status !== "success") throw new Error("Convex product response was invalid.");
  return payload.value;
}

async function refreshProductSnapshot(
  env: Env,
  convexUrl: string,
  key: string,
  cache: Cache,
  cacheKey: Request,
  slug: string | undefined,
  id: string | undefined,
) {
  if (!env.MEDIA_BUCKET) return;
  const product = slug
    ? await convexQuery(convexUrl, "products:getProductBySlug", { slug })
    : await convexQuery(convexUrl, "products:getProductById", { id });
  const body = JSON.stringify(product);
  await env.MEDIA_BUCKET.put(key, body, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    customMetadata: { updatedAt: String(Date.now()) },
  });
  await cache.put(
    cacheKey,
    new Response(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": PRODUCT_CACHE_CONTROL,
        "x-catalog-source": "convex-refresh",
      },
    }),
  );
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const convexUrl = env.VITE_CONVEX_URL?.replace(/\/+$/, "");
  if (!convexUrl) return responseJson({ error: "Convex URL is not configured." }, "error", 500);

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug")?.trim();
  const id = url.searchParams.get("id")?.trim();
  if (!slug && !id) return responseJson({ error: "Missing product slug or id." }, "error", 400);

  const kind = slug ? "slug" : "id";
  const value = slug || id || "";
  const key = `catalog/product-v2-subjects-${kind}/${safeKeyPart(value)}.json`;
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}${url.pathname}${url.search}`, request);
  const forceRefresh = url.searchParams.has("refresh");
  if (!forceRefresh) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  if (env.MEDIA_BUCKET) {
    if (forceRefresh) {
      try {
        const product = slug
          ? await convexQuery(convexUrl, "products:getProductBySlug", { slug })
          : await convexQuery(convexUrl, "products:getProductById", { id });
        const body = JSON.stringify(product);
        await env.MEDIA_BUCKET.put(key, body, {
          httpMetadata: { contentType: "application/json; charset=utf-8" },
          customMetadata: { updatedAt: String(Date.now()) },
        });
        return new Response(body, {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": REFRESH_CACHE_CONTROL,
            "x-catalog-source": "convex-refresh",
          },
        });
      } catch {
        return responseJson({ error: "Product refresh failed." }, "error", 502);
      }
    }

    const snapshot = await env.MEDIA_BUCKET.get(key);
    if (snapshot) {
      const isFresh = fresh(snapshot.customMetadata?.updatedAt);
      const response = snapshotJson(snapshot, isFresh ? "r2" : "r2-stale", !isFresh);
      await cache.put(cacheKey, response.clone());
      if (!isFresh) {
        waitUntil(refreshProductSnapshot(env, convexUrl, key, cache, cacheKey, slug || undefined, id || undefined).catch(() => undefined));
      }
      return response;
    }

    try {
      await refreshProductSnapshot(env, convexUrl, key, cache, cacheKey, slug || undefined, id || undefined);
      const refreshed = await cache.match(cacheKey);
      if (refreshed) return refreshed;
      throw new Error("Product refresh did not produce a response.");
    } catch {
      return responseJson({ error: "Product is temporarily unavailable." }, "error", 502);
    }
  }

  const product = slug
    ? await convexQuery(convexUrl, "products:getProductBySlug", { slug })
    : await convexQuery(convexUrl, "products:getProductById", { id });
  const response = responseJson(product, "convex");
  await cache.put(cacheKey, response.clone());
  return response;
};
