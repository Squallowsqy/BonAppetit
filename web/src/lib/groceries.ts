import { getIngredient, getRecipe } from "@/lib/catalog";
import { parseDateKey, planHorizon } from "@/lib/plan-labels";
import { formatQty, packDescriptor, toCatalogUnit } from "@/lib/units";
import type { GrocerySection, Ingredient, WeekPlan } from "@/lib/types";

/**
 * Liste de courses « ticket de caisse » :
 * - les usages d'un même ingrédient sont fusionnés après conversion d'unités ;
 * - la quantité est arrondie au conditionnement (2 pots, pas 1,5) ;
 * - le frais est regroupé par semaine d'utilisation (un pot de crème acheté en
 *   S1 ne tient pas jusqu'en S4), le long terme est acheté une fois ;
 * - sel/poivre et « au goût » vont dans « Déjà au placard ? » sans prix.
 */

export type GroceryLine = {
  key: string;
  ingredientId: string;
  name: string;
  aisle: string;
  /** Quantité consommée, dans l'unité catalogue. */
  qty: number;
  unit: string;
  qtyLabel: string;
  packs: number;
  packLabel: string | null;
  /** Prix ticket (packs × prix), hors coefficient enseigne. */
  estEUR: number | null;
  /** Prix au prorata consommé (pour l'écart « restes »). */
  usedEUR: number | null;
  section: GrocerySection;
  sectionLabel: string;
  sectionOrder: number;
  week: number | null;
  shelfDays: number | null;
  useDays: string[];
  estimated: boolean;
  /** Probablement déjà dans le placard (usage infime d'un produit longue durée) : prix hors total. */
  optional: boolean;
};

/** Au-delà : acheté une fois pour tout le plan. */
export const LONG_LIFE_DAYS = 21;
/** En-deçà : à acheter au plus près du jour d'utilisation. */
export const VERY_FRESH_DAYS = 3;
/** Produit longue durée dont on consomme ≤ 20 % d'un pack → « déjà au placard ? ». */
const PANTRY_STAPLE_DAYS = 180;
const PANTRY_STAPLE_RATIO = 0.2;

const AISLE_ORDER = [
  "produce",
  "meat",
  "fish",
  "dairy",
  "bakery",
  "frozen",
  "dry",
  "canned",
  "condiments",
  "beverages",
  "autre",
];

function sectionMeta(
  section: GrocerySection,
  week: number | null,
  multiWeek: boolean
): { label: string; order: number } {
  if (section === "staples") return { label: "Déjà au placard ?", order: 90 };
  if (section === "pantry") {
    return {
      label: multiWeek ? "Fond de placard · pour tout le mois" : "Épicerie & longue conservation",
      order: 50,
    };
  }
  return {
    label: multiWeek ? `Frais · semaine ${week ?? 1}` : "Frais de la semaine",
    order: week ?? 1,
  };
}

function packsFor(qty: number, ing: Ingredient): number {
  if (!ing.pack_qty || ing.pack_qty <= 0) return 1;
  const ratio = qty / ing.pack_qty;
  // tolérance 8 % : 1,05 pot → 1 pot (une recette n'exige pas le gramme près)
  const floor = Math.floor(ratio);
  if (ratio - floor <= 0.08 && floor >= 1) return floor;
  return Math.max(1, Math.ceil(ratio));
}

type Acc = {
  ing: Ingredient | undefined;
  ingredientId: string;
  names: Set<string>;
  qty: number;
  unit: string;
  section: GrocerySection;
  week: number | null;
  useDays: Set<string>;
};

export function buildGroceryList(plan: WeekPlan): GroceryLine[] {
  const servings = plan.servings;
  const multiWeek = planHorizon(plan) === "month";
  const acc = new Map<string, Acc>();

  for (const dinner of plan.dinners) {
    const recipe = getRecipe(dinner.recipeId);
    if (!recipe) continue;
    const scale = servings / (recipe.baseServings || 2);
    const { week, dayLabel } = parseDateKey(dinner.dateKey);
    const weekNo = week ?? 1;

    for (const line of recipe.ingredients) {
      const ing = getIngredient(line.ingredientId);
      const conv = toCatalogUnit(ing, (line.qty || 0) * scale, line.unit);
      const shelf = ing?.shelf_days ?? 7;

      let section: GrocerySection;
      let groupWeek: number | null;
      if (!ing || ing.staple || conv.qty <= 0) {
        section = "staples";
        groupWeek = null;
      } else if (shelf >= LONG_LIFE_DAYS || !multiWeek) {
        // semaine seule : tout est acheté en une fois, mais on garde la distinction frais/placard
        section = shelf >= LONG_LIFE_DAYS ? "pantry" : "week";
        groupWeek = section === "week" ? 1 : null;
      } else {
        section = "week";
        groupWeek = weekNo;
      }

      const key = `${section}:${groupWeek ?? "all"}:${line.ingredientId}`;
      let a = acc.get(key);
      if (!a) {
        a = {
          ing,
          ingredientId: line.ingredientId,
          names: new Set(),
          qty: 0,
          unit: conv.unit,
          section,
          week: groupWeek,
          useDays: new Set(),
        };
        acc.set(key, a);
      }
      a.names.add(line.name_fr || ing?.name_fr || line.ingredientId);
      a.qty += conv.qty;
      const dayTag = multiWeek && week != null ? `S${week} ${dayLabel.slice(0, 3).toLowerCase()}` : dayLabel.slice(0, 3).toLowerCase();
      a.useDays.add(dayTag);
    }
  }

  const lines: GroceryLine[] = [];
  for (const [key, a] of acc) {
    const ing = a.ing;
    const meta = sectionMeta(a.section, a.week, multiWeek);
    // Nom canonique du catalogue (nettoyé) ; le libellé recette ne sert qu'en secours.
    const name = ing?.name_fr || [...a.names][0] || a.ingredientId;

    if (a.section === "staples" || !ing) {
      lines.push({
        key,
        ingredientId: a.ingredientId,
        name,
        aisle: ing?.aisle || "autre",
        qty: 0,
        unit: a.unit,
        qtyLabel: "",
        packs: 0,
        packLabel: null,
        estEUR: null,
        usedEUR: null,
        section: "staples",
        sectionLabel: meta.label,
        sectionOrder: meta.order,
        week: null,
        shelfDays: ing?.shelf_days ?? null,
        useDays: [],
        estimated: Boolean(ing?.estimated),
        optional: true,
      });
      continue;
    }

    const packs = packsFor(a.qty, ing);
    const priceable = ing.price_eur != null && ing.pack_qty;
    const estEUR = priceable ? packs * (ing.price_eur as number) : null;
    const usedEUR = priceable
      ? (ing.price_eur as number) * (a.qty / (ing.pack_qty as number))
      : null;

    // Huile, vinaigre, sucre, miel… : 2 cs sur une bouteille → on ne l'impose pas au ticket
    const ratio = ing.pack_qty ? a.qty / ing.pack_qty : 1;
    const likelyOwned =
      a.section === "pantry" &&
      (ing.shelf_days ?? 0) >= PANTRY_STAPLE_DAYS &&
      ratio <= PANTRY_STAPLE_RATIO;
    const section: GrocerySection = likelyOwned ? "staples" : a.section;
    const m = likelyOwned ? sectionMeta("staples", null, multiWeek) : meta;

    lines.push({
      key,
      ingredientId: a.ingredientId,
      name,
      aisle: ing.aisle || "autre",
      qty: Math.round(a.qty * 100) / 100,
      unit: a.unit,
      qtyLabel: formatQty(a.qty, a.unit),
      packs,
      packLabel: packDescriptor(ing),
      estEUR,
      usedEUR,
      section,
      sectionLabel: m.label,
      sectionOrder: m.order,
      week: a.week,
      shelfDays: ing.shelf_days ?? null,
      useDays: [...a.useDays],
      estimated: Boolean(ing.estimated),
      optional: likelyOwned,
    });
  }

  return lines.sort((x, y) => {
    if (x.sectionOrder !== y.sectionOrder) return x.sectionOrder - y.sectionOrder;
    const ax = AISLE_ORDER.indexOf(x.aisle);
    const ay = AISLE_ORDER.indexOf(y.aisle);
    if (ax !== ay) return (ax < 0 ? 99 : ax) - (ay < 0 ? 99 : ay);
    // très périssable d'abord dans le rayon
    const sx = x.shelfDays ?? 99;
    const sy = y.shelfDays ?? 99;
    if (sx !== sy) return sx - sy;
    return x.name.localeCompare(y.name, "fr");
  });
}

export function aisleLabel(aisle: string) {
  const labels: Record<string, string> = {
    produce: "Fruits & légumes",
    meat: "Viandes",
    fish: "Poissons",
    dairy: "Produits laitiers & frais",
    bakery: "Boulangerie",
    dry: "Épicerie",
    canned: "Conserves",
    condiments: "Condiments & épices",
    frozen: "Surgelés",
    beverages: "Boissons",
    unknown: "Divers",
    autre: "Divers",
  };
  return labels[aisle] || aisle;
}
