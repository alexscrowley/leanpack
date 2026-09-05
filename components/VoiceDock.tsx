"use client";

import { useRef } from "react";

export function VoiceDock({
  listening,
  supported,
  canHold,
  busy,
  onStart,
  onStop,
  onSubmitText,
}: {
  listening: boolean;
  supported: boolean;
  canHold: boolean;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
  onSubmitText: (text: string) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const holdAt = useRef(0);

  return (
    <div className="border-t border-line/70 bg-ink/80 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-md sm:px-8">
      <form
        ref={formRef}
        className="mb-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const text = String(data.get("message") ?? "").trim();
          if (!text) return;
          onSubmitText(text);
          event.currentTarget.reset();
        }}
      >
        <label className="sr-only" htmlFor="leanpack-text">
          Type instead of speaking
        </label>
        <input
          id="leanpack-text"
          name="message"
          type="text"
          autoComplete="off"
          placeholder={supported ? "Or type the same thing…" : "Voice needs Chrome. Type here instead."}
          className="w-full rounded-full border border-line bg-panel px-4 py-3 text-[15px] text-cream outline-none placeholder:text-faint focus:border-gold/50"
        />
      </form>

      <div className="flex flex-col items-center">
        <button
          type="button"
          disabled={busy}
          aria-pressed={listening}
          aria-label={listening ? "Stop listening" : canHold ? "Hold to talk" : "Tap to talk"}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            if (listening) {
              holdAt.current = 0;
              onStop();
              return;
            }
            holdAt.current = Date.now();
            onStart();
          }}
          onPointerUp={() => {
            if (!canHold || holdAt.current === 0) return;
            onStop();
          }}
          className={`relative grid h-[88px] w-[88px] place-items-center rounded-full select-none touch-manipulation transition-transform duration-200 active:scale-95 disabled:opacity-50 ${
            listening ? "bg-gold text-ink" : "bg-cream text-ink"
          }`}
          style={listening ? { animation: "listen 1.6s ease-out infinite" } : undefined}
        >
          {listening && (
            <span
              className="absolute inset-0 rounded-full border border-gold/50"
              style={{ animation: "pulse-ring 1.6s ease-out infinite" }}
            />
          )}
          <MicIcon listening={listening} />
        </button>
        <p className="mt-3 text-[12px] tracking-[0.16em] text-faint uppercase">
          {busy ? "Working" : listening ? "Listening" : canHold ? "Hold to talk" : "Tap to talk"}
        </p>
      </div>
    </div>
  );
}

function MicIcon({ listening }: { listening: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect
        x="10"
        y="4"
        width="8"
        height="13"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.7"
        fill={listening ? "currentColor" : "none"}
      />
      <path d="M7 13a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M14 20v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
