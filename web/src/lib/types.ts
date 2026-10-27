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
  costBase?: number | null;
  costCoverage?: number;
};

export type FunnelAnswers = {
  storeId: string | null;
  adults: number;
  children: number;
  budget: number;
  dinners: number;
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
};

export type WeekPlan = {
  answers: FunnelAnswers;
  dinners: PlannedDinner[];
  totalCost: number;
  servings: number;
  createdAt: string;
};
