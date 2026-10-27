"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function RevealPage() {
  const router = useRouter();
  const { plan, setPlan } = useFunnelStore();
  const [swapping, setSwapping] = useState<string | null>(null);
  const store = plan ? getStore(plan.answers.storeId || "") : null;

  const underBudget = useMemo(() => {
    if (!plan) return true;
    return plan.totalCost <= plan.answers.budget;
  }, [plan]);

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
      <main className="ba-shell py-20 text-center">
        <p>Pas encore de menu.</p>
        <Link href="/quiz" className="ba-btn ba-btn-primary mt-4">
          Créer mon menu
        </Link>
      </main>
    );
  }

  return (
    <main className="pb-16">
      <header className="ba-shell flex items-center justify-between py-5">
        <Link href="/" className="font-display text-xl text-[var(--basil)]">
          BonAppétit<span className="text-[var(--saffron)]">!</span>
        </Link>
        <span className="rounded-full bg-[var(--mist)] px-3 py-1 text-xs font-semibold text-[var(--basil)]">
          Gratuit
        </span>
      </header>

      <section className="ba-shell max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--basil)]">
          Ton menu de la semaine
        </p>
        <h1 className="font-display mt-2 text-4xl text-[var(--basil-deep)]">
          {plan.dinners.length} dîners pour {plan.servings} pers.
        </h1>
        <p className="mt-3 text-lg">
          Total estimé{" "}
          <strong className={underBudget ? "text-[var(--basil)]" : "text-[var(--tomato)]"}>
            {formatEUR(plan.totalCost)}
          </strong>{" "}
          {store ? `chez ${store.name}` : ""} · budget {formatEUR(plan.answers.budget)}
          {underBudget ? " ✓" : " (un peu au-dessus — swap un plat)"}
        </p>
        <p className="mt-1 text-sm text-[var(--ink)]/55">Estimation ±10%.</p>

        <ul className="mt-8 space-y-3">
          {plan.dinners.map((d) => (
            <li
              key={d.dateKey}
              className="ba-card flex flex-col gap-3 rounded-3xl p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/45">
                  {DAY_LABEL[d.dateKey] || d.dateKey}
                </p>
                <p className="text-lg font-semibold">{d.title_fr}</p>
                <p className="text-sm text-[var(--basil)]">{formatEUR(d.cost)}</p>
              </div>
              <button
                type="button"
                className="ba-btn ba-btn-ghost text-sm disabled:opacity-50"
                disabled={swapping === d.dateKey}
                onClick={() => onSwap(d.dateKey)}
              >
                {swapping === d.dateKey ? "…" : "Changer"}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            className="ba-btn ba-btn-primary"
            onClick={() => router.push("/menu")}
          >
            Ouvrir mon espace
          </button>
          <Link href="/menu/groceries" className="ba-btn ba-btn-ghost">
            Voir la liste de courses
          </Link>
        </div>
      </section>
    </main>
  );
}
