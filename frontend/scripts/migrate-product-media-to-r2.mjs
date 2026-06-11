import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const BACKUP_DIR = "D:/DOWNLOADS/hurayah-r2-migration-backups";
const TMP_DIR = join(BACKUP_DIR, "tmp-product-media");
const BUCKET = "hurayah-product-media";
const PUBLIC_BASE = "https://media.abuhurayrahessentials.site";
const CONFIRMATION = "MIGRATE_PRODUCT_MEDIA_TO_R2_2026_06_07";

const npx = "npx";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

mkdirSync(BACKUP_DIR, { recursive: true });
mkdirSync(TMP_DIR, { recursive: true });

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: ROOT,
    stdio: options.stdio ?? "pipe",
    encoding: options.encoding ?? "utf8",
    shell: process.platform === "win32",
  });
}

function envValue(name) {
  try {
    const env = readFileSync(join(ROOT, ".env.local"), "utf8");
    const match = env.match(new RegExp(`^${name}=(.+)$`, "m"));
    return match?.[1]?.trim().replace(/^"|"$/g, "");
  } catch {
    return undefined;
  }
}

function cleanUrl(url) {
  return String(url ?? "").split("#")[0];
}

function isRemoteMedia(url) {
  const value = cleanUrl(url);
  if (!/^https?:\/\//i.test(value)) return false;
  if (value.startsWith(PUBLIC_BASE)) return false;
  return /\.(avif|gif|jpe?g|png|webp|mp4|webm)(\?|$)/i.test(value) || /cloudinary\.com|supabase\.co/i.test(value);
}

function collectMediaUrls(product) {
  const urls = new Set();
  const visit = (value, key = "") => {
    if (typeof value === "string") {
      if ((key === "cover_image_url" || key === "images" || key === "image" || key === "image_url" || key === "url") && isRemoteMedia(value)) {
        urls.add(cleanUrl(value));
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, key);
      return;
    }
    if (value && typeof value === "object") {
      for (const [childKey, childValue] of Object.entries(value)) visit(childValue, childKey);
    }
  };
  visit(product);
  return [...urls];
}

function extensionFor(url, contentType) {
  const type = String(contentType ?? "").toLowerCase();
  if (type.includes("avif")) return ".avif";
  if (type.includes("gif")) return ".gif";
  if (type.includes("jpeg") || type.includes("jpg")) return ".jpg";
  if (type.includes("png")) return ".png";
  if (type.includes("webp")) return ".webp";
  if (type.includes("mp4")) return ".mp4";
  if (type.includes("webm")) return ".webm";
  const parsed = new URL(url);
  const ext = extname(parsed.pathname).toLowerCase();
  return ext || ".bin";
}

function safeName(url) {
  const parsed = new URL(url);
  return basename(parsed.pathname).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(0, 80) || "media";
}

const productsRaw = run(npx, ["convex", "data", "products", "--prod", "--limit", "500", "--format", "json"]);
const products = JSON.parse(productsRaw);
const backupPath = join(BACKUP_DIR, `products-before-full-r2-media-${stamp}.json`);
writeFileSync(backupPath, JSON.stringify(products, null, 2));

const urls = [...new Set(products.flatMap(collectMediaUrls))].sort();
const replacements = [];
const failures = [];

console.log(`Found ${products.length} products and ${urls.length} non-R2 media URLs.`);

for (let index = 0; index < urls.length; index += 1) {
  const url = urls[index];
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 20);
  try {
    const response = await fetch(url, { headers: { "user-agent": "HurayahR2Migration/1.0" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const ext = extensionFor(url, contentType);
    const filePath = join(TMP_DIR, `${hash}${ext}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    writeFileSync(filePath, bytes);

    const key = `migrated/products/${hash}-${safeName(url).replace(/\.[a-z0-9]+$/i, "")}${ext}`;
    run(npx, ["wrangler", "r2", "object", "put", `${BUCKET}/${key}`, "--file", filePath, "--remote", "--content-type", contentType], { stdio: "pipe" });
    const to = `${PUBLIC_BASE}/${key}`;
    replacements.push({ from: url, to });
    console.log(`[${index + 1}/${urls.length}] ${Math.round(bytes.length / 1024)}KB -> ${to}`);
  } catch (error) {
    failures.push({ url, error: error instanceof Error ? error.message : String(error) });
    console.error(`[${index + 1}/${urls.length}] FAILED ${url}: ${failures.at(-1).error}`);
  }
}

const mapPath = join(BACKUP_DIR, `product-media-r2-map-${stamp}.json`);
writeFileSync(mapPath, JSON.stringify({ createdAt: new Date().toISOString(), backupPath, replacements, failures }, null, 2));

if (failures.length) {
  console.error(`Stopped before database update because ${failures.length} downloads/uploads failed. Map: ${mapPath}`);
  process.exit(1);
}

if (replacements.length) {
  const argsPath = join(BACKUP_DIR, `product-media-r2-mutation-args-${stamp}.json`);
  writeFileSync(argsPath, JSON.stringify({ confirmation: CONFIRMATION, replacements }));
  const convexUrl = envValue("VITE_CONVEX_URL");
  if (!convexUrl) throw new Error("VITE_CONVEX_URL is missing from .env.local.");
  const mutationResponse = await fetch(`${convexUrl.replace(/\/+$/, "")}/api/mutation`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      path: "r2MediaMigration:replaceProductMediaUrls",
      args: JSON.parse(readFileSync(argsPath, "utf8")),
      format: "json",
    }),
  });
  const mutationText = await mutationResponse.text();
  console.log(mutationText);
  if (!mutationResponse.ok || !mutationText.includes('"status":"success"')) {
    throw new Error(`Convex mutation failed: ${mutationText}`);
  }
}

rmSync(TMP_DIR, { recursive: true, force: true });
console.log(`Done. Backup: ${backupPath}`);
console.log(`Map: ${mapPath}`);
