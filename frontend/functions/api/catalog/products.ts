type Env = {
  MEDIA_BUCKET?: R2Bucket;
  VITE_CONVEX_URL?: string;
};

const CATALOG_KEY = "catalog/products-compact-v4-subjects.json";
const SNAPSHOT_TTL_MS = 5 * 60 * 1000;
const CATALOG_CACHE_CONTROL = "public, max-age=60, s-maxage=600, stale-while-revalidate=86400";
const STALE_CATALOG_CACHE_CONTROL = "public, max-age=30, s-maxage=60, stale-while-revalidate=86400";

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", CATALOG_CACHE_CONTROL);
  return new Response(JSON.stringify(data), { ...init, headers });
}

function snapshotResponse(snapshot: R2ObjectBody, source: string, stale = false) {
  return new Response(snapshot.body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": stale ? STALE_CATALOG_CACHE_CONTROL : CATALOG_CACHE_CONTROL,
      "x-catalog-source": source,
    },
  });
}

function isFresh(updatedAt: string | undefined) {
  const timestamp = Number(updatedAt ?? 0);
  return Number.isFinite(timestamp) && Date.now() - timestamp < SNAPSHOT_TTL_MS;
}

async function fetchCatalogFromConvex(convexUrl: string) {
  const upstream = await fetch(`${convexUrl}/api/query`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path: "products:listActiveProducts", args: {}, format: "json" }),
  });
  if (!upstream.ok) throw new Error("Convex catalog request failed.");
  const payload = (await upstream.json()) as { status?: string; value?: unknown };
  if (payload.status !== "success" || !Array.isArray(payload.value)) {
    throw new Error("Convex catalog response was invalid.");
  }
  return payload.value;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function compactProduct(product: unknown) {
  const row = product as Record<string, unknown>;
  const images = stringArray(row.images);
  const cover = typeof row.cover_image_url === "string" && row.cover_image_url ? row.cover_image_url : images[0] || null;
  const tags = stringArray(row.tags);
  const colorOptions = stringArray(row.color_options);
  const sizeOptions = stringArray(row.size_options);
  const optionTypes = Array.isArray(row.option_types) ? row.option_types : [];
  const compact: Record<string, unknown> = {
    id: row.id,
    name: row.name,
    price: row.price,
    price_inr: row.price_inr,
    stock_quantity: row.stock_quantity,
    in_stock: row.in_stock,
  };

  const set = (key: string, value: unknown) => {
    if (value == null) return;
    if (typeof value === "string" && value.trim() === "") return;
    compact[key] = value;
  };

  set("slug", row.slug);
  set("author", row.author);
  set("publisher", row.publisher);
  set("sale_price", row.sale_price);
  set("sale_price_inr", row.sale_price_inr);
  set("category", row.category);
  set("category_id", row.category_id);
  set("cover_image_url", cover);
  set("badge", row.badge);
  set("rating", row.rating);
  set("reviews_count", row.reviews_count);
  set("weight_g", row.weight_g);
  set("shipping_class", row.shipping_class);
  if (tags.length) compact.tags = tags;
  if (colorOptions.length) compact.color_options = colorOptions;
  if (sizeOptions.length) compact.size_options = sizeOptions;
  if (optionTypes.length) compact.option_types = optionTypes;
  if (row.is_featured === true) compact.is_featured = true;
  if (row.show_in_category_section === true) compact.show_in_category_section = true;
  if (row.is_new_arrival === true) compact.is_new_arrival = true;
  if (row.is_bestseller === true) compact.is_bestseller = true;
  if (row.is_on_sale === true) compact.is_on_sale = true;
  return compact;
}

function compactCatalog(catalog: unknown) {
  if (!Array.isArray(catalog)) return catalog;
  return catalog.map(compactProduct);
}

async function refreshSnapshot(env: Env, convexUrl: string, cache: Cache, cacheKey: Request) {
  if (!env.MEDIA_BUCKET) return;
  const catalog = compactCatalog(await fetchCatalogFromConvex(convexUrl));
  const body = JSON.stringify(catalog);
  await env.MEDIA_BUCKET.put(CATALOG_KEY, body, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    customMetadata: { updatedAt: String(Date.now()) },
  });
  await cache.put(
    cacheKey,
    new Response(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": CATALOG_CACHE_CONTROL,
        "x-catalog-source": "convex-refresh",
      },
    }),
  );
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const convexUrl = env.VITE_CONVEX_URL?.replace(/\/+$/, "");
  if (!convexUrl) return json({ error: "Convex URL is not configured." }, { status: 500 });
  if (!env.MEDIA_BUCKET) return json(compactCatalog(await fetchCatalogFromConvex(convexUrl)));

  const cache = caches.default;
  const url = new URL(request.url);
  const cacheKey = new Request(`${url.origin}${url.pathname}${url.search}`, request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const snapshot = await env.MEDIA_BUCKET.get(CATALOG_KEY);
  if (snapshot) {
    const fresh = isFresh(snapshot.customMetadata?.updatedAt);
    const response = snapshotResponse(snapshot, fresh ? "r2" : "r2-stale", !fresh);
    await cache.put(cacheKey, response.clone());
    if (!fresh) {
      waitUntil(refreshSnapshot(env, convexUrl, cache, cacheKey).catch(() => undefined));
    }
    return response;
  }

  try {
    await refreshSnapshot(env, convexUrl, cache, cacheKey);
    const refreshed = await cache.match(cacheKey);
    if (refreshed) return refreshed;
    throw new Error("Catalog refresh did not produce a response.");
  } catch {
    return json({ error: "Catalog is temporarily unavailable." }, { status: 502 });
  }
};
