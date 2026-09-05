import type { Exchange } from "@/lib/types";

export function Transcript({
  exchanges,
  interim,
}: {
  exchanges: Exchange[];
  interim?: string;
}) {
  const last = [...exchanges].reverse().find((e) => e.role === "assistant");

  return (
    <div className="px-5 pt-2 sm:px-8">
      <div className="min-h-[4.5rem] rounded-2xl border border-line/70 bg-panel/40 px-4 py-3">
        {interim ? (
          <p className="text-[14px] italic text-gold">{interim}</p>
        ) : last ? (
          <p className="text-[14.5px] leading-relaxed text-cream/90">{last.text}</p>
        ) : (
          <p className="text-[14px] text-muted">The last exchange will live here.</p>
        )}
      </div>
    </div>
  );
}
