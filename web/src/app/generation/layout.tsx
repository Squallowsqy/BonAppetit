import { Suspense } from "react";

export default function GenerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="ba-shell flex min-h-screen items-center justify-center">
          <p className="ba-caption">Préparation…</p>
        </main>
      }
    >
      {children}
    </Suspense>
  );
}
