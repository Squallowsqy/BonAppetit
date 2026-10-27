"use client";

import Link from "next/link";

export type RecipeNavItem = {
  slug: string;
  title_fr: string;
  label?: string;
};

type Props = {
  items: RecipeNavItem[];
  currentSlug: string;
};

export function RecipeNav({ items, currentSlug }: Props) {
  if (items.length < 2) return null;
  const idx = items.findIndex((x) => x.slug === currentSlug);
  if (idx < 0) return null;

  const prev = idx > 0 ? items[idx - 1] : null;
  const next = idx < items.length - 1 ? items[idx + 1] : null;

  return (
    <nav
      className="ba-recipe-nav mt-10 border-t border-[var(--separator)] pt-5"
      aria-label="Navigation entre recettes"
    >
      <div className="flex items-stretch gap-2">
        {prev ? (
          <Link
            href={`/menu/recipes/${prev.slug}`}
            className="ba-btn ba-btn-tinted min-w-0 flex-1 !h-auto !min-h-[3.25rem] flex-col !items-start !gap-0.5 !px-3.5 !py-2.5"
          >
            <span className="ba-caption">← {prev.label || "Précédente"}</span>
            <span className="ba-headline line-clamp-2 text-left text-[0.9rem]">
              {prev.title_fr}
            </span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/menu/recipes/${next.slug}`}
            className="ba-btn ba-btn-tinted min-w-0 flex-1 !h-auto !min-h-[3.25rem] flex-col !items-end !gap-0.5 !px-3.5 !py-2.5"
          >
            <span className="ba-caption">{next.label || "Suivante"} →</span>
            <span className="ba-headline line-clamp-2 text-right text-[0.9rem]">
              {next.title_fr}
            </span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </div>
      <p className="ba-footnote mt-2 text-center">
        {idx + 1} / {items.length}
      </p>
    </nav>
  );
}
