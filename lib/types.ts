export const ACTIVITIES = [
  "hiking",
  "running",
  "swimming",
  "beach",
  "formal",
  "work",
  "cycling",
  "skiing",
  "gym",
  "camping",
] as const;

export type Activity = (typeof ACTIVITIES)[number];

export type PackCategory = "clothes" | "toiletries" | "tech" | "docs" | "activity";

export type LaundryAccess = "yes" | "no" | "unknown";

export type Climate = "hot" | "warm" | "mild" | "cool" | "cold";

export type ConversationPhase = "welcome" | "collecting" | "ready";

export interface TripDraft {
  destination?: string;
  startDate?: string;
  endDate?: string;
  nights?: number;
  activities: Activity[];
  laundry: LaundryAccess;
  mentionedMeds: boolean;
  activitiesSettled: boolean;
}

export interface WeatherDay {
  date: string;
  tMax: number;
  tMin: number;
  precipProb: number;
  weatherCode: number;
}

export interface WeatherSummary {
  placeName: string;
  country?: string;
  latitude: number;
  longitude: number;
  days: WeatherDay[];
  avgHigh: number;
  avgLow: number;
  maxPrecip: number;
  climate: Climate;
  needsRain: boolean;
  isProxy: boolean;
  summary: string;
}

export interface PackItem {
  id: string;
  label: string;
  aliases: string[];
  quantity: number;
  category: PackCategory;
  packed: boolean;
  reason: string;
}

export interface Trip {
  destination: string;
  placeLabel: string;
  startDate?: string;
  endDate?: string;
  nights: number;
  activities: Activity[];
  laundry: boolean;
  mentionedMeds: boolean;
  weather: WeatherSummary;
  items: PackItem[];
  createdAt: string;
}

export interface Exchange {
  role: "user" | "assistant";
  text: string;
  at: number;
}

export interface AppState {
  phase: ConversationPhase;
  draft: TripDraft;
  trip: Trip | null;
  exchanges: Exchange[];
}

export interface TurnResult {
  draft: TripDraft;
  reply: string;
  readyToPack: boolean;
}

export const CATEGORY_LABELS: Record<PackCategory, string> = {
  clothes: "Clothes",
  toiletries: "Toiletries",
  tech: "Tech",
  docs: "Docs",
  activity: "Activity",
};

export const ACTIVITY_LABELS: Record<Activity, string> = {
  hiking: "hike",
  running: "run",
  swimming: "swim",
  beach: "beach",
  formal: "something nicer",
  work: "work",
  cycling: "ride",
  skiing: "ski",
  gym: "gym",
  camping: "camp",
};

export function emptyDraft(): TripDraft {
  return {
    activities: [],
    laundry: "unknown",
    mentionedMeds: false,
    activitiesSettled: false,
  };
}

export function emptyState(): AppState {
  return {
    phase: "welcome",
    draft: emptyDraft(),
    trip: null,
    exchanges: [],
  };
}
