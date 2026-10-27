import { NextResponse } from "next/server";
import { getStore } from "@/lib/catalog";
import { aisleLabel, buildGroceryList } from "@/lib/groceries";
import type { WeekPlan } from "@/lib/types";

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
      estEUR: l.estEUR != null ? Math.round(l.estEUR * coef * 100) / 100 : null,
    }));
    const totalEst = Math.round(lines.reduce((s, l) => s + (l.estEUR || 0), 0) * 100) / 100;
    return NextResponse.json({
      storeName: store?.name || null,
      totalEst,
      lines,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
