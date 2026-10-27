import { recipes } from "@/lib/catalog";
import { recipeCost, servingsFromHousehold } from "@/lib/pricing";
import type { FunnelAnswers, PlannedDinner, Recipe, WeekPlan } from "@/lib/types";

const DAY_KEYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"] as const;

function matchesDiet(recipe: Recipe, diet: string) {
  const protein = (recipe.mainProtein || "").toLowerCase();
  const title = (recipe.title_fr || "").toLowerCase();
  const veggy =
    recipe.flags?.vegetarian ||
    title.includes("végét") ||
    title.includes("vege") ||
    protein.includes("veg") ||
    protein.includes("tofu") ||
    protein.includes("legume");

  if (diet === "vegan") {
    return (
      title.includes("vegan") ||
      title.includes("végan") ||
      (veggy && !title.includes("fromage") && !title.includes("œuf") && !title.includes("oeuf"))
    );
  }
  if (diet === "vegetarian") return Boolean(veggy) || protein === "vegetarian";
  return true;
}

function matchesAllergens(recipe: Recipe, allergens: string[]) {
  if (!allergens.length) return true;
  const blob = `${recipe.title_fr} ${(recipe.allergens || []).join(" ")} ${recipe.ingredients
    .map((i) => i.name_fr || i.ingredientId)
    .join(" ")}`.toLowerCase();
  const map: Record<string, string[]> = {
    gluten: ["blé", "ble", "pâtes", "pates", "pain", "farine", "gluten", "naan", "wrap"],
    lactose: ["lait", "crème", "creme", "fromage", "beurre", "yaourt", "lactose"],
    egg: ["œuf", "oeuf", "egg"],
    peanut: ["arachide", "cacahu"],
    nuts: ["noix", "noisette", "amande", "cajou", "pistache"],
    soy: ["soja", "tofu", "soy"],
    fish: ["poisson", "saumon", "thon", "cabillaud", "lieu", "fish"],
    shellfish: ["crevette", "crustacé", "moule", "calamar"],
    sesame: ["sésame", "sesame"],
  };
  for (const a of allergens) {
    const keys = map[a] || [a];
    if (keys.some((k) => blob.includes(k))) return false;
  }
  return true;
}

function matchesDislikes(recipe: Recipe, dislikes: string[]) {
  if (!dislikes.length) return true;
  const blob = `${recipe.title_fr} ${recipe.ingredients.map((i) => i.name_fr || "").join(" ")}`.toLowerCase();
  const map: Record<string, string[]> = {
    coriander: ["coriandre"],
    mushrooms: ["champignon"],
    olives: ["olive"],
    seafood: ["crevette", "moule", "crustacé", "calamar", "fruit de mer"],
    offal: ["foie", "rognon", "abats"],
    "blue-cheese": ["bleu", "roquefort", "gorgonzola"],
  };
  for (const d of dislikes) {
    const keys = map[d] || [d];
    if (keys.some((k) => blob.includes(k))) return false;
  }
  return true;
}

function matchesTime(recipe: Recipe, timeMin: number) {
  const prep = recipe.prepMin ?? 35;
  return prep <= timeMin + 5;
}

function candidatePool(answers: FunnelAnswers): Recipe[] {
  return recipes.filter((r) => {
    if (!r.ingredients?.length) return false;
    if (!matchesDiet(r, answers.diet)) return false;
    if (!matchesAllergens(r, answers.allergens)) return false;
    if (!matchesDislikes(r, answers.dislikes)) return false;
    if (!matchesTime(r, answers.timeMin)) return false;
    return true;
  });
}

export function generateWeekPlan(answers: FunnelAnswers): WeekPlan {
  if (!answers.storeId) {
    throw new Error("Magasin manquant");
  }
  const servings = servingsFromHousehold(answers.adults, answers.children);
  const pool = candidatePool(answers);
  const scored = pool
    .map((r) => ({
      recipe: r,
      cost: recipeCost(r, answers.storeId!, servings),
    }))
    .filter((x) => x.cost > 0.5)
    .sort((a, b) => a.cost - b.cost);

  const fallback = recipes
    .map((r) => ({ recipe: r, cost: recipeCost(r, answers.storeId!, servings) }))
    .filter((x) => x.cost > 0.5)
    .sort((a, b) => a.cost - b.cost);

  const source = scored.length >= answers.dinners ? scored : fallback;

  const picked: { recipe: Recipe; cost: number }[] = [];
  const used = new Set<string>();

  // Greedy: take varied cheap recipes under remaining budget
  let remaining = answers.budget;
  const n = answers.dinners;

  for (const item of source) {
    if (picked.length >= n) break;
    if (used.has(item.recipe.id)) continue;
    const slotsLeft = n - picked.length;
    const maxForThis = remaining - 0.8 * (slotsLeft - 1); // leave room for cheapest leftovers
    if (item.cost <= Math.max(maxForThis, remaining / slotsLeft + 2)) {
      picked.push(item);
      used.add(item.recipe.id);
      remaining -= item.cost;
    }
  }

  // Fill leftovers with cheapest unused
  for (const item of source) {
    if (picked.length >= n) break;
    if (used.has(item.recipe.id)) continue;
    picked.push(item);
    used.add(item.recipe.id);
  }

  // If over budget, swap expensive for cheaper unused
  let total = picked.reduce((s, p) => s + p.cost, 0);
  let guard = 0;
  while (total > answers.budget && guard < 40) {
    guard += 1;
    const expensiveIdx = picked.reduce(
      (best, p, i) => (p.cost > picked[best].cost ? i : best),
      0
    );
    const current = picked[expensiveIdx];
    const replacement = source.find(
      (s) => !used.has(s.recipe.id) && s.cost < current.cost - 0.3
    );
    if (!replacement) break;
    used.delete(current.recipe.id);
    used.add(replacement.recipe.id);
    picked[expensiveIdx] = replacement;
    total = picked.reduce((s, p) => s + p.cost, 0);
  }

  const dinners: PlannedDinner[] = picked.slice(0, n).map((p, i) => ({
    dateKey: DAY_KEYS[i] || `j${i + 1}`,
    recipeId: p.recipe.id,
    slug: p.recipe.slug,
    title_fr: p.recipe.title_fr,
    prepMin: p.recipe.prepMin,
    cost: Math.round(p.cost * 100) / 100,
  }));

  return {
    answers,
    dinners,
    totalCost: Math.round(dinners.reduce((s, d) => s + d.cost, 0) * 100) / 100,
    servings,
    createdAt: new Date().toISOString(),
  };
}

export function swapDinner(
  plan: WeekPlan,
  dateKey: string
): WeekPlan {
  const storeId = plan.answers.storeId!;
  const servings = plan.servings;
  const used = new Set(plan.dinners.map((d) => d.recipeId));
  const target = plan.dinners.find((d) => d.dateKey === dateKey);
  if (!target) return plan;

  const pool = candidatePool(plan.answers)
    .map((r) => ({ recipe: r, cost: recipeCost(r, storeId, servings) }))
    .filter((x) => x.cost > 0.5 && !used.has(x.recipe.id))
    .sort((a, b) => Math.abs(a.cost - target.cost) - Math.abs(b.cost - target.cost));

  const next = pool[0];
  if (!next) return plan;

  const dinners = plan.dinners.map((d) =>
    d.dateKey === dateKey
      ? {
          ...d,
          recipeId: next.recipe.id,
          slug: next.recipe.slug,
          title_fr: next.recipe.title_fr,
          prepMin: next.recipe.prepMin,
          cost: Math.round(next.cost * 100) / 100,
        }
      : d
  );
  return {
    ...plan,
    dinners,
    totalCost: Math.round(dinners.reduce((s, d) => s + d.cost, 0) * 100) / 100,
  };
}
