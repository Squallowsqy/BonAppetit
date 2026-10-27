"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FadeIn } from "@/components/FadeIn";
import {
  selectBaskets,
  selectGroceryLists,
  useAuthStore,
} from "@/lib/auth-store";
import {
  downloadTextFile,
  groceryListToCsv,
  groceryListToTxt,
  slugFile,
} from "@/lib/grocery-export";
import { useFunnelStore } from "@/lib/funnel-store";
import {
  basketLabelFromPlan,
  groceryListTitle,
  planHorizon,
} from "@/lib/plan-labels";
import { formatEUR } from "@/lib/pricing";
import { useRequireAuth } from "@/lib/use-require-auth";
import type { GrocerySnapshotLine } from "@/lib/types";

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
  const { plan, groceryChecked, toggleGrocery, setPlan, markPlanSaved } =
    useFunnelStore();
  const sessionUserId = useAuthStore((s) => s.sessionUserId);
  const groceryLists = useAuthStore(selectGroceryLists);
  const baskets = useAuthStore(selectBaskets);
  const activeGroceryListId = useAuthStore((s) =>
    s.sessionUserId ? s.vault.activeGroceryListId : null
  );
  const saveGroceryList = useAuthStore((s) => s.saveGroceryList);
  const deleteGroceryList = useAuthStore((s) => s.deleteGroceryList);
  const setActiveGroceryList = useAuthStore((s) => s.setActiveGroceryList);
  const setActiveBasket = useAuthStore((s) => s.setActiveBasket);
  const { requireAuth } = useRequireAuth();

  const [lines, setLines] = useState<GroceryLine[]>([]);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [totalEst, setTotalEst] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"current" | "saved">("current");
  const [flash, setFlash] = useState<string | null>(null);

  const activeSaved = useMemo(
    () => groceryLists.find((g) => g.id === activeGroceryListId) || groceryLists[0],
    [groceryLists, activeGroceryListId]
  );

  useEffect(() => {
    if (viewMode === "saved" && activeSaved) {
      setLines(activeSaved.lines as GroceryLine[]);
      setStoreName(activeSaved.storeName);
      setTotalEst(activeSaved.totalEst);
      return;
    }
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
  }, [plan, viewMode, activeSaved]);

  const checkedMap =
    viewMode === "saved" && activeSaved
      ? activeSaved.checked
      : groceryChecked;

  function onToggle(key: string) {
    if (viewMode === "saved" && activeSaved) {
      const next = { ...activeSaved.checked, [key]: !activeSaved.checked[key] };
      useAuthStore.getState().updateGroceryListChecked(activeSaved.id, next);
    } else {
      toggleGrocery(key);
    }
  }

  function onSaveList() {
    if (!plan) return;
    if (!requireAuth({ next: "/menu/groceries", intent: "save-basket" })) return;
    const snapshot: GrocerySnapshotLine[] = lines.map((l) => ({
      key: l.key,
      name: l.name,
      aisle: l.aisle,
      aisleLabel: l.aisleLabel,
      qty: l.qty,
      unit: l.unit,
      estEUR: l.estEUR,
    }));
    const horizon = planHorizon(plan);
    const label = `${groceryListTitle(horizon)} · ${basketLabelFromPlan(plan)}${
      storeName ? ` · ${storeName}` : ""
    }`;
    const res = saveGroceryList({
      basketId: useAuthStore.getState().vault.activeBasketId,
      label,
      storeId: plan.answers.storeId,
      storeName,
      totalEst,
      lines: snapshot,
      checked: groceryChecked,
    });
    if (res.ok) {
      setFlash("Liste sauvegardée");
      setViewMode("saved");
      setTimeout(() => setFlash(null), 2200);
    }
  }

  function exportList(format: "txt" | "csv") {
    const source =
      viewMode === "saved" && activeSaved
        ? {
            label: activeSaved.label,
            storeName: activeSaved.storeName,
            totalEst: activeSaved.totalEst,
            lines: activeSaved.lines,
            checked: activeSaved.checked,
          }
        : {
            label: `${groceryListTitle(planHorizon(plan))} ${
              storeName ? storeName : ""
            }`.trim(),
            storeName,
            totalEst,
            lines,
            checked: groceryChecked,
          };
    const base = slugFile(source.label);
    if (format === "txt") {
      downloadTextFile(`${base}.txt`, groceryListToTxt(source), "text/plain;charset=utf-8");
    } else {
      downloadTextFile(`${base}.csv`, groceryListToCsv(source), "text/csv;charset=utf-8");
    }
  }

  function openBasketWeek(basketId: string) {
    const b = baskets.find((x) => x.id === basketId);
    if (!b) return;
    setActiveBasket(basketId);
    setPlan(b.plan);
    markPlanSaved();
    setViewMode("current");
  }

  if (!plan && groceryLists.length === 0) {
    return (
      <FadeIn className="py-8">
        <h1 className="ba-title text-[1.75rem]">Courses</h1>
        <p className="ba-body mt-2">Crée un menu pour générer ta liste.</p>
        <Link href="/quiz" className="ba-btn ba-btn-primary mt-6 inline-flex">
          Créer un menu
        </Link>
      </FadeIn>
    );
  }

  const byAisle = lines.reduce<Record<string, GroceryLine[]>>((acc, line) => {
    (acc[line.aisleLabel] ||= []).push(line);
    return acc;
  }, {});

  const remaining = lines.filter((l) => !checkedMap[l.key]).length;

  return (
    <FadeIn className="py-4">
      <h1 className="ba-title text-[1.75rem]">
        {plan ? groceryListTitle(planHorizon(plan)) : "Courses"}
      </h1>
      <p className="ba-body mt-1">
        {storeName || "Magasin"} ·{" "}
        <span className="font-semibold tabular-nums text-[var(--basil)]">
          {formatEUR(totalEst)}
        </span>{" "}
        (±10%)
        {remaining ? ` · ${remaining} restants` : " · terminé"}
        {plan && planHorizon(plan) === "month"
          ? ` · ${plan.dinners.length} dîners`
          : ""}
      </p>
      {flash && (
        <p className="mt-2 text-[0.9rem] font-semibold text-[var(--basil)]">{flash}</p>
      )}

      <div className="ba-grocery-toolbar mt-3">
        <button
          type="button"
          className={`ba-btn ${
            viewMode === "current" ? "ba-btn-primary" : "ba-btn-tinted"
          }`}
          onClick={() => setViewMode("current")}
          disabled={!plan}
        >
          {plan && planHorizon(plan) === "month" ? "Mois en cours" : "Semaine en cours"}
        </button>
        <button
          type="button"
          className={`ba-btn ${
            viewMode === "saved" ? "ba-btn-primary" : "ba-btn-tinted"
          }`}
          onClick={() => {
            if (!sessionUserId) {
              requireAuth({ next: "/menu/groceries", intent: "save-basket" });
              return;
            }
            setViewMode("saved");
          }}
        >
          Listes ({groceryLists.length})
        </button>
      </div>

      {viewMode === "saved" && (
        <div className="mt-4">
          {groceryLists.length === 0 ? (
            <p className="ba-body">Aucune liste sauvegardée.</p>
          ) : (
            <ul className="ba-grouped">
              {groceryLists.map((g) => (
                <li key={g.id} className="ba-row flex-col !items-stretch !gap-2 py-3">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => setActiveGroceryList(g.id)}
                  >
                    <p className="ba-headline">{g.label}</p>
                    <p className="ba-caption">
                      {new Date(g.savedAt).toLocaleDateString("fr-FR")} ·{" "}
                      {g.storeName || "Magasin"} · {formatEUR(g.totalEst)} ·{" "}
                      {g.lines.length} produits
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {g.basketId && baskets.some((b) => b.id === g.basketId) && (
                      <button
                        type="button"
                        className="ba-btn ba-btn-tinted !min-h-8 !px-3 !text-[0.8125rem]"
                        onClick={() => openBasketWeek(g.basketId)}
                      >
                        Rouvrir la semaine
                      </button>
                    )}
                    <button
                      type="button"
                      className="ba-btn ba-btn-plain !min-h-8 !text-[0.8125rem]"
                      onClick={() => {
                        if (confirm("Supprimer cette liste ?")) deleteGroceryList(g.id);
                      }}
                    >
                      Suppr.
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="ba-grocery-actions mt-2 flex flex-wrap gap-2">
        {viewMode === "current" && plan && (
          <button type="button" className="ba-btn ba-btn-primary" onClick={onSaveList}>
            {sessionUserId ? "Sauvegarder" : "S’enregistrer"}
          </button>
        )}
        <button
          type="button"
          className="ba-btn ba-btn-tinted"
          onClick={() => exportList("txt")}
          disabled={lines.length === 0}
        >
          Export TXT
        </button>
        <button
          type="button"
          className="ba-btn ba-btn-tinted"
          onClick={() => exportList("csv")}
          disabled={lines.length === 0}
        >
          Export CSV
        </button>
      </div>

      {loading && <p className="ba-caption mt-3">Chargement…</p>}

      <div className="mt-4 space-y-4 pb-4">
        {Object.entries(byAisle).map(([aisle, items]) => (
          <div key={aisle}>
            <p className="ba-caption ba-grocery-aisle uppercase tracking-[0.04em]">{aisle}</p>
            <ul className="ba-grouped">
              {items.map((item) => {
                const checked = Boolean(checkedMap[item.key]);
                return (
                  <li key={item.key}>
                    <label className="ba-row ba-grocery-item cursor-pointer justify-between">
                      <span className="flex min-w-0 flex-1 items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggle(item.key)}
                          className="mt-1 size-[1.2rem] shrink-0 accent-[var(--basil)]"
                        />
                        <span className={`min-w-0 ${checked ? "line-through opacity-45" : ""}`}>
                          <span className="ba-headline block">{item.name}</span>
                          <span className="ba-caption">
                            {Math.round(item.qty * 10) / 10} {item.unit}
                          </span>
                        </span>
                      </span>
                      {item.estEUR != null && (
                        <span className="ba-grocery-meta">
                          <span className="ba-caption ba-price tabular-nums font-semibold text-[var(--basil)]">
                            {formatEUR(item.estEUR)}
                          </span>
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
    </FadeIn>
  );
}
