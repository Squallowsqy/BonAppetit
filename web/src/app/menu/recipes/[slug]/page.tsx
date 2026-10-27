"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useFunnelStore } from "@/lib/funnel-store";
import { formatEUR } from "@/lib/pricing";

type RecipeDetail = {
  id: string;
  slug: string;
  title_fr: string;
  description_fr?: string;
  baseServings: number;
  prepMin?: number | null;
  steps_fr: string[];
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
  const { plan, toggleFavorite, favorites } = useFunnelStore();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [error, setError] = useState(false);

  const servings = plan?.servings || 2;
  const storeId = plan?.answers.storeId || "carrefour";

  useEffect(() => {
    fetch(`/api/recipes/${slug}?servings=${servings}&storeId=${storeId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("missing");
        return r.json();
      })
      .then(setRecipe)
      .catch(() => setError(true));
  }, [slug, servings, storeId]);

  if (error) {
    return (
      <section className="py-10">
        <p>Recette introuvable.</p>
        <Link href="/menu/recipes" className="ba-btn ba-btn-ghost mt-4">
          Retour
        </Link>
      </section>
    );
  }

  if (!recipe) {
    return <section className="py-10 text-[var(--ink)]/50">Chargement…</section>;
  }

  const fav = favorites.includes(recipe.id);
  const scale = servings / (recipe.baseServings || 2);

  return (
    <section className="py-6">
      <Link href="/menu/recipes" className="text-sm text-[var(--basil)]">
        ← Recettes
      </Link>
      <h1 className="font-display mt-3 text-3xl text-[var(--basil-deep)]">
        {recipe.title_fr}
      </h1>
      <p className="mt-2 text-[var(--ink)]/65">{recipe.description_fr}</p>
      <p className="mt-3 text-sm font-semibold text-[var(--basil)]">
        {formatEUR(recipe.cost)} pour {servings} pers.
        {recipe.prepMin ? ` · ${recipe.prepMin} min` : ""}
      </p>

      <button
        type="button"
        className="ba-btn ba-btn-ghost mt-4 text-sm"
        onClick={() => toggleFavorite(recipe.id)}
      >
        {fav ? "★ Favori" : "☆ Ajouter aux favoris"}
      </button>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wider text-[var(--basil)]">
        Ingrédients
      </h2>
      <ul className="mt-3 space-y-2">
        {recipe.ingredients.map((line) => {
          const qty = (line.qty || 0) * scale;
          return (
            <li key={line.ingredientId} className="ba-card rounded-2xl px-4 py-3 text-sm">
              <strong>{line.name_fr}</strong>
              {qty ? (
                <span className="text-[var(--ink)]/55">
                  {" "}
                  — {Math.round(qty * 10) / 10} {line.unit}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {recipe.steps_fr?.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-bold uppercase tracking-wider text-[var(--basil)]">
            Étapes
          </h2>
          <ol className="mt-3 space-y-3">
            {recipe.steps_fr.map((step, i) => (
              <li key={i} className="ba-card rounded-2xl px-4 py-3 text-sm leading-relaxed">
                <span className="mr-2 font-bold text-[var(--basil)]">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
