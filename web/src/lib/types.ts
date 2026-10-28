export type Store = {
  id: string;
  name: string;
  country: string;
  priceCoefficient: number;
  logo?: string;
  brandColor?: string;
};

export type Ingredient = {
  id: string;
  name_fr: string;
  /** Unité de référence du catalogue (g, ml, unit, sachet(s)…). */
  unit: string;
  aisle: string;
  /** Quantité par conditionnement, dans `unit`. */
  pack_qty: number | null;
  price_eur: number | null;
  /** Poids approximatif d'un conditionnement quand `unit` est un emballage (sachet, pot…). */
  pack_grams?: number;
  /** Jours de conservation après achat (ouverture incluse). */
  shelf_days?: number;
  /** Prix/pack estimés (pas de relevé enseigne). */
  estimated?: boolean;
  /** Fond de placard non chiffré (sel, poivre). */
  staple?: boolean;
};

export type RecipeIngredient = {
  ingredientId: string;
  qty: number | null;
  unit?: string | null;
  name_fr?: string | null;
};

export type Recipe = {
  id: string;
  slug: string;
  title_fr: string;
  description_fr?: string;
  baseServings: number;
  prepMin?: number | null;
  cookMin?: number | null;
  difficulty?: number | null;
  cuisine?: string | null;
  mainProtein?: string | null;
  flags?: Record<string, boolean>;
  allergens?: string[];
  ingredients: RecipeIngredient[];
  steps_fr: string[];
  image?: string | null;
  costBase?: number | null;
  costCoverage?: number;
};

export type PlanHorizon = "week" | "month";

export type FunnelAnswers = {
  storeId: string | null;
  adults: number;
  children: number;
  /** Total budget for the horizon (week or month). */
  budget: number;
  /** Dinners per week (month = this × 4). */
  dinners: number;
  /** week = 1 week; month = 4 weeks at the same weekly rhythm. */
  horizon: PlanHorizon;
  diet: string;
  protein: string;
  vibes: string[];
  allergens: string[];
  dislikes: string[];
  timeMin: number;
  skill: string;
  equipment: string[];
  goal: string;
};

export type PlannedDinner = {
  dateKey: string;
  recipeId: string;
  slug: string;
  title_fr: string;
  cost: number;
  prepMin?: number | null;
  image?: string | null;
  /** Conservation la plus courte parmi les ingrédients (jours) — pilote l'ordre dans la semaine. */
  freshDays?: number | null;
};

export type WeekPlan = {
  answers: FunnelAnswers;
  dinners: PlannedDinner[];
  totalCost: number;
  servings: number;
  createdAt: string;
  /** Mirrors answers.horizon; kept for older saved plans. */
  horizon?: PlanHorizon;
};

/** Snapshot d’une liste de courses liée à une semaine sauvegardée. */
export type GrocerySnapshotLine = {
  key: string;
  name: string;
  aisle: string;
  aisleLabel: string;
  qty: number;
  unit: string;
  estEUR: number | null;
  /** Section d'achat : `s1`…`s4` (frais, par semaine), `pantry` (longue conservation), `staples`. */
  section?: GrocerySection;
  sectionLabel?: string;
  /** Nombre de conditionnements à acheter et libellé (« 2 × pot 200 g »). */
  packs?: number;
  packLabel?: string | null;
  /** Jours de conservation ; ≤ 3 → à acheter au plus près de l'usage. */
  shelfDays?: number | null;
  /** Jours d'utilisation dans le plan (« lun », « jeu »). */
  useDays?: string[];
  /** Prix estimé faute de relevé enseigne. */
  estimated?: boolean;
};

export type GrocerySection = "week" | "pantry" | "staples";

export type SavedGroceryList = {
  id: string;
  basketId: string;
  label: string;
  storeId: string | null;
  storeName: string | null;
  totalEst: number;
  lines: GrocerySnapshotLine[];
  checked: Record<string, boolean>;
  savedAt: string;
  weekStart?: string;
};

/** Note utilisateur 1–5 (étoiles). */
export type RecipeRating = 1 | 2 | 3 | 4 | 5;

/** Signaux pour le moteur de goûts (ML local). */
export type TasteEventType =
  | "favorite"
  | "unfavorite"
  | "cooked"
  | "swap_out"
  | "save_basket"
  | "dislike"
  | "rate";

export type TasteEvent = {
  id: string;
  type: TasteEventType;
  recipeId: string;
  weight: number;
  at: string;
};

export type TasteSignals = {
  favoriteIds: string[];
  recentRecipeIds: string[];
  dislikeRecipeIds: string[];
  /** recipeId → dernière note 1–5 */
  ratings: Record<string, RecipeRating>;
  events: TasteEvent[];
};
