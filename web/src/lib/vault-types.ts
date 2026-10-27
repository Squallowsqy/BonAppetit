import type {
  SavedGroceryList,
  TasteEvent,
  WeekPlan,
  GrocerySnapshotLine,
} from "@/lib/types";

export type SavedBasket = {
  id: string;
  label: string;
  plan: WeekPlan;
  savedAt: string;
};

export type UserVaultData = {
  favorites: string[];
  /** recipeId → note 1–5 */
  ratings: Record<string, number>;
  baskets: SavedBasket[];
  groceryLists: SavedGroceryList[];
  groceryChecked: Record<string, boolean>;
  activeBasketId: string | null;
  activeGroceryListId: string | null;
  tasteEvents: TasteEvent[];
};

export function emptyVaultData(): UserVaultData {
  return {
    favorites: [],
    ratings: {},
    baskets: [],
    groceryLists: [],
    groceryChecked: {},
    activeBasketId: null,
    activeGroceryListId: null,
    tasteEvents: [],
  };
}

function normalizeRatings(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof id !== "string" || !id) continue;
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) continue;
    const stars = Math.round(n);
    if (stars < 1 || stars > 5) continue;
    out[id] = stars;
    if (Object.keys(out).length >= 500) break;
  }
  return out;
}

export function normalizeVault(raw: unknown): UserVaultData {
  const base = emptyVaultData();
  if (!raw || typeof raw !== "object") return base;
  const v = raw as Partial<UserVaultData>;
  return {
    favorites: Array.isArray(v.favorites)
      ? v.favorites.filter((x): x is string => typeof x === "string").slice(0, 500)
      : [],
    ratings: normalizeRatings(v.ratings),
    baskets: Array.isArray(v.baskets) ? (v.baskets as SavedBasket[]).slice(0, 30) : [],
    groceryLists: Array.isArray(v.groceryLists)
      ? (v.groceryLists as SavedGroceryList[]).slice(0, 40)
      : [],
    groceryChecked:
      v.groceryChecked && typeof v.groceryChecked === "object"
        ? v.groceryChecked
        : {},
    activeBasketId: v.activeBasketId ?? null,
    activeGroceryListId: v.activeGroceryListId ?? null,
    tasteEvents: Array.isArray(v.tasteEvents)
      ? (v.tasteEvents as TasteEvent[]).slice(0, 300)
      : [],
  };
}

export type { GrocerySnapshotLine };
