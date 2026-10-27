import { NextResponse } from "next/server";
import { generateWeekPlan } from "@/lib/generate";
import type { FunnelAnswers } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const answers = (await req.json()) as FunnelAnswers;
    if (!answers?.storeId) {
      return NextResponse.json({ error: "Magasin manquant" }, { status: 400 });
    }
    const plan = generateWeekPlan(answers);
    return NextResponse.json(plan);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
