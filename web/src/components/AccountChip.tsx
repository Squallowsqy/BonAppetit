"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";

export function AccountChip() {
  const sessionUserId = useAuthStore((s) => s.sessionUserId);
  const name = useAuthStore((s) => s.sessionUser?.name || null);

  if (sessionUserId) {
    return (
      <Link href="/menu/settings" className="ba-btn ba-btn-plain text-[0.95rem]">
        {name || "Compte"}
      </Link>
    );
  }
  return (
    <Link href="/auth?mode=register&next=/menu" className="ba-btn ba-btn-plain text-[0.95rem]">
      S’enregistrer
    </Link>
  );
}
