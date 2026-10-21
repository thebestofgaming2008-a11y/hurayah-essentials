export function safeRedirect(value: string | null | undefined): string {
  const fallback = "/account";
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20]|%2f|%5c/i.test(value)) return fallback;
  try {
    const url = new URL(value, "https://store.invalid");
    if (url.origin !== "https://store.invalid" || url.pathname.startsWith("//")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
