const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function nightsBetween(start: string, end: string): number {
  const a = parseIso(start).getTime();
  const b = parseIso(end).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

export function formatRange(start?: string, end?: string, nights?: number): string {
  if (start && end) {
    const a = parseIso(start);
    const b = parseIso(end);
    const sameMonth = a.getMonth() === b.getMonth();
    const left = a.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const right = b.toLocaleDateString("en-US", {
      month: sameMonth ? undefined : "short",
      day: "numeric",
    });
    return `${left}–${right}`;
  }
  if (typeof nights === "number") {
    return nights === 1 ? "1 night" : `${nights} nights`;
  }
  return "";
}

function nextWeekday(from: Date, weekday: number): Date {
  const d = new Date(from);
  const delta = (weekday - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d;
}

function parseMonthDay(raw: string, now: Date): string | undefined {
  const monthDay = raw.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
  );
  if (monthDay) {
    const month = MONTHS[monthDay[1].toLowerCase()];
    const day = Number(monthDay[2]);
    const year = now.getFullYear();
    let date = new Date(year, month, day);
    if (date.getTime() < now.getTime() - 86_400_000) {
      date = new Date(year + 1, month, day);
    }
    return isoDate(date);
  }

  const dayMonth = raw.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
  );
  if (dayMonth) {
    const month = MONTHS[dayMonth[2].toLowerCase()];
    const day = Number(dayMonth[1]);
    const year = now.getFullYear();
    let date = new Date(year, month, day);
    if (date.getTime() < now.getTime() - 86_400_000) {
      date = new Date(year + 1, month, day);
    }
    return isoDate(date);
  }

  const iso = raw.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  return undefined;
}

export function extractDates(text: string, now = new Date()): {
  nights?: number;
  startDate?: string;
  endDate?: string;
} {
  const lower = text.toLowerCase();

  const weekMatch = lower.match(/\b(\d+|a|one|two|three)\s+weeks?\b/);
  if (weekMatch) {
    const map: Record<string, number> = { a: 1, one: 1, two: 2, three: 3 };
    const n = map[weekMatch[1]] ?? Number(weekMatch[1]);
    if (Number.isFinite(n) && n > 0) return { nights: n * 7 };
  }

  if (/\b(?:a |one )?weekend\b/.test(lower) || /\bthis weekend\b/.test(lower)) {
    const start = isoDate(nextWeekday(now, 5));
    return { nights: 2, startDate: start, endDate: addDays(start, 2) };
  }

  if (/\bnext week\b/.test(lower)) {
    const start = isoDate(nextWeekday(now, 1));
    return { nights: 6, startDate: start, endDate: addDays(start, 6) };
  }

  if (/\ba week\b/.test(lower) || /\bone week\b/.test(lower)) {
    return { nights: 7 };
  }

  const words: Record<string, number> = {
    a: 1,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    twelve: 12,
  };

  const dayMatch = lower.match(/\b(\d+|a|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+(?:days?|nights?)\b/);
  if (dayMatch) {
    const n = words[dayMatch[1]] ?? Number(dayMatch[1]);
    if (Number.isFinite(n) && n > 0) return { nights: n };
  }

  const bare = lower.trim();
  if (/^\d{1,2}$/.test(bare)) {
    const n = Number(bare);
    if (n >= 1 && n <= 60) return { nights: n };
  }
  if (words[bare]) return { nights: words[bare] };

  const range = text.match(
    /\b(?:from\s+)?((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)|20\d{2}-\d{2}-\d{2})\s+(?:to|through|until|–|-|—)\s+((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)|20\d{2}-\d{2}-\d{2})\b/i,
  );
  if (range) {
    const startDate = parseMonthDay(range[1], now);
    const endDate = parseMonthDay(range[2], now);
    if (startDate && endDate) {
      return { startDate, endDate, nights: nightsBetween(startDate, endDate) };
    }
  }

  return {};
}

export function defaultWindow(nights: number, now = new Date()): {
  startDate: string;
  endDate: string;
} {
  const startDate = isoDate(now);
  return { startDate, endDate: addDays(startDate, nights) };
}
