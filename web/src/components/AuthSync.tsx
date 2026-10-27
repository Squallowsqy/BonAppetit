"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/lib/auth-store";

/** Keeps Zustand session + vault in sync with Auth.js secure cookie session. */
export function AuthSync() {
  const { data: session, status } = useSession();
  const setSession = useAuthStore((s) => s.setSession);
  const hydrateVault = useAuthStore((s) => s.hydrateVault);
  const sessionUserId = useAuthStore((s) => s.sessionUserId);
  const vaultHydrated = useAuthStore((s) => s.vaultHydrated);
  const lastId = useRef<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (status !== "authenticated" || !session?.user?.id) {
      if (sessionUserId) setSession(null);
      lastId.current = null;
      return;
    }

    const id = session.user.id;
    if (lastId.current !== id) {
      lastId.current = id;
      setSession({
        id,
        email: session.user.email || "",
        name: session.user.name || "",
      });
    }
  }, [status, session, sessionUserId, setSession]);

  useEffect(() => {
    if (sessionUserId && !vaultHydrated) {
      void hydrateVault();
    }
  }, [sessionUserId, vaultHydrated, hydrateVault]);

  return null;
}
