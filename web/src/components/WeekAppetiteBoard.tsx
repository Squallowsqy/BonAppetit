import Link from "next/link";
import { RecipeImage } from "@/components/RecipeImage";
import { formatEUR } from "@/lib/pricing";
import type { Recipe } from "@/lib/types";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;
const DAYS_FULL = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;

type Props = {
  recipes: Recipe[];
  /** Compact rail for mobile (horizontal). */
  variant?: "rail" | "board";
  /** Ticket de caisse — signature homepage. */
  receipt?: boolean;
};

/** Planning photo jour par jour — ouvre l’appétit à côté du hero. */
export function WeekAppetiteBoard({
  recipes,
  variant = "board",
  receipt = false,
}: Props) {
  const days = recipes.slice(0, 7).map((recipe, i) => ({
    recipe,
    short: DAYS[i],
    full: DAYS_FULL[i],
  }));

  if (!days.length) return null;

  if (variant === "rail") {
    return (
      <div className="ba-week-rail" aria-label="Planning de la semaine">
        <p className="ba-caption mb-2 px-1 uppercase tracking-[0.04em]">
          Une semaine type
        </p>
        <ul className="ba-week-rail-track">
          {days.map(({ recipe, short, full }, i) => (
            <li key={recipe.id} className="ba-week-rail-item">
              <Link
                href={`/menu/recipes/${recipe.slug}`}
                className="ba-week-day-link"
                style={{ animationDelay: `${80 + i * 55}ms` }}
              >
                <div className="ba-week-day-photo">
                  <RecipeImage
                    src={recipe.image}
                    alt={recipe.title_fr}
                    sizes="160px"
                  />
                </div>
                <span className="ba-week-day-tag" aria-label={full}>
                  {short}
                </span>
                <span className="ba-week-day-title">{recipe.title_fr}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (receipt) {
    const total = days.reduce((sum, d) => {
      const c = d.recipe.costBase;
      if (c == null) return sum;
      return sum + c / (d.recipe.baseServings || 2);
    }, 0);

    return (
      <aside
        className="ba-receipt"
        aria-label="Planning de la semaine type"
      >
        <div className="ba-receipt-head">
          <p className="ba-receipt-store">SEMAINE TYPE</p>
          <p className="ba-receipt-meta">7 dîners · tarif / pers.</p>
        </div>
        <ul className="ba-receipt-lines">
          {days.map(({ recipe, short, full }, i) => {
            const unit =
              recipe.costBase != null
                ? recipe.costBase / (recipe.baseServings || 2)
                : null;
            return (
              <li key={recipe.id}>
                <Link
                  href={`/menu/recipes/${recipe.slug}`}
                  className="ba-receipt-line"
                  style={{ animationDelay: `${90 + i * 70}ms` }}
                >
                  <div className="ba-receipt-photo">
                    <RecipeImage
                      src={recipe.image}
                      alt={recipe.title_fr}
                      sizes="96px"
                    />
                  </div>
                  <div className="ba-receipt-body">
                    <span className="ba-receipt-day" aria-label={full}>
                      {short}
                    </span>
                    <span className="ba-receipt-title">{recipe.title_fr}</span>
                  </div>
                  <span className="ba-receipt-price">
                    {unit != null ? formatEUR(unit) : "—"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ba-receipt-foot">
          <span>TOTAL EST.</span>
          <span>{formatEUR(total)}</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="ba-week-board" aria-label="Planning de la semaine">
      <p className="ba-week-board-eyebrow">Planning · semaine type</p>
      <ul className="ba-week-board-list">
        {days.map(({ recipe, short, full }, i) => (
          <li key={recipe.id}>
            <Link
              href={`/menu/recipes/${recipe.slug}`}
              className="ba-week-board-row"
              style={{ animationDelay: `${80 + i * 55}ms` }}
            >
              <div className="ba-week-board-photo">
                <RecipeImage
                  src={recipe.image}
                  alt={recipe.title_fr}
                  sizes="220px"
                />
              </div>
              <div className="ba-week-board-meta">
                <span className="ba-week-board-day" aria-label={full}>
                  {short}
                </span>
                <span className="ba-week-board-title">{recipe.title_fr}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
