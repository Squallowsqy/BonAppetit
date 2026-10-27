/**
 * Moteur de goûts local (content-based + novelty).
 * Apprend des favoris, paniers sauvegardés, swaps et feedbacks.
 * Oriente la génération pour varier les repas et regrouper les achats par enseigne.
 */
import type {
  FunnelAnswers,
  Recipe,
  RecipeRating,
  TasteEvent,
  TasteSignals,
} from "@/lib/types";

/** Poids ML dérivé d’une note 1–5 (3 = neutre). */
export function ratingToWeight(stars: number): number {
  return (Math.min(5, Math.max(1, stars)) - 3) * 1.15;
}

const FEATURE_KEYS = [
  "cuisine_fr",
  "cuisine_it",
  "cuisine_asia",
  "cuisine_mex",
  "cuisine_ind",
  "cuisine_med",
  "cuisine_world",
  "prot_poulet",
  "prot_boeuf",
  "prot_porc",
  "prot_poisson",
  "prot_vege",
  "prot_legumineuse",
  "vibe_comfort",
  "vibe_fresh",
  "vibe_spicy",
  "vibe_quick",
  "pasta",
  "riz",
  "patate",
  "legume_vert",
  "fromage",
  "price_low",
  "price_mid",
  "price_high",
  "aisle_produce",
  "aisle_meat",
  "aisle_dry",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type FeatureVec = Record<FeatureKey, number>;

function emptyVec(): FeatureVec {
  return Object.fromEntries(FEATURE_KEYS.map((k) => [k, 0])) as FeatureVec;
}

function blobOf(recipe: Recipe) {
  return `${recipe.title_fr} ${recipe.description_fr || ""} ${recipe.cuisine || ""} ${
    recipe.mainProtein || ""
  } ${recipe.ingredients.map((i) => i.name_fr || "").join(" ")}`.toLowerCase();
}

function has(blob: string, ...words: string[]) {
  return words.some((w) => blob.includes(w));
}

/** Vecteur de features d’une recette (0/1 sparse). */
export function recipeFeatures(recipe: Recipe): FeatureVec {
  const v = emptyVec();
  const b = blobOf(recipe);
  const cuisine = (recipe.cuisine || "").toLowerCase();

  if (has(cuisine, "franç", "franc") || has(b, "blanquette", "bœuf bourguignon", "ratatouille"))
    v.cuisine_fr = 1;
  if (has(cuisine, "ital") || has(b, "pasta", "pâtes", "risotto", "parmesan", "spaghetti", "rigatoni"))
    v.cuisine_it = 1;
  if (has(cuisine, "asia", "chin", "japon", "thaï", "thai", "coré") || has(b, "wok", "teriyaki", "miso", "udon", "ramen", "soja"))
    v.cuisine_asia = 1;
  if (has(cuisine, "mex") || has(b, "taco", "tostada", "burrito", "chili", "guacamole"))
    v.cuisine_mex = 1;
  if (has(cuisine, "ind") || has(b, "curry", "masala", "naan", "tandoori")) v.cuisine_ind = 1;
  if (has(cuisine, "méditerr", "mediterr", "grec", "liban") || has(b, "houmous", "falafel", "feta"))
    v.cuisine_med = 1;
  if (!v.cuisine_fr && !v.cuisine_it && !v.cuisine_asia && !v.cuisine_mex && !v.cuisine_ind && !v.cuisine_med)
    v.cuisine_world = 1;

  if (has(b, "poulet", "dinde", "volaille")) v.prot_poulet = 1;
  if (has(b, "bœuf", "boeuf", "steak", "haché")) v.prot_boeuf = 1;
  if (has(b, "porc", "lardon", "saucisse", "chorizo", "jambon")) v.prot_porc = 1;
  if (has(b, "saumon", "cabillaud", "poisson", "merlu", "thon", "crevette")) v.prot_poisson = 1;
  if (has(b, "tofu", "végét", "vege", "vegan") || recipe.flags?.vegetarian) v.prot_vege = 1;
  if (has(b, "lentille", "pois chiche", "haricot", "fagioli")) v.prot_legumineuse = 1;

  if (has(b, "gratin", "mijot", "comfort", "crémeux", "cremeux")) v.vibe_comfort = 1;
  if (has(b, "salade", "frais", "citron", "croquant")) v.vibe_fresh = 1;
  if (has(b, "piment", "épicé", "epice", "chili", "harissa")) v.vibe_spicy = 1;
  if ((recipe.prepMin || 99) <= 25 || recipe.flags?.quick) v.vibe_quick = 1;

  if (has(b, "pâtes", "pates", "pasta", "rigatoni", "spaghetti", "penne", "tortell")) v.pasta = 1;
  if (has(b, "riz", "risotto", "basmati")) v.riz = 1;
  if (has(b, "pomme de terre", "grenaill", "patate", "frite")) v.patate = 1;
  if (has(b, "épinard", "epinard", "brocoli", "courgette", "haricot vert")) v.legume_vert = 1;
  if (has(b, "fromage", "cheddar", "parmesan", "mozarella", "mozzarella")) v.fromage = 1;

  const cost = recipe.costBase ?? 6;
  if (cost < 4) v.price_low = 1;
  else if (cost < 8) v.price_mid = 1;
  else v.price_high = 1;

  const aisles = new Set(
    recipe.ingredients.map((i) => (i.ingredientId || "").split("-")[0] || "")
  );
  // Heuristic from ingredient names
  if (has(b, "carotte", "poireau", "oignon", "tomate", "salade", "courgette")) v.aisle_produce = 1;
  if (v.prot_poulet || v.prot_boeuf || v.prot_porc) v.aisle_meat = 1;
  if (v.pasta || v.riz || has(b, "farine", "conserve")) v.aisle_dry = 1;
  void aisles;

  return v;
}

export function addVec(a: FeatureVec, b: FeatureVec, w = 1): FeatureVec {
  const out = emptyVec();
  for (const k of FEATURE_KEYS) out[k] = a[k] + b[k] * w;
  return out;
}

export function scaleVec(a: FeatureVec, s: number): FeatureVec {
  const out = emptyVec();
  for (const k of FEATURE_KEYS) out[k] = a[k] * s;
  return out;
}

export function cosine(a: FeatureVec, b: FeatureVec) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k of FEATURE_KEYS) {
    dot += a[k] * b[k];
    na += a[k] * a[k];
    nb += b[k] * b[k];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Profil utilisateur appris à partir des signaux. */
export function learnTasteProfile(
  recipeById: Map<string, Recipe>,
  signals: TasteSignals,
  answers: FunnelAnswers
): FeatureVec {
  let profile = emptyVec();

  // Priors from quiz
  for (const vibe of answers.vibes || []) {
    if (vibe === "comfort") profile.vibe_comfort += 1.2;
    if (vibe === "fresh") profile.vibe_fresh += 1.2;
    if (vibe === "spicy") profile.vibe_spicy += 1.2;
    if (vibe === "world") profile.cuisine_world += 0.8;
  }
  if (answers.protein === "plant") {
    profile.prot_vege += 1.5;
    profile.prot_legumineuse += 1;
  }
  if (answers.protein === "high") {
    profile.prot_poulet += 0.6;
    profile.prot_poisson += 0.4;
  }
  if (answers.goal === "save") profile.price_low += 1.4;
  if (answers.goal === "time" || answers.timeMin <= 25) profile.vibe_quick += 1.2;
  if (answers.diet === "vegetarian" || answers.diet === "vegan") profile.prot_vege += 2;

  for (const id of signals.favoriteIds) {
    const r = recipeById.get(id);
    if (r) profile = addVec(profile, recipeFeatures(r), 2.2);
  }

  for (const id of signals.recentRecipeIds) {
    const r = recipeById.get(id);
    if (r) profile = addVec(profile, recipeFeatures(r), 1.1);
  }

  for (const id of signals.dislikeRecipeIds) {
    const r = recipeById.get(id);
    if (r) profile = addVec(profile, recipeFeatures(r), -1.8);
  }

  for (const [id, stars] of Object.entries(signals.ratings || {})) {
    const r = recipeById.get(id);
    if (!r) continue;
    profile = addVec(profile, recipeFeatures(r), ratingToWeight(stars));
  }

  for (const ev of signals.events || []) {
    if (ev.type === "rate") continue; // already applied via ratings map
    const r = recipeById.get(ev.recipeId);
    if (!r) continue;
    profile = addVec(profile, recipeFeatures(r), ev.weight);
  }

  return profile;
}

export type ScoredRecipe = {
  recipe: Recipe;
  score: number;
  taste: number;
  novelty: number;
  storeFit: number;
  varietyPenalty: number;
};

/**
 * Score une recette pour un utilisateur + contexte semaine en cours.
 * novelty : évite les plats déjà vus récemment
 * storeFit : favorise les recettes alignées budget enseigne
 * variety : pénalise les features trop proches des plats déjà choisis
 */
export function scoreRecipe(opts: {
  recipe: Recipe;
  profile: FeatureVec;
  recentIds: Set<string>;
  pickedFeatures: FeatureVec[];
  cost: number;
  budgetPerDinner: number;
}): ScoredRecipe {
  const feats = recipeFeatures(opts.recipe);
  const taste = cosine(opts.profile, feats);

  let novelty = 1;
  if (opts.recentIds.has(opts.recipe.id)) novelty -= 0.85;
  // soft novelty on similar recent cuisines handled via variety

  let varietyPenalty = 0;
  for (const pf of opts.pickedFeatures) {
    const sim = cosine(pf, feats);
    if (sim > 0.72) varietyPenalty += (sim - 0.55) * 0.9;
  }

  // Store / budget affinity: prefer near target cost, not just cheapest
  const target = opts.budgetPerDinner;
  const rel = target > 0 ? Math.abs(opts.cost - target) / target : 0;
  const storeFit = Math.max(0, 1 - rel * 0.85);

  const score =
    taste * 0.52 +
    novelty * 0.18 +
    storeFit * 0.22 -
    varietyPenalty * 0.35 +
    (feats.vibe_quick && opts.budgetPerDinner ? 0.02 : 0);

  return {
    recipe: opts.recipe,
    score,
    taste,
    novelty,
    storeFit,
    varietyPenalty,
  };
}

export function summarizeTaste(profile: FeatureVec): string[] {
  const ranked = FEATURE_KEYS.map((k) => ({ k, v: profile[k] }))
    .filter((x) => x.v > 0.4)
    .sort((a, b) => b.v - a.v)
    .slice(0, 6);

  const labels: Record<string, string> = {
    cuisine_fr: "Cuisine française",
    cuisine_it: "Italienne / pâtes",
    cuisine_asia: "Saveurs asiatiques",
    cuisine_mex: "Mexicain",
    cuisine_ind: "Curry / Inde",
    cuisine_med: "Méditerranéen",
    cuisine_world: "Ouverture monde",
    prot_poulet: "Poulet / volaille",
    prot_boeuf: "Bœuf",
    prot_porc: "Porc / charcuterie",
    prot_poisson: "Poisson",
    prot_vege: "Plats végétariens",
    prot_legumineuse: "Légumineuses",
    vibe_comfort: "Réconfort",
    vibe_fresh: "Fraîcheur",
    vibe_spicy: "Épicé",
    vibe_quick: "Rapide",
    pasta: "Pâtes",
    riz: "Riz",
    patate: "Pommes de terre",
    legume_vert: "Légumes verts",
    fromage: "Fromage",
    price_low: "Bons plans",
    price_mid: "Milieu de gamme",
    price_high: "Plats premium",
    aisle_produce: "Fruits & légumes",
    aisle_meat: "Rayon viande",
    aisle_dry: "Épicerie sèche",
  };

  return ranked.map((x) => labels[x.k] || x.k);
}

export function buildSignalsFromVault(input: {
  favorites: string[];
  basketRecipeIds: string[];
  events: TasteEvent[];
  ratings?: Record<string, number>;
}): TasteSignals {
  const dislikeRecipeIds = input.events
    .filter((e) => e.type === "dislike" || e.type === "swap_out")
    .map((e) => e.recipeId);

  const ratings: Record<string, RecipeRating> = {};
  for (const [id, value] of Object.entries(input.ratings || {})) {
    const stars = Math.round(value);
    if (stars >= 1 && stars <= 5) ratings[id] = stars as RecipeRating;
  }
  // Low ratings also feed dislikes for generation variety
  for (const [id, stars] of Object.entries(ratings)) {
    if (stars <= 2) dislikeRecipeIds.push(id);
  }

  return {
    favoriteIds: input.favorites,
    recentRecipeIds: [...new Set(input.basketRecipeIds)].slice(0, 40),
    dislikeRecipeIds: [...new Set(dislikeRecipeIds)],
    ratings,
    events: input.events.slice(0, 200),
  };
}
