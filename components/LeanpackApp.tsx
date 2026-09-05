"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Checklist } from "@/components/Checklist";
import { Transcript } from "@/components/Transcript";
import { TripStrip } from "@/components/TripStrip";
import { VoiceDock } from "@/components/VoiceDock";
import { polishReply } from "@/lib/advice";
import { interpretCommand } from "@/lib/commands";
import { processUtterance, welcomeLine } from "@/lib/conversation";
import { defaultWindow } from "@/lib/dates";
import { commentaryForTrip, preservePacked, tripFromDraft } from "@/lib/packing-engine";
import { getServerSnapshot, getSnapshot, hydrateFromStorage, resetAppState, setAppState, subscribe } from "@/lib/store";
import { type Exchange, type Trip } from "@/lib/types";
import { useSpeech } from "@/lib/use-speech";
import { fetchWeather, mildFallback } from "@/lib/weather";

export function LeanpackApp() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [busy, setBusy] = useState(false);
  const speech = useSpeech();
  const handlingRef = useRef(false);

  useEffect(() => {
    hydrateFromStorage();
  }, []);

  const pushExchange = useCallback((role: Exchange["role"], text: string) => {
    setAppState((prev) => ({
      ...prev,
      exchanges: [...prev.exchanges, { role, text, at: Date.now() }].slice(-12),
    }));
  }, []);

  const speakAndLog = useCallback(
    async (scripted: string, nextDraft = getSnapshot().draft, trip = getSnapshot().trip) => {
      const polished = await polishReply(scripted, { draft: nextDraft, trip });
      pushExchange("assistant", polished);
      speech.speak(polished);
    },
    [pushExchange, speech],
  );

  const buildTrip = useCallback(async (draft: ReturnType<typeof getSnapshot>["draft"], previous?: Trip | null) => {
    const nights = draft.nights ?? 3;
    const window =
      draft.startDate && draft.endDate
        ? { startDate: draft.startDate, endDate: draft.endDate }
        : defaultWindow(nights);

    let weather;
    try {
      weather = await fetchWeather({
        query: draft.destination ?? "",
        startDate: window.startDate,
        endDate: window.endDate,
      });
    } catch {
      weather = mildFallback(draft.destination ?? "Your trip");
    }

    const generated = tripFromDraft(
      { ...draft, startDate: draft.startDate ?? window.startDate, endDate: draft.endDate ?? window.endDate },
      weather,
    );
    generated.items = preservePacked(previous?.items, generated.items);
    return generated;
  }, []);

  const handleUtterance = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || handlingRef.current) return;
      handlingRef.current = true;
      speech.hush();
      pushExchange("user", trimmed);

      const current = getSnapshot();
      const command = interpretCommand(trimmed, current.trip);

      try {
        if (command?.kind === "reset") {
          resetAppState();
          await speakAndLog(command.speech, getSnapshot().draft, null);
          return;
        }

        if (current.phase === "ready" && current.trip && command) {
          if (command.kind === "check") {
            setAppState((prev) => {
              if (!prev.trip) return prev;
              return {
                ...prev,
                trip: {
                  ...prev.trip,
                  items: prev.trip.items.map((item) =>
                    item.id === command.item.id ? { ...item, packed: command.packed } : item,
                  ),
                },
              };
            });
            await speakAndLog(command.speech, current.draft, current.trip);
            return;
          }
          await speakAndLog(command.speech, current.draft, current.trip);
          return;
        }

        const turn = processUtterance(current.draft, trimmed);
        setAppState((prev) => ({
          ...prev,
          phase: "collecting",
          draft: turn.draft,
        }));

        if (!turn.readyToPack) {
          await speakAndLog(turn.reply, turn.draft, current.trip);
          return;
        }

        setBusy(true);
        pushExchange("assistant", turn.reply);
        speech.speak(turn.reply);

        const trip = await buildTrip(turn.draft, current.trip);
        setAppState((prev) => ({
          ...prev,
          phase: "ready",
          draft: turn.draft,
          trip,
        }));
        await speakAndLog(commentaryForTrip(trip), turn.draft, trip);
      } finally {
        setBusy(false);
        handlingRef.current = false;
      }
    },
    [buildTrip, pushExchange, speakAndLog, speech],
  );

  useEffect(() => {
    speech.setOnFinal((text) => {
      void handleUtterance(text);
    });
  }, [handleUtterance, speech]);

  const toggleItem = useCallback((id: string) => {
    setAppState((prev) => {
      if (!prev.trip) return prev;
      return {
        ...prev,
        trip: {
          ...prev.trip,
          items: prev.trip.items.map((item) => (item.id === id ? { ...item, packed: !item.packed } : item)),
        },
      };
    });
  }, []);

  const reset = useCallback(() => {
    speech.hush();
    resetAppState();
    speech.speak(welcomeLine());
  }, [speech]);

  const greeting = useMemo(() => welcomeLine(), []);
  const showWelcomePrompt = state.phase === "welcome" && state.exchanges.length === 0;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col lg:max-w-2xl">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <p className="text-[13px] font-medium tracking-[0.22em] text-gold uppercase">Leanpack</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => speech.setTtsOn((on) => !on)}
            className="text-[12px] text-faint transition-colors hover:text-cream"
          >
            {speech.ttsOn ? "Voice on" : "Voice off"}
          </button>
          {state.trip && (
            <button
              type="button"
              onClick={reset}
              className="text-[12px] text-faint transition-colors hover:text-cream"
            >
              New trip
            </button>
          )}
        </div>
      </header>

      {state.trip ? (
        <>
          <TripStrip trip={state.trip} />
          <main className="flex-1 overflow-y-auto pt-8">
            <Checklist items={state.trip.items} onToggle={toggleItem} />
          </main>
        </>
      ) : (
        <main className="flex flex-1 flex-col justify-center px-5 pb-6 sm:px-8">
          <p className="rise font-serif text-[42px] leading-[1.05] tracking-tight text-cream sm:text-6xl">
            Speak the trip.
          </p>
          <p className="rise delay-1 mt-5 max-w-sm text-[16px] leading-relaxed text-muted">
            City, nights, what you’ll do. I’ll ask about laundry — then cut the list until it fits in one bag.
          </p>
          {showWelcomePrompt && (
            <p className="rise delay-2 mt-8 text-[14px] text-gold-dim">{greeting}</p>
          )}
        </main>
      )}

      {(state.exchanges.length > 0 || speech.interim || speech.listening) && (
        <Transcript exchanges={state.exchanges} interim={speech.interim} />
      )}
      <VoiceDock
        listening={speech.listening}
        supported={speech.supported}
        busy={busy}
        error={speech.error}
        onStart={() => {
          if (!speech.supported) return;
          void speech.start();
        }}
        onStop={() => speech.stop()}
        onSubmitText={(text) => {
          void handleUtterance(text);
        }}
      />
    </div>
  );
}
