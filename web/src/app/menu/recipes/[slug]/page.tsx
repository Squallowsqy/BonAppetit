"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FadeIn } from "@/components/FadeIn";
import { RecipeImage } from "@/components/RecipeImage";
import { RecipeNav, type RecipeNavItem } from "@/components/RecipeNav";
import { StarRating } from "@/components/StarRating";
import {
  selectFavorites,
  selectRatings,
  useAuthStore,
} from "@/lib/auth-store";
import { useFunnelStore } from "@/lib/funnel-store";
import { parseDateKey } from "@/lib/plan-labels";
import { useRequireAuth } from "@/lib/use-require-auth";
import { formatEUR } from "@/lib/pricing";
import type { RecipeRating } from "@/lib/types";

const EXPLORE_NAV_KEY = "ba-recipe-nav-explore";

type RecipeDetail = {
  id: string;
  slug: string;
  title_fr: string;
  description_fr?: string;
  baseServings: number;
  prepMin?: number | null;
  cookMin?: number | null;
  steps_fr: string[];
  image?: string | null;
  cost: number;
  ingredients: {
    ingredientId: string;
    name_fr: string;
    qty: number | null;
    unit: string;
  }[];
};

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const fromReveal = searchParams.get("from") === "reveal";
  const hrefSuffix = fromReveal ? "?from=reveal" : "";
  const backHref = fromReveal ? "/reveal" : "/menu/recipes";
  const backLabel = fromReveal ? "← Ton menu" : "← Recettes";

  const { plan } = useFunnelStore();
  const favorites = useAuthStore(selectFavorites);
  const ratings = useAuthStore(selectRatings);
  const toggleFavoriteAuth = useAuthStore((s) => s.toggleFavorite);
  const setRating = useAuthStore((s) => s.setRating);
  const { requireAuth } = useRequireAuth();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [error, setError] = useState(false);
  const [exploreNav, setExploreNav] = useState<RecipeNavItem[]>([]);

  const servings = plan?.servings || 2;
  const storeId = plan?.answers.storeId || "carrefour";

  const weekNav = useMemo<RecipeNavItem[]>(() => {
    if (!plan?.dinners?.length) return [];
    return plan.dinners.map((d) => {
      const { week, dayLabel } = parseDateKey(d.dateKey);
      return {
        slug: d.slug,
        title_fr: d.title_fr,
        label: week != null ? `S${week} · ${dayLabel}` : dayLabel,
      };
    });
  }, [plan]);

  const navItems = useMemo(() => {
    if (weekNav.some((x) => x.slug === slug)) return weekNav;
    return exploreNav;
  }, [weekNav, exploreNav, slug]);

  useEffect(() => {
    setError(false);
    setRecipe(null);
    fetch(`/api/recipes/${slug}?servings=${servings}&storeId=${storeId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("missing");
        return r.json();
      })
      .then(setRecipe)
      .catch(() => setError(true));
  }, [slug, servings, storeId]);

  useEffect(() => {
    if (weekNav.some((x) => x.slug === slug)) return;

    try {
      const raw = sessionStorage.getItem(EXPLORE_NAV_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RecipeNavItem[];
        if (Array.isArray(parsed) && parsed.some((x) => x.slug === slug)) {
          setExploreNav(parsed);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    fetch("/api/recipes?limit=36&page=1")
      .then((r) => r.json())
      .then((data: { items?: { slug: string; title_fr: string }[] }) => {
        const list = data.items || [];
        const items = list.map((r) => ({ slug: r.slug, title_fr: r.title_fr }));
        setExploreNav(items);
        try {
          sessionStorage.setItem(EXPLORE_NAV_KEY, JSON.stringify(items));
        } catch {
          /* ignore */
        }
      })
      .catch(() => setExploreNav([]));
  }, [slug, weekNav]);

  if (error) {
    return (
      <section className="py-8">
        <p className="ba-body">Recette introuvable.</p>
        <Link href={backHref} className="ba-btn ba-btn-plain mt-4">
          Retour
        </Link>
      </section>
    );
  }

  if (!recipe) {
    return <section className="ba-caption py-8">Chargement…</section>;
  }

  const fav = favorites.includes(recipe.id);
  const scale = servings / (recipe.baseServings || 2);
  const totalMin =
    (recipe.prepMin || 0) + (recipe.cookMin || 0) || recipe.prepMin || null;

  const recipeId = recipe.id;
  const recipeSlug = recipe.slug;
  const authNext = `/menu/recipes/${recipeSlug}${hrefSuffix}`;

  function onToggleFavorite() {
    if (
      !requireAuth({
        next: authNext,
        intent: "favorite",
        recipeId,
      })
    ) {
      return;
    }
    toggleFavoriteAuth(recipeId);
  }

  function onRate(stars: RecipeRating) {
    if (
      !requireAuth({
        next: authNext,
        intent: "rate",
        recipeId,
      })
    ) {
      return;
    }
    setRating(recipeId, stars);
  }

  return (
    <FadeIn className="py-4">
      <Link href={backHref} className="ba-btn ba-btn-plain !px-0">
        {backLabel}
      </Link>
      {fromReveal ? (
        <p className="ba-caption mt-1">
          Aperçu avant sauvegarde · ingrédients et étapes ci-dessous
        </p>
      ) : null}

      <div className="ba-recipe-hero mt-3">
        <RecipeImage src={recipe.image} alt={recipe.title_fr} />
      </div>

      <h1 className="ba-title mt-4 text-[1.75rem]">{recipe.title_fr}</h1>
      {recipe.description_fr ? (
        <p className="ba-body mt-2">{recipe.description_fr}</p>
      ) : null}
      <p className="mt-3 text-[0.95rem] font-semibold tabular-nums text-[var(--basil)]">
        {formatEUR(recipe.cost)} pour {servings} pers.
        {totalMin ? ` · ${totalMin} min` : ""}
        {recipe.steps_fr?.length
          ? ` · ${recipe.steps_fr.length} étapes`
          : ""}
      </p>

      <div className="mt-5 rounded-2xl bg-[color-mix(in_srgb,var(--basil)_8%,white)] px-4 py-3">
        <p className="ba-caption mb-2 uppercase tracking-[0.04em]">
          Ton avis
        </p>
        <StarRating
          value={ratings[recipe.id]}
          onChange={onRate}
          showLabel
        />
      </div>

      <button
        type="button"
        className="ba-btn ba-btn-tinted mt-4 !min-h-10"
        onClick={onToggleFavorite}
      >
        {fav ? "♥ Favori" : "♡ Sauvegarder en favori"}
      </button>

      <p className="ba-caption mt-8 mb-2 px-1 uppercase tracking-[0.04em]">
        Ingrédients
      </p>
      <ul className="ba-grouped">
        {recipe.ingredients.map((line) => {
          const qty = (line.qty || 0) * scale;
          return (
            <li key={line.ingredientId} className="ba-row justify-between gap-3">
              <span className="ba-headline">{line.name_fr}</span>
              {qty ? (
                <span className="ba-caption shrink-0 tabular-nums">
                  {Math.round(qty * 10) / 10} {line.unit}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {recipe.steps_fr?.length > 0 && (
        <>
          <p className="ba-caption mt-8 mb-2 px-1 uppercase tracking-[0.04em]">
            Préparation · {recipe.steps_fr.length} étapes
          </p>
          <ol className="ba-grouped">
            {recipe.steps_fr.map((step, i) => (
              <li key={i} className="ba-row !items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--basil)_14%,white)] text-[0.75rem] font-bold text-[var(--basil-deep)]">
                  {i + 1}
                </span>
                <p className="ba-body !text-[var(--label)] leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </>
      )}

      <RecipeNav
        items={navItems}
        currentSlug={slug}
        hrefSuffix={hrefSuffix}
      />
      {fromReveal ? (
        <div className="mt-6">
          <Link href="/reveal" className="ba-btn ba-btn-primary w-full">
            Retour au menu · sauvegarder
          </Link>
        </div>
      ) : null}
    </FadeIn>
  );
}
