"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FadeIn } from "@/components/FadeIn";
import { useAuthStore } from "@/lib/auth-store";
import { getStore } from "@/lib/catalog-client";
import { useFunnelStore } from "@/lib/funnel-store";
import { formatEUR } from "@/lib/pricing";

export default function SettingsPage() {
  const { plan, answers, resetFunnel } = useFunnelStore();
  const sessionUserId = useAuthStore((s) => s.sessionUserId);
  const user = useAuthStore((s) => s.sessionUser);
  const logout = useAuthStore((s) => s.logout);
  const getTasteSignals = useAuthStore((s) => s.getTasteSignals);
  const basketsCount = useAuthStore((s) =>
    s.sessionUserId ? s.vault.baskets.length : 0
  );
  const favCount = useAuthStore((s) =>
    s.sessionUserId ? s.vault.favorites.length : 0
  );
  const ratingsCount = useAuthStore((s) =>
    s.sessionUserId ? Object.keys(s.vault.ratings || {}).length : 0
  );
  const groceryCount = useAuthStore((s) =>
    s.sessionUserId ? s.vault.groceryLists.length : 0
  );
  const store = getStore(answers.storeId || plan?.answers.storeId || "");

  const [tasteTags, setTasteTags] = useState<string[]>([]);
  const [tasteReady, setTasteReady] = useState(false);

  useEffect(() => {
    if (!sessionUserId) {
      setTasteTags([]);
      setTasteReady(false);
      return;
    }
    const taste = getTasteSignals();
    fetch("/api/taste/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, taste }),
    })
      .then((r) => r.json())
      .then((data) => {
        setTasteTags(data.tags || []);
        setTasteReady(Boolean(data.ready));
      })
      .catch(() => {});
  }, [sessionUserId, answers, getTasteSignals, favCount, basketsCount]);

  return (
    <FadeIn className="py-4">
      <h1 className="ba-title text-[1.75rem]">Réglages</h1>

      <p className="ba-caption mt-5 mb-2 px-1 uppercase tracking-[0.04em]">Compte</p>
      {sessionUserId && user ? (
        <ul className="ba-grouped">
          <li className="ba-row flex-col !items-start !gap-1">
            <p className="ba-headline">{user.name}</p>
            <p className="ba-caption">{user.email}</p>
          </li>
          <li className="ba-row justify-between">
            <span className="ba-caption">Paniers sauvegardés</span>
            <span className="ba-headline tabular-nums">{basketsCount}</span>
          </li>
          <li className="ba-row justify-between">
            <span className="ba-caption">Listes de courses</span>
            <span className="ba-headline tabular-nums">{groceryCount}</span>
          </li>
          <li className="ba-row justify-between">
            <span className="ba-caption">Recettes favorites</span>
            <span className="ba-headline tabular-nums">{favCount}</span>
          </li>
          <li className="ba-row justify-between">
            <span className="ba-caption">Plats notés</span>
            <span className="ba-headline tabular-nums">{ratingsCount}</span>
          </li>
          <li className="ba-row">
            <button
              type="button"
              className="ba-btn ba-btn-tinted w-full"
              onClick={() => logout()}
            >
              Se déconnecter
            </button>
          </li>
        </ul>
      ) : (
        <ul className="ba-grouped">
          <li className="ba-row flex-col !items-start !gap-2 py-3.5">
            <p className="ba-headline">Pas encore de compte</p>
            <p className="ba-caption">
              Obligatoire pour sauvegarder paniers, courses et entraîner le menu intelligent.
            </p>
            <div className="mt-1 flex w-full flex-col gap-2 sm:flex-row">
              <Link
                href="/auth?mode=register&next=/menu/settings"
                className="ba-btn ba-btn-primary flex-1"
              >
                S’enregistrer
              </Link>
              <Link
                href="/auth?mode=login&next=/menu/settings"
                className="ba-btn ba-btn-tinted flex-1"
              >
                Se connecter
              </Link>
            </div>
          </li>
        </ul>
      )}

      {sessionUserId && (
        <>
          <p className="ba-caption mt-8 mb-2 px-1 uppercase tracking-[0.04em]">
            Goûts appris (ML)
          </p>
          <ul className="ba-grouped">
            <li className="ba-row flex-col !items-start !gap-2 py-3.5">
              <p className="ba-headline">
                {tasteReady ? "Profil actif" : "En apprentissage"}
              </p>
              <p className="ba-caption">
                Favoris, paniers et swaps entraînent des suggestions plus variées, calées sur ton enseigne.
              </p>
              {tasteTags.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {tasteTags.map((tag) => (
                    <span key={tag} className="ba-chip">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="ba-footnote">
                  Ajoute des favoris ou sauvegarde un panier pour démarrer.
                </p>
              )}
              <Link
                href="/generation?mode=ml"
                className="ba-btn ba-btn-primary mt-1 w-full sm:w-auto"
              >
                Générer un menu intelligent
              </Link>
            </li>
          </ul>
        </>
      )}

      <p className="ba-caption mt-8 mb-2 px-1 uppercase tracking-[0.04em]">
        Préférences menu
      </p>
      <ul className="ba-grouped">
        <li className="ba-row flex-col !items-start !gap-1">
          <p className="ba-headline">BonAppétit !</p>
          <p className="ba-caption">100% gratuit — aucun abonnement.</p>
        </li>
        <li className="ba-row justify-between">
          <span className="ba-caption">Magasin</span>
          <span className="ba-headline">{store?.name || "non défini"}</span>
        </li>
        <li className="ba-row justify-between">
          <span className="ba-caption">Foyer</span>
          <span className="ba-headline">
            {answers.adults} adulte(s)
            {answers.children ? `, ${answers.children} enfant(s)` : ""}
          </span>
        </li>
        <li className="ba-row justify-between">
          <span className="ba-caption">Budget</span>
          <span className="ba-headline tabular-nums">{formatEUR(answers.budget)}</span>
        </li>
      </ul>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link href="/quiz?restart=1" className="ba-btn ba-btn-primary flex-1">
          Refaire le quiz
        </Link>
        <button
          type="button"
          className="ba-btn ba-btn-tinted flex-1"
          onClick={() => {
            if (confirm("Réinitialiser le menu brouillon et le quiz ?")) resetFunnel();
          }}
        >
          Réinitialiser le brouillon
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Link href="/menu/history" className="ba-btn ba-btn-plain !px-0">
          Historique des paniers →
        </Link>
        <Link href="/menu/groceries" className="ba-btn ba-btn-plain !px-0">
          Listes de courses & exports →
        </Link>
      </div>
    </FadeIn>
  );
}
