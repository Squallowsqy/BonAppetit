/** Codes WMO (Open-Meteo) → libellé FR court. */
export function weatherCodeLabel(code: number): string {
  if (code === 0) return "Ciel clair";
  if (code === 1) return "Peu nuageux";
  if (code === 2) return "Partiellement nuageux";
  if (code === 3) return "Couvert";
  if (code === 45 || code === 48) return "Brouillard";
  if (code >= 51 && code <= 57) return "Bruine";
  if (code >= 61 && code <= 67) return "Pluie";
  if (code >= 71 && code <= 77) return "Neige";
  if (code >= 80 && code <= 82) return "Averses";
  if (code === 85 || code === 86) return "Averses de neige";
  if (code === 95) return "Orage";
  if (code === 96 || code === 99) return "Orage grêleux";
  return "Variable";
}

export function weatherCodeIcon(code: number): string {
  if (code === 0 || code === 1) return "sun";
  if (code === 2 || code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 95) return "storm";
  if (code >= 51) return "rain";
  return "cloud";
}

export type WeatherDay = {
  date: string;
  weekday: string;
  code: number;
  label: string;
  icon: string;
  tMin: number;
  tMax: number;
  precipMm: number;
};

export type WeatherSummary = {
  place: string;
  tomorrow: WeatherDay & { tip: string };
  week: {
    summary: string;
    days: WeatherDay[];
  };
};

const WEEKDAY_FR = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"] as const;

function weekdayShort(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return WEEKDAY_FR[d.getDay()] || "";
}

function tipFor(day: { code: number; tMax: number; precipMm: number }): string {
  if (day.code >= 95) return "Orages : un plat réconfort à la maison.";
  if (day.precipMm >= 5 || (day.code >= 61 && day.code < 80))
    return "Temps mouillé : idéal pour un plat mijoté.";
  if (day.tMax >= 26) return "Chaleur : privilégie léger et frais.";
  if (day.tMax <= 8) return "Frais dehors : soupe ou gratin bienvenus.";
  if (day.code <= 1) return "Beau temps : parfait pour un repas simple.";
  return "Météo tranquille pour cuisiner sans stress.";
}

export function buildWeatherSummary(
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  },
  place: string,
  /** Index 0 = aujourd'hui dans la réponse Open-Meteo (timezone locale). */
  todayIndex = 0
): WeatherSummary {
  const days: WeatherDay[] = daily.time.map((date, i) => {
    const code = Number(daily.weather_code[i] ?? 0);
    return {
      date,
      weekday: weekdayShort(date),
      code,
      label: weatherCodeLabel(code),
      icon: weatherCodeIcon(code),
      tMin: Math.round(Number(daily.temperature_2m_min[i] ?? 0)),
      tMax: Math.round(Number(daily.temperature_2m_max[i] ?? 0)),
      precipMm: Math.round(Number(daily.precipitation_sum[i] ?? 0) * 10) / 10,
    };
  });

  const tomorrow = days[todayIndex + 1] || days[todayIndex] || days[0];
  const weekDays = days.slice(todayIndex, todayIndex + 7);

  const rainy = weekDays.filter((d) => d.precipMm >= 2 || d.code >= 61).length;
  const hot = weekDays.filter((d) => d.tMax >= 26).length;
  const cold = weekDays.filter((d) => d.tMax <= 8).length;
  const tMin = Math.min(...weekDays.map((d) => d.tMin));
  const tMax = Math.max(...weekDays.map((d) => d.tMax));

  let summary: string;
  if (rainy >= 3) summary = `Semaine arrosée (${rainy} jours) · ${tMin}–${tMax}°`;
  else if (hot >= 3) summary = `Semaine chaude · pics à ${tMax}°`;
  else if (cold >= 3) summary = `Semaine fraîche · ${tMin}–${tMax}°`;
  else if (rainy >= 1) {
    const rainyDay = weekDays.find((d) => d.precipMm >= 2 || d.code >= 61);
    summary = `Douce · averses ${rainyDay?.weekday || ""} · ${tMin}–${tMax}°`.replace(
      /\s+/g,
      " "
    ).trim();
  } else summary = `Semaine calme · ${tMin}–${tMax}°`;

  return {
    place,
    tomorrow: { ...tomorrow, tip: tipFor(tomorrow) },
    week: { summary, days: weekDays },
  };
}
