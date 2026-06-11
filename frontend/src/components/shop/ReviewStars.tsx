import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

export function RatingStars({
  rating,
  count,
  size = "md",
  className,
}: {
  rating: number | null | undefined;
  count?: number;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="inline-flex items-center gap-0.5" aria-label={`${safeRating.toFixed(1)} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = Math.max(0, Math.min(1, safeRating - (star - 1))) * 100;
          return (
            <span key={star} className={cn("relative inline-grid text-[#d5dae8]", sizes[size])} aria-hidden="true">
              <Star className={cn("absolute inset-0", sizes[size])} strokeWidth={1.7} />
              <span className="absolute inset-0 overflow-hidden text-[#d1a21e]" style={{ width: `${fill}%` }}>
                <Star className={cn("fill-current", sizes[size])} strokeWidth={1.7} />
              </span>
            </span>
          );
        })}
      </span>
      {typeof count === "number" && (
        <span className="text-[12px] text-foreground/55">
          {safeRating.toFixed(1)} · {count} {count === 1 ? "review" : "reviews"}
        </span>
      )}
    </span>
  );
}

export function StarRatingInput({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? value;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const selected = star <= active;
          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-md border border-transparent text-[#b8becf] outline-none transition-all hover:border-brand/15 hover:bg-hero/45 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60",
                selected && "text-[#d1a21e]",
              )}
              aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
            >
              <Star className={cn("h-5 w-5", selected && "fill-current")} strokeWidth={1.7} />
            </button>
          );
        })}
      </div>
      <span className="text-[12px] font-medium text-foreground/55">{value}/5</span>
    </div>
  );
}
