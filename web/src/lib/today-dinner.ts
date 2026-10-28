import { parseDateKey, planHorizon } from "@/lib/plan-labels";
import type { PlannedDinner, WeekPlan } from "@/lib/types";

/** JS getDay() → clé menu (lun…dim). */
const JS_DAY_TO_KEY = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"] as const;

export type TodayDinnerResult = {
  dinner: PlannedDinner | null;
  /** Prochain dîner du plan si ce soir n'est pas programmé. */
  next: PlannedDinner | null;
  dayKey: string;
  week: number | null;
  /** true si le plan (mois) est hors période. */
  expired: boolean;
  label: string;
};

function startOfMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 dim
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

/** Semaine 1…4 du plan mensuel d'après la date de création. */
export function planWeekIndex(plan: WeekPlan, now = new Date()): number {
  if (planHorizon(plan) !== "month") return 1;
  const created = new Date(plan.createdAt);
  if (Number.isNaN(created.getTime())) return 1;
  const start = startOfMonday(created);
  const cur = startOfMonday(now);
  const diff = Math.floor((cur.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return diff + 1;
}

export function todayDayKey(now = new Date()): string {
  return JS_DAY_TO_KEY[now.getDay()] || "lun";
}

/**
 * Trouve le dîner du jour dans un menu validé / brouillon.
 * Mode mois : aligne la semaine calendaire sur createdAt (S1 = semaine de création).
 */
export function resolveTodayDinner(
  plan: WeekPlan | null | undefined,
  now = new Date()
): TodayDinnerResult | null {
  if (!plan?.dinners?.length) return null;

  const dayKey = todayDayKey(now);
  const horizon = planHorizon(plan);
  const weekIdx = planWeekIndex(plan, now);
  const expired = horizon === "month" && weekIdx > 4;

  const inScope = plan.dinners.filter((d) => {
    const { week, day } = parseDateKey(d.dateKey);
    if (horizon === "month") {
      if (expired) return false;
      return week === weekIdx && day === dayKey;
    }
    return day === dayKey;
  });

  const dinner = inScope[0] || null;

  const DAY_ORD: Record<string, number> = {
    lun: 0,
    mar: 1,
    mer: 2,
    jeu: 3,
    ven: 4,
    sam: 5,
    dim: 6,
  };
  const todayOrd = DAY_ORD[dayKey] ?? 0;

  let next: PlannedDinner | null = null;
  if (!dinner && !expired) {
    const upcoming = plan.dinners
      .map((d) => {
        const { week, day } = parseDateKey(d.dateKey);
        const ord = DAY_ORD[day] ?? 0;
        const w = week ?? 1;
        let rank: number;
        if (horizon === "month") {
          if (w < weekIdx) return null;
          if (w === weekIdx && ord <= todayOrd) return null;
          rank = w * 10 + ord;
        } else {
          if (ord <= todayOrd) return null;
          rank = ord;
        }
        return { d, rank };
      })
      .filter((x): x is { d: PlannedDinner; rank: number } => x != null)
      .sort((a, b) => a.rank - b.rank);
    next = upcoming[0]?.d || null;
  }

  const dayLabel =
    dayKey === "lun"
      ? "Lundi"
      : dayKey === "mar"
        ? "Mardi"
        : dayKey === "mer"
          ? "Mercredi"
          : dayKey === "jeu"
            ? "Jeudi"
            : dayKey === "ven"
              ? "Vendredi"
              : dayKey === "sam"
                ? "Samedi"
                : "Dimanche";

  let label = dayLabel;
  if (horizon === "month" && !expired) label = `S${weekIdx} · ${dayLabel}`;
  if (expired) label = "Menu terminé";

  return {
    dinner,
    next,
    dayKey,
    week: horizon === "month" ? Math.min(4, Math.max(1, weekIdx)) : null,
    expired,
    label,
  };
}
