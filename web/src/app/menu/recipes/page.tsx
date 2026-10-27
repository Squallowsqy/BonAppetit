"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FadeIn } from "@/components/FadeIn";
import { RecipeImage } from "@/components/RecipeImage";
import { useFunnelStore } from "@/lib/funnel-store";
import { formatEUR } from "@/lib/pricing";

const PAGE_SIZE = 36;

type RecipeCard = {
  id: string;
  slug: string;
  title_fr: string;
  prepMin?: number | null;
  costBase?: number | null;
  baseServings?: number;
  image?: string | null;
  stepsCount?: number;
};

type PagePayload = {
  items: RecipeCard[];
  total: number;
  page: number;
  pageCount: number;
  hasMore: boolean;
};

function persistNav(list: RecipeCard[]) {
  try {
    sessionStorage.setItem(
      "ba-recipe-nav-explore",
      JSON.stringify(list.map((r) => ({ slug: r.slug, title_fr: r.title_fr })))
    );
  } catch {
    /* ignore */
  }
}

export default function RecipesPage() {
  const { plan } = useFunnelStore();
  const [explore, setExplore] = useState<RecipeCard[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recipes?limit=${PAGE_SIZE}&page=${p}`);
      const data = (await res.json()) as PagePayload;
      setExplore(data.items || []);
      setPage(data.page || p);
      setPageCount(data.pageCount || 1);
      setTotal(data.total || 0);
      persistNav(data.items || []);
    } catch {
      setExplore([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  return (
    <FadeIn className="py-4">
      <h1 className="ba-title text-[1.75rem]">Recettes</h1>

      {plan && plan.dinners.length > 0 && (
        <div className="mt-5">
          <p className="ba-caption mb-2 px-1 uppercase tracking-[0.04em]">
            {plan.horizon === "month" || plan.answers?.horizon === "month"
              ? "Ce mois"
              : "Cette semaine"}
          </p>
          <ul className="ba-grouped">
            {plan.dinners.map((d) => (
              <li key={d.recipeId}>
                <Link
                  href={`/menu/recipes/${d.slug}`}
                  className="ba-row ba-meal-row ba-press !gap-3"
                >
                  <div className="ba-recipe-thumb">
                    <RecipeImage src={d.image} alt={d.title_fr} />
                  </div>
                  <span className="ba-headline min-w-0 truncate">{d.title_fr}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8">
        <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
          <p className="ba-caption uppercase tracking-[0.04em]">Explorer</p>
          <p className="ba-footnote">
            {total
              ? `${Math.min((page - 1) * PAGE_SIZE + 1, total)}–${Math.min(page * PAGE_SIZE, total)} / ${total}`
              : ""}
          </p>
        </div>

        {loading ? (
          <p className="ba-caption px-1 py-4">Chargement…</p>
        ) : (
          <ul className="ba-grouped">
            {explore.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/menu/recipes/${r.slug}`}
                  className="ba-row ba-meal-row ba-press !gap-3"
                >
                  <div className="ba-recipe-thumb">
                    <RecipeImage src={r.image} alt={r.title_fr} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="ba-headline block truncate">{r.title_fr}</span>
                    <span className="ba-caption">
                      {r.prepMin ? `${r.prepMin} min` : "—"}
                      {r.stepsCount ? ` · ${r.stepsCount} étapes` : ""}
                      {r.costBase != null
                        ? ` · ${formatEUR(r.costBase / (r.baseServings || 2))}/pers`
                        : ""}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pageCount > 1 ? (
          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              className="ba-btn ba-btn-tinted flex-1 !min-h-11"
              disabled={loading || page <= 1}
              onClick={() => {
                const next = page - 1;
                void loadPage(next);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              ← Précédent
            </button>
            <span className="ba-caption shrink-0 tabular-nums px-1">
              {page} / {pageCount}
            </span>
            <button
              type="button"
              className="ba-btn ba-btn-tinted flex-1 !min-h-11"
              disabled={loading || page >= pageCount}
              onClick={() => {
                const next = page + 1;
                void loadPage(next);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Suivant →
            </button>
          </div>
        ) : null}
      </div>
    </FadeIn>
  );
}
