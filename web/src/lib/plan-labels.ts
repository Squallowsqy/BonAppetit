import type { PlannedDinner, PlanHorizon, WeekPlan } from "@/lib/types";

const DAY_SHORT = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"] as const;

export const DAY_LABEL: Record<string, string> = {
  lun: "Lundi",
  mar: "Mardi",
  mer: "Mercredi",
  jeu: "Jeudi",
  ven: "Vendredi",
  sam: "Samedi",
  dim: "Dimanche",
};

export function planHorizon(plan: WeekPlan | null | undefined): PlanHorizon {
  return plan?.horizon || plan?.answers?.horizon || "week";
}

export function totalDinnerSlots(
  dinnersPerWeek: number,
  horizon: PlanHorizon
): number {
  return Math.max(1, dinnersPerWeek) * (horizon === "month" ? 4 : 1);
}

/** Build dateKeys: lun… or s1-lun…s4-… */
export function dinnerDateKey(
  index: number,
  dinnersPerWeek: number,
  horizon: PlanHorizon
): string {
  const perWeek = Math.max(1, Math.min(7, dinnersPerWeek));
  const day = DAY_SHORT[index % perWeek] || `j${(index % perWeek) + 1}`;
  if (horizon !== "month") return day;
  const week = Math.floor(index / perWeek) + 1;
  return `s${week}-${day}`;
}

export function parseDateKey(dateKey: string): {
  week: number | null;
  day: string;
  dayLabel: string;
} {
  const m = /^s(\d+)-([a-z]+)$/i.exec(dateKey);
  if (m) {
    const day = m[2];
    return {
      week: Number(m[1]),
      day,
      dayLabel: DAY_LABEL[day] || day,
    };
  }
  return {
    week: null,
    day: dateKey,
    dayLabel: DAY_LABEL[dateKey] || dateKey,
  };
}

export function groupDinnersByWeek(
  dinners: PlannedDinner[]
): { week: number | null; label: string; dinners: PlannedDinner[] }[] {
  const map = new Map<number | null, PlannedDinner[]>();
  for (const d of dinners) {
    const { week } = parseDateKey(d.dateKey);
    const list = map.get(week) || [];
    list.push(d);
    map.set(week, list);
  }
  const keys = [...map.keys()].sort((a, b) => {
    if (a == null) return -1;
    if (b == null) return 1;
    return a - b;
  });
  return keys.map((week) => ({
    week,
    label: week == null ? "Cette semaine" : `Semaine ${week}`,
    dinners: map.get(week) || [],
  }));
}

export function planTitle(plan: WeekPlan): string {
  const h = planHorizon(plan);
  if (h === "month") return "Mon mois";
  return "Ma semaine";
}

export function planBudgetLabel(horizon: PlanHorizon): string {
  return horizon === "month" ? "Budget mois" : "Budget semaine";
}

export function groceryListTitle(horizon: PlanHorizon): string {
  return horizon === "month" ? "Liste du mois" : "Liste de courses";
}

export function basketLabelFromPlan(plan: WeekPlan): string {
  const date = new Date(plan.createdAt).toLocaleDateString("fr-FR");
  return planHorizon(plan) === "month"
    ? `Mois du ${date}`
    : `Semaine du ${date}`;
}
