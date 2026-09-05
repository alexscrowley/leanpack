import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM = `You are Leanpack — a calm, slightly dry packing assistant.
Rewrite the provided scripted reply so it sounds spoken, short, and premium.
Rules:
- 1–3 sentences. No lists. No emoji.
- Push back on overpacking. Prefer fewer items.
- Never invent packing items or change quantities.
- Never mention being an AI or OpenAI.
- Keep the same facts as the scripted reply.`;

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({ available: false });
  }

  try {
    const body = (await request.json()) as { scripted?: string };
    const scripted = (body.scripted ?? "").slice(0, 800);
    if (!scripted) return NextResponse.json({ available: false });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.5,
        max_tokens: 160,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: scripted },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ available: false });
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({ available: true, text: text || scripted });
  } catch {
    return NextResponse.json({ available: false });
  }
}
