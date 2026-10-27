"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ALLERGEN_OPTIONS,
  DIET_OPTIONS,
  DISLIKE_OPTIONS,
  GOAL_OPTIONS,
  PROTEIN_OPTIONS,
  VIBE_OPTIONS,
  stores,
} from "@/lib/catalog-client";
import {
  FUNNEL_STEPS,
  useFunnelStore,
} from "@/lib/funnel-store";
import { formatEUR } from "@/lib/pricing";

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

export default function QuizPage() {
  const router = useRouter();
  const { stepIndex, answers, next, back, patchAnswers, setStepIndex } = useFunnelStore();
  const step = FUNNEL_STEPS[stepIndex];
  const progress = ((stepIndex + 1) / FUNNEL_STEPS.length) * 100;

  const canNext = (() => {
    if (step === "store") return Boolean(answers.storeId);
    if (step === "spend") return answers.budget >= 15;
    if (step === "dinners") return answers.dinners >= 3;
    return true;
  })();

  const goNext = () => {
    if (step === "recap") {
      router.push("/generation");
      return;
    }
    next();
  };

  return (
    <main className="min-h-screen">
      <header className="ba-shell flex items-center justify-between py-5">
        <Link href="/" className="font-display text-xl text-[var(--basil)]">
          BonAppétit<span className="text-[var(--saffron)]">!</span>
        </Link>
        <p className="text-sm text-[var(--ink)]/55">
          {stepIndex + 1}/{FUNNEL_STEPS.length}
        </p>
      </header>

      <div className="h-1 w-full bg-black/5">
        <div
          className="h-full bg-[var(--basil)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="ba-shell max-w-2xl py-10">
        {step === "welcome" && (
          <section className="rise space-y-4">
            <h1 className="font-display text-4xl text-[var(--basil-deep)]">
              Créons ta semaine
            </h1>
            <p className="text-lg text-[var(--ink)]/70">
              Quelques questions, puis un menu calé sur ton magasin et ton budget.
              C’est gratuit.
            </p>
          </section>
        )}

        {step === "store" && (
          <section className="rise space-y-5">
            <h1 className="font-display text-3xl">Ton magasin</h1>
            <div className="flex flex-wrap gap-2">
              {stores.map((s) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  active={answers.storeId === s.id}
                  onClick={() => patchAnswers({ storeId: s.id })}
                />
              ))}
            </div>
          </section>
        )}

        {step === "household" && (
          <section className="rise space-y-6">
            <h1 className="font-display text-3xl">Qui mange ?</h1>
            <label className="block">
              <span className="text-sm font-semibold">Adultes</span>
              <input
                type="range"
                min={1}
                max={6}
                value={answers.adults}
                onChange={(e) => patchAnswers({ adults: Number(e.target.value) })}
                className="mt-2 w-full accent-[var(--basil)]"
              />
              <span className="text-sm">{answers.adults}</span>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Enfants (½ portion)</span>
              <input
                type="range"
                min={0}
                max={6}
                value={answers.children}
                onChange={(e) => patchAnswers({ children: Number(e.target.value) })}
                className="mt-2 w-full accent-[var(--basil)]"
              />
              <span className="text-sm">{answers.children}</span>
            </label>
          </section>
        )}

        {step === "spend" && (
          <section className="rise space-y-5">
            <h1 className="font-display text-3xl">Budget courses dîners</h1>
            <p className="text-4xl font-bold text-[var(--basil)]">
              {formatEUR(answers.budget)}
            </p>
            <input
              type="range"
              min={20}
              max={120}
              step={5}
              value={answers.budget}
              onChange={(e) => patchAnswers({ budget: Number(e.target.value) })}
              className="w-full accent-[var(--basil)]"
            />
          </section>
        )}

        {step === "dinners" && (
          <section className="rise space-y-5">
            <h1 className="font-display text-3xl">Dîners / semaine</h1>
            <div className="flex flex-wrap gap-2">
              {[3, 4, 5, 6, 7].map((n) => (
                <Chip
                  key={n}
                  label={`${n}`}
                  active={answers.dinners === n}
                  onClick={() => patchAnswers({ dinners: n })}
                />
              ))}
            </div>
          </section>
        )}

        {step === "diet" && (
          <section className="rise space-y-5">
            <h1 className="font-display text-3xl">Régime</h1>
            <div className="flex flex-wrap gap-2">
              {DIET_OPTIONS.map((o) => (
                <Chip
                  key={o.id}
                  label={o.label}
                  active={answers.diet === o.id}
                  onClick={() => patchAnswers({ diet: o.id })}
                />
              ))}
            </div>
          </section>
        )}

        {step === "protein" && (
          <section className="rise space-y-5">
            <h1 className="font-display text-3xl">Protéines</h1>
            <div className="flex flex-wrap gap-2">
              {PROTEIN_OPTIONS.map((o) => (
                <Chip
                  key={o.id}
                  label={o.label}
                  active={answers.protein === o.id}
                  onClick={() => patchAnswers({ protein: o.id })}
                />
              ))}
            </div>
          </section>
        )}

        {step === "vibes" && (
          <section className="rise space-y-5">
            <h1 className="font-display text-3xl">Ambiance des plats</h1>
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
          <section className="rise space-y-5">
            <h1 className="font-display text-3xl">Allergies</h1>
            <p className="text-sm text-[var(--ink)]/60">Optionnel — on évite ces ingrédients.</p>
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
          <section className="rise space-y-5">
            <h1 className="font-display text-3xl">Tu n’aimes pas</h1>
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
          <section className="rise space-y-5">
            <h1 className="font-display text-3xl">Temps max en cuisine</h1>
            <p className="text-3xl font-bold">{answers.timeMin} min</p>
            <input
              type="range"
              min={15}
              max={60}
              step={5}
              value={answers.timeMin}
              onChange={(e) => patchAnswers({ timeMin: Number(e.target.value) })}
              className="w-full accent-[var(--basil)]"
            />
          </section>
        )}

        {step === "skill" && (
          <section className="rise space-y-5">
            <h1 className="font-display text-3xl">Niveau en cuisine</h1>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "beginner", label: "Débutant" },
                { id: "intermediate", label: "Intermédiaire" },
                { id: "advanced", label: "À l’aise" },
              ].map((o) => (
                <Chip
                  key={o.id}
                  label={o.label}
                  active={answers.skill === o.id}
                  onClick={() => patchAnswers({ skill: o.id })}
                />
              ))}
            </div>
          </section>
        )}

        {step === "equipment" && (
          <section className="rise space-y-5">
            <h1 className="font-display text-3xl">Équipement</h1>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "stove", label: "Plaques" },
                { id: "oven", label: "Four" },
                { id: "microwave", label: "Micro-ondes" },
                { id: "blender", label: "Mixeur" },
              ].map((o) => {
                const active = answers.equipment.includes(o.id);
                return (
                  <Chip
                    key={o.id}
                    label={o.label}
                    active={active}
                    onClick={() =>
                      patchAnswers({
                        equipment: active
                          ? answers.equipment.filter((v) => v !== o.id)
                          : [...answers.equipment, o.id],
                      })
                    }
                  />
                );
              })}
            </div>
          </section>
        )}

        {step === "goal" && (
          <section className="rise space-y-5">
            <h1 className="font-display text-3xl">Objectif principal</h1>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((o) => (
                <Chip
                  key={o.id}
                  label={o.label}
                  active={answers.goal === o.id}
                  onClick={() => patchAnswers({ goal: o.id })}
                />
              ))}
            </div>
          </section>
        )}

        {step === "recap" && (
          <section className="rise space-y-4">
            <h1 className="font-display text-3xl">Récap</h1>
            <ul className="ba-card space-y-2 rounded-3xl p-5 text-sm">
              <li>
                Magasin :{" "}
                <strong>{stores.find((s) => s.id === answers.storeId)?.name || "—"}</strong>
              </li>
              <li>
                Foyer : {answers.adults} adulte(s)
                {answers.children ? `, ${answers.children} enfant(s)` : ""}
              </li>
              <li>
                Budget : <strong>{formatEUR(answers.budget)}</strong> · {answers.dinners}{" "}
                dîners
              </li>
              <li>
                Régime : {answers.diet} · temps ≤ {answers.timeMin} min
              </li>
            </ul>
            <p className="text-sm text-[var(--ink)]/60">
              Ensuite on génère ton menu — accès immédiat, sans payer.
            </p>
          </section>
        )}

        <div className="mt-10 flex items-center justify-between gap-3">
          <button
            type="button"
            className="ba-btn ba-btn-ghost"
            onClick={() => (stepIndex === 0 ? router.push("/") : back())}
          >
            Retour
          </button>
          <button
            type="button"
            className="ba-btn ba-btn-primary disabled:opacity-40"
            disabled={!canNext}
            onClick={goNext}
          >
            {step === "recap" ? "Générer mon menu" : "Continuer"}
          </button>
        </div>

        <button
          type="button"
          className="mt-6 text-xs text-[var(--ink)]/40 underline"
          onClick={() => setStepIndex(FUNNEL_STEPS.length - 1)}
        >
          Aller au récap
        </button>
      </div>
    </main>
  );
}
