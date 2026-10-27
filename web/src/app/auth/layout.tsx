import { Suspense } from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<main className="ba-shell py-20 ba-caption">Chargement…</main>}>{children}</Suspense>;
}
