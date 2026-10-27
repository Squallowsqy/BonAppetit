import { recipes } from "@/lib/catalog";
import { recipeCost, servingsFromHousehold } from "@/lib/pricing";
import {
  learnTasteProfile,
  recipeFeatures,
  scoreRecipe,
  type FeatureVec,
} from "@/lib/taste-ml";
import {
  dinnerDateKey,
  totalDinnerSlots,
} from "@/lib/plan-labels";
import type {
  FunnelAnswers,
  PlannedDinner,
  Recipe,
  TasteSignals,
  WeekPlan,
} from "@/lib/types";

/** Viande rouge (bœuf, veau, agneau) — pas deux jours d’affilée. */
export function isRedMeatRecipe(recipe: Recipe): boolean {
  const protein = (recipe.mainProtein || "").toLowerCase();
  if (/(b[oœ]uf|beef|veau|agneau|lamb|mutton)/.test(protein)) return true;

  const blob = `${recipe.title_fr} ${recipe.description_fr || ""} ${recipe.ingredients
    .map((i) => i.name_fr || i.ingredientId)
    .join(" ")}`.toLowerCase();

  if (
    /(b[oœ]uf|beef|veau|agneau|lamb|rumsteck|entrec[oô]te|faux[- ]?filet|bavette|onglet|bourguignon|stroganoff)/.test(
      blob
    )
  ) {
    return true;
  }
  // « steak » / « haché » sans autre protéine claire → bœuf par défaut
  if (
    /\bsteak\b/.test(blob) &&
    !/(thon|saumon|poulet|dinde|porc|tofu|tempeh|saucisse)/.test(blob)
  ) {
    return true;
  }
  if (/hach[ée]/.test(blob) && /(b[oœ]uf|beef|steak)/.test(blob)) return true;
  return false;
}

function breaksRedMeatRule(
  previous: Recipe | null | undefined,
  candidate: Recipe | null | undefined
) {
  if (!previous || !candidate) return false;
  return isRedMeatRecipe(previous) && isRedMeatRecipe(candidate);
}

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

function toDinner(
  p: { recipe: Recipe; cost: number },
  i: number,
  answers: FunnelAnswers
): PlannedDinner {
  const horizon = answers.horizon || "week";
  return {
    dateKey: dinnerDateKey(i, answers.dinners, horizon),
    recipeId: p.recipe.id,
    slug: p.recipe.slug,
    title_fr: p.recipe.title_fr,
    prepMin: p.recipe.prepMin,
    image: p.recipe.image ?? null,
    cost: Math.round(p.cost * 100) / 100,
  };
}

/** Génération classique (budget greedy). */
export function generateWeekPlan(answers: FunnelAnswers): WeekPlan {
  if (!answers.storeId) throw new Error("Magasin manquant");
  const servings = servingsFromHousehold(answers.adults, answers.children);
  const pool = candidatePool(answers);
  const scored = pool
    .map((r) => ({ recipe: r, cost: recipeCost(r, answers.storeId!, servings) }))
    .filter((x) => x.cost > 0.5)
    .sort((a, b) => a.cost - b.cost);

  const fallback = recipes
    .map((r) => ({ recipe: r, cost: recipeCost(r, answers.storeId!, servings) }))
    .filter((x) => x.cost > 0.5)
    .sort((a, b) => a.cost - b.cost);

  const horizon = answers.horizon || "week";
  const n = totalDinnerSlots(answers.dinners, horizon);
  const source = scored.length >= n ? scored : fallback;
  const picked: { recipe: Recipe; cost: number }[] = [];
  const used = new Set<string>();
  let remaining = answers.budget;

  for (const item of source) {
    if (picked.length >= n) break;
    if (used.has(item.recipe.id)) continue;
    const prev = picked[picked.length - 1]?.recipe;
    if (breaksRedMeatRule(prev, item.recipe)) continue;
    const slotsLeft = n - picked.length;
    const maxForThis = remaining - 0.8 * (slotsLeft - 1);
    if (item.cost <= Math.max(maxForThis, remaining / slotsLeft + 2)) {
      picked.push(item);
      used.add(item.recipe.id);
      remaining -= item.cost;
    }
  }
  for (const item of source) {
    if (picked.length >= n) break;
    if (used.has(item.recipe.id)) continue;
    const prev = picked[picked.length - 1]?.recipe;
    if (breaksRedMeatRule(prev, item.recipe)) continue;
    picked.push(item);
    used.add(item.recipe.id);
  }
  // Dernier recours : remplir sans contrainte si pool trop petit
  for (const item of source) {
    if (picked.length >= n) break;
    if (used.has(item.recipe.id)) continue;
    picked.push(item);
    used.add(item.recipe.id);
  }

  let total = picked.reduce((s, p) => s + p.cost, 0);
  let guard = 0;
  while (total > answers.budget && guard < 40) {
    guard += 1;
    const expensiveIdx = picked.reduce(
      (best, p, i) => (p.cost > picked[best].cost ? i : best),
      0
    );
    const current = picked[expensiveIdx];
    const prev = picked[expensiveIdx - 1]?.recipe;
    const next = picked[expensiveIdx + 1]?.recipe;
    const replacement = source.find(
      (s) =>
        !used.has(s.recipe.id) &&
        s.cost < current.cost - 0.3 &&
        !breaksRedMeatRule(prev, s.recipe) &&
        !breaksRedMeatRule(s.recipe, next)
    );
    if (!replacement) break;
    used.delete(current.recipe.id);
    used.add(replacement.recipe.id);
    picked[expensiveIdx] = replacement;
    total = picked.reduce((s, p) => s + p.cost, 0);
  }

  repairConsecutiveRedMeat(picked, source, used);

  const dinners = picked.slice(0, n).map((p, i) => toDinner(p, i, answers));
  return {
    answers,
    dinners,
    totalCost: Math.round(dinners.reduce((s, d) => s + d.cost, 0) * 100) / 100,
    servings,
    createdAt: new Date().toISOString(),
    horizon,
  };
}

/**
 * Génération ML : goûts appris + variété inter-plats + fit budget enseigne.
 * Les recettes récentes sont pénalisées pour faire tourner le menu.
 */
export function generateWeekPlanML(
  answers: FunnelAnswers,
  signals: TasteSignals
): WeekPlan {
  if (!answers.storeId) throw new Error("Magasin manquant");
  const servings = servingsFromHousehold(answers.adults, answers.children);
  const horizon = answers.horizon || "week";
  const n = totalDinnerSlots(answers.dinners, horizon);
  const budgetPerDinner = answers.budget / Math.max(1, n);

  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const profile = learnTasteProfile(recipeById, signals, answers);
  const recentIds = new Set([
    ...signals.recentRecipeIds,
    ...signals.favoriteIds.slice(0, 0), // favorites stay preferred via taste, not blocked
  ]);
  // Soft-block only non-favorite recent meals for novelty
  for (const id of signals.recentRecipeIds) {
    if (!signals.favoriteIds.includes(id)) recentIds.add(id);
  }
  for (const id of signals.dislikeRecipeIds) recentIds.add(id);

  const pool = candidatePool(answers)
    .map((r) => ({
      recipe: r,
      cost: recipeCost(r, answers.storeId!, servings),
    }))
    .filter((x) => x.cost > 0.5 && x.cost <= budgetPerDinner * 1.85);

  const fallbackPool =
    pool.length >= n
      ? pool
      : recipes
          .map((r) => ({
            recipe: r,
            cost: recipeCost(r, answers.storeId!, servings),
          }))
          .filter((x) => x.cost > 0.5);

  const picked: { recipe: Recipe; cost: number }[] = [];
  const used = new Set<string>();
  const pickedFeatures: FeatureVec[] = [];
  let remaining = answers.budget;

  for (let slot = 0; slot < n; slot++) {
    const slotsLeft = n - slot;
    const maxCost = Math.min(
      remaining - 0.5 * Math.max(0, slotsLeft - 1),
      budgetPerDinner * 1.55
    );
    const prev = picked[picked.length - 1]?.recipe;

    const ranked = fallbackPool
      .filter(
        (x) =>
          !used.has(x.recipe.id) &&
          x.cost <= Math.max(maxCost, budgetPerDinner * 0.55) &&
          !breaksRedMeatRule(prev, x.recipe)
      )
      .map((x) => {
        const s = scoreRecipe({
          recipe: x.recipe,
          profile,
          recentIds,
          pickedFeatures,
          cost: x.cost,
          budgetPerDinner,
        });
        return { ...x, ml: s };
      })
      .sort((a, b) => b.ml.score - a.ml.score);

    const choice =
      ranked[0] ||
      fallbackPool.find(
        (x) => !used.has(x.recipe.id) && !breaksRedMeatRule(prev, x.recipe)
      ) ||
      fallbackPool.find((x) => !used.has(x.recipe.id));
    if (!choice) break;
    picked.push({ recipe: choice.recipe, cost: choice.cost });
    used.add(choice.recipe.id);
    pickedFeatures.push(recipeFeatures(choice.recipe));
    remaining -= choice.cost;
  }

  // Budget repair
  let total = picked.reduce((s, p) => s + p.cost, 0);
  let guard = 0;
  while (total > answers.budget && guard < 50) {
    guard += 1;
    const expensiveIdx = picked.reduce(
      (best, p, i) => (p.cost > picked[best].cost ? i : best),
      0
    );
    const current = picked[expensiveIdx];
    const prev = picked[expensiveIdx - 1]?.recipe;
    const nextR = picked[expensiveIdx + 1]?.recipe;
    const cheaper = fallbackPool
      .filter(
        (x) =>
          !used.has(x.recipe.id) &&
          x.cost < current.cost - 0.25 &&
          !breaksRedMeatRule(prev, x.recipe) &&
          !breaksRedMeatRule(x.recipe, nextR)
      )
      .map((x) => {
        const without = pickedFeatures.filter((_, i) => i !== expensiveIdx);
        return {
          ...x,
          ml: scoreRecipe({
            recipe: x.recipe,
            profile,
            recentIds,
            pickedFeatures: without,
            cost: x.cost,
            budgetPerDinner,
          }),
        };
      })
      .sort((a, b) => b.ml.score - a.ml.score)[0];
    if (!cheaper) break;
    used.delete(current.recipe.id);
    used.add(cheaper.recipe.id);
    picked[expensiveIdx] = { recipe: cheaper.recipe, cost: cheaper.cost };
    pickedFeatures[expensiveIdx] = recipeFeatures(cheaper.recipe);
    total = picked.reduce((s, p) => s + p.cost, 0);
  }

  repairConsecutiveRedMeat(picked, fallbackPool, used);

  const dinners = picked.slice(0, n).map((p, i) => toDinner(p, i, answers));
  return {
    answers,
    dinners,
    totalCost: Math.round(dinners.reduce((s, d) => s + d.cost, 0) * 100) / 100,
    servings,
    createdAt: new Date().toISOString(),
    horizon,
  };
}

/** Remplace une viande rouge si elle colle à une autre (jours adjacents). */
function repairConsecutiveRedMeat(
  picked: { recipe: Recipe; cost: number }[],
  pool: { recipe: Recipe; cost: number }[],
  used: Set<string>
) {
  for (let i = 1; i < picked.length; i++) {
    if (!breaksRedMeatRule(picked[i - 1].recipe, picked[i].recipe)) continue;
    const prevNext = picked[i + 1]?.recipe;
    const replacement = pool.find(
      (s) =>
        !used.has(s.recipe.id) &&
        !isRedMeatRecipe(s.recipe) &&
        !breaksRedMeatRule(s.recipe, prevNext)
    );
    if (!replacement) continue;
    used.delete(picked[i].recipe.id);
    used.add(replacement.recipe.id);
    picked[i] = replacement;
  }
}

export function swapDinner(plan: WeekPlan, dateKey: string, signals?: TasteSignals): WeekPlan {
  const storeId = plan.answers.storeId!;
  const servings = plan.servings;
  const used = new Set(plan.dinners.map((d) => d.recipeId));
  const targetIdx = plan.dinners.findIndex((d) => d.dateKey === dateKey);
  const target = targetIdx >= 0 ? plan.dinners[targetIdx] : undefined;
  if (!target) return plan;

  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const neighborPrev =
    targetIdx > 0 ? recipeById.get(plan.dinners[targetIdx - 1].recipeId) : undefined;
  const neighborNext =
    targetIdx < plan.dinners.length - 1
      ? recipeById.get(plan.dinners[targetIdx + 1].recipeId)
      : undefined;

  const budgetPerDinner = plan.answers.budget / Math.max(1, plan.dinners.length);
  const poolBase = candidatePool(plan.answers)
    .map((r) => ({ recipe: r, cost: recipeCost(r, storeId, servings) }))
    .filter(
      (x) =>
        x.cost > 0.5 &&
        !used.has(x.recipe.id) &&
        !breaksRedMeatRule(neighborPrev, x.recipe) &&
        !breaksRedMeatRule(x.recipe, neighborNext)
    );

  let next: { recipe: Recipe; cost: number } | undefined;

  if (signals) {
    const profile = learnTasteProfile(recipeById, signals, plan.answers);
    const recentIds = new Set(signals.recentRecipeIds);
    const pickedFeatures = plan.dinners
      .filter((d) => d.dateKey !== dateKey)
      .map((d) => {
        const r = recipeById.get(d.recipeId);
        return r ? recipeFeatures(r) : null;
      })
      .filter(Boolean) as FeatureVec[];

    next = poolBase
      .map((x) => ({
        ...x,
        ml: scoreRecipe({
          recipe: x.recipe,
          profile,
          recentIds,
          pickedFeatures,
          cost: x.cost,
          budgetPerDinner,
        }),
      }))
      .sort((a, b) => {
        const costDist = Math.abs(a.cost - target.cost) - Math.abs(b.cost - target.cost);
        return b.ml.score * 2 - a.ml.score * 2 + costDist * 0.15;
      })[0];
  } else {
    next = poolBase.sort(
      (a, b) => Math.abs(a.cost - target.cost) - Math.abs(b.cost - target.cost)
    )[0];
  }

  if (!next) return plan;

  const dinners = plan.dinners.map((d) =>
    d.dateKey === dateKey
      ? {
          ...d,
          recipeId: next!.recipe.id,
          slug: next!.recipe.slug,
          title_fr: next!.recipe.title_fr,
          prepMin: next!.recipe.prepMin,
          image: next!.recipe.image ?? null,
          cost: Math.round(next!.cost * 100) / 100,
        }
      : d
  );
  return {
    ...plan,
    dinners,
    totalCost: Math.round(dinners.reduce((s, d) => s + d.cost, 0) * 100) / 100,
    horizon: plan.horizon || plan.answers.horizon || "week",
  };
}
