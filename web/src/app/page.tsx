import Link from "next/link";
import { HomeHero } from "@/components/HomeHero";
import { RecipeImage } from "@/components/RecipeImage";
import { SiteFooter } from "@/components/SiteFooter";
import { featuredRecipes, stores } from "@/lib/catalog-client";
import { formatEUR } from "@/lib/pricing";

export default function HomePage() {
  const weekPlan = featuredRecipes.filter((r) => r.image).slice(0, 7);
  const weekFallback =
    weekPlan.length >= 5 ? weekPlan : featuredRecipes.slice(0, 7);

  return (
    <main className="ba-home">
      <header className="ba-home-nav">
        <Link href="/" className="ba-home-nav-brand">
          BonAppétit<span>!</span>
        </Link>
        <div className="ba-home-nav-actions">
          <Link href="/menu" className="ba-home-nav-link">
            Mon menu
          </Link>
          <Link href="/auth?mode=login&next=/menu" className="ba-home-nav-link">
            Connexion
          </Link>
        </div>
      </header>

      <HomeHero weekRecipes={weekFallback} />

      <section className="ba-home-stores" aria-label="Enseignes">
        <p className="ba-home-kicker">Prix calés sur ton enseigne</p>
        <ul className="ba-home-store-list">
          {stores.map((s) => (
            <li key={s.id}>
              <Link href="/quiz">{s.name}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="exemples" className="ba-home-examples">
        <div className="ba-home-examples-head">
          <h2 className="ba-home-h2">À moins de 5&nbsp;€ / pers.</h2>
          <p className="ba-home-lede ba-home-lede-tight">
            Exemples au tarif enseigne — pas des vitrines marketing.
          </p>
        </div>
        <ul className="ba-home-example-list">
          {featuredRecipes.slice(0, 6).map((r, i) => (
            <li key={r.id} style={{ animationDelay: `${120 + i * 60}ms` }}>
              <Link href={`/menu/recipes/${r.slug}`} className="ba-home-example-row">
                <div className="ba-home-example-photo">
                  <RecipeImage src={r.image} alt={r.title_fr} />
                </div>
                <div className="ba-home-example-meta">
                  <p className="ba-home-example-title">{r.title_fr}</p>
                  <p className="ba-home-example-price">
                    {r.costBase != null
                      ? `${formatEUR(r.costBase / (r.baseServings || 2))} / pers.`
                      : "Selon magasin"}
                    {r.steps_fr?.length ? ` · ${r.steps_fr.length} étapes` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <div className="ba-home-examples-foot">
          <Link href="/quiz" className="ba-home-btn-primary">
            Créer mon menu
          </Link>
          <Link href="/auth?mode=register&next=/menu" className="ba-home-btn-ghost">
            Créer un compte
          </Link>
        </div>
      </section>

      <div className="ba-home-footer-wrap">
        <SiteFooter wide />
      </div>
    </main>
  );
}
