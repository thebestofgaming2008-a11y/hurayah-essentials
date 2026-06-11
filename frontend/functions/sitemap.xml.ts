type Product = {
  slug?: string | null;
  id?: string | null;
  updated_at?: string | null;
  category?: string | null;
  category_id?: string | null;
};

const SITE_ORIGIN = "https://hurayrahessentials.com";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, priority: string, lastmod?: string | null) {
  const date = lastmod ? new Date(lastmod) : null;
  const validDate = date && Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    validDate ? `    <lastmod>${validDate}</lastmod>` : "",
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].filter(Boolean).join("\n");
}

export const onRequestGet: PagesFunction = async ({ request }) => {
  const origin = new URL(request.url).origin;
  const response = await fetch(`${origin}/api/catalog/products`, {
    headers: { accept: "application/json" },
  });
  const products = response.ok ? ((await response.json().catch(() => [])) as Product[]) : [];
  const categories = new Set(["books", "clothing", "essentials"]);
  for (const product of products) {
    const key = String(product.category_id || product.category || "").trim().toLowerCase();
    if (key && !["aqeedah", "arabic", "fiqh", "hadith", "purification", "seerah", "tafsir", "urdu"].includes(key)) {
      categories.add(key);
    }
  }

  const urls = [
    urlEntry(`${SITE_ORIGIN}/`, "1.0"),
    urlEntry(`${SITE_ORIGIN}/shop`, "0.9"),
    urlEntry(`${SITE_ORIGIN}/contact`, "0.6"),
    urlEntry(`${SITE_ORIGIN}/about`, "0.5"),
    urlEntry(`${SITE_ORIGIN}/track`, "0.4"),
    ...Array.from(categories).sort().map((category) => urlEntry(`${SITE_ORIGIN}/category/${encodeURIComponent(category)}`, "0.75")),
    ...products
      .filter((product) => product.slug || product.id)
      .map((product) => urlEntry(`${SITE_ORIGIN}/product/${encodeURIComponent(String(product.slug || product.id))}`, "0.85", product.updated_at)),
  ];

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=1800",
    },
  });
};
