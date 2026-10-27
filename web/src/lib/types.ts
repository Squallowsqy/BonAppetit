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
  unit: string;
  aisle: string;
  pack_qty: number | null;
  price_eur: number | null;
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
};

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
