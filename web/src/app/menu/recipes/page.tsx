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

function parsePayload(raw: unknown, requestedPage: number): PagePayload {
  if (Array.isArray(raw)) {
    const items = raw as RecipeCard[];
    return {
      items,
      total: items.length,
      page: 1,
      pageCount: 1,
      hasMore: false,
    };
  }
  const data = (raw || {}) as Partial<PagePayload> & { recipes?: RecipeCard[] };
  const items = data.items || data.recipes || [];
  const total = typeof data.total === "number" ? data.total : items.length;
  const page = data.page || requestedPage;
  const pageCount =
    data.pageCount ||
    Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasMore =
    typeof data.hasMore === "boolean"
      ? data.hasMore
      : page * PAGE_SIZE < total;
  return { items, total, page, pageCount, hasMore };
}

export default function RecipesPage() {
  const { plan } = useFunnelStore();
  const [explore, setExplore] = useState<RecipeCard[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number) => {
    const res = await fetch(`/api/recipes?limit=${PAGE_SIZE}&page=${p}`);
    if (!res.ok) throw new Error("fetch failed");
    const raw = await res.json();
    return parsePayload(raw, p);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPage(1)
      .then((data) => {
        if (cancelled) return;
        setExplore(data.items);
        setPage(data.page);
        setTotal(data.total);
        setHasMore(data.hasMore);
        persistNav(data.items);
      })
      .catch(() => {
        if (cancelled) return;
        setExplore([]);
        setError("Impossible de charger les recettes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  async function onLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const next = page + 1;
      const data = await fetchPage(next);
      setExplore((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        const merged = [...prev];
        for (const item of data.items) {
          if (!seen.has(item.id)) merged.push(item);
        }
        persistNav(merged);
        return merged;
      });
      setPage(data.page);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch {
      setError("Chargement interrompu. Réessaie.");
    } finally {
      setLoadingMore(false);
    }
  }

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
          <p className="ba-footnote tabular-nums">
            {total
              ? `${explore.length} / ${total}`
              : explore.length
                ? `${explore.length}`
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

        {error ? (
          <p className="ba-caption mt-3 px-1 text-[var(--destructive,#b00020)]">
            {error}
          </p>
        ) : null}

        {!loading && hasMore ? (
          <button
            type="button"
            className="ba-btn ba-btn-primary mt-5 w-full !min-h-12"
            disabled={loadingMore}
            onClick={() => void onLoadMore()}
          >
            {loadingMore
              ? "Chargement…"
              : `Voir plus de recettes (${Math.min(PAGE_SIZE, Math.max(0, total - explore.length))} suivantes)`}
          </button>
        ) : null}

        {!loading && !hasMore && explore.length > 0 ? (
          <p className="ba-caption mt-5 px-1 text-center">
            {total > PAGE_SIZE
              ? `Les ${total} recettes sont affichées.`
              : null}
          </p>
        ) : null}
      </div>
    </FadeIn>
  );
}
