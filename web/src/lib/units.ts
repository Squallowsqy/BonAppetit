import type { Ingredient } from "@/lib/types";

/**
 * Conversion d'une ligne recette (qty, unit) vers l'unité de référence du
 * catalogue, pour pouvoir additionner les usages et arrondir au conditionnement.
 *
 * Les recettes gardent leurs unités « cuisine » (cs, cc, pièce, sachet…) ; la
 * conversion ne sert qu'à la liste de courses.
 */

const PIECE_RE = /^(pi[eè]ce|pieces|unit|unité|unite|pcs?|boule|filet)\b/i;
const PACK_RE = /^(sachet|paquet|pot|bo[iî]te|brique|botte|sac|barquette|bocal|tube|rouleau)/i;
const SLICE_RE = /^tranche/i;
const HEAD_RE = /^t[eê]te/i;
const TASTE_RE = /selon|go[uû]t|pinc[ée]e|brin|q\.?s\.?|^$/i;

/** Poids moyen d'une pièce (g) pour les ingrédients pesés au catalogue. */
const PIECE_GRAMS: Record<string, number> = {
  "ing-onion": 150,
  "ing-red-onion": 120,
  "ing-shallot": 30,
  "ing-carrot": 125,
  "ing-potato": 150,
  "ing-sweet-potato": 250,
  "ing-tomato": 120,
  "ing-leek": 200,
  "ing-celery": 60,
  "ing-butternut": 1000,
  "ing-ginger": 30,
  "ing-spring-onion": 20,
  "ing-chicken-breast": 150,
  "ing-chicken-thigh": 120,
  "ing-turkey-cutlet": 130,
  "ing-pork-chop": 160,
  "ing-pork-tenderloin": 450,
  "ing-beef-steak": 160,
  "ing-sausage": 100,
  "ing-duck-breast": 350,
  "ing-salmon": 125,
  "ing-cod": 140,
  "ing-white-fish": 125,
  "ing-trout": 125,
  "ing-ham": 40,
  "ing-cured-ham": 15,
  "ing-lardons": 100,
  "ing-mozzarella": 125,
  "ing-feta": 200,
  "ing-goat-cheese": 150,
  "ing-camembert": 250,
  "ing-reblochon": 450,
  "ing-bread": 50,
  "ing-pak-choi": 150,
  "ing-endive": 120,
  "ing-beetroot": 120,
  "ing-asparagus": 25,
  "ing-green-beans": 8,
  "ing-mushroom": 20,
  "ing-arugula": 60,
  "ing-spinach-fresh": 100,
  "ing-red-cabbage": 1000,
  "ing-white-cabbage": 1000,
  "ing-kale": 300,
  "ing-mixed-veg": 400,
};

/** Grammes pour une cuillère à soupe selon la nature du produit. */
function spoonGrams(ing: Ingredient | undefined, spoon: "cs" | "cc"): number {
  const base = spoon === "cs" ? 15 : 5;
  if (!ing) return base;
  const n = ing.name_fr.toLowerCase();
  // épices sèches : plus légères
  if (ing.aisle === "condiments" && /(épice|epice|cumin|paprika|curry|cannelle|curcuma|origan|herbes|thym|piment|muscade|ras|za'?atar|baharat|garam|gomasio|poivre|sel)/.test(n)) {
    return spoon === "cs" ? 8 : 3;
  }
  if (/(sucre|cassonade|farine|chapelure|panko|graines|sésame|sesame)/.test(n)) {
    return spoon === "cs" ? 12 : 4;
  }
  return base;
}

function packWeightGrams(ing: Ingredient): number {
  if (ing.pack_grams) return ing.pack_grams;
  const u = ing.unit.toLowerCase();
  if (u === "g" || u === "ml") return ing.pack_qty || 100;
  return 100;
}

export type Converted = {
  /** Quantité dans l'unité catalogue. 0 = « au goût » (fond de placard). */
  qty: number;
  unit: string;
  /** false si la conversion a dû deviner (pas de table). */
  exact: boolean;
};

export function toCatalogUnit(
  ing: Ingredient | undefined,
  qtyRaw: number | null | undefined,
  unitRaw: string | null | undefined
): Converted {
  const qty = Number(qtyRaw) || 0;
  const unit = (unitRaw || "").trim();
  const target = (ing?.unit || unit || "g").toLowerCase();

  // « 1 pincée », « 2 brins » : fond de placard / au goût
  if (/pinc[ée]e|brin/i.test(unit)) return { qty: 0, unit: target, exact: true };
  if (TASTE_RE.test(unit) && qty === 0) return { qty: 0, unit: target, exact: true };
  if (!ing) return { qty, unit: unit || "u", exact: false };
  if (qty <= 0) {
    // Quantité absente sur un produit non-condiment : on compte 1 conditionnement
    if (ing.aisle !== "condiments" && !ing.staple && ing.pack_qty) {
      return { qty: ing.pack_qty, unit: target, exact: false };
    }
    return { qty: 0, unit: target, exact: true };
  }

  let u = unit.toLowerCase();
  const targetIsMass = target === "g" || target === "ml";
  const targetIsPiece = PIECE_RE.test(target);
  const targetIsPack = PACK_RE.test(target);

  // Erreur de saisie fréquente : « 220 pièce(s) de porc » = 220 g
  if (targetIsMass && qty >= 20 && (u === "" || PIECE_RE.test(u))) u = target;

  // Même unité (ou g↔ml équivalents)
  if (u === target || ((u === "g" || u === "ml") && targetIsMass)) {
    return { qty, unit: target, exact: true };
  }

  // Unité absente (« 1 Tomates cerises ») : on lit « 1 conditionnement » ou « 1 pièce »
  if (u === "") {
    if (targetIsPiece) return { qty, unit: target, exact: false };
    if (targetIsPack) return { qty, unit: target, exact: false };
    return { qty: qty * (ing.pack_qty || 1), unit: target, exact: false };
  }

  // Masses / volumes
  let grams: number | null = null;
  if (u === "g" || u === "ml") grams = qty;
  else if (u === "kg" || u === "l") grams = qty * 1000;
  else if (u === "cl") grams = qty * 10;
  else if (u === "cs") grams = qty * spoonGrams(ing, "cs");
  else if (u === "cc") grams = qty * spoonGrams(ing, "cc");
  else if (u === "cm") grams = qty * 8; // gingembre
  else if (SLICE_RE.test(u)) grams = qty * (PIECE_GRAMS[ing.id] ?? 25);
  else if (HEAD_RE.test(u)) {
    // « 1 tête d'ail » dans une recette = ~4 gousses réellement utilisées
    if (targetIsPiece) return { qty: qty * 4, unit: target, exact: true };
    grams = qty * 20;
  } else if (PIECE_RE.test(u)) {
    if (targetIsPiece) return { qty, unit: target, exact: true };
    grams = qty * (PIECE_GRAMS[ing.id] ?? 100);
    if (!(ing.id in PIECE_GRAMS)) {
      return { qty: targetIsPack ? qty : grams, unit: target, exact: false };
    }
  } else if (PACK_RE.test(u)) {
    // 1 sachet recette = 1 conditionnement catalogue
    if (targetIsPack) return { qty, unit: target, exact: true };
    return { qty: qty * (ing.pack_qty || 1), unit: target, exact: true };
  }

  if (grams == null) {
    return { qty, unit: target, exact: false };
  }

  if (targetIsMass) return { qty: grams, unit: target, exact: true };
  if (targetIsPiece) {
    const per = PIECE_GRAMS[ing.id] ?? 100;
    return { qty: grams / per, unit: target, exact: ing.id in PIECE_GRAMS };
  }
  if (targetIsPack) {
    return { qty: grams / packWeightGrams(ing), unit: target, exact: Boolean(ing.pack_grams) };
  }
  return { qty: grams, unit: target, exact: false };
}

/** « pot 200 g », « sachet », « ×6 ». */
export function packDescriptor(ing: Ingredient): string | null {
  if (!ing.pack_qty) return null;
  const u = ing.unit.toLowerCase();
  if (u === "g" || u === "ml") return `${ing.pack_qty >= 1000 ? ing.pack_qty / 1000 + (u === "g" ? " kg" : " L") : ing.pack_qty + " " + u}`;
  if (PIECE_RE.test(u)) return ing.pack_qty > 1 ? `lot de ${ing.pack_qty}` : "pièce";
  const label = u.replace(/\(s\)$/, "");
  return ing.pack_grams ? `${label} ~${ing.pack_grams} g` : label;
}

/** Quantité lisible dans l'unité catalogue (« 300 g », « 2 pièces », « 1,5 sachet »). */
export function formatQty(qty: number, unit: string): string {
  const u = unit.toLowerCase();
  if (qty === 0) return "";
  if (u === "g" || u === "ml") {
    if (qty >= 1000) return `${(Math.round(qty / 50) * 50) / 1000} ${u === "g" ? "kg" : "L"}`;
    return `${Math.round(qty / 5) * 5 || Math.round(qty)} ${u}`;
  }
  const rounded = Math.max(0.1, Math.round(qty * 10) / 10);
  if (PIECE_RE.test(u)) return `${rounded} ${rounded > 1 ? "pièces" : "pièce"}`;
  const label = u.replace(/\(s\)$/, "");
  if (rounded < 1) return `moins d'un ${label}`;
  return `${rounded} ${label}${rounded > 1 ? "s" : ""}`;
}
