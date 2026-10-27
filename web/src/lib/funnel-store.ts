"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FunnelAnswers, WeekPlan } from "@/lib/types";

export const FUNNEL_STEPS = [
  "welcome",
  "store",
  "household",
  "dinners",
  "horizon",
  "spend",
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
  horizon: "week",
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
  /** Brouillon de menu (non garanti sans compte). */
  plan: WeekPlan | null;
  /** true si le brouillon a été poussé dans le coffre compte. */
  planSaved: boolean;
  groceryChecked: Record<string, boolean>;
  setStepIndex: (i: number) => void;
  next: () => void;
  back: () => void;
  patchAnswers: (patch: Partial<FunnelAnswers>) => void;
  setPlan: (plan: WeekPlan | null) => void;
  markPlanSaved: () => void;
  toggleGrocery: (key: string) => void;
  resetFunnel: () => void;
};

export const useFunnelStore = create<FunnelState>()(
  persist(
    (set, get) => ({
      stepIndex: 0,
      answers: defaultAnswers,
      plan: null,
      planSaved: false,
      groceryChecked: {},
      setStepIndex: (i) =>
        set({ stepIndex: Math.max(0, Math.min(i, FUNNEL_STEPS.length - 1)) }),
      next: () =>
        set({ stepIndex: Math.min(get().stepIndex + 1, FUNNEL_STEPS.length - 1) }),
      back: () => set({ stepIndex: Math.max(get().stepIndex - 1, 0) }),
      patchAnswers: (patch) => set({ answers: { ...get().answers, ...patch } }),
      setPlan: (plan) => set({ plan, groceryChecked: {}, planSaved: false }),
      markPlanSaved: () => set({ planSaved: true }),
      toggleGrocery: (key) =>
        set({
          groceryChecked: {
            ...get().groceryChecked,
            [key]: !get().groceryChecked[key],
          },
        }),
      resetFunnel: () =>
        set({
          stepIndex: 0,
          answers: defaultAnswers,
          plan: null,
          planSaved: false,
          groceryChecked: {},
        }),
    }),
    {
      name: "bonappetit-funnel-v3",
      version: 3,
      migrate: (persisted) => {
        const p = persisted as { answers?: Partial<FunnelAnswers> } | undefined;
        if (!p?.answers) return p as never;
        return {
          ...p,
          answers: {
            ...defaultAnswers,
            ...p.answers,
            horizon: p.answers.horizon || "week",
          },
        } as never;
      },
    }
  )
);
