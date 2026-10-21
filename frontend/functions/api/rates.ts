type Env = {
  EXCHANGE_RATE_API_KEY?: string;
  MEDIA_BUCKET?: R2Bucket;
};

type Rates = {
  base: "INR";
  rates: Record<string, number>;
  source: "exchangerate-api.com";
  fetchedAt: string;
  sourceUpdatedAt: string | null;
};

const SNAPSHOT_KEY = "exchange-rates/INR-v1.json";
const FRESH_MS = 60 * 60 * 1000;
const MAX_AGE_MS = 48 * FRESH_MS;
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SAR", "CAD", "AUD", "SGD", "MYR", "QAR", "KWD", "ZAR"];

function validRates(rates: unknown): rates is Record<string, number> {
  if (!rates || typeof rates !== "object") return false;
  const values = rates as Record<string, number>;
  return values.INR === 1 && CURRENCIES.every((code) => Number.isFinite(values[code]) && values[code] > 0);
}

function validSnapshot(value: unknown): value is Rates {
  if (!value || typeof value !== "object") return false;
  const data = value as Rates;
  const age = Date.now() - Date.parse(data.fetchedAt);
  return data.base === "INR" && data.source === "exchangerate-api.com" && validRates(data.rates) && age >= 0 && age <= MAX_AGE_MS;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const cache = caches.default;
  const key = new Request(`${new URL(request.url).origin}/api/rates?cache=v3`);
  const hit = await cache.match(key).catch(() => undefined);
  if (hit) return hit;

  let saved: Rates | null = null;
  try {
    const object = await env.MEDIA_BUCKET?.get(SNAPSHOT_KEY);
    const value = object ? await object.json() : null;
    if (validSnapshot(value)) saved = value;
  } catch {
    // A cache failure must not prevent a request to the provider.
  }

  async function respond(data: Rates, stale = false) {
    const response = Response.json({ ...data, stale, error: stale ? "Using recently verified exchange rates while the provider is unavailable." : null }, {
      headers: { "cache-control": `public, max-age=${stale ? 300 : 3600}` },
    });
    await cache.put(key, response.clone()).catch(() => undefined);
    return response;
  }

  if (saved && Date.now() - Date.parse(saved.fetchedAt) < FRESH_MS) return respond(saved);

  let error = "Exchange rates are temporarily unavailable.";
  const apiKey = env.EXCHANGE_RATE_API_KEY?.trim();
  if (apiKey) {
    try {
      const res = await fetch("https://v6.exchangerate-api.com/v6/latest/INR", {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.result === "success" && data.base_code === "INR" && validRates(data.conversion_rates)) {
        const body: Rates = {
          base: "INR",
          rates: data.conversion_rates,
          source: "exchangerate-api.com",
          fetchedAt: new Date().toISOString(),
          sourceUpdatedAt: typeof data.time_last_update_utc === "string" ? data.time_last_update_utc : null,
        };
        await env.MEDIA_BUCKET?.put(SNAPSHOT_KEY, JSON.stringify(body), {
          httpMetadata: { contentType: "application/json" },
        }).catch(() => undefined);
        return respond(body);
      }
      error = `Exchange-rate provider unavailable (${res.status}).`;
    } catch {
      // Do not expose provider URLs, credentials or raw network errors to visitors.
      error = "Exchange-rate provider could not be reached.";
    }
  }
  if (saved) return respond(saved, true);

  // Never substitute guessed rates when neither the provider nor a recent snapshot works.
  const response = Response.json({ base: "INR", rates: { INR: 1 }, source: "fallback", error }, {
    headers: { "cache-control": "public, max-age=60" },
  });
  await cache.put(key, response.clone()).catch(() => undefined);
  return response;
};
