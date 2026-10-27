"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFunnelStore } from "@/lib/funnel-store";

type Card = { id: string; slug: string; title_fr: string };

export default function FavoritesPage() {
  const { favorites, toggleFavorite, plan } = useFunnelStore();
  const [list, setList] = useState<Card[]>([]);

  useEffect(() => {
    if (!favorites.length) {
      setList([]);
      return;
    }
    // Prefer titles already in week plan
    const fromPlan = (plan?.dinners || [])
      .filter((d) => favorites.includes(d.recipeId))
      .map((d) => ({ id: d.recipeId, slug: d.slug, title_fr: d.title_fr }));
    const missing = favorites.filter((id) => !fromPlan.some((x) => x.id === id));
    if (!missing.length) {
      setList(fromPlan);
      return;
    }
    fetch(`/api/recipes?ids=${favorites.join(",")}`)
      .then((r) => r.json())
      .then((data: Card[]) => setList(data))
      .catch(() => setList(fromPlan));
  }, [favorites, plan]);

  return (
    <section className="py-6">
      <h1 className="font-display text-3xl">Favoris</h1>
      {list.length === 0 ? (
        <p className="mt-4 text-[var(--ink)]/60">Aucun favori pour l’instant.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {list.map((r) => (
            <li
              key={r.id}
              className="ba-card flex items-center justify-between rounded-2xl px-4 py-3"
            >
              <Link href={`/menu/recipes/${r.slug}`} className="font-medium">
                {r.title_fr}
              </Link>
              <button
                type="button"
                className="text-sm text-[var(--ink)]/50"
                onClick={() => toggleFavorite(r.id)}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
