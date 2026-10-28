"use client";

import { useEffect, useState } from "react";
import type { WeatherSummary } from "@/lib/weather";

const COORDS_KEY = "ba-weather-coords";

type StoredCoords = { lat: number; lon: number; place?: string };

function readStored(): StoredCoords | null {
  try {
    const raw = localStorage.getItem(COORDS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as StoredCoords;
    if (typeof v.lat === "number" && typeof v.lon === "number") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function writeStored(c: StoredCoords) {
  try {
    localStorage.setItem(COORDS_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load(lat: number, lon: number, place?: string) {
      const q = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
      });
      if (place) q.set("place", place);
      try {
        const res = await fetch(`/api/weather?${q}`);
        if (!res.ok) return;
        const data = (await res.json()) as WeatherSummary;
        if (!cancelled) setWeather(data);
      } catch {
        /* silencieux */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const stored = readStored();
    const fallback = { lat: 48.8566, lon: 2.3522, place: "Paris" };

    if (stored) {
      void load(stored.lat, stored.lon, stored.place);
    } else {
      void load(fallback.lat, fallback.lon, fallback.place);
    }

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          };
          writeStored(c);
          void load(c.lat, c.lon);
        },
        () => {
          /* permission refusée → on garde Paris / stored */
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 6 * 3600 * 1000 }
      );
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return { weather, loading };
}
