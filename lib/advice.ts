import type { Trip, TripDraft } from "./types";

export async function polishReply(
  scripted: string,
  context: { draft: TripDraft; trip: Trip | null },
): Promise<string> {
  try {
    const res = await fetch("/api/advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scripted, draft: context.draft, trip: context.trip }),
    });
    if (!res.ok) return scripted;
    const data = (await res.json()) as { text?: string; available?: boolean };
    if (!data.available || !data.text) return scripted;
    return data.text.trim() || scripted;
  } catch {
    return scripted;
  }
}
