import Link from "next/link";
import { RecipeImage } from "@/components/RecipeImage";
import { SiteFooter } from "@/components/SiteFooter";
import { TopBar } from "@/components/TopBar";
import { WeekAppetiteBoard } from "@/components/WeekAppetiteBoard";
import { featuredRecipes, stores } from "@/lib/catalog-client";
import { formatEUR } from "@/lib/pricing";

export default function HomePage() {
  const weekPlan = featuredRecipes.filter((r) => r.image).slice(0, 7);
  const weekFallback =
    weekPlan.length >= 5 ? weekPlan : featuredRecipes.slice(0, 7);

  return (
    <main className="min-h-screen pb-16">
      <TopBar
        wide
        trailing={
          <Link href="/menu" className="ba-btn ba-btn-plain text-[0.95rem]">
            Mon menu
          </Link>
        }
      />

      {/* Hero split — brand left, week photos right */}
      <section className="ba-shell-wide ba-home-hero ba-fade-up pt-6 pb-10 md:pt-10 md:pb-14">
        <div className="ba-home-hero-copy">
          <p className="ba-display text-[clamp(3rem,8vw,5.25rem)] text-[var(--basil)]">
            BonAppétit
            <span className="text-[var(--saffron)]">!</span>
          </p>
          <h1 className="ba-title mt-4 max-w-[22ch] text-[1.5rem] text-[var(--label)] md:text-[1.75rem]">
            Des dîners calés sur ton magasin et ton budget.
          </h1>
          <p className="ba-body mt-3 max-w-[34ch]">
            Gratuit. Sans abonnement. Menu + liste de courses en deux minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/quiz" className="ba-btn ba-btn-primary min-w-[11rem]">
              Créer mon menu
            </Link>
            <a href="#exemples" className="ba-btn ba-btn-tinted min-w-[9rem]">
              Exemples
            </a>
          </div>
        </div>

        <div className="ba-home-hero-side">
          <WeekAppetiteBoard recipes={weekFallback} variant="board" />
        </div>
      </section>

      {/* Mobile week rail (board is desktop-only) */}
      <section className="ba-shell-wide ba-home-week-mobile pb-10">
        <WeekAppetiteBoard recipes={weekFallback} variant="rail" />
      </section>

      {/* Stores */}
      <section className="ba-shell-wide pb-12">
        <p className="ba-caption mb-3 px-1 uppercase tracking-[0.04em]">
          Ton magasin
        </p>
        <div className="flex flex-wrap gap-2">
          {stores.map((s) => (
            <Link key={s.id} href="/quiz" className="ba-chip">
              {s.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Examples */}
      <section id="exemples" className="ba-shell-wide pb-16">
        <h2 className="ba-title text-[1.75rem]">À moins de 5&nbsp;€ / pers.</h2>
        <p className="ba-body mt-1">Prix de référence enseignes.</p>
        <ul className="mt-5 ba-grouped">
          {featuredRecipes.slice(0, 6).map((r) => (
            <li key={r.id} className="overflow-hidden !p-0">
              <div className="ba-recipe-card-media">
                <RecipeImage src={r.image} alt={r.title_fr} />
              </div>
              <div className="flex flex-col items-start gap-1 px-4 py-3.5">
                <p className="ba-headline">{r.title_fr}</p>
                <p className="ba-caption line-clamp-2">{r.description_fr}</p>
                <p className="pt-1 text-[0.95rem] font-semibold text-[var(--basil)]">
                  {r.costBase != null
                    ? `${formatEUR(r.costBase / (r.baseServings || 2))} / pers.`
                    : "Selon magasin"}
                  {r.steps_fr && r.steps_fr.length > 0
                    ? ` · ${r.steps_fr.length} étapes`
                    : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/quiz" className="ba-btn ba-btn-primary">
            Créer mon menu gratuitement
          </Link>
          <Link href="/auth?mode=register&next=/menu" className="ba-btn ba-btn-tinted">
            S’enregistrer
          </Link>
        </div>
      </section>

      <SiteFooter wide />
    </main>
  );
}
