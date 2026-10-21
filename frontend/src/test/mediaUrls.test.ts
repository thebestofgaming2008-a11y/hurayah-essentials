import { describe, expect, it } from "vitest";
import { mediaUrl, normalizeMediaUrls } from "../../shared/mediaUrls";
import { productCardThumbnailUrl, productImage } from "../data/products";
import type { Product } from "../services/productService";

const oldUrl = "https://media.abuhurayrahessentials.site/media/book%20cover.jpg?v=2#cover.jpg";
const newUrl = "https://media.hurayrahessentials.com/media/book%20cover.jpg?v=2#cover.jpg";

describe("media domain recovery", () => {
  it("preserves object paths, query strings and upload filename fragments", () => {
    expect(mediaUrl(oldUrl)).toBe(newUrl);
    expect(mediaUrl(newUrl)).toBe(newUrl);
  });

  it.each([
    "/images/local.jpg", "blob:https://hurayrahessentials.com/id", "Not a URL", "",
    "https://elsewhere.example/book.jpg",
    "https://media.abuhurayrahessentials.site.evil.example/book.jpg",
    "https://example.com/media.abuhurayrahessentials.site/book.jpg",
  ])("does not alter unrelated values: %s", (value) => {
    expect(mediaUrl(value)).toBe(value);
  });

  it("repairs cached product, cart and order data without mutating the original or amounts", () => {
    const original = { images: [oldUrl], items: [{ image: oldUrl, quantity: 2, price: 500 }], status: "paid", value: null };
    expect(normalizeMediaUrls(original)).toEqual({ images: [newUrl], items: [{ image: newUrl, quantity: 2, price: 500 }], status: "paid", value: null });
    expect(original.images).toEqual([oldUrl]);
    expect(normalizeMediaUrls(undefined)).toBeUndefined();
  });

  it("generates thumbnails on the current domain and keeps an original-image fallback", () => {
    expect(productImage({ cover_image_url: oldUrl } as Product)).toBe(newUrl);
    expect(productCardThumbnailUrl(oldUrl)).toBe("https://media.hurayrahessentials.com/thumbnails/w420/media_book_cover.jpg.webp");
    expect(productCardThumbnailUrl("https://elsewhere.example/book.jpg")).toBeNull();
    expect(productCardThumbnailUrl("https://media.hurayrahessentials.com/thumbnails/w420/a.webp")).toBeNull();
  });
});
