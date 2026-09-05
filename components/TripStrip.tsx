import type { ReactNode } from "react";
import { formatRange } from "@/lib/dates";
import { ACTIVITY_LABELS, type Trip } from "@/lib/types";

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-line/80 bg-panel/60 px-3 py-1 text-[12px] tracking-wide text-cream/85">
      {children}
    </span>
  );
}

export function TripStrip({ trip }: { trip: Trip }) {
  const activities = trip.activities.length
    ? trip.activities.map((a) => ACTIVITY_LABELS[a]).join(" · ")
    : "city days";

  return (
    <section className="rise border-b border-line/70 px-5 py-4 sm:px-8">
      <p className="font-serif text-[22px] leading-tight text-cream sm:text-[26px]">
        {trip.placeLabel}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Pill>{formatRange(trip.startDate, trip.endDate, trip.nights) || `${trip.nights} nights`}</Pill>
        <Pill>{trip.nights === 1 ? "1 night" : `${trip.nights} nights`}</Pill>
        <Pill>{trip.weather.summary.replace(/\.$/, "")}</Pill>
        <Pill>{trip.laundry ? "Laundry" : "No laundry"}</Pill>
        <Pill>{activities}</Pill>
      </div>
    </section>
  );
}
