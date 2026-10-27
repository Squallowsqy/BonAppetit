"use client";

import Link from "next/link";
import { useState } from "react";
import { getStore } from "@/lib/catalog-client";
import { useFunnelStore } from "@/lib/funnel-store";
import { formatEUR } from "@/lib/pricing";
import type { WeekPlan } from "@/lib/types";

const DAY_LABEL: Record<string, string> = {
  lun: "Lundi",
  mar: "Mardi",
  mer: "Mercredi",
  jeu: "Jeudi",
  ven: "Vendredi",
  sam: "Samedi",
  dim: "Dimanche",
};

export default function MenuWeekPage() {
  const { plan, setPlan, toggleFavorite, favorites } = useFunnelStore();
  const [swapping, setSwapping] = useState<string | null>(null);
  const store = plan ? getStore(plan.answers.storeId || "") : null;

  async function onSwap(dateKey: string) {
    if (!plan) return;
    setSwapping(dateKey);
    try {
      const res = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, dateKey }),
      });
      const data = (await res.json()) as WeekPlan;
      if (res.ok) setPlan(data);
    } finally {
      setSwapping(null);
    }
  }

  if (!plan) {
    return (
      <section className="py-10">
        <h1 className="font-display text-3xl">Pas encore de semaine</h1>
        <p className="mt-2 text-[var(--ink)]/65">Crée ton menu gratuitement en 2 minutes.</p>
        <Link href="/quiz" className="ba-btn ba-btn-primary mt-6">
          Créer mon menu
        </Link>
      </section>
    );
  }

  return (
    <section className="py-6">
      <h1 className="font-display text-3xl text-[var(--basil-deep)]">Ma semaine</h1>
      <p className="mt-2 text-[var(--ink)]/70">
        {formatEUR(plan.totalCost)} estimés
        {store ? ` · ${store.name}` : ""} · budget {formatEUR(plan.answers.budget)}
      </p>

      <ul className="mt-8 space-y-3">
        {plan.dinners.map((d) => {
          const fav = favorites.includes(d.recipeId);
          return (
            <li key={d.dateKey} className="ba-card rounded-3xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/45">
                    {DAY_LABEL[d.dateKey] || d.dateKey}
                  </p>
                  <Link
                    href={`/menu/recipes/${d.slug}`}
                    className="text-lg font-semibold hover:text-[var(--basil)]"
                  >
                    {d.title_fr}
                  </Link>
                  <p className="text-sm text-[var(--basil)]">{formatEUR(d.cost)}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className="ba-btn ba-btn-ghost px-3 py-2 text-xs disabled:opacity-50"
                    disabled={swapping === d.dateKey}
                    onClick={() => onSwap(d.dateKey)}
                  >
                    {swapping === d.dateKey ? "…" : "Swap"}
                  </button>
                  <button
                    type="button"
                    className="ba-btn ba-btn-ghost px-3 py-2 text-xs"
                    onClick={() => toggleFavorite(d.recipeId)}
                  >
                    {fav ? "★" : "☆"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
