import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type CurrencyContextValue = {
  currency: string;
  currencies: string[];
  detectedCountry: string | null;
  loading: boolean;
  sourceTimestamp: string | null;
  rateSource: "fallback";
  rateError: string | null;
  setCurrency: (currency: string) => void;
  convertFromInr: (amount: number | null | undefined) => number | null;
  format: (amountInr: number | null | undefined) => string;
};

type GeoResponse = {
  country?: string;
  currency?: string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);
const STORAGE_KEY = "he_currency_v1";
const MANUAL_KEY = "he_currency_manual_v1";
const COUNTRY_KEY = "he_detected_country_v1";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SAR", "CAD", "AUD", "SGD", "MYR", "QAR", "KWD", "ZAR"] as const;
const INR_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
  AED: 0.044,
  SAR: 0.045,
  CAD: 0.016,
  AUD: 0.018,
  SGD: 0.016,
  MYR: 0.056,
  QAR: 0.044,
  KWD: 0.0037,
  ZAR: 0.22,
};

function supportedCurrency(value: string | null | undefined) {
  const next = String(value ?? "").trim().toUpperCase();
  return CURRENCIES.includes(next as (typeof CURRENCIES)[number]) ? next : "INR";
}

function readStoredCurrency() {
  if (typeof window === "undefined") return "INR";
  return supportedCurrency(window.localStorage.getItem(STORAGE_KEY));
}

function hasManualCurrency() {
  return typeof window !== "undefined" && window.localStorage.getItem(MANUAL_KEY) === "1";
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState(readStoredCurrency);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(COUNTRY_KEY);
  });
  const [loading, setLoading] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [sourceTimestamp, setSourceTimestamp] = useState<string | null>(null);

  useEffect(() => {
    if (hasManualCurrency()) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/geo", { headers: { accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Geo lookup failed"))))
      .then((data: GeoResponse) => {
        if (cancelled) return;
        const nextCurrency = supportedCurrency(data.currency);
        const nextCountry = String(data.country ?? "").trim().toUpperCase() || null;
        setCurrencyState(nextCurrency);
        setDetectedCountry(nextCountry);
        setSourceTimestamp(new Date().toISOString());
        window.localStorage.setItem(STORAGE_KEY, nextCurrency);
        if (nextCountry) window.localStorage.setItem(COUNTRY_KEY, nextCountry);
      })
      .catch((error) => {
        if (!cancelled) setRateError(error instanceof Error ? error.message : "Could not detect currency");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((next: string) => {
    const clean = supportedCurrency(next);
    setCurrencyState(clean);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, clean);
      window.localStorage.setItem(MANUAL_KEY, "1");
    }
  }, []);

  const convertFromInr = useCallback(
    (amount: number | null | undefined) => {
      if (amount == null) return null;
      return amount * (INR_RATES[currency] ?? 1);
    },
    [currency],
  );

  const format = useCallback(
    (amountInr: number | null | undefined) => {
      const converted = convertFromInr(amountInr);
      if (converted == null) return "-";
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency,
        maximumFractionDigits: currency === "INR" ? 0 : 2,
      }).format(converted);
    },
    [convertFromInr, currency],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      currencies: [...CURRENCIES],
      detectedCountry,
      loading,
      sourceTimestamp,
      rateSource: "fallback",
      rateError,
      setCurrency,
      convertFromInr,
      format,
    }),
    [convertFromInr, currency, detectedCountry, format, loading, rateError, setCurrency, sourceTimestamp],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
