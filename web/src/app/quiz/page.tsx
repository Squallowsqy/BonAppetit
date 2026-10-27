"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FadeIn } from "@/components/FadeIn";
import { TopBar } from "@/components/TopBar";
import {
  ALLERGEN_OPTIONS,
  DIET_OPTIONS,
  DISLIKE_OPTIONS,
  GOAL_OPTIONS,
  PROTEIN_OPTIONS,
  VIBE_OPTIONS,
  stores,
} from "@/lib/catalog-client";
import { FUNNEL_STEPS, useFunnelStore } from "@/lib/funnel-store";
import { totalDinnerSlots } from "@/lib/plan-labels";
import { formatEUR } from "@/lib/pricing";
import type { PlanHorizon } from "@/lib/types";

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="ba-chip" data-active={active} onClick={onClick}>
      {label}
    </button>
  );
}

function StepTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-6">
      <h1 className="ba-title text-[1.85rem] text-[var(--label)]">{children}</h1>
      {hint ? <p className="ba-body mt-2">{hint}</p> : null}
    </div>
  );
}

/** Étapes à choix unique : on avance automatiquement après la sélection. */
const AUTO_ADVANCE_STEPS = new Set<string>([
  "store",
  "dinners",
  "horizon",
  "diet",
  "protein",
  "goal",
]);

export default function QuizPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { stepIndex, answers, next, back, patchAnswers, setStepIndex } =
    useFunnelStore();
  const step = FUNNEL_STEPS[stepIndex] ?? FUNNEL_STEPS[0];
  const progress = ((stepIndex + 1) / FUNNEL_STEPS.length) * 100;
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // « Nouveau quiz » / reprise : repartir du début si demandé ou si l’index est hors bornes
  useEffect(() => {
    if (params.get("restart") === "1" || stepIndex >= FUNNEL_STEPS.length) {
      setStepIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    []
  );

  /** Sélection unique → patch + avance douce (laisse voir l’état actif). */
  const pickAndAdvance = (patch: Parameters<typeof patchAnswers>[0]) => {
    patchAnswers(patch);
    if (!AUTO_ADVANCE_STEPS.has(step)) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => next(), 220);
  };

  const canNext = (() => {
    if (step === "store") return Boolean(answers.storeId);
    if (step === "spend") {
      return answers.horizon === "month"
        ? answers.budget >= 60
        : answers.budget >= 15;
    }
    if (step === "dinners") return answers.dinners >= 3;
    if (step === "horizon") return answers.horizon === "week" || answers.horizon === "month";
    return true;
  })();

  const horizon: PlanHorizon = answers.horizon || "week";
  const mealCount = totalDinnerSlots(answers.dinners, horizon);

  const goNext = () => {
    if (step === "recap") {
      router.push("/generation");
      return;
    }
    next();
  };

  return (
    <main className="min-h-screen pb-28">
      <TopBar
        trailing={
          <p className="ba-caption tabular-nums">
            {stepIndex + 1} / {FUNNEL_STEPS.length}
          </p>
        }
      />

      <div className="ba-progress sticky top-[52px] z-30">
        <i style={{ width: `${progress}%` }} />
      </div>

      <div className="ba-shell pt-8">
        <FadeIn id={step}>
          {step === "store" && (
            <section>
              <StepTitle hint="Les prix du menu sont calés sur cette enseigne. Gratuit, deux minutes.">
                Ton magasin
              </StepTitle>
              <div className="flex flex-wrap gap-2">
                {stores.map((s) => (
                  <Chip
                    key={s.id}
                    label={s.name}
                    active={answers.storeId === s.id}
                    onClick={() => pickAndAdvance({ storeId: s.id })}
                  />
                ))}
              </div>
            </section>
          )}

          {step === "household" && (
            <section>
              <StepTitle hint="Un enfant compte pour une demi-portion.">
                Qui mange ?
              </StepTitle>
              <div className="ba-grouped">
                <label className="ba-row flex-col !items-stretch !gap-2">
                  <div className="flex justify-between">
                    <span className="ba-headline">Adultes</span>
                    <span className="tabular-nums text-[var(--basil)] font-semibold">
                      {answers.adults}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    value={answers.adults}
                    onChange={(e) => patchAnswers({ adults: Number(e.target.value) })}
                    className="w-full accent-[var(--basil)]"
                  />
                </label>
                <label className="ba-row flex-col !items-stretch !gap-2">
                  <div className="flex justify-between">
                    <span className="ba-headline">Enfants</span>
                    <span className="tabular-nums text-[var(--basil)] font-semibold">
                      {answers.children}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={6}
                    value={answers.children}
                    onChange={(e) => patchAnswers({ children: Number(e.target.value) })}
                    className="w-full accent-[var(--basil)]"
                  />
                </label>
              </div>
            </section>
          )}

          {step === "dinners" && (
            <section>
              <StepTitle hint="Les autres soirs restent libres (restes, sorties, improvisation).">
                Dîners par semaine
              </StepTitle>
              <div className="flex flex-wrap gap-2">
                {[3, 4, 5, 6, 7].map((n) => (
                  <Chip
                    key={n}
                    label={`${n}`}
                    active={answers.dinners === n}
                    onClick={() => pickAndAdvance({ dinners: n })}
                  />
                ))}
              </div>
            </section>
          )}

          {step === "horizon" && (
            <section>
              <StepTitle hint="Le mois reprend ton rythme sur 4 semaines.">
                Semaine ou mois ?
              </StepTitle>
              <div className="flex flex-col gap-2">
                <Chip
                  label={`Cette semaine · ${answers.dinners} dîners`}
                  active={horizon === "week"}
                  onClick={() => {
                    const nextBudget =
                      answers.horizon === "month"
                        ? Math.round(answers.budget / 4 / 5) * 5
                        : answers.budget;
                    pickAndAdvance({
                      horizon: "week",
                      budget: Math.min(120, Math.max(20, nextBudget || 45)),
                    });
                  }}
                />
                <Chip
                  label={`Ce mois · 4 semaines · ${answers.dinners * 4} dîners`}
                  active={horizon === "month"}
                  onClick={() => {
                    const nextBudget =
                      answers.horizon === "week"
                        ? answers.budget * 4
                        : answers.budget;
                    pickAndAdvance({
                      horizon: "month",
                      budget: Math.min(400, Math.max(80, nextBudget || 180)),
                    });
                  }}
                />
              </div>
            </section>
          )}

          {step === "spend" && (
            <section>
              <StepTitle>
                {horizon === "month"
                  ? "Budget courses du mois"
                  : "Budget courses de la semaine"}
              </StepTitle>
              <p className="ba-display text-[2.75rem] tabular-nums text-[var(--basil)]">
                {formatEUR(answers.budget)}
              </p>
              <p className="ba-caption mt-1">
                {mealCount} dîners · ~
                {formatEUR(answers.budget / Math.max(1, mealCount))} / repas
              </p>
              <input
                type="range"
                min={horizon === "month" ? 80 : 20}
                max={horizon === "month" ? 400 : 120}
                step={5}
                value={answers.budget}
                onChange={(e) => patchAnswers({ budget: Number(e.target.value) })}
                className="mt-6 w-full accent-[var(--basil)]"
              />
            </section>
          )}

          {step === "diet" && (
            <section>
              <StepTitle>Régime</StepTitle>
              <div className="flex flex-wrap gap-2">
                {DIET_OPTIONS.map((o) => (
                  <Chip
                    key={o.id}
                    label={o.label}
                    active={answers.diet === o.id}
                    onClick={() => pickAndAdvance({ diet: o.id })}
                  />
                ))}
              </div>
            </section>
          )}

          {step === "protein" && (
            <section>
              <StepTitle>Protéines</StepTitle>
              <div className="flex flex-wrap gap-2">
                {PROTEIN_OPTIONS.map((o) => (
                  <Chip
                    key={o.id}
                    label={o.label}
                    active={answers.protein === o.id}
                    onClick={() => pickAndAdvance({ protein: o.id })}
                  />
                ))}
              </div>
            </section>
          )}

          {step === "vibes" && (
            <section>
              <StepTitle hint="Plusieurs choix possibles.">Ambiance des plats</StepTitle>
              <div className="flex flex-wrap gap-2">
                {VIBE_OPTIONS.map((o) => {
                  const active = answers.vibes.includes(o.id);
                  return (
                    <Chip
                      key={o.id}
                      label={o.label}
                      active={active}
                      onClick={() =>
                        patchAnswers({
                          vibes: active
                            ? answers.vibes.filter((v) => v !== o.id)
                            : [...answers.vibes, o.id],
                        })
                      }
                    />
                  );
                })}
              </div>
            </section>
          )}

          {step === "allergens" && (
            <section>
              <StepTitle hint="Optionnel — passe si rien ne s’applique.">Allergies</StepTitle>
              <div className="flex flex-wrap gap-2">
                {ALLERGEN_OPTIONS.map((o) => {
                  const active = answers.allergens.includes(o.id);
                  return (
                    <Chip
                      key={o.id}
                      label={o.label}
                      active={active}
                      onClick={() =>
                        patchAnswers({
                          allergens: active
                            ? answers.allergens.filter((v) => v !== o.id)
                            : [...answers.allergens, o.id],
                        })
                      }
                    />
                  );
                })}
              </div>
            </section>
          )}

          {step === "dislikes" && (
            <section>
              <StepTitle hint="Optionnel — on écarte ces ingrédients.">Tu n’aimes pas</StepTitle>
              <div className="flex flex-wrap gap-2">
                {DISLIKE_OPTIONS.map((o) => {
                  const active = answers.dislikes.includes(o.id);
                  return (
                    <Chip
                      key={o.id}
                      label={o.label}
                      active={active}
                      onClick={() =>
                        patchAnswers({
                          dislikes: active
                            ? answers.dislikes.filter((v) => v !== o.id)
                            : [...answers.dislikes, o.id],
                        })
                      }
                    />
                  );
                })}
              </div>
            </section>
          )}

          {step === "time" && (
            <section>
              <StepTitle>Temps max en cuisine</StepTitle>
              <p className="ba-display text-[2.75rem] tabular-nums text-[var(--basil)]">
                {answers.timeMin}
                <span className="ml-1 text-[1.25rem] font-semibold text-[var(--secondary-label)]">
                  min
                </span>
              </p>
              <input
                type="range"
                min={15}
                max={60}
                step={5}
                value={answers.timeMin}
                onChange={(e) => patchAnswers({ timeMin: Number(e.target.value) })}
                className="mt-6 w-full accent-[var(--basil)]"
              />
            </section>
          )}

          {step === "goal" && (
            <section>
              <StepTitle hint="Oriente le choix des plats (prix, rapidité, variété…).">
                Objectif principal
              </StepTitle>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((o) => (
                  <Chip
                    key={o.id}
                    label={o.label}
                    active={answers.goal === o.id}
                    onClick={() => pickAndAdvance({ goal: o.id })}
                  />
                ))}
              </div>
            </section>
          )}

          {step === "recap" && (
            <section>
              <StepTitle hint="Touche une ligne pour la modifier. Ensuite on génère ton menu — gratuit, sans compte.">
                Récap
              </StepTitle>
              <ul className="ba-grouped">
                {(
                  [
                    {
                      step: "store",
                      label: "Magasin",
                      value: stores.find((s) => s.id === answers.storeId)?.name || "—",
                    },
                    {
                      step: "household",
                      label: "Foyer",
                      value: `${answers.adults} adulte(s)${
                        answers.children ? `, ${answers.children} enfant(s)` : ""
                      }`,
                    },
                    {
                      step: "horizon",
                      label: "Horizon",
                      value: horizon === "month" ? "Mois (4 sem.)" : "Semaine",
                    },
                    {
                      step: "spend",
                      label: horizon === "month" ? "Budget mois" : "Budget semaine",
                      value: formatEUR(answers.budget),
                    },
                    {
                      step: "dinners",
                      label: "Dîners",
                      value: `${mealCount}${
                        horizon === "month" ? ` (${answers.dinners}/sem.)` : ""
                      }`,
                    },
                    {
                      step: "diet",
                      label: "Régime",
                      value:
                        DIET_OPTIONS.find((o) => o.id === answers.diet)?.label || "—",
                    },
                    {
                      step: "time",
                      label: "Temps",
                      value: `≤ ${answers.timeMin} min`,
                    },
                  ] as const
                ).map((row) => (
                  <li key={row.step}>
                    <button
                      type="button"
                      className="ba-row ba-press w-full justify-between text-left"
                      onClick={() => setStepIndex(FUNNEL_STEPS.indexOf(row.step))}
                      aria-label={`Modifier : ${row.label}`}
                    >
                      <span className="ba-caption">{row.label}</span>
                      <span className="ba-headline flex items-center gap-2 tabular-nums">
                        {row.value}
                        <span aria-hidden className="text-[var(--tertiary-label)]">
                          ›
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </FadeIn>
      </div>

      {/* Sticky footer actions — continuous feedback, always reachable */}
      <div className="ba-material-thick fixed inset-x-0 bottom-0 z-40 border-t border-[var(--separator)] pb-[var(--safe-bottom)]">
        <div className="ba-shell flex items-center justify-between gap-3 py-3">
          <button
            type="button"
            className="ba-btn ba-btn-plain"
            onClick={() => (stepIndex === 0 ? router.push("/") : back())}
          >
            Retour
          </button>
          <button
            type="button"
            className="ba-btn ba-btn-primary min-w-[9.5rem]"
            disabled={!canNext}
            onClick={goNext}
          >
            {step === "recap"
              ? "Générer mon menu"
              : step === "allergens" || step === "dislikes" || step === "vibes"
                ? answers[step].length
                  ? "Continuer"
                  : "Passer"
                : "Continuer"}
          </button>
        </div>
      </div>
    </main>
  );
}
