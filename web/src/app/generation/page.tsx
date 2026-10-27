"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useAuthStore } from "@/lib/auth-store";
import { useFunnelStore } from "@/lib/funnel-store";
import type { WeekPlan } from "@/lib/types";

const MESSAGES_CLASSIC = [
  "Prix de ton magasin…",
  "Allergies et goûts…",
  "On tient ton budget…",
  "Presque prêt…",
];

const MESSAGES_ML = [
  "Analyse de tes goûts…",
  "Variété des repas…",
  "Optimisation enseigne…",
  "Menu personnalisé…",
];

export default function GenerationPage() {
  const router = useRouter();
  const params = useSearchParams();
  const forceMl = params.get("mode") === "ml";
  const { answers, setPlan } = useFunnelStore();
  const sessionUserId = useAuthStore((s) => s.sessionUserId);
  const getTasteSignals = useAuthStore((s) => s.getTasteSignals);
  const [msg, setMsg] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modeLabel, setModeLabel] = useState("classic");
  const [attempt, setAttempt] = useState(0);
  const reduce = useReducedMotion();

  const messages =
    forceMl || sessionUserId ? MESSAGES_ML : MESSAGES_CLASSIC;

  useEffect(() => {
    if (!answers.storeId) {
      router.replace("/quiz");
      return;
    }

    setError(null);
    setMsg(0);

    const tick = setInterval(() => {
      setMsg((m) => Math.min(m + 1, messages.length - 1));
    }, 650);

    let cancelled = false;

    (async () => {
      try {
        const useMl = forceMl || Boolean(sessionUserId);
        const taste = useMl ? getTasteSignals() : null;
        setModeLabel(useMl && taste ? "ml" : "classic");

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            useMl && taste
              ? { answers, taste, mode: "ml" }
              : answers
          ),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");
        if (cancelled) return;
        setPlan(data as WeekPlan);
        router.replace("/reveal");
      } catch (e) {
        if (!cancelled) {
          clearInterval(tick);
          setError(
            e instanceof Error && e.message !== "Erreur"
              ? e.message
              : "Impossible de générer le menu pour l’instant."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [
    answers,
    router,
    setPlan,
    sessionUserId,
    getTasteSignals,
    forceMl,
    messages.length,
    attempt,
  ]);

  return (
    <main className="ba-shell flex min-h-screen flex-col items-center justify-center text-center">
      <p className="ba-title text-[1.5rem] text-[var(--basil)]">
        BonAppétit<span className="text-[var(--saffron)]">!</span>
      </p>
      <p className="ba-caption mt-2">
        {modeLabel === "ml" ? "Menu intelligent" : "Menu budget"}
      </p>

      {!error && (
        <motion.div
          className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-[var(--fill)]"
          aria-hidden
        >
          <motion.div
            className="h-full rounded-full bg-[var(--basil)]"
            initial={{ width: "12%" }}
            animate={
              reduce
                ? { opacity: [0.5, 1, 0.5] }
                : { width: ["12%", "78%", "42%", "92%"] }
            }
            transition={
              reduce
                ? { duration: 1.2, repeat: Infinity }
                : { duration: 2.2, repeat: Infinity, ease: [0.32, 0.72, 0, 1] }
            }
          />
        </motion.div>
      )}

      <p
        className={`ba-body mt-6 text-[1.05rem] ${error ? "text-[var(--tomato)]" : ""}`}
        role={error ? "alert" : "status"}
        aria-live="polite"
      >
        {error || messages[msg]}
      </p>

      {error && (
        <div className="mt-6 flex w-full max-w-[22rem] flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="ba-btn ba-btn-primary flex-1"
            onClick={() => setAttempt((a) => a + 1)}
          >
            Réessayer
          </button>
          <button
            type="button"
            className="ba-btn ba-btn-tinted flex-1"
            onClick={() => router.push("/quiz")}
          >
            Modifier mes réponses
          </button>
        </div>
      )}
    </main>
  );
}
