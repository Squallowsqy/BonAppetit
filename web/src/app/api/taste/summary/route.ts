import { NextResponse } from "next/server";
import { recipes } from "@/lib/catalog";
import { learnTasteProfile, summarizeTaste } from "@/lib/taste-ml";
import type { FunnelAnswers, TasteSignals } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      answers: FunnelAnswers;
      taste: TasteSignals;
    };
    if (!body?.answers || !body?.taste) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }
    const recipeById = new Map(recipes.map((r) => [r.id, r]));
    const profile = learnTasteProfile(recipeById, body.taste, body.answers);
    const tags = summarizeTaste(profile);
    const eventCount = body.taste.events?.length || 0;
    const favoriteCount = body.taste.favoriteIds?.length || 0;
    return NextResponse.json({
      tags,
      eventCount,
      favoriteCount,
      recentCount: body.taste.recentRecipeIds?.length || 0,
      ready: eventCount + favoriteCount >= 2,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}
