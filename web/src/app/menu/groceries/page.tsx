"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFunnelStore } from "@/lib/funnel-store";
import { formatEUR } from "@/lib/pricing";

type GroceryLine = {
  key: string;
  name: string;
  aisle: string;
  aisleLabel: string;
  qty: number;
  unit: string;
  estEUR: number | null;
};

export default function GroceriesPage() {
  const { plan, groceryChecked, toggleGrocery } = useFunnelStore();
  const [lines, setLines] = useState<GroceryLine[]>([]);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [totalEst, setTotalEst] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!plan) return;
    setLoading(true);
    fetch("/api/groceries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    })
      .then((r) => r.json())
      .then((data) => {
        setLines(data.lines || []);
        setStoreName(data.storeName);
        setTotalEst(data.totalEst || 0);
      })
      .finally(() => setLoading(false));
  }, [plan]);

  if (!plan) {
    return (
      <section className="py-10">
        <h1 className="font-display text-3xl">Liste de courses</h1>
        <Link href="/quiz" className="ba-btn ba-btn-primary mt-6">
          Créer un menu d’abord
        </Link>
      </section>
    );
  }

  const byAisle = lines.reduce<Record<string, GroceryLine[]>>((acc, line) => {
    (acc[line.aisleLabel] ||= []).push(line);
    return acc;
  }, {});

  return (
    <section className="py-6">
      <h1 className="font-display text-3xl">Courses</h1>
      <p className="mt-2 text-[var(--ink)]/65">
        {storeName || "Magasin"} · estimation {formatEUR(totalEst)} (±10%)
      </p>
      {loading && <p className="mt-4 text-sm text-[var(--ink)]/50">Chargement…</p>}

      <div className="mt-8 space-y-8">
        {Object.entries(byAisle).map(([aisle, items]) => (
          <div key={aisle}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--basil)]">
              {aisle}
            </h2>
            <ul className="mt-3 space-y-2">
              {items.map((item) => {
                const checked = Boolean(groceryChecked[item.key]);
                return (
                  <li key={item.key}>
                    <label className="ba-card flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGrocery(item.key)}
                        className="size-4 accent-[var(--basil)]"
                      />
                      <span className={`flex-1 ${checked ? "line-through opacity-50" : ""}`}>
                        {item.name}
                        <span className="ml-2 text-sm text-[var(--ink)]/45">
                          {Math.round(item.qty * 10) / 10} {item.unit}
                        </span>
                      </span>
                      {item.estEUR != null && (
                        <span className="text-sm text-[var(--ink)]/55">
                          {formatEUR(item.estEUR)}
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
