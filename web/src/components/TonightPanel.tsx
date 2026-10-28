"use client";

import Link from "next/link";
import { useMemo } from "react";
import { RecipeImage } from "@/components/RecipeImage";
import { resolveTodayDinner } from "@/lib/today-dinner";
import { useActivePlan } from "@/lib/use-active-plan";
import { useWeather } from "@/lib/use-weather";
import type { WeatherSummary } from "@/lib/weather";

function WeatherStrip({
  weather,
  compact,
}: {
  weather: WeatherSummary | null;
  compact?: boolean;
}) {
  if (!weather) return null;
  const { tomorrow, week, place } = weather;
  if (compact) {
    return (
      <p className="ba-tonight-weather">
        <span className="ba-tonight-weather-place">{place}</span>
        {" · Demain "}
        <strong>
          {tomorrow.label.toLowerCase()} {tomorrow.tMin}–{tomorrow.tMax}°
        </strong>
        {" · "}
        {week.summary}
      </p>
    );
  }
  return (
    <div className="ba-tonight-weather-block">
      <p className="ba-tonight-weather">
        <span className="ba-tonight-weather-place">{place}</span>
        {" · Demain : "}
        <strong>
          {tomorrow.label} {tomorrow.tMin}–{tomorrow.tMax}°
        </strong>
        {tomorrow.precipMm >= 1 ? ` · ${tomorrow.precipMm} mm` : ""}
      </p>
      <p className="ba-tonight-weather-tip">{tomorrow.tip}</p>
      <p className="ba-tonight-weather-week">{week.summary}</p>
      <ul className="ba-tonight-week-days" aria-label="Prévisions de la semaine">
        {week.days.slice(0, 7).map((d) => (
          <li key={d.date} title={d.label}>
            <span className="ba-tonight-wd">{d.weekday}</span>
            <span
              className={`ba-tonight-dot ba-tonight-dot-${d.icon}`}
              aria-hidden
            />
            <span className="ba-tonight-wt">
              {d.tMin}/{d.tMax}°
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Bandeau compact pour /menu. */
export function TonightBanner() {
  const { plan, hydrated } = useActivePlan();
  const { weather } = useWeather();
  const today = useMemo(
    () => (hydrated ? resolveTodayDinner(plan) : null),
    [hydrated, plan]
  );

  if (!hydrated || !today || today.expired) return null;

  const focus = today.dinner || today.next;
  if (!focus) return null;

  const isTonight = Boolean(today.dinner);

  return (
    <section className="ba-tonight-banner" aria-label="À préparer">
      <Link
        href={`/menu/recipes/${focus.slug}`}
        className="ba-tonight-banner-link"
      >
        <div className="ba-tonight-banner-photo">
          <RecipeImage src={focus.image} alt="" />
        </div>
        <div className="ba-tonight-banner-copy">
          <p className="ba-tonight-kicker">
            {isTonight ? `Ce soir · ${today.label}` : `Prochain · ${today.label}`}
          </p>
          <p className="ba-tonight-banner-title">{focus.title_fr}</p>
          <WeatherStrip weather={weather} compact />
        </div>
      </Link>
    </section>
  );
}

export function useTonightHeroImage(): string | null {
  const { plan, hydrated } = useActivePlan();
  return useMemo(() => {
    if (!hydrated || !plan) return null;
    const today = resolveTodayDinner(plan);
    if (!today || today.expired) return null;
    return today.dinner?.image || today.next?.image || null;
  }, [hydrated, plan]);
}

export function HomeTonightCopy() {
  const { plan, source, hydrated } = useActivePlan();
  const { weather } = useWeather();
  const today = useMemo(
    () => (hydrated ? resolveTodayDinner(plan) : null),
    [hydrated, plan]
  );

  if (!hydrated || !plan || !today || today.expired) return null;

  const focus = today.dinner || today.next;
  const isTonight = Boolean(today.dinner);

  return (
    <div className="ba-home-hero-copy ba-home-tonight">
      <p className="ba-home-brand">
        BonAppétit<span>!</span>
      </p>
      <p className="ba-tonight-kicker ba-tonight-kicker-home">
        {isTonight
          ? `À préparer · ${today.label}`
          : focus
            ? "Pas de dîner prévu ce soir · prochain"
            : `Menu · ${today.label}`}
        {source === "draft" ? " · brouillon" : ""}
      </p>
      {focus ? (
        <>
          <h1 className="ba-home-h1 ba-tonight-title">{focus.title_fr}</h1>
          <p className="ba-home-lede">
            {focus.prepMin ? `${focus.prepMin} min` : "Recette prête"}
            {focus.cost != null
              ? ` · ~${focus.cost.toFixed(2).replace(".", ",")} €`
              : ""}
            {" · "}
            {isTonight ? "c’est le plat du jour" : "selon ton menu"}
          </p>
        </>
      ) : (
        <>
          <h1 className="ba-home-h1">Rien au programme ce soir</h1>
          <p className="ba-home-lede">
            Ton menu ne couvre pas {today.label.toLowerCase()}. Reprends le
            semainier ou crée un nouveau menu.
          </p>
        </>
      )}

      <WeatherStrip weather={weather} />

      <div className="ba-home-cta">
        {focus ? (
          <Link
            href={`/menu/recipes/${focus.slug}`}
            className="ba-home-btn-primary"
          >
            Voir la recette
          </Link>
        ) : null}
        <Link href="/menu" className="ba-home-btn-ghost">
          Mon menu
        </Link>
        <Link href="/quiz?restart=1" className="ba-home-btn-ghost">
          Nouveau menu
        </Link>
      </div>
    </div>
  );
}
