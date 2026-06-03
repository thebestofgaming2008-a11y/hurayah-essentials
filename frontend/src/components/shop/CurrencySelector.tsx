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

export function CurrencySelector({
  className = "",
  label = false,
  variant = "bar",
}: {
  className?: string;
  label?: boolean;
  variant?: "bar" | "menu" | "footer";
}) {
  const { currency, currencies, setCurrency } = useCurrency();
  const shellClass =
    variant === "bar"
      ? "bg-brand text-brand-foreground"
      : variant === "menu"
        ? "border border-foreground/10 bg-white/65 text-foreground"
        : "border border-border bg-background text-foreground";
  const selectClass = variant === "bar" ? "text-[18px]" : "text-[14px]";
  const symbolClass = variant === "bar" ? "text-[24px]" : "text-[16px] font-semibold";
  return (
    <label className={cn("commerce-shell block text-[11px] text-[rgb(var(--vibe-muted))]", className)}>
      {label && <span className={cn("mb-1 block", variant === "menu" && "px-1 text-foreground/55", variant === "footer" && "text-foreground/55")}>Currency</span>}
      <span className={cn("relative flex h-9 min-w-[112px] items-center overflow-hidden rounded-md", shellClass)}>
        <ChevronDown className="pointer-events-none absolute left-3 h-3.5 w-3.5" />
        <select
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          className={cn("h-full w-full cursor-pointer appearance-none bg-transparent pl-9 pr-9 text-center font-medium outline-none", selectClass)}
          aria-label="Select currency"
        >
          {currencies.map((item) => (
            <option key={item} value={item} className="bg-white text-zinc-900">
              {item}
            </option>
          ))}
        </select>
        <span className={cn("pointer-events-none absolute right-3 leading-none", symbolClass)}>{SYMBOLS[currency] ?? currency}</span>
      </span>
    </label>
  );
}
