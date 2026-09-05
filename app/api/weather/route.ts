import { NextResponse } from "next/server";
import { addDays, defaultWindow, isoDate } from "@/lib/dates";
import type { WeatherDay } from "@/lib/types";
import { summarizeWeather } from "@/lib/weather";

export const runtime = "nodejs";

interface GeocodeHit {
  name: string;
  country?: string;
  latitude: number;
  longitude: number;
  admin1?: string;
}

interface ForecastDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max?: number[];
  weather_code?: number[];
  weathercode?: number[];
}

function forecastHorizon(): string {
  return addDays(isoDate(new Date()), 15);
}

function clampRange(start?: string, end?: string): { start: string; end: string; isProxy: boolean } {
  const today = isoDate(new Date());
  const horizon = forecastHorizon();
  if (!start || !end) {
    const win = defaultWindow(5);
    return { start: win.startDate, end: win.endDate, isProxy: true };
  }
  if (start > horizon) {
    const nights = Math.min(7, Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) || 5));
    return { start: today, end: addDays(today, nights), isProxy: true };
  }
  const safeEnd = end > horizon ? horizon : end;
  const safeStart = start < today ? today : start;
  if (safeStart > safeEnd) {
    return { start: today, end: addDays(today, 5), isProxy: true };
  }
  return { start: safeStart, end: safeEnd, isProxy: start !== safeStart || end !== safeEnd };
}

function daysFromDaily(daily: ForecastDaily): WeatherDay[] {
  const codes = daily.weather_code ?? daily.weathercode ?? [];
  return daily.time.map((date, i) => ({
    date,
    tMax: daily.temperature_2m_max[i] ?? 18,
    tMin: daily.temperature_2m_min[i] ?? 12,
    precipProb: daily.precipitation_probability_max?.[i] ?? 0,
    weatherCode: codes[i] ?? 0,
  }));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) {
    return NextResponse.json({ error: "Missing place" }, { status: 400 });
  }

  const range = clampRange(url.searchParams.get("start") ?? undefined, url.searchParams.get("end") ?? undefined);

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`,
      { next: { revalidate: 86400 } },
    );
    if (!geoRes.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }
    const geo = (await geoRes.json()) as { results?: GeocodeHit[] };
    const hit = geo.results?.[0];
    if (!hit) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", String(hit.latitude));
    forecastUrl.searchParams.set("longitude", String(hit.longitude));
    forecastUrl.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    );
    forecastUrl.searchParams.set("timezone", "auto");
    forecastUrl.searchParams.set("start_date", range.start);
    forecastUrl.searchParams.set("end_date", range.end);

    const wxRes = await fetch(forecastUrl, { next: { revalidate: 1800 } });
    if (!wxRes.ok) {
      return NextResponse.json({ error: "Forecast failed" }, { status: 502 });
    }
    const wx = (await wxRes.json()) as { daily?: ForecastDaily };
    if (!wx.daily?.time?.length) {
      return NextResponse.json({ error: "No forecast" }, { status: 502 });
    }

    const summary = summarizeWeather({
      placeName: hit.name,
      country: hit.country,
      latitude: hit.latitude,
      longitude: hit.longitude,
      days: daysFromDaily(wx.daily),
      isProxy: range.isProxy,
    });

    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: "Weather unavailable" }, { status: 502 });
  }
}
