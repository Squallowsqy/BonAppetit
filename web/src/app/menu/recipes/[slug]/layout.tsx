import { Suspense } from "react";

/** `useSearchParams` (from=reveal) impose une frontière Suspense. */
export default function RecipeSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<section className="ba-caption py-8">Chargement…</section>}>
      {children}
    </Suspense>
  );
}
