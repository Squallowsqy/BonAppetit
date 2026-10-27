import { NextResponse } from "next/server";
import { swapDinner } from "@/lib/generate";
import type { WeekPlan } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { plan: WeekPlan; dateKey: string };
    if (!body?.plan || !body?.dateKey) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }
    const plan = swapDinner(body.plan, body.dateKey);
    return NextResponse.json(plan);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
