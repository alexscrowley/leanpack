import type { Climate, WeatherDay, WeatherSummary } from "./types";

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

function climateFromHighs(avgHigh: number): Climate {
  if (avgHigh >= 28) return "hot";
  if (avgHigh >= 22) return "warm";
  if (avgHigh >= 15) return "mild";
  if (avgHigh >= 8) return "cool";
  return "cold";
}

function weatherWord(code: number, needsRain: boolean): string {
  if (RAIN_CODES.has(code) || needsRain) return "rain in the mix";
  if (code === 45 || code === 48) return "foggy stretches";
  if (code >= 71 && code <= 77) return "snow possible";
  if (code >= 1 && code <= 3) return "partly cloudy";
  return "mostly clear";
}

export function summarizeWeather(input: {
  placeName: string;
  country?: string;
  latitude: number;
  longitude: number;
  days: WeatherDay[];
  isProxy: boolean;
}): WeatherSummary {
  const { days } = input;
  const avgHigh = days.length ? Math.round(days.reduce((s, d) => s + d.tMax, 0) / days.length) : 18;
  const avgLow = days.length ? Math.round(days.reduce((s, d) => s + d.tMin, 0) / days.length) : 12;
  const maxPrecip = days.length ? Math.max(...days.map((d) => d.precipProb)) : 0;
  const wettest = days.reduce((best, d) => (d.precipProb > best.precipProb ? d : best), days[0] ?? {
    date: "",
    tMax: avgHigh,
    tMin: avgLow,
    precipProb: 0,
    weatherCode: 0,
  });
  const climate = climateFromHighs(avgHigh);
  const needsRain = days.some((d) => d.precipProb >= 45 || RAIN_CODES.has(d.weatherCode));
  const sky = weatherWord(wettest?.weatherCode ?? 0, needsRain);

  const summary = `${avgLow}–${avgHigh}°, ${sky}.`;

  return {
    ...input,
    avgHigh,
    avgLow,
    maxPrecip,
    climate,
    needsRain,
    summary,
  };
}

export function mildFallback(placeName: string): WeatherSummary {
  return summarizeWeather({
    placeName,
    latitude: 0,
    longitude: 0,
    days: [],
    isProxy: true,
  });
}

export async function fetchWeather(params: {
  query: string;
  startDate?: string;
  endDate?: string;
}): Promise<WeatherSummary> {
  const search = new URLSearchParams();
  search.set("q", params.query);
  if (params.startDate) search.set("start", params.startDate);
  if (params.endDate) search.set("end", params.endDate);

  const res = await fetch(`/api/weather?${search.toString()}`);
  if (!res.ok) {
    throw new Error("Weather request failed");
  }
  return (await res.json()) as WeatherSummary;
}
