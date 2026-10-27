"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FunnelAnswers, WeekPlan } from "@/lib/types";

export const FUNNEL_STEPS = [
  "welcome",
  "store",
  "household",
  "spend",
  "dinners",
  "diet",
  "protein",
  "vibes",
  "allergens",
  "dislikes",
  "time",
  "skill",
  "equipment",
  "goal",
  "recap",
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const defaultAnswers: FunnelAnswers = {
  storeId: null,
  adults: 2,
  children: 0,
  budget: 45,
  dinners: 5,
  diet: "omnivore",
  protein: "balanced",
  vibes: ["comfort"],
  allergens: [],
  dislikes: [],
  timeMin: 30,
  skill: "intermediate",
  equipment: ["stove", "oven"],
  goal: "save",
};

type FunnelState = {
  stepIndex: number;
  answers: FunnelAnswers;
  plan: WeekPlan | null;
  groceryChecked: Record<string, boolean>;
  favorites: string[];
  setStepIndex: (i: number) => void;
  next: () => void;
  back: () => void;
  patchAnswers: (patch: Partial<FunnelAnswers>) => void;
  setPlan: (plan: WeekPlan | null) => void;
  toggleGrocery: (key: string) => void;
  toggleFavorite: (recipeId: string) => void;
  resetFunnel: () => void;
};

export const useFunnelStore = create<FunnelState>()(
  persist(
    (set, get) => ({
      stepIndex: 0,
      answers: defaultAnswers,
      plan: null,
      groceryChecked: {},
      favorites: [],
      setStepIndex: (i) => set({ stepIndex: Math.max(0, Math.min(i, FUNNEL_STEPS.length - 1)) }),
      next: () => set({ stepIndex: Math.min(get().stepIndex + 1, FUNNEL_STEPS.length - 1) }),
      back: () => set({ stepIndex: Math.max(get().stepIndex - 1, 0) }),
      patchAnswers: (patch) => set({ answers: { ...get().answers, ...patch } }),
      setPlan: (plan) => set({ plan, groceryChecked: {} }),
      toggleGrocery: (key) =>
        set({
          groceryChecked: {
            ...get().groceryChecked,
            [key]: !get().groceryChecked[key],
          },
        }),
      toggleFavorite: (recipeId) => {
        const fav = get().favorites;
        set({
          favorites: fav.includes(recipeId)
            ? fav.filter((id) => id !== recipeId)
            : [...fav, recipeId],
        });
      },
      resetFunnel: () =>
        set({
          stepIndex: 0,
          answers: defaultAnswers,
          plan: null,
          groceryChecked: {},
        }),
    }),
    { name: "bonappetit-funnel-v1" }
  )
);
