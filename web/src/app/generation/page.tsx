"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnelStore } from "@/lib/funnel-store";
import type { WeekPlan } from "@/lib/types";

const MESSAGES = [
  "On regarde les prix de ton magasin…",
  "On filtre allergies et goûts…",
  "On assemble une semaine qui tient le budget…",
  "Presque prêt…",
];

export default function GenerationPage() {
  const router = useRouter();
  const { answers, setPlan } = useFunnelStore();
  const [msg, setMsg] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!answers.storeId) {
      router.replace("/quiz");
      return;
    }

    const tick = setInterval(() => {
      setMsg((m) => Math.min(m + 1, MESSAGES.length - 1));
    }, 700);

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(answers),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");
        if (cancelled) return;
        setPlan(data as WeekPlan);
        router.replace("/reveal");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur de génération");
        }
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [answers, router, setPlan]);

  return (
    <main className="ba-shell flex min-h-screen flex-col items-center justify-center text-center">
      <p className="font-display text-3xl text-[var(--basil)]">
        BonAppétit<span className="text-[var(--saffron)]">!</span>
      </p>
      <div className="mt-8 h-2 w-48 overflow-hidden rounded-full bg-black/10">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--basil)]" />
      </div>
      <p className="mt-6 text-lg text-[var(--ink)]/70">{error || MESSAGES[msg]}</p>
    </main>
  );
}
