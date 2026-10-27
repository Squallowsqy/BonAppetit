"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FadeIn } from "@/components/FadeIn";
import { RecipeImage } from "@/components/RecipeImage";
import { selectFavorites, useAuthStore } from "@/lib/auth-store";

type Card = { id: string; slug: string; title_fr: string; image?: string | null };

export default function FavoritesPage() {
  const sessionUserId = useAuthStore((s) => s.sessionUserId);
  const favorites = useAuthStore(selectFavorites);
  const toggleFavorite = useAuthStore((s) => s.toggleFavorite);
  const user = useAuthStore((s) => s.sessionUser);
  const [list, setList] = useState<Card[]>([]);

  useEffect(() => {
    if (!sessionUserId || !favorites.length) {
      setList([]);
      return;
    }
    fetch(`/api/recipes?ids=${favorites.join(",")}`)
      .then((r) => r.json())
      .then((data: Card[]) => setList(data))
      .catch(() => setList([]));
  }, [favorites, sessionUserId]);

  if (!sessionUserId) {
    return (
      <FadeIn className="py-4">
        <h1 className="ba-title text-[1.75rem]">Favoris</h1>
        <p className="ba-body mt-3 max-w-[34ch]">
          Enregistre-toi pour sauvegarder tes recettes préférées.
        </p>
        <Link
          href="/auth?mode=register&next=/menu/favorites&intent=favorite"
          className="ba-btn ba-btn-primary mt-6 inline-flex"
        >
          Créer un compte
        </Link>
        <Link
          href="/auth?mode=login&next=/menu/favorites"
          className="ba-btn ba-btn-tinted mt-3 inline-flex"
        >
          Déjà un compte ? Se connecter
        </Link>
      </FadeIn>
    );
  }

  return (
    <FadeIn className="py-4">
      <h1 className="ba-title text-[1.75rem]">Favoris</h1>
      <p className="ba-caption mt-1">Compte · {user?.name || user?.email}</p>
      {list.length === 0 ? (
        <p className="ba-body mt-3">Aucun favori pour l’instant.</p>
      ) : (
        <ul className="ba-grouped mt-5">
          {list.map((r) => (
            <li key={r.id} className="ba-row ba-meal-row justify-between !items-center gap-3">
              <Link
                href={`/menu/recipes/${r.slug}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <div className="ba-recipe-thumb">
                  <RecipeImage src={r.image} alt={r.title_fr} />
                </div>
                <span className="ba-headline truncate">{r.title_fr}</span>
              </Link>
              <button
                type="button"
                className="ba-btn ba-btn-plain !min-h-8 shrink-0 !text-[0.875rem]"
                onClick={() => toggleFavorite(r.id)}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </FadeIn>
  );
}
