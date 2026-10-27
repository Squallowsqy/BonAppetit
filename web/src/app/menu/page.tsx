"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FadeIn } from "@/components/FadeIn";
import { RecipeImage } from "@/components/RecipeImage";
import { StarRating } from "@/components/StarRating";
import { getStore } from "@/lib/catalog-client";
import {
  selectFavorites,
  selectRatings,
  useAuthStore,
} from "@/lib/auth-store";
import { useFunnelStore } from "@/lib/funnel-store";
import {
  groceryListTitle,
  groupDinnersByWeek,
  parseDateKey,
  planHorizon,
  planTitle,
} from "@/lib/plan-labels";
import { useRequireAuth } from "@/lib/use-require-auth";
import { formatEUR } from "@/lib/pricing";
import type { RecipeRating, WeekPlan } from "@/lib/types";

export default function MenuWeekPage() {
  const { plan, setPlan } = useFunnelStore();
  const favorites = useAuthStore(selectFavorites);
  const ratings = useAuthStore(selectRatings);
  const toggleFavoriteAuth = useAuthStore((s) => s.toggleFavorite);
  const setRating = useAuthStore((s) => s.setRating);
  const { requireAuth } = useRequireAuth();
  const [swapping, setSwapping] = useState<string | null>(null);
  const store = plan ? getStore(plan.answers.storeId || "") : null;
  const horizon = planHorizon(plan);
  const weeks = useMemo(
    () => (plan ? groupDinnersByWeek(plan.dinners) : []),
    [plan]
  );

  useEffect(() => {
    if (!plan?.dinners?.length) return;
    if (plan.dinners.every((d) => d.image)) return;
    const ids = plan.dinners.map((d) => d.recipeId).join(",");
    fetch(`/api/recipes?ids=${ids}`)
      .then((r) => r.json())
      .then((list: { id: string; image?: string | null }[]) => {
        const byId = new Map(list.map((x) => [x.id, x.image]));
        const dinners = plan.dinners.map((d) => ({
          ...d,
          image: d.image || byId.get(d.recipeId) || null,
        }));
        if (dinners.some((d, i) => d.image !== plan.dinners[i].image)) {
          setPlan({ ...plan, dinners });
        }
      })
      .catch(() => {});
  }, [plan, setPlan]);

  const getTasteSignals = useAuthStore((s) => s.getTasteSignals);
  const recordTaste = useAuthStore((s) => s.recordTaste);
  const sessionUserId = useAuthStore((s) => s.sessionUserId);

  async function onSwap(dateKey: string) {
    if (!plan) return;
    const previous = plan.dinners.find((d) => d.dateKey === dateKey);
    setSwapping(dateKey);
    try {
      const taste = sessionUserId ? getTasteSignals() : null;
      const res = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, dateKey, taste }),
      });
      const data = (await res.json()) as WeekPlan;
      if (res.ok) {
        if (previous && sessionUserId) recordTaste("swap_out", previous.recipeId);
        setPlan(data);
      }
    } finally {
      setSwapping(null);
    }
  }

  if (!plan) {
    return (
      <FadeIn className="py-8">
        <h1 className="ba-title text-[1.75rem]">Pas encore de menu</h1>
        <p className="ba-body mt-2">Crée ta semaine ou ton mois gratuitement.</p>
        <Link href="/quiz" className="ba-btn ba-btn-primary mt-6 inline-flex">
          Créer mon menu
        </Link>
      </FadeIn>
    );
  }

  return (
    <FadeIn className="py-4">
      <h1 className="ba-title text-[1.75rem]">{planTitle(plan)}</h1>
      <p className="ba-body mt-1">
        <span className="font-semibold tabular-nums text-[var(--basil)]">
          {formatEUR(plan.totalCost)}
        </span>
        {store ? ` · ${store.name}` : ""} ·{" "}
        {horizon === "month" ? "budget mois" : "budget"}{" "}
        {formatEUR(plan.answers.budget)} · {plan.dinners.length} dîners
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/generation?mode=ml" className="ba-btn ba-btn-primary !min-h-9 !px-3 !text-[0.875rem]">
          Menu intelligent
        </Link>
        <Link href="/quiz" className="ba-btn ba-btn-tinted !min-h-9 !px-3 !text-[0.875rem]">
          Nouveau quiz
        </Link>
        <Link href="/menu/groceries" className="ba-btn ba-btn-tinted !min-h-9 !px-3 !text-[0.875rem]">
          {groceryListTitle(horizon)}
        </Link>
      </div>
      <p className="ba-footnote mt-2 px-1">
        Le menu intelligent apprend de tes favoris et paniers pour varier les plats selon ton enseigne.
      </p>

      {weeks.map((group) => (
        <div key={group.label} className="mt-5">
          {horizon === "month" ? (
            <p className="ba-caption mb-2 px-1 uppercase tracking-[0.04em]">
              {group.label}
            </p>
          ) : null}
          <ul className="ba-grouped">
            {group.dinners.map((d) => {
              const fav = favorites.includes(d.recipeId);
              const { dayLabel } = parseDateKey(d.dateKey);
              return (
                <li
                  key={d.dateKey}
                  className="ba-row ba-meal-row !items-stretch gap-3 !py-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Link
                      href={`/menu/recipes/${d.slug}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <div className="ba-recipe-thumb">
                        <RecipeImage src={d.image} alt={d.title_fr} />
                      </div>
                      <div className="min-w-0">
                        <p className="ba-caption">{dayLabel}</p>
                        <p className="ba-headline truncate text-[var(--label)]">
                          {d.title_fr}
                        </p>
                        <p className="mt-0.5 text-[0.9rem] font-semibold tabular-nums text-[var(--basil)]">
                          {formatEUR(d.cost)}
                        </p>
                      </div>
                    </Link>
                    <StarRating
                      size="sm"
                      value={ratings[d.recipeId]}
                      onChange={(stars: RecipeRating) => {
                        if (
                          !requireAuth({
                            next: "/menu",
                            intent: "rate",
                            recipeId: d.recipeId,
                          })
                        ) {
                          return;
                        }
                        setRating(d.recipeId, stars);
                      }}
                    />
                  </div>
                  <div className="ba-meal-actions !self-center">
                    <button
                      type="button"
                      className="ba-btn ba-btn-tinted !min-h-9 !px-3 !py-1.5 !text-[0.8125rem]"
                      disabled={swapping === d.dateKey}
                      onClick={() => onSwap(d.dateKey)}
                    >
                      {swapping === d.dateKey ? "…" : "Swap"}
                    </button>
                    <button
                      type="button"
                      className="ba-btn ba-btn-tinted !min-h-9 !w-9 !px-0 !py-1.5"
                      aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
                      onClick={() => {
                        if (
                          !requireAuth({
                            next: "/menu",
                            intent: "favorite",
                            recipeId: d.recipeId,
                          })
                        ) {
                          return;
                        }
                        toggleFavoriteAuth(d.recipeId);
                      }}
                    >
                      {fav ? "♥" : "♡"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </FadeIn>
  );
}
