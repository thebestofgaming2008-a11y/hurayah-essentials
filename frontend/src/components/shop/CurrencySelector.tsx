import { ChevronDown } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

const SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  SAR: "ر.س",
  CAD: "$",
  AUD: "$",
  SGD: "$",
  MYR: "RM",
  QAR: "ر.ق",
  KWD: "د.ك",
  ZAR: "R",
};

export function CurrencySelector({ className = "", label = false }: { className?: string; label?: boolean }) {
  const { currency, currencies, setCurrency } = useCurrency();
  return (
    <label className={cn("commerce-shell block text-[11px] text-[rgb(var(--vibe-muted))]", className)}>
      {label && <span className="mb-1 block">Currency Selector</span>}
      <span className="relative flex h-9 min-w-[112px] items-center overflow-hidden rounded-none bg-brand text-brand-foreground">
        <ChevronDown className="pointer-events-none absolute left-3 h-3.5 w-3.5" />
        <select
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          className="h-full w-full cursor-pointer appearance-none bg-transparent pl-9 pr-9 text-center text-[18px] font-medium outline-none"
          aria-label="Select currency"
        >
          {currencies.map((item) => (
            <option key={item} value={item} className="bg-white text-zinc-900">
              {item}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 text-[24px] leading-none">{SYMBOLS[currency] ?? currency}</span>
      </span>
    </label>
  );
}
