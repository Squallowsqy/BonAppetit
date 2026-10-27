"use client";

import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import {
  selectBaskets,
  selectGroceryLists,
  useAuthStore,
} from "@/lib/auth-store";
import {
  downloadTextFile,
  fromSaved,
  groceryListToCsv,
  groceryListToTxt,
  slugFile,
} from "@/lib/grocery-export";
import { useFunnelStore } from "@/lib/funnel-store";
import { formatEUR } from "@/lib/pricing";

export default function HistoryPage() {
  const sessionUserId = useAuthStore((s) => s.sessionUserId);
  const baskets = useAuthStore(selectBaskets);
  const groceryLists = useAuthStore(selectGroceryLists);
  const setActiveBasket = useAuthStore((s) => s.setActiveBasket);
  const deleteBasket = useAuthStore((s) => s.deleteBasket);
  const deleteGroceryList = useAuthStore((s) => s.deleteGroceryList);
  const setPlan = useFunnelStore((s) => s.setPlan);
  const markPlanSaved = useFunnelStore((s) => s.markPlanSaved);

  if (!sessionUserId) {
    return (
      <FadeIn className="py-4">
        <h1 className="ba-title text-[1.75rem]">Historique</h1>
        <p className="ba-body mt-3 max-w-[34ch]">
          Connecte-toi pour retrouver paniers et listes de courses.
        </p>
        <Link
          href="/auth?mode=register&next=/menu/history&intent=save-basket"
          className="ba-btn ba-btn-primary mt-6 inline-flex"
        >
          S’enregistrer
        </Link>
      </FadeIn>
    );
  }

  return (
    <FadeIn className="py-4">
      <h1 className="ba-title text-[1.75rem]">Historique</h1>

      <p className="ba-caption mt-5 mb-2 px-1 uppercase tracking-[0.04em]">
        Paniers / semaines
      </p>
      {baskets.length === 0 ? (
        <p className="ba-body">Aucun panier sauvegardé.</p>
      ) : (
        <ul className="ba-grouped">
          {baskets.map((b) => (
            <li key={b.id} className="ba-row flex-col !items-stretch !gap-2 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="ba-headline truncate">{b.label}</p>
                  <p className="ba-caption">
                    {new Date(b.savedAt).toLocaleDateString("fr-FR")} ·{" "}
                    {b.plan.dinners.length} dîners · {formatEUR(b.plan.totalCost)}
                  </p>
                </div>
                <button
                  type="button"
                  className="ba-btn ba-btn-plain !min-h-8 !text-[0.8125rem]"
                  onClick={() => {
                    if (confirm("Supprimer ce panier ?")) deleteBasket(b.id);
                  }}
                >
                  Suppr.
                </button>
              </div>
              <button
                type="button"
                className="ba-btn ba-btn-tinted !min-h-9 w-full"
                onClick={() => {
                  setActiveBasket(b.id);
                  setPlan(b.plan);
                  markPlanSaved();
                }}
              >
                Rouvrir ce panier
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="ba-caption mt-8 mb-2 px-1 uppercase tracking-[0.04em]">
        Listes de courses
      </p>
      {groceryLists.length === 0 ? (
        <p className="ba-body">
          Aucune liste. Génère un menu puis sauvegarde depuis Courses.
        </p>
      ) : (
        <ul className="ba-grouped">
          {groceryLists.map((g) => (
            <li key={g.id} className="ba-row flex-col !items-stretch !gap-2 py-3.5">
              <div className="min-w-0">
                <p className="ba-headline truncate">{g.label}</p>
                <p className="ba-caption">
                  {new Date(g.savedAt).toLocaleDateString("fr-FR")} ·{" "}
                  {g.storeName || "Magasin"} · {formatEUR(g.totalEst)} ·{" "}
                  {g.lines.length} produits
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="ba-btn ba-btn-tinted !min-h-8 !px-3 !text-[0.8125rem]"
                  onClick={() => {
                    const src = fromSaved(g);
                    downloadTextFile(
                      `${slugFile(g.label)}.txt`,
                      groceryListToTxt(src),
                      "text/plain;charset=utf-8"
                    );
                  }}
                >
                  TXT
                </button>
                <button
                  type="button"
                  className="ba-btn ba-btn-tinted !min-h-8 !px-3 !text-[0.8125rem]"
                  onClick={() => {
                    const src = fromSaved(g);
                    downloadTextFile(
                      `${slugFile(g.label)}.csv`,
                      groceryListToCsv(src),
                      "text/csv;charset=utf-8"
                    );
                  }}
                >
                  CSV
                </button>
                <Link
                  href="/menu/groceries"
                  className="ba-btn ba-btn-tinted !min-h-8 !px-3 !text-[0.8125rem]"
                  onClick={() =>
                    useAuthStore.getState().setActiveGroceryList(g.id)
                  }
                >
                  Ouvrir
                </Link>
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
    </FadeIn>
  );
}
