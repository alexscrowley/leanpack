import { ACTIVITIES, type Activity, type LaundryAccess, type TripDraft } from "./types";
import { extractDates } from "./dates";

const CITY_ALIASES: Record<string, string> = {
  nyc: "New York",
  "new york city": "New York",
  la: "Los Angeles",
  "l.a.": "Los Angeles",
  sf: "San Francisco",
  "s.f.": "San Francisco",
  dc: "Washington",
  "d.c.": "Washington",
};

const STOP_WORDS = new Set([
  "yes",
  "yeah",
  "yep",
  "no",
  "nope",
  "ok",
  "okay",
  "please",
  "thanks",
  "thank",
  "laundry",
  "washer",
  "washing",
  "machine",
  "hiking",
  "running",
  "swimming",
  "just",
  "nothing",
  "none",
  "hi",
  "hello",
  "hey",
  "packed",
  "check",
  "uncheck",
  "left",
  "what",
  "whats",
]);

const COMMENTARY_WORDS = new Set([
  "you",
  "your",
  "youre",
  "not",
  "very",
  "smart",
  "dumb",
  "stupid",
  "idiot",
  "this",
  "that",
  "these",
  "those",
  "is",
  "are",
  "am",
  "was",
  "were",
  "be",
  "been",
  "being",
  "my",
  "me",
  "we",
  "they",
  "them",
  "their",
  "it",
  "its",
  "so",
  "too",
  "really",
  "why",
  "how",
  "who",
  "whom",
  "because",
  "but",
  "if",
  "then",
  "than",
  "can",
  "cannot",
  "cant",
  "dont",
  "wont",
  "isnt",
  "arent",
  "im",
  "ive",
  "a",
  "an",
]);

const PLACE_PARTICLES = new Set([
  "de",
  "del",
  "des",
  "di",
  "da",
  "do",
  "dos",
  "das",
  "van",
  "von",
  "san",
  "santa",
  "santo",
  "sao",
  "los",
  "las",
  "la",
  "le",
  "el",
  "st",
  "ste",
  "saint",
  "the",
]);

const CONTRACTION = /^(?:i|you|we|they|it|that|what|who|can|do|wo|is|are|i)(?:'|’)(?:m|re|ve|ll|d|t|s)$/i;

const ACTIVITY_PATTERNS: { activity: Activity; pattern: RegExp }[] = [
  { activity: "hiking", pattern: /\b(hik(?:e|ing)|trail|trekk(?:ing)?|backpacking)\b/i },
  { activity: "running", pattern: /\b(run(?:ning)?|jog(?:ging)?|5k|marathon)\b/i },
  { activity: "swimming", pattern: /\b(swim(?:ming)?|pool|snorkel(?:ing)?)\b/i },
  { activity: "beach", pattern: /\b(beach|sunbath|ocean swim|seaside)\b/i },
  { activity: "formal", pattern: /\b(formal|wedding|nice dinner|black tie|dressy|gala)\b/i },
  { activity: "work", pattern: /\b(work|meeting(?:s)?|conference|client|office|business)\b/i },
  { activity: "cycling", pattern: /\b(cycl(?:e|ing)|bik(?:e|ing)|spin)\b/i },
  { activity: "skiing", pattern: /\b(ski(?:ing)?|snowboard(?:ing)?)\b/i },
  { activity: "gym", pattern: /\b(gym|workout|weights|training)\b/i },
  { activity: "camping", pattern: /\b(camp(?:ing)?|tent)\b/i },
];

const NO_ACTIVITY = /\b(nothing special|no activities|just (?:walking|wandering|sightseeing|the city|relaxing)|only sightseeing|city break|no plans)\b/i;

const YES_LAUNDRY =
  /\b(yes|yeah|yep|i will|i'll have|there is|there'?s|hotel laundry|washing machine|washer|i can wash|we can wash|laundry (?:access|on site|at the hotel|available))\b/i;
const NO_LAUNDRY =
  /\b(no laundry|no washer|no washing|can'?t wash|cannot wash|no (?:washing )?machine|won'?t have laundry|without laundry)\b/i;
const LAUNDRY_MENTION = /\b(laundry|washer|washing machine|laundromat|wash clothes)\b/i;

export function extractActivities(text: string): { activities: Activity[]; settled: boolean } {
  if (NO_ACTIVITY.test(text)) return { activities: [], settled: true };
  const found = ACTIVITY_PATTERNS.filter((row) => row.pattern.test(text)).map((row) => row.activity);
  const unique = ACTIVITIES.filter((a) => found.includes(a));
  return { activities: unique, settled: unique.length > 0 };
}

export function extractLaundry(text: string): LaundryAccess | undefined {
  const lower = text.toLowerCase().trim();
  if (NO_LAUNDRY.test(lower)) return "no";
  if (LAUNDRY_MENTION.test(lower) && YES_LAUNDRY.test(lower)) return "yes";
  if (/^(yes|yeah|yep|i will|i'll|we will|there is|there'?s one)\b/.test(lower) && lower.length < 40) {
    return "yes";
  }
  if (/^(no|nope|not really|we won't|i won't)\b/.test(lower) && lower.length < 40) {
    return "no";
  }
  if (/\bno\b/.test(lower) && LAUNDRY_MENTION.test(lower)) return "no";
  if (/\byes\b/.test(lower) && LAUNDRY_MENTION.test(lower)) return "yes";
  return undefined;
}

export function extractMeds(text: string): boolean {
  return /\b(meds|medication|medicine|prescription|pills|inhaler)\b/i.test(text);
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => (part.length <= 2 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, "").replace(/['’]/g, "");
}

function looksLikeCommentary(words: string[]): boolean {
  return words.some((word) => {
    if (CONTRACTION.test(word)) return true;
    const folded = normalizeWord(word);
    if (!folded) return false;
    if (PLACE_PARTICLES.has(folded)) return false;
    return STOP_WORDS.has(folded) || COMMENTARY_WORDS.has(folded);
  });
}

function cleanDestination(raw: string, opts: { maxTokens?: number } = {}): string | undefined {
  const trimmed = raw
    .replace(/^[\s,.:;!?-]+/, "")
    .replace(/[\s,.:;!?]+$/, "")
    .replace(/\b(please|today|tomorrow)\b/gi, "")
    .trim();
  if (trimmed.length < 2 || trimmed.length > 48) return undefined;
  const alias = CITY_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (opts.maxTokens && words.length > opts.maxTokens) return undefined;
  if (looksLikeCommentary(words)) return undefined;
  if (!/[a-zA-Z]/.test(trimmed)) return undefined;
  return titleCase(trimmed);
}

export function extractDestination(text: string): string | undefined {
  const aliased = Object.entries(CITY_ALIASES).find(([key]) => new RegExp(`\\b${key.replace(".", "\\.")}\\b`, "i").test(text));
  if (aliased) return aliased[1];

  const patterned = text.match(
    /\b(?:going to|headed to|flying to|fly to|visit(?:ing)?|trip to|off to|in)\s+([a-zA-Z][a-zA-Z .'-]{1,40}?)(?=\s+(?:for|from|on|next|this|in \d|with|and|,|\.|$)|$)/i,
  );
  if (patterned) {
    const cleaned = cleanDestination(patterned[1]);
    if (cleaned) return cleaned;
  }

  const cityFor = text.match(
    /\b([a-zA-Z][a-zA-Z .'-]{1,32}?)\s+for\s+(?:a |one |two |three |four |five |six |seven |eight |nine |ten |twelve |\d+)/i,
  );
  if (cityFor) {
    const cleaned = cleanDestination(cityFor[1].replace(/^(?:i(?:'| a)?m going to|heading to|flying to)\s+/i, ""));
    if (cleaned) return cleaned;
  }

  const cityNext = text.match(
    /\b([a-zA-Z][a-zA-Z .'-]{1,32}?)\s+(?:next week|this weekend|from\s+\d)/i,
  );
  if (cityNext) {
    const cleaned = cleanDestination(cityNext[1]);
    if (cleaned) return cleaned;
  }

  const compact = text.trim();
  const compactWords = compact.split(/\s+/).filter(Boolean);
  if (
    compactWords.length <= 3 &&
    !/\d/.test(compact) &&
    !extractActivities(compact).settled
  ) {
    return cleanDestination(compact, { maxTokens: 3 });
  }
  return undefined;
}

export function mergeDraft(draft: TripDraft, text: string): TripDraft {
  const next: TripDraft = {
    ...draft,
    activities: [...draft.activities],
  };

  const destination = extractDestination(text);
  if (destination) next.destination = destination;

  const dates = extractDates(text);
  if (dates.nights) next.nights = dates.nights;
  if (dates.startDate) next.startDate = dates.startDate;
  if (dates.endDate) next.endDate = dates.endDate;

  const { activities, settled } = extractActivities(text);
  if (activities.length) {
    next.activities = Array.from(new Set([...next.activities, ...activities]));
    next.activitiesSettled = true;
  } else if (settled) {
    next.activitiesSettled = true;
  }

  const laundry = extractLaundry(text);
  if (laundry) next.laundry = laundry;

  if (extractMeds(text)) next.mentionedMeds = true;

  return next;
}

export function missingSlots(draft: TripDraft): Array<"destination" | "nights" | "activities" | "laundry"> {
  const missing: Array<"destination" | "nights" | "activities" | "laundry"> = [];
  if (!draft.destination) missing.push("destination");
  if (!draft.nights) missing.push("nights");
  if (!draft.activitiesSettled) missing.push("activities");
  if (draft.laundry === "unknown") missing.push("laundry");
  return missing;
}
