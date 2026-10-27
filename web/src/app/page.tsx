import Link from "next/link";
import { featuredRecipes, stores } from "@/lib/catalog-client";
import { formatEUR } from "@/lib/pricing";

export default function HomePage() {
  const highlights = featuredRecipes.slice(0, 6);

  return (
    <main>
      <header className="ba-shell flex items-center justify-between py-5">
        <p className="font-display text-2xl tracking-tight text-[var(--basil)]">
          BonAppétit<span className="text-[var(--saffron)]">!</span>
        </p>
        <Link href="/menu" className="text-sm font-semibold text-[var(--basil-deep)]">
          Mon menu
        </Link>
      </header>

      <section className="relative overflow-hidden border-y border-[var(--line)]">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(135deg, #1b5e3b 0%, #144a30 42%, #0f3d27 100%)",
          }}
        />
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(240,180,41,.35), transparent 28%), radial-gradient(circle at 80% 0%, rgba(255,255,255,.12), transparent 35%)",
          }}
        />
        <div className="ba-shell grid min-h-[78vh] items-end gap-10 py-14 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="rise text-white">
            <p className="font-display text-5xl leading-[0.92] tracking-tight md:text-7xl">
              BonAppétit
              <span className="text-[var(--saffron)]">!</span>
            </p>
            <h1 className="mt-5 max-w-xl text-2xl font-medium leading-snug text-white/92 md:text-3xl">
              Des bons dîners, calés sur ton magasin et ton budget.
            </h1>
            <p className="mt-4 max-w-md text-base text-white/75">
              Gratuit. Sans abonnement. Menu de la semaine + liste de courses en
              deux minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/quiz"
                className="ba-btn ba-btn-primary bg-[var(--saffron)] text-[var(--ink)] hover:bg-[#ffc84a]"
              >
                Créer mon menu
              </Link>
              <a href="#exemples" className="ba-btn ba-btn-ghost border-white/25 text-white">
                Voir des exemples
              </a>
            </div>
          </div>

          <div className="rise rise-delay-2 rounded-[2rem] border border-white/15 bg-white/10 p-5 text-white backdrop-blur-md">
            <p className="text-sm uppercase tracking-[0.18em] text-white/60">
              Semaine type · 2 pers.
            </p>
            <ul className="mt-4 space-y-3">
              {highlights.slice(0, 5).map((r, i) => (
                <li
                  key={r.id}
                  className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-3 last:border-0"
                >
                  <span className="text-sm text-white/55">
                    {["Lun", "Mar", "Mer", "Jeu", "Ven"][i]}
                  </span>
                  <span className="flex-1 text-sm font-medium">{r.title_fr}</span>
                  <span className="text-sm text-[var(--saffron)]">
                    {r.costBase != null ? formatEUR(r.costBase) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="ba-shell py-14">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--basil)]">
          Touche ton magasin
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {stores.map((s) => (
            <Link
              key={s.id}
              href="/quiz"
              className="ba-chip text-sm font-medium"
              style={{ borderColor: `${s.brandColor}55` }}
            >
              {s.name}
            </Link>
          ))}
        </div>
      </section>

      <section id="exemples" className="border-t border-[var(--line)] bg-[var(--mist)]/50 py-16">
        <div className="ba-shell">
          <h2 className="font-display text-3xl text-[var(--basil-deep)] md:text-4xl">
            Des plats à moins de 5&nbsp;€ / pers.
          </h2>
          <p className="mt-2 max-w-xl text-[var(--ink)]/70">
            Estimations sur prix de référence enseignes (±10%).
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((r) => (
              <article key={r.id} className="ba-card rounded-3xl p-5">
                <h3 className="text-lg font-semibold leading-snug">{r.title_fr}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-[var(--ink)]/65">
                  {r.description_fr}
                </p>
                <p className="mt-4 text-sm font-bold text-[var(--basil)]">
                  {r.costBase != null
                    ? `${formatEUR(r.costBase / (r.baseServings || 2))} / pers.`
                    : "Prix selon magasin"}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/quiz" className="ba-btn ba-btn-primary">
              Créer mon menu gratuitement
            </Link>
          </div>
        </div>
      </section>

      <footer className="ba-shell flex flex-col gap-2 py-10 text-sm text-[var(--ink)]/55 md:flex-row md:items-center md:justify-between">
        <p className="font-display text-lg text-[var(--basil)]">
          BonAppétit<span className="text-[var(--saffron)]">!</span>
        </p>
        <p>100% gratuit · France · estimations magasin ±10%</p>
      </footer>
    </main>
  );
}
