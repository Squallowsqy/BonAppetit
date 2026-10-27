"use client";

import { SessionProvider } from "next-auth/react";
import { AuthSync } from "@/components/AuthSync";

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus>
      <AuthSync />
      {children}
    </SessionProvider>
  );
}
