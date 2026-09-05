import { OVERPACK_PUSHBACK } from "./packing-engine";
import type { PackItem, Trip } from "./types";

export type CommandResult =
  | { kind: "check"; item: PackItem; packed: boolean; speech: string }
  | { kind: "left"; remaining: PackItem[]; speech: string }
  | { kind: "weather"; speech: string }
  | { kind: "count"; speech: string }
  | { kind: "reset"; speech: string }
  | { kind: "pushback"; speech: string }
  | { kind: "unknown"; speech: string };

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchItem(query: string, items: PackItem[]): PackItem | undefined {
  const q = normalize(query);
  if (!q) return undefined;

  const scored = items
    .map((item) => {
      const haystacks = [item.label, ...item.aliases, item.id.split(".")[1] ?? ""].map(normalize);
      let score = 0;
      for (const hay of haystacks) {
        if (!hay) continue;
        if (hay === q) score = Math.max(score, 100);
        else if (hay.includes(q) || q.includes(hay)) score = Math.max(score, 80 - Math.abs(hay.length - q.length));
        else if (hay.split(" ").some((w) => w === q || q.split(" ").includes(w))) score = Math.max(score, 40);
      }
      return { item, score };
    })
    .filter((row) => row.score >= 40)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.item;
}

function leftoverSpeech(remaining: PackItem[]): string {
  if (!remaining.length) return "You’re done. Everything is packed.";
  if (remaining.length === 1) return `Just ${remaining[0].label.toLowerCase()} left.`;
  if (remaining.length <= 4) {
    const labels = remaining.map((i) => i.label.toLowerCase());
    const last = labels.pop();
    return `Still open: ${labels.join(", ")}, and ${last}.`;
  }
  return `${remaining.length} things left. Start at the top — clothes first.`;
}

export function interpretCommand(text: string, trip: Trip | null): CommandResult | undefined {
  const raw = text.trim();
  const lower = raw.toLowerCase();

  if (/\b(start over|new trip|reset|forget this|scratch that)\b/.test(lower)) {
    return { kind: "reset", speech: "Wiped. Where to next?" };
  }

  if (!trip) return undefined;

  if (/\b(what'?s left|what is left|remaining|not packed|still (?:to )?pack|what do i have left)\b/.test(lower)) {
    const remaining = trip.items.filter((i) => !i.packed);
    return { kind: "left", remaining, speech: leftoverSpeech(remaining) };
  }

  if (/\b(how'?s the weather|what'?s the weather|weather)\b/.test(lower) && !/\bpacked\b/.test(lower)) {
    return { kind: "weather", speech: trip.weather.summary };
  }

  if (/\b(how many|what'?s on the list|count)\b/.test(lower)) {
    const left = trip.items.filter((i) => !i.packed).length;
    return {
      kind: "count",
      speech: `${trip.items.length} on the list. ${left} still open.`,
    };
  }

  for (const row of OVERPACK_PUSHBACK) {
    if (row.pattern.test(raw) && /\b(add|bring|pack|need|should i)\b/i.test(raw)) {
      return { kind: "pushback", speech: row.reply };
    }
  }

  const checkMatch = raw.match(
    /^(?:please )?(?:check(?:\s+off)?|packed|i packed|pack(?:ed)?|tick|mark)\s+(?:the |my |our )?(.+?)$/i,
  );
  const uncheckMatch = raw.match(
    /^(?:please )?(?:uncheck|unpack|not packed|undo)\s+(?:the |my |our )?(.+?)$/i,
  );

  if (uncheckMatch?.[1]) {
    const item = matchItem(uncheckMatch[1], trip.items);
    if (item) {
      return {
        kind: "check",
        item,
        packed: false,
        speech: `${item.label} is back on the list.`,
      };
    }
  }

  if (checkMatch?.[1]) {
    const item = matchItem(checkMatch[1], trip.items);
    if (item) {
      return {
        kind: "check",
        item,
        packed: true,
        speech: item.packed ? `${item.label} was already packed.` : `Checked off ${item.label.toLowerCase()}.`,
      };
    }
    return { kind: "unknown", speech: `I don’t have ${checkMatch[1]} on the list. That’s probably correct.` };
  }

  // Bare item name while packing — treat as check-off if it uniquely matches.
  const maybeItem = matchItem(raw, trip.items);
  if (maybeItem && raw.split(/\s+/).length <= 4) {
    return {
      kind: "check",
      item: maybeItem,
      packed: true,
      speech: `Checked off ${maybeItem.label.toLowerCase()}.`,
    };
  }

  return undefined;
}
