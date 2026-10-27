import { getIngredient, getRecipe } from "@/lib/catalog";
import type { WeekPlan } from "@/lib/types";

export type GroceryLine = {
  key: string;
  ingredientId: string;
  name: string;
  aisle: string;
  qty: number;
  unit: string;
  estEUR: number | null;
};

export function buildGroceryList(plan: WeekPlan): GroceryLine[] {
  const storeCoef = 1; // already baked into dinner costs; line est uses ingredient packs × coef via answers
  const coef =
    // lazy import avoided — coefficient applied in UI via store if needed
    1;
  void storeCoef;
  void coef;

  const map = new Map<string, GroceryLine>();
  const servings = plan.servings;

  for (const dinner of plan.dinners) {
    const recipe = getRecipe(dinner.recipeId);
    if (!recipe) continue;
    const scale = servings / (recipe.baseServings || 2);
    for (const line of recipe.ingredients) {
      const ing = getIngredient(line.ingredientId);
      const name = line.name_fr || ing?.name_fr || line.ingredientId;
      const unit = line.unit || ing?.unit || "u";
      const qty = (line.qty || 0) * scale;
      const key = line.ingredientId;
      const prev = map.get(key);
      let est: number | null = null;
      if (ing?.price_eur && ing.pack_qty) {
        est = ing.price_eur * (qty / ing.pack_qty);
      }
      if (prev) {
        prev.qty += qty;
        if (est != null) prev.estEUR = (prev.estEUR || 0) + est;
      } else {
        map.set(key, {
          key,
          ingredientId: line.ingredientId,
          name,
          aisle: ing?.aisle || "autre",
          qty,
          unit,
          estEUR: est,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.aisle === b.aisle ? a.name.localeCompare(b.name, "fr") : a.aisle.localeCompare(b.aisle, "fr")
  );
}

export function aisleLabel(aisle: string) {
  const labels: Record<string, string> = {
    produce: "Fruits & légumes",
    meat: "Viandes",
    fish: "Poissons",
    dairy: "Produits laitiers",
    bakery: "Boulangerie",
    dry: "Épicerie",
    canned: "Conserves",
    condiments: "Condiments",
    frozen: "Surgelés",
    beverages: "Boissons",
    unknown: "Divers",
    autre: "Divers",
  };
  return labels[aisle] || aisle;
}
