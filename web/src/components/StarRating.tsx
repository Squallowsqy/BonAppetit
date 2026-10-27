"use client";

import type { RecipeRating } from "@/lib/types";

const LABELS = ["Médiocre", "Moyen", "Correct", "Bon", "Excellent"] as const;

type Props = {
  value: number | null | undefined;
  onChange: (stars: RecipeRating) => void;
  size?: "sm" | "md";
  /** Affiche le libellé sous les étoiles (md). */
  showLabel?: boolean;
  className?: string;
  disabled?: boolean;
};

export function StarRating({
  value,
  onChange,
  size = "md",
  showLabel = false,
  className = "",
  disabled = false,
}: Props) {
  const current = value && value >= 1 && value <= 5 ? value : 0;
  const starClass =
    size === "sm"
      ? "text-[1.05rem] leading-none"
      : "text-[1.45rem] leading-none";

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <div
        className="inline-flex items-center gap-0.5"
        role="radiogroup"
        aria-label="Note sur 5"
      >
        {([1, 2, 3, 4, 5] as const).map((n) => {
          const filled = n <= current;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={current === n}
              aria-label={`${n} étoile${n > 1 ? "s" : ""} — ${LABELS[n - 1]}`}
              disabled={disabled}
              className={`ba-press rounded-md px-0.5 transition-colors disabled:opacity-50 ${starClass}`}
              style={{
                color: filled ? "var(--basil)" : "var(--tertiary-label, var(--secondary-label))",
              }}
              onClick={() => onChange(n)}
            >
              {filled ? "★" : "☆"}
            </button>
          );
        })}
      </div>
      {showLabel && size !== "sm" ? (
        <p className="ba-caption">
          {current
            ? `${LABELS[current - 1]} · ${current}/5`
            : "Laisse ton avis"}
        </p>
      ) : null}
    </div>
  );
}
