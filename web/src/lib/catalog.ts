import ingredientsData from "@/data/ingredients.json";
import storesData from "@/data/stores.json";
import recipesData from "@/data/recipes.json";
import featuredData from "@/data/featured.json";
import type { Ingredient, Recipe, Store } from "@/lib/types";

export const ingredients = ingredientsData as unknown as Ingredient[];
export const stores = storesData as unknown as Store[];
export const recipes = recipesData as unknown as Recipe[];
export const featuredRecipes = featuredData as unknown as Recipe[];

const ingredientById = new Map(ingredients.map((i) => [i.id, i]));
const recipeById = new Map(recipes.map((r) => [r.id, r]));
const storeById = new Map(stores.map((s) => [s.id, s]));

export function getIngredient(id: string) {
  return ingredientById.get(id);
}

export function getRecipe(id: string) {
  return recipeById.get(id);
}

export function getStore(id: string) {
  return storeById.get(id);
}

export const ALLERGEN_OPTIONS = [
  { id: "gluten", label: "Gluten" },
  { id: "lactose", label: "Lactose / lait" },
  { id: "egg", label: "Œuf" },
  { id: "peanut", label: "Arachide" },
  { id: "nuts", label: "Fruits à coque" },
  { id: "soy", label: "Soja" },
  { id: "fish", label: "Poisson" },
  { id: "shellfish", label: "Crustacés" },
  { id: "sesame", label: "Sésame" },
] as const;

export const DIET_OPTIONS = [
  { id: "omnivore", label: "Omnivore" },
  { id: "flexitarian", label: "Flexitarien" },
  { id: "vegetarian", label: "Végétarien" },
  { id: "vegan", label: "Vegan" },
] as const;

export const PROTEIN_OPTIONS = [
  { id: "balanced", label: "Équilibré" },
  { id: "high", label: "Beaucoup de protéines" },
  { id: "plant", label: "Plutôt végétal" },
] as const;

export const VIBE_OPTIONS = [
  { id: "comfort", label: "Réconfort" },
  { id: "fresh", label: "Fraîcheur" },
  { id: "spicy", label: "Épicé" },
  { id: "kid", label: "Kids friendly" },
  { id: "world", label: "Saveurs du monde" },
] as const;

export const DISLIKE_OPTIONS = [
  { id: "coriander", label: "Coriandre" },
  { id: "mushrooms", label: "Champignons" },
  { id: "olives", label: "Olives" },
  { id: "seafood", label: "Fruits de mer" },
  { id: "offal", label: "Abats" },
  { id: "blue-cheese", label: "Fromages bleus" },
] as const;

export const GOAL_OPTIONS = [
  { id: "save", label: "Économiser" },
  { id: "time", label: "Gagner du temps" },
  { id: "variety", label: "Plus de variété" },
  { id: "balance", label: "Mieux équilibrer" },
] as const;
