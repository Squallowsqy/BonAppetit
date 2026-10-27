"use client";

import { useFunnelStore } from "@/lib/funnel-store";
import { formatEUR } from "@/lib/pricing";

export default function HistoryPage() {
  const { plan } = useFunnelStore();

  return (
    <section className="py-6">
      <h1 className="font-display text-3xl">Historique</h1>
      {!plan ? (
        <p className="mt-4 text-[var(--ink)]/60">Aucun menu sauvegardé.</p>
      ) : (
        <div className="ba-card mt-6 rounded-3xl p-5">
          <p className="font-semibold">Semaine en cours</p>
          <p className="mt-1 text-sm text-[var(--ink)]/60">
            Créée le {new Date(plan.createdAt).toLocaleDateString("fr-FR")} ·{" "}
            {plan.dinners.length} dîners · {formatEUR(plan.totalCost)}
          </p>
        </div>
      )}
    </section>
  );
}
