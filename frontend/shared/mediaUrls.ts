export const MEDIA_IMAGE_HOST = "media.hurayrahessentials.com";
const LEGACY_MEDIA_HOST = "media.abuhurayrahessentials.site";

export function mediaUrl(value: string): string {
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.hostname !== LEGACY_MEDIA_HOST) return value;
    url.hostname = MEDIA_IMAGE_HOST;
    url.protocol = "https:";
    url.port = "";
    return url.toString();
  } catch {
    return value;
  }
}

// Normalize JSON responses and saved carts without rewriting production records.
export function normalizeMediaUrls<T>(value: T): T {
  if (typeof value === "string") return mediaUrl(value) as T;
  if (Array.isArray(value)) return value.map(normalizeMediaUrls) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeMediaUrls(entry)]),
    ) as T;
  }
  return value;
}
