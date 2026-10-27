import storesData from "@/data/stores.json";
import featuredData from "@/data/featured.json";
import type { Recipe, Store } from "@/lib/types";

export const stores = storesData as unknown as Store[];
export const featuredRecipes = featuredData as unknown as Recipe[];

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

export function getStore(id: string) {
  return stores.find((s) => s.id === id);
}
