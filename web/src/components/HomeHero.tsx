"use client";

import Link from "next/link";
import { useMemo } from "react";
import { HomeCta } from "@/components/HomeCta";
import { HomeTonightCopy, useTonightHeroImage } from "@/components/TonightPanel";
import { WeekAppetiteBoard } from "@/components/WeekAppetiteBoard";
import { resolveTodayDinner } from "@/lib/today-dinner";
import { useActivePlan } from "@/lib/use-active-plan";
import type { Recipe } from "@/lib/types";

type Props = {
  weekRecipes: Recipe[];
};

export function HomeHero({ weekRecipes }: Props) {
  const { plan, hydrated } = useActivePlan();
  const tonightImage = useTonightHeroImage();
  const showTonight = useMemo(() => {
    if (!hydrated || !plan) return false;
    const today = resolveTodayDinner(plan);
    return Boolean(today && !today.expired);
  }, [hydrated, plan]);

  const heroPhoto = tonightImage || weekRecipes[0]?.image;

  return (
    <section className="ba-home-hero" aria-label="Accueil">
      <div
        className="ba-home-hero-plane"
        style={
          heroPhoto ? { backgroundImage: `url(${heroPhoto})` } : undefined
        }
        aria-hidden
      />
      <div className="ba-home-hero-veil" aria-hidden />

      <div className="ba-home-hero-inner">
        {showTonight ? (
          <HomeTonightCopy />
        ) : (
          <div className="ba-home-hero-copy">
            <p className="ba-home-brand">
              BonAppétit<span>!</span>
            </p>
            <h1 className="ba-home-h1">
              Enfin ! Des repas calés sur ton magasin et ton budget.
            </h1>
            <p className="ba-home-lede">
              Menu + liste de courses en deux minutes. Gratuit, sans abonnement.
            </p>
            <HomeCta />
          </div>
        )}

        <aside className="ba-home-hero-side" aria-label="Semainier">
          <WeekAppetiteBoard
            recipes={weekRecipes}
            variant="board"
            receipt
          />
          {showTonight ? (
            <p className="ba-home-cta-note ba-tonight-side-note">
              <Link href="/menu">Voir tout le menu →</Link>
            </p>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
