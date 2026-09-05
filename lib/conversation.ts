import { ACTIVITY_LABELS, emptyDraft, type TripDraft, type TurnResult } from "./types";
import { mergeDraft, missingSlots } from "./extract";

function activityPhrase(draft: TripDraft): string {
  if (!draft.activities.length) return "nothing fancy";
  const labels = draft.activities.map((a) => ACTIVITY_LABELS[a]);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function nightsPhrase(nights?: number): string {
  if (!nights) return "";
  return nights === 1 ? "one night" : `${nights} nights`;
}

function recap(draft: TripDraft): string {
  const parts: string[] = [];
  if (draft.destination) parts.push(draft.destination);
  if (draft.nights) parts.push(nightsPhrase(draft.nights));
  if (draft.activitiesSettled) parts.push(activityPhrase(draft));
  if (draft.laundry === "yes") parts.push("laundry on site");
  if (draft.laundry === "no") parts.push("no laundry");
  return parts.join(", ");
}

export function welcomeLine(): string {
  return "Where to? Tell me the city, how long, and what you’ll actually do.";
}

export function nextQuestion(draft: TripDraft): string {
  const missing = missingSlots(draft);
  const first = missing[0];
  if (first === "destination") {
    return "Which city? Just the name is enough.";
  }
  if (first === "nights") {
    return draft.destination
      ? `${draft.destination}. How many nights?`
      : "How many nights?";
  }
  if (first === "activities") {
    return "Anything besides walking — hike, swim, run, meetings? Or nothing special.";
  }
  if (first === "laundry") {
    return "Will you have a washing machine — hotel, apartment, or a laundromat?";
  }
  return `That’s ${recap(draft)}. I’ll build the lean list.`;
}

export function processUtterance(draft: TripDraft, text: string): TurnResult {
  const next = mergeDraft(draft, text);
  const missing = missingSlots(next);

  if (!missing.length) {
    const reply = `${recap(next)}. Checking the weather — then I’ll cut the list down.`;
    return { draft: next, reply, readyToPack: true };
  }

  const asked = nextQuestion(next);
  const acknowledged = recap(next);
  const reply = acknowledged && missing[0] !== "destination" ? `${acknowledged}. ${asked}` : asked;

  return { draft: next, reply, readyToPack: false };
}

export function resetDraft(): TripDraft {
  return emptyDraft();
}
