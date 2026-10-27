import { getIngredient, getStore } from "@/lib/catalog";
import type { Recipe } from "@/lib/types";

export function formatEUR(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

/** Cost for a recipe at given servings and store coefficient. */
export function recipeCost(
  recipe: Recipe,
  storeId: string,
  servings: number
): number {
  const store = getStore(storeId);
  const coef = store?.priceCoefficient ?? 1;
  const scale = servings / (recipe.baseServings || 2);

  if (recipe.costBase != null && recipe.costBase > 0) {
    return recipe.costBase * scale * coef;
  }

  let total = 0;
  for (const line of recipe.ingredients) {
    const ing = getIngredient(line.ingredientId);
    const qty = (line.qty || 0) * scale;
    if (!ing?.price_eur || !ing.pack_qty) continue;
    total += ing.price_eur * (qty / ing.pack_qty);
  }
  return total * coef;
}

export function servingsFromHousehold(adults: number, children: number) {
  return Math.max(1, adults + children * 0.5);
}
