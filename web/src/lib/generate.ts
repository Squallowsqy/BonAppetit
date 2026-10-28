import { getIngredient, recipes } from "@/lib/catalog";
import { recipeCost, servingsFromHousehold } from "@/lib/pricing";
import {
  cosine,
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

function normalizeDishText(s: string): string {
  return s
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const FAMILY_STOP = new Set([
  "de",
  "du",
  "des",
  "au",
  "aux",
  "la",
  "le",
  "les",
  "et",
  "and",
  "a",
  "avec",
  "sauce",
  "facon",
  "maison",
  "notre",
  "fameuse",
  "express",
  "gourmande",
  "gourmand",
  "legere",
  "vivifiant",
  "sur",
  "en",
  "pour",
  "dans",
  "son",
  "sa",
  "ses",
  "aux",
  "une",
  "un",
  "des",
]);

function dishStemFromWord(w: string): string | null {
  if (/^(pave|paves)$/.test(w)) return "pave";
  if (/^(nouille|nouilles|udon|ramen|wok)$/.test(w)) return "nouilles";
  if (
    /^(pate|pates|penne|rigatoni|spaghetti|tagliatelle|farfalle|casarecce|conchiglie|linguini|linguine|orzo)$/.test(
      w
    )
  )
    return "pates";
  if (/^(bowl|bol)$/.test(w)) return "bowl";
  if (/^(gratin|gratins)$/.test(w)) return "gratin";
  if (/^(salade|salades)$/.test(w)) return "salade";
  if (/^(poulet|dinde)$/.test(w)) return "volaille";
  if (/^(boeuf|steak|bavette)$/.test(w)) return "boeuf";
  if (/^(risotto|risottos)$/.test(w)) return "risotto";
  if (/^(burger|burgers)$/.test(w)) return "burger";
  if (/^(wrap|wraps|pita|pitas|naan|galette|galettes)$/.test(w)) return "wrap";
  if (/^(curry|currys)$/.test(w)) return "curry";
  if (/^(soupe|soupes|veloute|mijote|mijotes)$/.test(w)) return "mijote";
  return null;
}

/** Clé de famille (anti-doublons sur le mois : un seul « pavé », « nouilles », etc.). */
export function recipeFamilyKey(recipe: Recipe): string {
  const words = normalizeDishText(recipe.title_fr)
    .split(" ")
    .filter((w) => w.length > 2 && !FAMILY_STOP.has(w));
  for (const w of words) {
    const mapped = dishStemFromWord(w);
    if (mapped) return mapped;
  }
  return words[0] || recipe.id;
}

type ProteinBucket =
  | "poulet"
  | "boeuf"
  | "porc"
  | "veau"
  | "agneau"
  | "poisson"
  | "crevette"
  | "vege"
  | "other";

function proteinBucket(recipe: Recipe): ProteinBucket {
  const raw = `${recipe.mainProtein || ""} ${recipe.title_fr} ${
    recipe.description_fr || ""
  }`.toLowerCase();
  const blob = normalizeDishText(raw);
  if (/(poulet|dinde|volaille)/.test(blob)) return "poulet";
  if (/\bveau\b/.test(blob)) return "veau";
  if (/(agneau|lamb)/.test(blob)) return "agneau";
  if (/(b[oœ]uf|boeuf|beef|steak|bavette|hache)/.test(raw) || /boeuf/.test(blob))
    return "boeuf";
  if (/(porc|lardon|saucisse|chorizo|jambon|bacon)/.test(blob)) return "porc";
  if (/(crevette|scampi)/.test(blob)) return "crevette";
  if (/(saumon|cabillaud|poisson|merlu|thon|lieu)/.test(blob)) return "poisson";
  if (
    /(tofu|veget|vege|vegan|legumineuse|pois chiche|lentille)/.test(blob) ||
    recipe.flags?.vegetarian
  )
    return "vege";
  return "other";
}

/** Trop proche du plat précédent (même famille, même protéine, ou features très proches). */
export function breaksAdjacentVariety(
  previous: Recipe | null | undefined,
  candidate: Recipe | null | undefined
): boolean {
  if (!previous || !candidate) return false;
  if (previous.id === candidate.id) return true;
  if (recipeFamilyKey(previous) === recipeFamilyKey(candidate)) return true;
  const prevBucket = proteinBucket(previous);
  const nextBucket = proteinBucket(candidate);
  if (prevBucket !== "other" && prevBucket === nextBucket) return true;
  const sim = cosine(recipeFeatures(previous), recipeFeatures(candidate));
  return sim >= 0.78;
}

function familyAlreadyPicked(
  candidate: Recipe,
  picked: { recipe: Recipe }[],
  usedFamilies: Set<string>
): boolean {
  const key = recipeFamilyKey(candidate);
  if (usedFamilies.has(key)) return true;
  return picked.some((p) => recipeFamilyKey(p.recipe) === key);
}

function breaksPlanRules(
  previous: Recipe | null | undefined,
  candidate: Recipe,
  opts: {
    picked: { recipe: Recipe }[];
    used: Set<string>;
    usedFamilies: Set<string>;
    allowAdjacentRelax?: boolean;
  }
): boolean {
  if (opts.used.has(candidate.id)) return true;
  if (familyAlreadyPicked(candidate, opts.picked, opts.usedFamilies)) return true;
  if (breaksRedMeatRule(previous, candidate)) return true;
  if (!opts.allowAdjacentRelax && breaksAdjacentVariety(previous, candidate)) return true;
  return false;
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

/* ------------------------------------------------------------------ */
/* Périssabilité                                                       */
/* ------------------------------------------------------------------ */

const freshCache = new Map<string, { min: number | null; veryFresh: number }>();

/**
 * Conservation la plus courte (jours) parmi les ingrédients de la recette, et
 * nombre d'ingrédients très périssables (≤ 3 j). Sel/poivre et « au goût »
 * sont ignorés.
 */
export function recipeFreshness(recipe: Recipe): { min: number | null; veryFresh: number } {
  const cached = freshCache.get(recipe.id);
  if (cached) return cached;
  let min: number | null = null;
  let veryFresh = 0;
  for (const line of recipe.ingredients) {
    if (!line.qty) continue;
    const ing = getIngredient(line.ingredientId);
    if (!ing || ing.staple || ing.shelf_days == null) continue;
    if (min == null || ing.shelf_days < min) min = ing.shelf_days;
    if (ing.shelf_days <= 3) veryFresh += 1;
  }
  const out = { min, veryFresh };
  freshCache.set(recipe.id, out);
  return out;
}

export function recipeFreshDays(recipe: Recipe): number | null {
  return recipeFreshness(recipe).min;
}

function freshRank(recipe: Recipe): number {
  const f = recipeFreshness(recipe);
  // plus c'est petit, plus c'est à cuisiner tôt ; les très périssables multiples passent devant
  return (f.min ?? 99) * 10 - Math.min(f.veryFresh, 9);
}

function pairBreaks(prev: Recipe | undefined, cur: Recipe | undefined) {
  if (!prev || !cur) return false;
  return breaksRedMeatRule(prev, cur) || breaksAdjacentVariety(prev, cur);
}

function countAdjacencyIssues(list: { recipe: Recipe }[]): number {
  let n = 0;
  for (let i = 1; i < list.length; i++) {
    if (pairBreaks(list[i - 1].recipe, list[i].recipe)) n += 1;
  }
  return n;
}

/**
 * Dans chaque semaine, place en premier les plats dont les ingrédients
 * s'abîment le plus vite (poisson, viande hachée, herbes, salade…), puis
 * répare les enchaînements trop proches par échanges à l'intérieur de la
 * semaine — en choisissant l'échange qui déplace le moins la fraîcheur.
 */
function orderPerishablesFirst(
  picked: { recipe: Recipe; cost: number }[],
  perWeek: number
) {
  const size = Math.max(1, perWeek);
  for (let start = 0; start < picked.length; start += size) {
    const end = Math.min(picked.length, start + size);
    const chunk = picked.slice(start, end);
    chunk.sort((a, b) => freshRank(a.recipe) - freshRank(b.recipe));
    for (let k = 0; k < chunk.length; k++) picked[start + k] = chunk[k];
  }

  const weekOf = (i: number) => Math.floor(i / size);

  for (let pass = 0; pass < 3; pass++) {
    let issues = countAdjacencyIssues(picked);
    if (issues === 0) return;
    for (let i = 1; i < picked.length && issues > 0; i++) {
      if (!pairBreaks(picked[i - 1].recipe, picked[i].recipe)) continue;
      let best: number | null = null;
      let bestScore = Infinity;
      // On peut déplacer l'un ou l'autre des deux plats fautifs, chacun
      // uniquement à l'intérieur de sa propre semaine (gère aussi le
      // passage vendredi → lundi entre deux semaines).
      for (const j of [i - 1, i]) {
        const wkStart = weekOf(j) * size;
        const wkEnd = Math.min(picked.length, wkStart + size);
        for (let m = wkStart; m < wkEnd; m++) {
          if (m === j) continue;
          const a = Math.min(j, m);
          const b = Math.max(j, m);
          const trial = picked.slice();
          [trial[a], trial[b]] = [trial[b], trial[a]];
          const after = countAdjacencyIssues(trial);
          if (after >= issues) continue;
          const penalty =
            after * 100 + Math.abs(freshRank(trial[a].recipe) - freshRank(trial[b].recipe));
          if (penalty < bestScore) {
            bestScore = penalty;
            best = a * 1000 + b;
          }
        }
      }
      if (best != null) {
        const a = Math.floor(best / 1000);
        const b = best % 1000;
        [picked[a], picked[b]] = [picked[b], picked[a]];
        issues = countAdjacencyIssues(picked);
      }
    }
  }
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
    freshDays: recipeFreshDays(p.recipe),
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
  const usedFamilies = new Set<string>();
  let remaining = answers.budget;

  const tryPick = (item: { recipe: Recipe; cost: number }, relax: boolean) => {
    if (picked.length >= n) return false;
    const prev = picked[picked.length - 1]?.recipe;
    if (
      breaksPlanRules(prev, item.recipe, {
        picked,
        used,
        usedFamilies,
        allowAdjacentRelax: relax,
      })
    ) {
      return false;
    }
    picked.push(item);
    used.add(item.recipe.id);
    usedFamilies.add(recipeFamilyKey(item.recipe));
    remaining -= item.cost;
    return true;
  };

  for (const item of source) {
    if (picked.length >= n) break;
    const prev = picked[picked.length - 1]?.recipe;
    if (
      breaksPlanRules(prev, item.recipe, { picked, used, usedFamilies })
    )
      continue;
    const slotsLeft = n - picked.length;
    const maxForThis = remaining - 0.8 * (slotsLeft - 1);
    if (item.cost <= Math.max(maxForThis, remaining / slotsLeft + 2)) {
      tryPick(item, false);
    }
  }
  for (const item of source) {
    if (picked.length >= n) break;
    tryPick(item, false);
  }
  // Relâche uniquement l’adjacence protéine si le pool est trop serré — jamais les doublons famille
  for (const item of source) {
    if (picked.length >= n) break;
    tryPick(item, true);
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
    const others = picked.filter((_, i) => i !== expensiveIdx);
    const otherFamilies = new Set(others.map((p) => recipeFamilyKey(p.recipe)));
    const otherIds = new Set(others.map((p) => p.recipe.id));
    const replacement = source.find(
      (s) =>
        !otherIds.has(s.recipe.id) &&
        !otherFamilies.has(recipeFamilyKey(s.recipe)) &&
        s.cost < current.cost - 0.3 &&
        !breaksRedMeatRule(prev, s.recipe) &&
        !breaksRedMeatRule(s.recipe, next) &&
        !breaksAdjacentVariety(prev, s.recipe) &&
        !breaksAdjacentVariety(s.recipe, next)
    );
    if (!replacement) break;
    used.delete(current.recipe.id);
    usedFamilies.delete(recipeFamilyKey(current.recipe));
    used.add(replacement.recipe.id);
    usedFamilies.add(recipeFamilyKey(replacement.recipe));
    picked[expensiveIdx] = replacement;
    total = picked.reduce((s, p) => s + p.cost, 0);
  }

  repairPlanVariety(picked, source, used, usedFamilies);
  orderPerishablesFirst(picked, answers.dinners);

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
  const usedFamilies = new Set<string>();
  const pickedFeatures: FeatureVec[] = [];
  let remaining = answers.budget;

  for (let slot = 0; slot < n; slot++) {
    const slotsLeft = n - slot;
    const maxCost = Math.min(
      remaining - 0.5 * Math.max(0, slotsLeft - 1),
      budgetPerDinner * 1.55
    );
    const prev = picked[picked.length - 1]?.recipe;

    const eligible = (relax: boolean) =>
      fallbackPool.filter(
        (x) =>
          x.cost <= Math.max(maxCost, budgetPerDinner * 0.55) &&
          !breaksPlanRules(prev, x.recipe, {
            picked,
            used,
            usedFamilies,
            allowAdjacentRelax: relax,
          })
      );

    const rank = (list: typeof fallbackPool) =>
      list
        .map((x) => {
          const s = scoreRecipe({
            recipe: x.recipe,
            profile,
            recentIds,
            pickedFeatures,
            cost: x.cost,
            budgetPerDinner,
            adjacentRecipe: prev,
          });
          return { ...x, ml: s };
        })
        .sort((a, b) => b.ml.score - a.ml.score);

    const ranked = rank(eligible(false));
    const choice =
      ranked[0] ||
      rank(eligible(true))[0] ||
      fallbackPool.find(
        (x) =>
          !breaksPlanRules(prev, x.recipe, {
            picked,
            used,
            usedFamilies,
            allowAdjacentRelax: true,
          })
      );
    if (!choice) break;
    picked.push({ recipe: choice.recipe, cost: choice.cost });
    used.add(choice.recipe.id);
    usedFamilies.add(recipeFamilyKey(choice.recipe));
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
    const others = picked.filter((_, i) => i !== expensiveIdx);
    const otherFamilies = new Set(others.map((p) => recipeFamilyKey(p.recipe)));
    const otherIds = new Set(others.map((p) => p.recipe.id));
    const cheaper = fallbackPool
      .filter(
        (x) =>
          !otherIds.has(x.recipe.id) &&
          !otherFamilies.has(recipeFamilyKey(x.recipe)) &&
          x.cost < current.cost - 0.25 &&
          !breaksRedMeatRule(prev, x.recipe) &&
          !breaksRedMeatRule(x.recipe, nextR) &&
          !breaksAdjacentVariety(prev, x.recipe) &&
          !breaksAdjacentVariety(x.recipe, nextR)
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
            adjacentRecipe: prev,
          }),
        };
      })
      .sort((a, b) => b.ml.score - a.ml.score)[0];
    if (!cheaper) break;
    used.delete(current.recipe.id);
    usedFamilies.delete(recipeFamilyKey(current.recipe));
    used.add(cheaper.recipe.id);
    usedFamilies.add(recipeFamilyKey(cheaper.recipe));
    picked[expensiveIdx] = { recipe: cheaper.recipe, cost: cheaper.cost };
    pickedFeatures[expensiveIdx] = recipeFeatures(cheaper.recipe);
    total = picked.reduce((s, p) => s + p.cost, 0);
  }

  repairPlanVariety(picked, fallbackPool, used, usedFamilies);
  orderPerishablesFirst(picked, answers.dinners);

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

/** Corrige doublons famille + enchaînements trop similaires / viande rouge. */
function repairPlanVariety(
  picked: { recipe: Recipe; cost: number }[],
  pool: { recipe: Recipe; cost: number }[],
  used: Set<string>,
  usedFamilies: Set<string>
) {
  const seenFamilies = new Set<string>();
  for (let i = 0; i < picked.length; i++) {
    const prev = picked[i - 1]?.recipe;
    const next = picked[i + 1]?.recipe;
    const current = picked[i].recipe;
    const fam = recipeFamilyKey(current);
    const familyClash = seenFamilies.has(fam);
    const adjacentClash =
      breaksRedMeatRule(prev, current) ||
      breaksAdjacentVariety(prev, current) ||
      breaksAdjacentVariety(current, next);
    if (!familyClash && !adjacentClash) {
      seenFamilies.add(fam);
      continue;
    }

    const blockedFamilies = new Set(
      [...seenFamilies].filter((f) => f !== fam)
    );
    for (let j = i + 1; j < picked.length; j++) {
      blockedFamilies.add(recipeFamilyKey(picked[j].recipe));
    }

    const replacement = pool.find((s) => {
      if (used.has(s.recipe.id) && s.recipe.id !== current.id) return false;
      const key = recipeFamilyKey(s.recipe);
      if (blockedFamilies.has(key)) return false;
      if (s.recipe.id !== current.id && used.has(s.recipe.id)) return false;
      if (breaksRedMeatRule(prev, s.recipe)) return false;
      if (breaksRedMeatRule(s.recipe, next)) return false;
      if (breaksAdjacentVariety(prev, s.recipe)) return false;
      if (breaksAdjacentVariety(s.recipe, next)) return false;
      return s.recipe.id !== current.id;
    });
    if (!replacement) {
      seenFamilies.add(fam);
      continue;
    }
    used.delete(current.id);
    usedFamilies.delete(fam);
    used.add(replacement.recipe.id);
    usedFamilies.add(recipeFamilyKey(replacement.recipe));
    picked[i] = replacement;
    seenFamilies.add(recipeFamilyKey(replacement.recipe));
  }
}

export function swapDinner(plan: WeekPlan, dateKey: string, signals?: TasteSignals): WeekPlan {
  const storeId = plan.answers.storeId!;
  const servings = plan.servings;
  const used = new Set(plan.dinners.map((d) => d.recipeId));
  const usedFamilies = new Set(
    plan.dinners
      .map((d) => recipes.find((r) => r.id === d.recipeId))
      .filter(Boolean)
      .map((r) => recipeFamilyKey(r!))
  );
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
  const targetRecipe = recipeById.get(target.recipeId);
  const targetFamily = targetRecipe ? recipeFamilyKey(targetRecipe) : null;

  const budgetPerDinner = plan.answers.budget / Math.max(1, plan.dinners.length);
  const poolBase = candidatePool(plan.answers)
    .map((r) => ({ recipe: r, cost: recipeCost(r, storeId, servings) }))
    .filter((x) => {
      if (x.cost <= 0.5 || used.has(x.recipe.id)) return false;
      const fam = recipeFamilyKey(x.recipe);
      if (usedFamilies.has(fam) && fam !== targetFamily) return false;
      if (breaksRedMeatRule(neighborPrev, x.recipe)) return false;
      if (breaksRedMeatRule(x.recipe, neighborNext)) return false;
      if (breaksAdjacentVariety(neighborPrev, x.recipe)) return false;
      if (breaksAdjacentVariety(x.recipe, neighborNext)) return false;
      return true;
    });

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
          freshDays: recipeFreshDays(next!.recipe),
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
