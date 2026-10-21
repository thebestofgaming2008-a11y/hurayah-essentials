// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateRates } from "../../scripts/check-store-health.mjs";

const now = Date.now();
const data = { source: "exchangerate-api.com", base: "INR", fetchedAt: new Date(now).toISOString(), rates: Object.fromEntries(["INR", "USD", "EUR", "GBP", "AED", "SAR", "CAD", "AUD", "SGD", "MYR", "QAR", "KWD", "ZAR"].map((c) => [c, 1])) };
describe("live health checks", () => {
  it("accepts recent complete provider rates", () => expect(validateRates(data, now)).toBe(true));
  it("alerts on fallback even when the endpoint returns HTTP 200", () => expect(validateRates({ ...data, source: "fallback" }, now)).toBe(false));
  it("alerts before a stale-rate reserve expires", () => expect(validateRates({ ...data, stale: true }, now)).toBe(false));
  it("alerts when the cache stops refreshing", () => expect(validateRates(data, now + 3 * 3600000)).toBe(false));
  it("rejects missing currencies", () => expect(validateRates({ ...data, rates: { INR: 1 } }, now)).toBe(false));
});
