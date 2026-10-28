import { NextResponse } from "next/server";
import { getStore } from "@/lib/catalog";
import { aisleLabel, buildGroceryList } from "@/lib/groceries";
import type { WeekPlan } from "@/lib/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function POST(req: Request) {
  try {
    const plan = (await req.json()) as WeekPlan;
    if (!plan?.dinners) {
      return NextResponse.json({ error: "Plan manquant" }, { status: 400 });
    }
    const store = getStore(plan.answers.storeId || "");
    const coef = store?.priceCoefficient ?? 1;
    const lines = buildGroceryList(plan).map((l) => ({
      ...l,
      aisleLabel: aisleLabel(l.aisle),
      estEUR: l.estEUR != null ? round2(l.estEUR * coef) : null,
      usedEUR: l.usedEUR != null ? round2(l.usedEUR * coef) : null,
    }));
    const required = lines.filter((l) => !l.optional);
    const totalEst = round2(required.reduce((s, l) => s + (l.estEUR || 0), 0));
    const usedEst = round2(required.reduce((s, l) => s + (l.usedEUR || 0), 0));
    const optionalEst = round2(
      lines.filter((l) => l.optional).reduce((s, l) => s + (l.estEUR || 0), 0)
    );
    return NextResponse.json({
      storeName: store?.name || null,
      /** Ticket estimé hors « déjà au placard ? ». */
      totalEst,
      /** Part réellement consommée par les recettes ; l'écart = restes réutilisables. */
      usedEst,
      leftoverEst: round2(Math.max(0, totalEst - usedEst)),
      /** À ajouter si les basiques (huile, vinaigre, sucre…) manquent. */
      optionalEst,
      lines,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
