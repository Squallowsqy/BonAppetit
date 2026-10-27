"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FadeIn } from "@/components/FadeIn";
import { RecipeImage } from "@/components/RecipeImage";
import { TopBar } from "@/components/TopBar";
import { useAuthStore } from "@/lib/auth-store";
import { getStore } from "@/lib/catalog-client";
import { useFunnelStore } from "@/lib/funnel-store";
import {
  basketLabelFromPlan,
  groupDinnersByWeek,
  parseDateKey,
  planHorizon,
} from "@/lib/plan-labels";
import { useRequireAuth } from "@/lib/use-require-auth";
import { formatEUR } from "@/lib/pricing";
import type { WeekPlan } from "@/lib/types";

export default function RevealPage() {
  const router = useRouter();
  const { plan, setPlan, planSaved, markPlanSaved } = useFunnelStore();
  const saveBasket = useAuthStore((s) => s.saveBasket);
  const saveGroceryList = useAuthStore((s) => s.saveGroceryList);
  const logged = useAuthStore((s) => s.sessionUserId);
  const { requireAuth } = useRequireAuth();
  const [swapping, setSwapping] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const store = plan ? getStore(plan.answers.storeId || "") : null;

  // Complète les photos manquantes pour pouvoir visualiser avant sauvegarde
  useEffect(() => {
    if (!plan?.dinners?.length) return;
    if (plan.dinners.every((d) => d.image)) return;
    const ids = plan.dinners.map((d) => d.recipeId).join(",");
    fetch(`/api/recipes?ids=${ids}`)
      .then((r) => r.json())
      .then((list: { id: string; image?: string | null }[]) => {
        if (!Array.isArray(list)) return;
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

  const underBudget = useMemo(() => {
    if (!plan) return true;
    return plan.totalCost <= plan.answers.budget;
  }, [plan]);

  const horizon = planHorizon(plan);
  const weeks = useMemo(
    () => (plan ? groupDinnersByWeek(plan.dinners) : []),
    [plan]
  );

  const getTasteSignals = useAuthStore((s) => s.getTasteSignals);
  const recordTaste = useAuthStore((s) => s.recordTaste);

  async function onSwap(dateKey: string) {
    if (!plan) return;
    const previous = plan.dinners.find((d) => d.dateKey === dateKey);
    setSwapping(dateKey);
    setSwapError(null);
    try {
      const taste = logged ? getTasteSignals() : null;
      const res = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, dateKey, taste }),
      });
      const data = (await res.json()) as WeekPlan;
      if (res.ok) {
        if (previous && logged) recordTaste("swap_out", previous.recipeId);
        setPlan(data);
      } else {
        setSwapError("Pas d’autre plat compatible pour ce soir. Réessaie plus tard.");
      }
    } catch {
      setSwapError("Connexion interrompue, le plat n’a pas été changé.");
    } finally {
      setSwapping(null);
    }
  }

  async function onSaveBasket() {
    if (!plan) return;
    if (!requireAuth({ next: "/reveal", intent: "save-basket" })) return;
    const label = basketLabelFromPlan(plan);
    const saved = saveBasket(plan, label);
    markPlanSaved();
    setSavedFlash(true);
    try {
      const res = await fetch("/api/groceries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      const data = await res.json();
      if (res.ok && saved.ok) {
        saveGroceryList({
          basketId: saved.basket.id,
          label: `Courses · ${label}`,
          storeId: plan.answers.storeId,
          storeName: data.storeName || null,
          totalEst: data.totalEst || 0,
          lines: (data.lines || []).map(
            (l: {
              key: string;
              name: string;
              aisle: string;
              aisleLabel: string;
              qty: number;
              unit: string;
              estEUR: number | null;
            }) => ({
              key: l.key,
              name: l.name,
              aisle: l.aisle,
              aisleLabel: l.aisleLabel,
              qty: l.qty,
              unit: l.unit,
              estEUR: l.estEUR,
            })
          ),
          checked: {},
        });
      }
    } catch {
      /* liste optionnelle */
    }
  }

  if (!plan) {
    return (
      <main className="ba-shell py-20 text-center">
        <p className="ba-body">Pas encore de menu.</p>
        <Link href="/quiz" className="ba-btn ba-btn-primary mt-6 inline-flex">
          Créer mon menu
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-28">
      <TopBar
        trailing={
          <span className="rounded-full bg-[color-mix(in_srgb,var(--basil)_12%,white)] px-2.5 py-1 text-[0.75rem] font-semibold text-[var(--basil-deep)]">
            Gratuit
          </span>
        }
      />

      <FadeIn className="ba-shell pt-6">
        <p className="ba-caption uppercase tracking-[0.04em]">Ton menu</p>
        <h1 className="ba-title mt-1 text-[1.85rem]">
          {plan.dinners.length} dîners
          {horizon === "month" ? " · 4 sem." : ""} · {plan.servings} pers.
        </h1>
        <p className="ba-body mt-2">
          <span
            className={`font-semibold tabular-nums ${
              underBudget ? "text-[var(--basil)]" : "text-[var(--tomato)]"
            }`}
          >
            {formatEUR(plan.totalCost)}
          </span>
          {store ? ` chez ${store.name}` : ""} ·{" "}
          {horizon === "month" ? "budget mois" : "budget"}{" "}
          {formatEUR(plan.answers.budget)}
          {underBudget ? " ✓" : " — swap un plat"}
        </p>
        <p className="ba-footnote mt-1">
          Estimation ±10% · touche un plat pour voir la recette avant de
          sauvegarder
        </p>

        {swapError && (
          <p className="mt-3 text-[0.9rem] font-semibold text-[var(--tomato)]" role="alert">
            {swapError}
          </p>
        )}

        {!logged && (
          <div className="mt-4 rounded-[12px] bg-[color-mix(in_srgb,var(--saffron)_18%,white)] px-4 py-3">
            <p className="ba-headline text-[0.95rem]">Pas encore enregistré</p>
            <p className="ba-caption mt-0.5">
              Inscris-toi gratuitement pour sauvegarder ce panier et tes recettes.
            </p>
          </div>
        )}

        {(planSaved || savedFlash) && logged && (
          <p className="mt-3 text-[0.9rem] font-semibold text-[var(--basil)]">
            Panier sauvegardé dans ton compte ✓
          </p>
        )}

        {weeks.map((group) => (
          <div key={group.label} className="mt-6">
            {horizon === "month" ? (
              <p className="ba-caption mb-2 px-1 uppercase tracking-[0.04em]">
                {group.label}
              </p>
            ) : null}
            <ul className="ba-grouped">
              {group.dinners.map((d) => {
                const { dayLabel } = parseDateKey(d.dateKey);
                return (
                  <li
                    key={d.dateKey}
                    className="ba-row ba-meal-row justify-between !items-center gap-3"
                  >
                    <Link
                      href={`/menu/recipes/${d.slug}?from=reveal`}
                      className="ba-press flex min-w-0 flex-1 items-center gap-3"
                      aria-label={`Voir la recette : ${d.title_fr}`}
                    >
                      <div className="ba-recipe-thumb">
                        <RecipeImage src={d.image} alt="" />
                      </div>
                      <div className="min-w-0">
                        <p className="ba-caption">{dayLabel}</p>
                        <p className="ba-headline truncate text-[var(--label)]">
                          {d.title_fr}
                        </p>
                        <p className="mt-0.5 text-[0.9rem] font-semibold tabular-nums text-[var(--basil)]">
                          {formatEUR(d.cost)}
                          {d.prepMin ? (
                            <span className="ml-1.5 font-medium text-[var(--secondary-label)]">
                              · {d.prepMin} min
                            </span>
                          ) : null}
                        </p>
                        <p className="ba-caption mt-0.5 text-[var(--basil)]">
                          Voir la recette ›
                        </p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      className="ba-btn ba-btn-tinted !min-h-9 shrink-0 !px-3 !py-1.5 !text-[0.875rem]"
                      disabled={swapping === d.dateKey}
                      onClick={() => onSwap(d.dateKey)}
                    >
                      {swapping === d.dateKey ? "…" : "Changer"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </FadeIn>

      <div className="ba-material-thick fixed inset-x-0 bottom-0 z-40 border-t border-[var(--separator)] pb-[var(--safe-bottom)]">
        <div className="ba-shell flex flex-col gap-2 py-3 sm:flex-row">
          <button
            type="button"
            className="ba-btn ba-btn-primary flex-1"
            onClick={onSaveBasket}
          >
            {logged
              ? planSaved || savedFlash
                ? "Panier sauvegardé"
                : "Sauvegarder mon panier"
              : "S’enregistrer pour sauvegarder"}
          </button>
          <button
            type="button"
            className="ba-btn ba-btn-tinted flex-1"
            onClick={() => router.push("/menu")}
          >
            {horizon === "month" ? "Voir le mois" : "Voir la semaine"}
          </button>
        </div>
      </div>
    </main>
  );
}
