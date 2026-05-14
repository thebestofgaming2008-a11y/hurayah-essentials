import { cn } from "@/lib/utils";

const methods = [
  { label: "VISA", className: "bg-[#1434CB] text-white" },
  { label: "Mastercard", className: "bg-[#111827] text-white" },
  { label: "AMEX", className: "bg-[#2E77BC] text-white" },
  { label: "Diners", className: "bg-[#0A5A8F] text-white" },
  { label: "RuPay", className: "bg-white text-[#172554] border border-zinc-200" },
  { label: "UPI", className: "bg-[#F5F5F5] text-zinc-700 border border-zinc-200" },
];

export function PaymentMethods({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[10px] font-medium uppercase tracking-widest text-[rgb(var(--vibe-muted))]">
        Secure payments by Razorpay
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {methods.map((method) => (
          <span
            key={method.label}
            className={cn(
              "grid place-items-center rounded px-2 font-sans font-bold tracking-normal shadow-sm",
              compact ? "h-6 min-w-10 text-[9px]" : "h-7 min-w-12 text-[10px]",
              method.className,
            )}
          >
            {method.label}
          </span>
        ))}
      </div>
    </div>
  );
}
