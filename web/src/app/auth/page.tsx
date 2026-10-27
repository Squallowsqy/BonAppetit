"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { FadeIn } from "@/components/FadeIn";
import { OAuthButtons } from "@/components/OAuthButtons";
import { TopBar } from "@/components/TopBar";
import { useAuthStore } from "@/lib/auth-store";
import { useFunnelStore } from "@/lib/funnel-store";

type Mode = "register" | "login";

function AuthPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/menu";
  const intent = params.get("intent");
  const recipeId = params.get("recipeId") || undefined;
  const oauthReturn = params.get("oauth") === "1";
  const authError = params.get("error");

  const initialMode: Mode = params.get("mode") === "login" ? "login" : "register";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const oauthHandled = useRef(false);

  const { status } = useSession();
  const register = useAuthStore((s) => s.register);
  const login = useAuthStore((s) => s.login);
  const hydrateVault = useAuthStore((s) => s.hydrateVault);
  const saveBasket = useAuthStore((s) => s.saveBasket);
  const toggleFavorite = useAuthStore((s) => s.toggleFavorite);
  const setPendingIntent = useAuthStore((s) => s.setPendingIntent);
  const sessionUserId = useAuthStore((s) => s.sessionUserId);
  const vaultHydrated = useAuthStore((s) => s.vaultHydrated);
  const { plan, markPlanSaved } = useFunnelStore();

  const subtitle = useMemo(() => {
    if (intent === "save-basket") return "Crée un compte pour sauvegarder ton panier.";
    if (intent === "favorite") return "Crée un compte pour garder tes recettes favorites.";
    if (intent === "rate") return "Crée un compte pour noter les plats et améliorer ton menu.";
    return "Compte sécurisé cloud — accessible sur tous tes appareils.";
  }, [intent]);

  const oauthCallbackUrl = useMemo(() => {
    const q = new URLSearchParams();
    q.set("oauth", "1");
    q.set("next", next);
    if (intent) q.set("intent", intent);
    if (recipeId) q.set("recipeId", recipeId);
    return `/auth?${q.toString()}`;
  }, [intent, next, recipeId]);

  function applyIntent() {
    if (intent === "save-basket" && plan) {
      saveBasket(plan);
      markPlanSaved();
    } else if (intent === "favorite" && recipeId) {
      toggleFavorite(recipeId);
    }
    setPendingIntent(null);
  }

  useEffect(() => {
    if (authError) {
      setError("Connexion sociale annulée ou échouée. Réessaie.");
    }
  }, [authError]);

  // After credentials or OAuth: wait for AuthSync + vault, then intent + redirect
  useEffect(() => {
    if (!oauthReturn && status !== "authenticated") return;
    if (status !== "authenticated" || !sessionUserId) {
      if (oauthReturn && status === "unauthenticated" && !oauthHandled.current) {
        setError("Connexion sociale incomplète. Réessaie.");
      }
      return;
    }
    if (!vaultHydrated) {
      void hydrateVault();
      return;
    }
    if (oauthHandled.current && !oauthReturn) return;
    oauthHandled.current = true;
    applyIntent();
    router.replace(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthReturn, status, sessionUserId, vaultHydrated]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === "register"
          ? await register({ name, email, password })
          : await login({ email, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // AuthSync + vault hydrate; effect above finishes redirect
      oauthHandled.current = false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen pb-16">
      <TopBar
        trailing={
          <Link href="/" className="ba-btn ba-btn-plain text-[0.95rem]">
            Accueil
          </Link>
        }
      />
      <FadeIn className="ba-shell pt-6">
        <p className="ba-caption uppercase tracking-[0.04em]">Compte</p>
        <h1 className="ba-title mt-1 text-[1.85rem]">
          {mode === "register" ? "S’enregistrer" : "Se connecter"}
        </h1>
        <p className="ba-body mt-2 max-w-[36ch]">{subtitle}</p>

        <OAuthButtons
          callbackUrl={oauthCallbackUrl}
          busy={busy}
          onBusy={setBusy}
        />

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className={`ba-btn flex-1 !min-h-10 ${
              mode === "register" ? "ba-btn-primary" : "ba-btn-tinted"
            }`}
            onClick={() => setMode("register")}
          >
            Inscription
          </button>
          <button
            type="button"
            className={`ba-btn flex-1 !min-h-10 ${
              mode === "login" ? "ba-btn-primary" : "ba-btn-tinted"
            }`}
            onClick={() => setMode("login")}
          >
            Connexion
          </button>
        </div>

        <form onSubmit={onSubmit} className="ba-grouped mt-5 p-4">
          {mode === "register" && (
            <label className="block">
              <span className="ba-caption">Prénom</span>
              <input
                className="ba-input mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="given-name"
                required
                maxLength={80}
              />
            </label>
          )}
          <label className="mt-3 block">
            <span className="ba-caption">E-mail</span>
            <input
              className="ba-input mt-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label className="mt-3 block">
            <span className="ba-caption">Mot de passe</span>
            <input
              className="ba-input mt-1"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              minLength={mode === "register" ? 10 : 1}
              maxLength={128}
              required
            />
            {mode === "register" ? (
              <span className="ba-footnote mt-1 block">
                10+ caractères, majuscule, minuscule, chiffre et symbole.
              </span>
            ) : null}
          </label>

          {error ? (
            <p className="mt-3 text-[0.9rem] font-medium text-[var(--tomato)]">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="ba-btn ba-btn-primary mt-5 w-full"
          >
            {busy
              ? "…"
              : mode === "register"
                ? "Créer mon compte"
                : "Se connecter"}
          </button>
        </form>

        <p className="ba-footnote mt-4 px-1">
          Compte gratuit. Mot de passe chiffré (bcrypt) et stocké sur Neon Postgres —
          jamais en clair. Session cookie HttpOnly.
        </p>
      </FadeIn>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen pb-16">
          <div className="ba-shell pt-6">
            <p className="ba-caption">Compte</p>
            <h1 className="ba-title mt-1 text-[1.85rem]">Chargement…</h1>
          </div>
        </main>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}
