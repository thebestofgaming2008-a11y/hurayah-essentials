type Env = {
  EXCHANGE_RATE_API_KEY?: string;
  RATES_CACHE?: KVNamespace;
};

const FALLBACK_RATES = { INR: 1, USD: 0.012, GBP: 0.0095, EUR: 0.011, AED: 0.044, SAR: 0.045 };
const CACHE_KEY = "rates:INR:v2";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const cached = await env.RATES_CACHE?.get(CACHE_KEY);
  if (cached) {
    return new Response(cached, {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  let body = {
    base: "INR",
    rates: FALLBACK_RATES,
    source: "fallback",
    fetchedAt: new Date().toISOString(),
    error: env.EXCHANGE_RATE_API_KEY ? null : "EXCHANGE_RATE_API_KEY is not configured.",
  };

  if (env.EXCHANGE_RATE_API_KEY) {
    try {
      const res = await fetch(`https://v6.exchangerate-api.com/v6/${env.EXCHANGE_RATE_API_KEY}/latest/INR`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.result === "success" && data?.conversion_rates) {
        body = {
          base: "INR",
          rates: data.conversion_rates,
          source: "exchangerate-api.com",
          fetchedAt: new Date().toISOString(),
          error: null,
        };
      } else {
        body.error = data?.["error-type"] || `ExchangeRate-API returned ${res.status}`;
      }
    } catch (error) {
      body.error = error instanceof Error ? error.message : "ExchangeRate-API request failed.";
    }
  }

  if (body.source === "exchangerate-api.com") {
    await env.RATES_CACHE?.put(CACHE_KEY, JSON.stringify(body), { expirationTtl: 60 * 60 * 24 });
  }
  return Response.json(body, {
    headers: {
      "cache-control": body.source === "exchangerate-api.com" ? "public, max-age=3600" : "no-store",
    },
  });
};
