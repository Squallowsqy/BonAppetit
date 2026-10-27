"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

export function useRequireAuth() {
  const router = useRouter();
  const sessionUserId = useAuthStore((s) => s.sessionUserId);

  function requireAuth(opts: {
    next: string;
    intent?: "save-basket" | "favorite" | "rate";
    recipeId?: string;
    mode?: "register" | "login";
  }) {
    if (sessionUserId) return true;
    const q = new URLSearchParams();
    q.set("next", opts.next);
    if (opts.intent) q.set("intent", opts.intent);
    if (opts.recipeId) q.set("recipeId", opts.recipeId);
    q.set("mode", opts.mode || "register");
    router.push(`/auth?${q.toString()}`);
    return false;
  }

  return { requireAuth, isLoggedIn: Boolean(sessionUserId) };
}
