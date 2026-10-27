"use client";

import Link from "next/link";
import { getStore } from "@/lib/catalog-client";
import { useFunnelStore } from "@/lib/funnel-store";
import { formatEUR } from "@/lib/pricing";

export default function SettingsPage() {
  const { plan, answers, resetFunnel } = useFunnelStore();
  const store = getStore(answers.storeId || plan?.answers.storeId || "");

  return (
    <section className="py-6">
      <h1 className="font-display text-3xl">Réglages</h1>
      <div className="ba-card mt-6 space-y-3 rounded-3xl p-5 text-sm">
        <p>
          <strong>BonAppétit !</strong> est 100% gratuit — aucun abonnement.
        </p>
        <p>Magasin : {store?.name || "non défini"}</p>
        <p>
          Foyer : {answers.adults} adulte(s)
          {answers.children ? `, ${answers.children} enfant(s)` : ""}
        </p>
        <p>Budget habituel : {formatEUR(answers.budget)}</p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/quiz" className="ba-btn ba-btn-primary">
          Refaire le quiz
        </Link>
        <button
          type="button"
          className="ba-btn ba-btn-ghost"
          onClick={() => {
            if (confirm("Réinitialiser le menu et le quiz ?")) resetFunnel();
          }}
        >
          Tout réinitialiser
        </button>
      </div>
    </section>
  );
}
