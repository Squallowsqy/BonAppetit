"use client";

import { useEffect, useMemo, useState } from "react";
import { selectBaskets, useAuthStore } from "@/lib/auth-store";
import { useFunnelStore } from "@/lib/funnel-store";
import type { WeekPlan } from "@/lib/types";

/**
 * Menu « validé » prioritaire : panier actif du coffre, sinon brouillon funnel,
 * sinon dernier panier sauvegardé.
 */
export function useActivePlan(): {
  plan: WeekPlan | null;
  source: "basket" | "draft" | null;
  hydrated: boolean;
} {
  const [persistReady, setPersistReady] = useState(false);
  const draft = useFunnelStore((s) => s.plan);
  const planSaved = useFunnelStore((s) => s.planSaved);
  const sessionUserId = useAuthStore((s) => s.sessionUserId);
  const vaultHydrated = useAuthStore((s) => s.vaultHydrated);
  const activeBasketId = useAuthStore((s) =>
    s.sessionUserId ? s.vault.activeBasketId : null
  );
  const baskets = useAuthStore(selectBaskets);

  useEffect(() => {
    const unsub = useFunnelStore.persist.onFinishHydration(() =>
      setPersistReady(true)
    );
    if (useFunnelStore.persist.hasHydrated()) setPersistReady(true);
    return unsub;
  }, []);

  return useMemo(() => {
    if (!persistReady) return { plan: null, source: null, hydrated: false };

    if (sessionUserId) {
      if (!vaultHydrated) {
        // En attendant le coffre, on peut déjà montrer le brouillon local
        if (draft) {
          return { plan: draft, source: "draft" as const, hydrated: false };
        }
        return { plan: null, source: null, hydrated: false };
      }
      const active =
        baskets.find((b) => b.id === activeBasketId) || baskets[0] || null;
      if (active?.plan) {
        return { plan: active.plan, source: "basket" as const, hydrated: true };
      }
    }

    if (draft) {
      return {
        plan: draft,
        source: planSaved ? ("basket" as const) : ("draft" as const),
        hydrated: true,
      };
    }

    return { plan: null, source: null, hydrated: true };
  }, [
    persistReady,
    sessionUserId,
    vaultHydrated,
    activeBasketId,
    baskets,
    draft,
    planSaved,
  ]);
}
