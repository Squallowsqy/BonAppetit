"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFunnelStore } from "@/lib/funnel-store";
import { formatEUR } from "@/lib/pricing";

type RecipeCard = {
  id: string;
  slug: string;
  title_fr: string;
  prepMin?: number | null;
  costBase?: number | null;
  baseServings?: number;
};

export default function RecipesPage() {
  const { plan } = useFunnelStore();
  const [explore, setExplore] = useState<RecipeCard[]>([]);

  useEffect(() => {
    fetch("/api/recipes?limit=24")
      .then((r) => r.json())
      .then(setExplore)
      .catch(() => setExplore([]));
  }, []);

  return (
    <section className="py-6">
      <h1 className="font-display text-3xl">Recettes</h1>

      {plan && plan.dinners.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--basil)]">
            Cette semaine
          </h2>
          <ul className="mt-3 space-y-2">
            {plan.dinners.map((d) => (
              <li key={d.recipeId}>
                <Link
                  href={`/menu/recipes/${d.slug}`}
                  className="ba-card block rounded-2xl px-4 py-3 font-medium hover:border-[var(--basil)]"
                >
                  {d.title_fr}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--basil)]">
          Explorer
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {explore.map((r) => (
            <li key={r.id}>
              <Link
                href={`/menu/recipes/${r.slug}`}
                className="ba-card block rounded-2xl px-4 py-3"
              >
                <p className="font-medium leading-snug">{r.title_fr}</p>
                <p className="mt-1 text-xs text-[var(--ink)]/50">
                  {r.prepMin ? `${r.prepMin} min` : "—"}
                  {r.costBase != null
                    ? ` · ${formatEUR(r.costBase / (r.baseServings || 2))}/pers`
                    : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
