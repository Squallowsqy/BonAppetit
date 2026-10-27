import { NextResponse } from "next/server";
import { generateWeekPlan, generateWeekPlanML } from "@/lib/generate";
import type { FunnelAnswers, TasteSignals } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      answers?: FunnelAnswers;
      taste?: TasteSignals | null;
      mode?: "classic" | "ml";
    } & FunnelAnswers;

    // Back-compat: plain FunnelAnswers body
    const answers: FunnelAnswers =
      body.answers ||
      ({
        storeId: body.storeId,
        adults: body.adults,
        children: body.children,
        budget: body.budget,
        dinners: body.dinners,
        diet: body.diet,
        protein: body.protein,
        vibes: body.vibes,
        allergens: body.allergens,
        dislikes: body.dislikes,
        timeMin: body.timeMin,
        skill: body.skill,
        equipment: body.equipment,
        goal: body.goal,
      } as FunnelAnswers);

    if (!answers?.storeId) {
      return NextResponse.json({ error: "Magasin manquant" }, { status: 400 });
    }

    const useMl = body.mode === "ml" || Boolean(body.taste);
    const plan =
      useMl && body.taste
        ? generateWeekPlanML(answers, body.taste)
        : generateWeekPlan(answers);

    return NextResponse.json({
      ...plan,
      meta: { mode: useMl && body.taste ? "ml" : "classic" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
