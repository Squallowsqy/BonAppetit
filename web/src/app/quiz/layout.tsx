import { Suspense } from "react";

/** `useSearchParams` côté quiz (reprise / restart) impose une frontière Suspense. */
export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="ba-shell flex min-h-screen items-center justify-center">
          <p className="ba-caption">Chargement…</p>
        </main>
      }
    >
      {children}
    </Suspense>
  );
}
