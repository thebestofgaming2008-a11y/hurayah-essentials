import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type RatesResponse = {
  base: string;
  rates: Record<string, number>;
  source?: string;
  sourceTimestamp?: string;
  fetchedAt?: string;
  stale?: boolean;
};

type CurrencyContextValue = {
  currency: string;
  currencies: string[];
  loading: boolean;
  sourceTimestamp: string | null;
  rateSource: "live" | "fallback" | "cached";
  rateError: string | null;
  setCurrency: (currency: string) => void;
  convertFromInr: (amount: number | null | undefined) => number | null;
  format: (amountInr: number | null | undefined) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);
const STORAGE_KEY = "he_currency_v1";
const MANUAL_KEY = "he_currency_manual_v1";
const RATES_CACHE_KEY = "he_currency_rates_v2";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6h

const FALLBACK_RATES: RatesResponse = {
  base: "INR",
  rates: { INR: 1, USD: 0.012, GBP: 0.0095, EUR: 0.011, AED: 0.044, SAR: 0.045 },
  source: "fallback",
};

const PREFERRED_CURRENCIES = ["INR", "USD", "GBP", "EUR", "AED", "SAR"];

function symbolFor(currency: string) {
  const map: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "د.إ", SAR: "﷼" };
  return map[currency] ?? currency;
}

async function fetchExchangeRates(): Promise<RatesResponse> {
  const appRates = await fetch("/api/rates", { headers: { accept: "application/json" } }).catch(() => null);
  if (appRates?.ok) {
    const data = await appRates.json();
    if (data?.rates) return data as RatesResponse;
  }
  const apiKey = import.meta.env.VITE_EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    console.warn("VITE_EXCHANGE_RATE_API_KEY missing; using fallback rates");
    return FALLBACK_RATES;
  }
  const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/INR`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Exchange rate API ${res.status}`);
  const data = await res.json();
  if (data.result !== "success") throw new Error(`Exchange rate API: ${data["error-type"] ?? "unknown"}`);
  return {
    base: data.base_code ?? "INR",
    rates: data.conversion_rates ?? {},
    source: "exchangerate-api.com",
    sourceTimestamp: data.time_last_update_utc ?? undefined,
    fetchedAt: new Date().toISOString(),
  };
}

function readCache(): RatesResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RatesResponse & { _cachedAt?: number };
    if (!parsed._cachedAt || Date.now() - parsed._cachedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rates: RatesResponse) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ ...rates, _cachedAt: Date.now() }));
  } catch {
    /* noop */
  }
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [rates, setRates] = useState<RatesResponse>(() => readCache() ?? FALLBACK_RATES);
  const [rateError, setRateError] = useState<string | null>(null);
  const [currency, setCurrencyState] = useState("INR");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, "INR");
    localStorage.removeItem(MANUAL_KEY);
  }, []);

  const currencies = useMemo(() => ["INR"], []);

  const setCurrency = useCallback((_next: string) => {
    setCurrencyState("INR");
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "INR");
      localStorage.removeItem(MANUAL_KEY);
    }
  }, []);

  const convertFromInr = useCallback(
    (amount: number | null | undefined) => {
      if (amount == null) return null;
      if (currency === "INR") return amount;
      const inrRate = rates.rates?.INR;
      const targetRate = rates.rates?.[currency];
      if (!inrRate || !targetRate) return amount;
      return (amount / inrRate) * targetRate;
    },
    [currency, rates],
  );

  const format = useCallback(
    (amountInr: number | null | undefined) => {
      const converted = convertFromInr(amountInr);
      if (converted == null) return "-";
      if (currency === "INR") return `₹${Math.round(converted).toLocaleString("en-IN")}`;
      return `${symbolFor(currency)}${converted.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [convertFromInr, currency],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      currencies,
      loading,
      sourceTimestamp: rates.sourceTimestamp ?? rates.fetchedAt ?? null,
      rateSource: rates.source === "exchangerate-api.com" ? "live" : rates.source === "cached" ? "cached" : "fallback",
      rateError,
      setCurrency,
      convertFromInr,
      format,
    }),
    [convertFromInr, currencies, currency, format, loading, rateError, rates.fetchedAt, rates.source, rates.sourceTimestamp, setCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
