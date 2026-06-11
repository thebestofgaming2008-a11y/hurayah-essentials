const PRIMARY_HOST = "hurayrahessentials.com";
const LEGACY_HOSTS = new Set(["abuhurayrahessentials.site", "www.abuhurayrahessentials.site"]);
const SITE_ORIGIN = `https://${PRIMARY_HOST}`;
const DEFAULT_IMAGE = `${SITE_ORIGIN}/hurayrah-icon-512.png`;

type Env = {
  MEDIA_BUCKET?: R2Bucket;
  VITE_CONVEX_URL?: string;
};

type SeoMeta = {
  title: string;
  description: string;
  canonical: string;
  image: string;
  jsonLd?: Record<string, unknown>;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanText(value: unknown, fallback = "") {
  return String(value ?? fallback).replace(/\s+/g, " ").trim();
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1).trim()}…` : value;
}

function absoluteUrl(url: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${url.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function getProductBySlug(requestUrl: URL, slug: string) {
  const endpoint = new URL(`/api/catalog/product?slug=${encodeURIComponent(slug)}`, requestUrl.origin);
  const response = await fetch(endpoint.toString(), {
    headers: { accept: "application/json" },
  });
  if (!response.ok) return null;
  const product = await response.json().catch(() => null);
  return product && !product.error ? product as Record<string, unknown> : null;
}

async function routeMeta(request: Request): Promise<SeoMeta> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const canonical = `${SITE_ORIGIN}${path === "/" ? "/" : path}`;
  const homeDescription = "Authentic Islamic books, modest clothing and essentials from Hurayrah Essentials, delivered across India with international WhatsApp ordering.";

  if (path.startsWith("/product/")) {
    const slug = decodeURIComponent(path.split("/").filter(Boolean)[1] ?? "");
    const product = slug ? await getProductBySlug(url, slug) : null;
    if (product) {
      const name = cleanText(product.name, "Hurayrah Essentials product");
      const description = truncate(
        cleanText(product.short_description || product.description, `Buy ${name} from Hurayrah Essentials.`),
        155,
      );
      const image = cleanText(product.cover_image_url, DEFAULT_IMAGE);
      const price = Number(product.sale_price_inr ?? product.price_inr ?? product.price ?? 0);
      return {
        title: `${name} | Hurayrah Essentials`,
        description,
        canonical,
        image,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Product",
          name,
          description,
          image,
          url: canonical,
          brand: { "@type": "Brand", name: "Hurayrah Essentials" },
          offers: price > 0 ? {
            "@type": "Offer",
            priceCurrency: "INR",
            price,
            availability: Number(product.stock_quantity ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: canonical,
          } : undefined,
        },
      };
    }
  }

  if (path === "/shop") {
    return {
      title: "Shop Islamic Books, Clothing and Essentials | Hurayrah Essentials",
      description: "Browse authentic Islamic books, modest clothing and everyday essentials from Hurayrah Essentials.",
      canonical,
      image: DEFAULT_IMAGE,
    };
  }

  if (path.startsWith("/category/")) {
    const key = decodeURIComponent(path.split("/").filter(Boolean)[1] ?? "");
    const label = key ? key.charAt(0).toUpperCase() + key.slice(1) : "Collection";
    return {
      title: `${label} Collection | Hurayrah Essentials`,
      description: `Shop the ${label.toLowerCase()} collection at Hurayrah Essentials.`,
      canonical,
      image: DEFAULT_IMAGE,
    };
  }

  if (path === "/contact") {
    return {
      title: "Contact Hurayrah Essentials",
      description: "Contact Hurayrah Essentials for order help, WhatsApp support, product questions and store information.",
      canonical,
      image: DEFAULT_IMAGE,
    };
  }

  if (path === "/about") {
    return {
      title: "About Hurayrah Essentials",
      description: "Learn about Hurayrah Essentials and its mission to make authentic Islamic books and essentials accessible.",
      canonical,
      image: DEFAULT_IMAGE,
    };
  }

  return {
    title: "Hurayrah Essentials — Seek Knowledge Affordably",
    description: homeDescription,
    canonical,
    image: DEFAULT_IMAGE,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Hurayrah Essentials",
      url: SITE_ORIGIN,
      logo: DEFAULT_IMAGE,
      sameAs: ["https://www.instagram.com/hurayrah_essentials"],
    },
  };
}

function upsertMeta(html: string, meta: SeoMeta) {
  const replacements: Array<[RegExp, string]> = [
    [/<title>.*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`],
    [/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeHtml(meta.description)}" />`],
    [/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`],
    [/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(meta.title)}" />`],
    [/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(meta.description)}" />`],
    [/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`],
    [/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${escapeHtml(absoluteUrl(SITE_ORIGIN, meta.image))}" />`],
    [/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${escapeHtml(absoluteUrl(SITE_ORIGIN, meta.image))}" />`],
  ];
  let next = html;
  for (const [pattern, replacement] of replacements) {
    next = next.match(pattern) ? next.replace(pattern, replacement) : next.replace("</head>", `${replacement}\n  </head>`);
  }
  if (!/name="twitter:title"/i.test(next)) {
    next = next.replace("</head>", `    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />\n  </head>`);
  }
  if (!/name="twitter:description"/i.test(next)) {
    next = next.replace("</head>", `    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />\n  </head>`);
  }
  if (meta.jsonLd) {
    next = next.replace("</head>", `    <script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, "\\u003c")}</script>\n  </head>`);
  }
  return next;
}

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  const url = new URL(request.url);
  if (LEGACY_HOSTS.has(url.hostname)) {
    url.hostname = PRIMARY_HOST;
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }
  if (url.hostname === `www.${PRIMARY_HOST}`) {
    url.hostname = PRIMARY_HOST;
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }
  const response = await next();
  const contentType = response.headers.get("content-type") ?? "";
  if (request.method !== "GET" || !contentType.includes("text/html")) {
    return response;
  }

  const meta = await routeMeta(request);
  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  return new Response(upsertMeta(html, meta), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
