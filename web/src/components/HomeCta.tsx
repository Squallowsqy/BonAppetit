"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFunnelStore } from "@/lib/funnel-store";
import { planTitle } from "@/lib/plan-labels";

/**
 * CTA du hero : s’adapte au contexte du visiteur une fois le store hydraté.
 * - Menu déjà généré → « Voir mon menu » en premier, « Nouveau menu » en second.
 * - Quiz en cours → « Reprendre » (on garde les réponses).
 * - Sinon → « Créer mon menu ».
 * Le rendu serveur reste le CTA neutre pour éviter tout décalage visuel.
 */
export function HomeCta() {
  const [hydrated, setHydrated] = useState(false);
  const plan = useFunnelStore((s) => s.plan);
  const stepIndex = useFunnelStore((s) => s.stepIndex);

  useEffect(() => setHydrated(true), []);

  if (hydrated && plan) {
    return (
      <div className="ba-home-cta">
        <Link href="/menu" className="ba-home-btn-primary">
          Voir mon menu
        </Link>
        <Link href="/quiz?restart=1" className="ba-home-btn-ghost">
          Nouveau menu
        </Link>
        <p className="ba-home-cta-note">
          {planTitle(plan)} · {plan.dinners.length} dîners prêts
        </p>
      </div>
    );
  }

  if (hydrated && stepIndex > 0) {
    return (
      <div className="ba-home-cta">
        <Link href="/quiz" className="ba-home-btn-primary">
          Reprendre mon menu
        </Link>
        <Link href="/quiz?restart=1" className="ba-home-btn-ghost">
          Recommencer
        </Link>
      </div>
    );
  }

  return (
    <div className="ba-home-cta">
      <Link href="/quiz" className="ba-home-btn-primary">
        Créer mon menu
      </Link>
      <a href="#exemples" className="ba-home-btn-ghost">
        Voir des prix
      </a>
    </div>
  );
}
