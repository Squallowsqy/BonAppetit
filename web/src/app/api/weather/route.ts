import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { buildWeatherSummary } from "@/lib/weather";

export const runtime = "nodejs";

const DEFAULT = { lat: 48.8566, lon: 2.3522, place: "Paris" };

type CacheEntry = { at: number; body: unknown };
const cache = new Map<string, CacheEntry>();
const CACHE_MS = 30 * 60 * 1000;

function clampCoord(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

async function reversePlace(lat: number, lon: number): Promise<string> {
  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    // Open-Meteo n'a pas de reverse officiel simple : on approxime via une
    // recherche autour des coordonnées n'est pas fiable. On garde le libellé
    // fourni côté client, sinon « près de chez toi ».
    void url;
    void lat;
    void lon;
    return "près de chez toi";
  } catch {
    return "près de chez toi";
  }
}

export async function GET(req: Request) {
  const limited = rateLimit({
    key: `weather:${clientIp(req)}`,
    limit: 40,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes météo" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const url = new URL(req.url);
  const lat =
    clampCoord(Number(url.searchParams.get("lat")), -90, 90) ?? DEFAULT.lat;
  const lon =
    clampCoord(Number(url.searchParams.get("lon")), -180, 180) ?? DEFAULT.lon;
  const placeParam = (url.searchParams.get("place") || "").trim().slice(0, 48);
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return NextResponse.json(hit.body, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
    });
  }

  const place =
    placeParam ||
    (Math.abs(lat - DEFAULT.lat) < 0.05 && Math.abs(lon - DEFAULT.lon) < 0.05
      ? DEFAULT.place
      : await reversePlace(lat, lon));

  const api = new URL("https://api.open-meteo.com/v1/forecast");
  api.searchParams.set("latitude", String(lat));
  api.searchParams.set("longitude", String(lon));
  api.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum"
  );
  api.searchParams.set("timezone", "auto");
  api.searchParams.set("forecast_days", "8");

  try {
    const res = await fetch(api.toString(), {
      next: { revalidate: 1800 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Météo indisponible" },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      daily?: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_sum: number[];
      };
    };
    if (!data.daily?.time?.length) {
      return NextResponse.json(
        { error: "Météo indisponible" },
        { status: 502 }
      );
    }

    const summary = buildWeatherSummary(data.daily, place, 0);
    cache.set(key, { at: Date.now(), body: summary });
    return NextResponse.json(summary, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Météo indisponible" }, { status: 502 });
  }
}
