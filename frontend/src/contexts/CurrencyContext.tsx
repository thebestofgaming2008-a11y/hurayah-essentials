import { createContext, useCallback, useContext, useEffect, useMemo } from "react";

type CurrencyContextValue = {
  currency: string;
  currencies: string[];
  loading: boolean;
  sourceTimestamp: string | null;
  rateSource: "fallback";
  rateError: string | null;
  setCurrency: (currency: string) => void;
  convertFromInr: (amount: number | null | undefined) => number | null;
  format: (amountInr: number | null | undefined) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);
const STORAGE_KEY = "he_currency_v1";
const MANUAL_KEY = "he_currency_manual_v1";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, "INR");
    localStorage.removeItem(MANUAL_KEY);
  }, []);

  const setCurrency = useCallback((_next: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "INR");
      localStorage.removeItem(MANUAL_KEY);
    }
  }, []);

  const convertFromInr = useCallback((amount: number | null | undefined) => amount ?? null, []);

  const format = useCallback((amountInr: number | null | undefined) => {
    if (amountInr == null) return "-";
    return `₹${Math.round(amountInr).toLocaleString("en-IN")}`;
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency: "INR",
      currencies: ["INR"],
      loading: false,
      sourceTimestamp: null,
      rateSource: "fallback",
      rateError: null,
      setCurrency,
      convertFromInr,
      format,
    }),
    [convertFromInr, format, setCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
