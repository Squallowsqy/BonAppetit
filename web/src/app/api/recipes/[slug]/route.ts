import { NextResponse } from "next/server";
import { getIngredient, recipes } from "@/lib/catalog";
import { recipeCost } from "@/lib/pricing";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const recipe = recipes.find((r) => r.slug === slug || r.id === slug);
  if (!recipe) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const url = new URL(req.url);
  const servings = Number(url.searchParams.get("servings") || recipe.baseServings || 2);
  const storeId = url.searchParams.get("storeId") || "carrefour";

  const ingredients = recipe.ingredients.map((line) => {
    const ing = getIngredient(line.ingredientId);
    return {
      ...line,
      name_fr: line.name_fr || ing?.name_fr || line.ingredientId,
      unit: line.unit || ing?.unit || "",
      aisle: ing?.aisle || "autre",
    };
  });

  return NextResponse.json({
    ...recipe,
    ingredients,
    cost: recipeCost(recipe, storeId, servings),
  });
}
