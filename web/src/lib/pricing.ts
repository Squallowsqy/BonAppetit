import { getIngredient, getStore } from "@/lib/catalog";
import { toCatalogUnit } from "@/lib/units";
import type { Recipe } from "@/lib/types";

export function formatEUR(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

const baseCostCache = new Map<string, { cost: number; coverage: number }>();

/**
 * Coût « consommé » d'une recette pour `baseServings`, coefficient enseigne 1 :
 * chaque ligne est convertie dans l'unité catalogue puis valorisée au prorata
 * du conditionnement. Les lignes « au goût » / sel-poivre ne comptent pas.
 */
export function recipeBaseCost(recipe: Recipe): { cost: number; coverage: number } {
  const cached = baseCostCache.get(recipe.id);
  if (cached) return cached;

  let total = 0;
  let priced = 0;
  let countable = 0;
  for (const line of recipe.ingredients) {
    const ing = getIngredient(line.ingredientId);
    if (ing?.staple) continue;
    const conv = toCatalogUnit(ing, line.qty, line.unit);
    if (conv.qty <= 0) continue;
    countable += 1;
    if (!ing?.price_eur || !ing.pack_qty) continue;
    priced += 1;
    total += ing.price_eur * (conv.qty / ing.pack_qty);
  }
  const out = {
    cost: Math.round(total * 100) / 100,
    coverage: countable ? Math.round((priced / countable) * 100) / 100 : 0,
  };
  baseCostCache.set(recipe.id, out);
  return out;
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
  return recipeBaseCost(recipe).cost * scale * coef;
}

export function servingsFromHousehold(adults: number, children: number) {
  return Math.max(1, adults + children * 0.5);
}
