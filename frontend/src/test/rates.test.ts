// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequestGet } from "../../functions/api/rates";

const rates = { INR: 1, USD: 0.011, EUR: 0.01, GBP: 0.008, AED: 0.04, SAR: 0.04, CAD: 0.015, AUD: 0.017, SGD: 0.014, MYR: 0.045, QAR: 0.04, KWD: 0.003, ZAR: 0.19 };
const snapshot = (age = 0) => ({ base: "INR", rates, source: "exchangerate-api.com", fetchedAt: new Date(Date.now() - age).toISOString(), sourceUpdatedAt: null });
let cache: { match: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };
let bucket: { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  cache = { match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) };
  bucket = { get: vi.fn().mockResolvedValue(null), put: vi.fn().mockResolvedValue(undefined) };
  fetchMock = vi.fn();
  vi.stubGlobal("caches", { default: cache });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

async function request() {
  return onRequestGet({ request: new Request("https://shop.example/api/rates"), env: { EXCHANGE_RATE_API_KEY: " test-secret \n", MEDIA_BUCKET: bucket } } as never);
}

describe("exchange-rate delivery", () => {
  it("authenticates server-side and stores only verified provider data", async () => {
    fetchMock.mockResolvedValue(Response.json({ result: "success", base_code: "INR", conversion_rates: rates }));
    const response = await request();
    const body = await response.json();
    expect(body).toMatchObject({ source: "exchangerate-api.com", rates, stale: false, error: null });
    expect(fetchMock).toHaveBeenCalledWith("https://v6.exchangerate-api.com/v6/latest/INR", expect.objectContaining({ headers: { Authorization: "Bearer test-secret", Accept: "application/json" } }));
    expect(bucket.put).toHaveBeenCalledOnce();
    expect(JSON.stringify(body)).not.toContain("test-secret");
  });

  it("serves fresh snapshots without spending provider requests", async () => {
    bucket.get.mockResolvedValue({ json: async () => snapshot() });
    expect((await (await request()).json()).rates).toEqual(rates);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps recent verified rates during an outage with a short retry cache", async () => {
    bucket.get.mockResolvedValue({ json: async () => snapshot(2 * 3600000) });
    fetchMock.mockResolvedValue(new Response("Forbidden", { status: 403 }));
    const response = await request();
    expect(await response.json()).toMatchObject({ rates, stale: true, source: "exchangerate-api.com" });
    expect(response.headers.get("cache-control")).toContain("max-age=300");
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("never uses expired or guessed conversion rates", async () => {
    bucket.get.mockResolvedValue({ json: async () => snapshot(49 * 3600000) });
    fetchMock.mockRejectedValue(new Error("sensitive network details"));
    const body = await (await request()).json();
    expect(body).toMatchObject({ rates: { INR: 1 }, source: "fallback" });
    expect(JSON.stringify(body)).not.toContain("sensitive");
  });

  it("rejects incomplete provider rates", async () => {
    fetchMock.mockResolvedValue(Response.json({ result: "success", base_code: "INR", conversion_rates: { INR: 1, USD: -1 } }));
    expect((await (await request()).json()).rates).toEqual({ INR: 1 });
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("continues when storage is unavailable", async () => {
    bucket.get.mockRejectedValue(new Error("R2 unavailable"));
    bucket.put.mockRejectedValue(new Error("R2 unavailable"));
    fetchMock.mockResolvedValue(Response.json({ result: "success", base_code: "INR", conversion_rates: rates }));
    expect((await (await request()).json()).source).toBe("exchangerate-api.com");
  });

  it("uses the edge cache without calling storage or the provider", async () => {
    cache.match.mockResolvedValue(Response.json(snapshot()));
    expect((await (await request()).json()).rates).toEqual(rates);
    expect(bucket.get).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
