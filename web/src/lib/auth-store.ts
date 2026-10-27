"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { basketLabelFromPlan } from "@/lib/plan-labels";
import { buildSignalsFromVault, ratingToWeight } from "@/lib/taste-ml";
import type {
  RecipeRating,
  SavedGroceryList,
  TasteEvent,
  TasteEventType,
  TasteSignals,
  WeekPlan,
  GrocerySnapshotLine,
} from "@/lib/types";
import {
  emptyVaultData,
  normalizeVault,
  type SavedBasket,
  type UserVaultData,
} from "@/lib/vault-types";

export type { SavedBasket };

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

type AuthState = {
  sessionUserId: string | null;
  sessionUser: AuthUser | null;
  vault: UserVaultData;
  vaultHydrated: boolean;
  pendingIntent: {
    type: "save-basket" | "favorite" | "rate";
    recipeId?: string;
  } | null;
  /** Legacy local vault snapshot for one-shot cloud migration. */
  legacyVault: UserVaultData | null;

  setPendingIntent: (intent: AuthState["pendingIntent"]) => void;
  setSession: (user: AuthUser | null) => void;
  hydrateVault: () => Promise<void>;
  pushVault: () => Promise<void>;

  register: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  login: (input: {
    email: string;
    password: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;

  user: () => AuthUser | null;
  isLoggedIn: () => boolean;
  getVault: () => UserVaultData;

  toggleFavorite: (
    recipeId: string
  ) => { ok: true; favorites: string[] } | { ok: false; needAuth: true };
  setRating: (
    recipeId: string,
    stars: RecipeRating
  ) =>
    | { ok: true; ratings: Record<string, number> }
    | { ok: false; needAuth: true };
  clearRating: (
    recipeId: string
  ) =>
    | { ok: true; ratings: Record<string, number> }
    | { ok: false; needAuth: true };
  saveBasket: (
    plan: WeekPlan,
    label?: string
  ) => { ok: true; basket: SavedBasket } | { ok: false; needAuth: true };
  setActiveBasket: (basketId: string | null) => void;
  deleteBasket: (basketId: string) => void;
  toggleGrocery: (key: string) => void;
  setGroceryChecked: (map: Record<string, boolean>) => void;

  saveGroceryList: (input: {
    basketId?: string | null;
    label: string;
    storeId: string | null;
    storeName: string | null;
    totalEst: number;
    lines: GrocerySnapshotLine[];
    checked: Record<string, boolean>;
  }) => { ok: true; list: SavedGroceryList } | { ok: false; needAuth: true };
  updateGroceryListChecked: (
    listId: string,
    checked: Record<string, boolean>
  ) => void;
  setActiveGroceryList: (listId: string | null) => void;
  deleteGroceryList: (listId: string) => void;

  recordTaste: (type: TasteEventType, recipeId: string, weight?: number) => void;
  getTasteSignals: () => TasteSignals;
};

export const EMPTY_FAVORITES: string[] = [];
export const EMPTY_RATINGS: Record<string, number> = {};
export const EMPTY_BASKETS: SavedBasket[] = [];
export const EMPTY_GROCERY_LISTS: SavedGroceryList[] = [];

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePush(get: () => AuthState) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void get().pushVault();
  }, 400);
}

function patchVault(
  set: (fn: (s: AuthState) => Partial<AuthState>) => void,
  get: () => AuthState,
  updater: (v: UserVaultData) => UserVaultData
) {
  set((s) => ({ vault: updater(s.vault) }));
  schedulePush(get);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      sessionUserId: null,
      sessionUser: null,
      vault: emptyVaultData(),
      vaultHydrated: false,
      pendingIntent: null,
      legacyVault: null,

      setPendingIntent: (intent) => set({ pendingIntent: intent }),

      setSession: (user) =>
        set({
          sessionUserId: user?.id ?? null,
          sessionUser: user,
          vaultHydrated: false,
        }),

      hydrateVault: async () => {
        const id = get().sessionUserId;
        if (!id) return;
        try {
          const res = await fetch("/api/vault", { credentials: "include" });
          if (!res.ok) return;
          const data = (await res.json()) as {
            vault: UserVaultData;
            empty: boolean;
          };
          let vault = normalizeVault(data.vault);
          const legacy = get().legacyVault;

          if (data.empty && legacy && !isEmptyVault(legacy)) {
            vault = normalizeVault(legacy);
            await fetch("/api/vault", {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ vault }),
            });
            set({ legacyVault: null });
          }

          set({ vault, vaultHydrated: true });
        } catch {
          set({ vaultHydrated: true });
        }
      },

      pushVault: async () => {
        const id = get().sessionUserId;
        if (!id) return;
        try {
          await fetch("/api/vault", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vault: get().vault }),
          });
        } catch {
          /* offline / transient — next mutation retries */
        }
      },

      register: async ({ name, email, password }) => {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        if (!data.ok) {
          return { ok: false, error: data.error || "Inscription impossible." };
        }

        const { signIn } = await import("next-auth/react");
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (result?.error) {
          return {
            ok: false,
            error: "Compte créé, mais connexion échouée. Réessaie.",
          };
        }
        return { ok: true };
      },

      login: async ({ email, password }) => {
        const guard = await fetch("/api/auth/login-guard", { method: "POST" });
        if (guard.status === 429) {
          return {
            ok: false,
            error: "Trop de tentatives. Réessaie plus tard.",
          };
        }

        const { signIn } = await import("next-auth/react");
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (result?.error) {
          return { ok: false, error: "E-mail ou mot de passe incorrect." };
        }
        return { ok: true };
      },

      logout: async () => {
        const { signOut } = await import("next-auth/react");
        await signOut({ redirect: false });
        set({
          sessionUserId: null,
          sessionUser: null,
          vault: emptyVaultData(),
          vaultHydrated: false,
          pendingIntent: null,
        });
      },

      user: () => get().sessionUser,
      isLoggedIn: () => Boolean(get().sessionUserId),
      getVault: () => get().vault,

      toggleFavorite: (recipeId) => {
        if (!get().sessionUserId) return { ok: false, needAuth: true };
        const vault = get().vault;
        const has = vault.favorites.includes(recipeId);
        const favorites = has
          ? vault.favorites.filter((x) => x !== recipeId)
          : [...vault.favorites, recipeId];
        const ev: TasteEvent = {
          id: uid("t"),
          type: has ? "unfavorite" : "favorite",
          recipeId,
          weight: has ? -1.5 : 2.2,
          at: new Date().toISOString(),
        };
        patchVault(set, get, (v) => ({
          ...v,
          favorites,
          tasteEvents: [ev, ...v.tasteEvents].slice(0, 300),
        }));
        return { ok: true, favorites };
      },

      setRating: (recipeId, stars) => {
        if (!get().sessionUserId) return { ok: false, needAuth: true };
        const value = Math.min(5, Math.max(1, Math.round(stars))) as RecipeRating;
        const ev: TasteEvent = {
          id: uid("t"),
          type: "rate",
          recipeId,
          weight: ratingToWeight(value),
          at: new Date().toISOString(),
        };
        let ratings: Record<string, number> = {};
        patchVault(set, get, (v) => {
          ratings = { ...(v.ratings || {}), [recipeId]: value };
          return {
            ...v,
            ratings,
            tasteEvents: [ev, ...v.tasteEvents].slice(0, 300),
          };
        });
        return { ok: true, ratings };
      },

      clearRating: (recipeId) => {
        if (!get().sessionUserId) return { ok: false, needAuth: true };
        let ratings: Record<string, number> = {};
        patchVault(set, get, (v) => {
          const next = { ...v.ratings };
          delete next[recipeId];
          ratings = next;
          return { ...v, ratings };
        });
        return { ok: true, ratings };
      },

      saveBasket: (plan, label) => {
        if (!get().sessionUserId) return { ok: false, needAuth: true };
        const vault = get().vault;
        const basket: SavedBasket = {
          id: uid("b"),
          label: label || basketLabelFromPlan(plan),
          plan,
          savedAt: new Date().toISOString(),
        };
        const tasteEvents: TasteEvent[] = [
          ...plan.dinners.map(
            (d): TasteEvent => ({
              id: uid("t"),
              type: "save_basket",
              recipeId: d.recipeId,
              weight: 1.1,
              at: new Date().toISOString(),
            })
          ),
          ...vault.tasteEvents,
        ].slice(0, 300);
        const baskets = [basket, ...vault.baskets].slice(0, 30);
        patchVault(set, get, (v) => ({
          ...v,
          baskets,
          activeBasketId: basket.id,
          groceryChecked: {},
          tasteEvents,
        }));
        return { ok: true, basket };
      },

      setActiveBasket: (basketId) => {
        if (!get().sessionUserId) return;
        patchVault(set, get, (v) => ({
          ...v,
          activeBasketId: basketId,
          groceryChecked: {},
        }));
      },

      deleteBasket: (basketId) => {
        if (!get().sessionUserId) return;
        patchVault(set, get, (v) => {
          const baskets = v.baskets.filter((b) => b.id !== basketId);
          const groceryLists = v.groceryLists.filter(
            (g) => g.basketId !== basketId
          );
          return {
            ...v,
            baskets,
            groceryLists,
            activeBasketId:
              v.activeBasketId === basketId
                ? baskets[0]?.id || null
                : v.activeBasketId,
          };
        });
      },

      toggleGrocery: (key) => {
        if (!get().sessionUserId) return;
        patchVault(set, get, (v) => ({
          ...v,
          groceryChecked: {
            ...v.groceryChecked,
            [key]: !v.groceryChecked[key],
          },
        }));
      },

      setGroceryChecked: (map) => {
        if (!get().sessionUserId) return;
        patchVault(set, get, (v) => ({ ...v, groceryChecked: map }));
      },

      saveGroceryList: (input) => {
        if (!get().sessionUserId) return { ok: false, needAuth: true };
        const vault = get().vault;
        const list: SavedGroceryList = {
          id: uid("g"),
          basketId: input.basketId || vault.activeBasketId || uid("orphan"),
          label: input.label,
          storeId: input.storeId,
          storeName: input.storeName,
          totalEst: input.totalEst,
          lines: input.lines,
          checked: { ...input.checked },
          savedAt: new Date().toISOString(),
        };
        patchVault(set, get, (v) => ({
          ...v,
          groceryLists: [list, ...v.groceryLists].slice(0, 40),
          activeGroceryListId: list.id,
        }));
        return { ok: true, list };
      },

      updateGroceryListChecked: (listId, checked) => {
        if (!get().sessionUserId) return;
        patchVault(set, get, (v) => ({
          ...v,
          groceryLists: v.groceryLists.map((g) =>
            g.id === listId ? { ...g, checked } : g
          ),
        }));
      },

      setActiveGroceryList: (listId) => {
        if (!get().sessionUserId) return;
        patchVault(set, get, (v) => ({ ...v, activeGroceryListId: listId }));
      },

      deleteGroceryList: (listId) => {
        if (!get().sessionUserId) return;
        patchVault(set, get, (v) => {
          const groceryLists = v.groceryLists.filter((g) => g.id !== listId);
          return {
            ...v,
            groceryLists,
            activeGroceryListId:
              v.activeGroceryListId === listId
                ? groceryLists[0]?.id || null
                : v.activeGroceryListId,
          };
        });
      },

      recordTaste: (type, recipeId, weight) => {
        if (!get().sessionUserId) return;
        const defaults: Record<TasteEventType, number> = {
          favorite: 2.2,
          unfavorite: -1.5,
          cooked: 1.4,
          swap_out: -1.2,
          save_basket: 1.1,
          dislike: -2,
          rate: 0,
        };
        const ev: TasteEvent = {
          id: uid("t"),
          type,
          recipeId,
          weight: weight ?? defaults[type],
          at: new Date().toISOString(),
        };
        patchVault(set, get, (v) => ({
          ...v,
          tasteEvents: [ev, ...v.tasteEvents].slice(0, 300),
        }));
      },

      getTasteSignals: () => {
        if (!get().sessionUserId) {
          return buildSignalsFromVault({
            favorites: [],
            basketRecipeIds: [],
            events: [],
            ratings: {},
          });
        }
        const vault = get().vault;
        const basketRecipeIds = vault.baskets.flatMap((b) =>
          b.plan.dinners.map((d) => d.recipeId)
        );
        return buildSignalsFromVault({
          favorites: vault.favorites,
          basketRecipeIds,
          events: vault.tasteEvents,
          ratings: vault.ratings,
        });
      },
    }),
    {
      name: "bonappetit-auth-v3",
      partialize: (s) => ({
        // Never persist passwords; keep only offline vault cache + legacy migrate buffer
        legacyVault: s.legacyVault,
        vault: s.vault,
      }),
      migrate: (persisted) => {
        const p = persisted as Record<string, unknown> | undefined;
        if (!p) return p as never;
        // Capture v2 local vaults for one-shot cloud migration
        if (p.vaults && typeof p.vaults === "object" && p.sessionUserId) {
          const vaults = p.vaults as Record<string, UserVaultData>;
          const id = String(p.sessionUserId);
          const legacy = vaults[id];
          return {
            legacyVault: legacy ? normalizeVault(legacy) : null,
            vault: emptyVaultData(),
          } as never;
        }
        return p as never;
      },
      version: 3,
    }
  )
);

function isEmptyVault(v: UserVaultData) {
  return (
    v.favorites.length === 0 &&
    Object.keys(v.ratings || {}).length === 0 &&
    v.baskets.length === 0 &&
    v.groceryLists.length === 0 &&
    v.tasteEvents.length === 0
  );
}

export function selectFavorites(s: AuthState): string[] {
  if (!s.sessionUserId) return EMPTY_FAVORITES;
  return s.vault.favorites.length ? s.vault.favorites : EMPTY_FAVORITES;
}

export function selectRatings(s: AuthState): Record<string, number> {
  if (!s.sessionUserId) return EMPTY_RATINGS;
  const ratings = s.vault.ratings || EMPTY_RATINGS;
  return Object.keys(ratings).length ? ratings : EMPTY_RATINGS;
}

export function selectBaskets(s: AuthState): SavedBasket[] {
  if (!s.sessionUserId) return EMPTY_BASKETS;
  return s.vault.baskets.length ? s.vault.baskets : EMPTY_BASKETS;
}

export function selectGroceryLists(s: AuthState): SavedGroceryList[] {
  if (!s.sessionUserId) return EMPTY_GROCERY_LISTS;
  return s.vault.groceryLists.length ? s.vault.groceryLists : EMPTY_GROCERY_LISTS;
}
